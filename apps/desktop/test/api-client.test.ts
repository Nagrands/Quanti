import { afterEach, describe, expect, test, vi } from "vitest";

import { ApiClient } from "../src/api/client";
import { ApiError } from "../src/api/errors";

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body)
  } as unknown as Response;
}

function createEmptyResponse(status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected end of JSON input"))
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("ApiClient", () => {
  test("uses the configured base URL and returns successful JSON", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/v1/");
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ status: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new ApiClient().request<{ status: string }>("/health");

    expect(result).toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/v1/health", undefined);
  });

  test("falls back to the local API URL", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ status: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    await new ApiClient().request("/health");

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3100/health", undefined);
  });

  test("maps the backend error envelope to ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createJsonResponse({
        error: {
          code: "VALIDATION_ERROR",
          message: ["sku must be a string", "unit must be a string"],
          statusCode: 400
        }
      }, 400))
    );

    await expect(new ApiClient().request("/products")).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      code: "VALIDATION_ERROR",
      message: "sku must be a string, unit must be a string"
    });
  });

  test("maps fetch failures to a network ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const request = new ApiClient().request("/health");

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Failed to fetch"
    });
  });

  test("accepts successful responses without a JSON body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createEmptyResponse()));

    await expect(new ApiClient().request<void>("/products/product-1", {
      method: "DELETE"
    })).resolves.toBeUndefined();
  });
});
