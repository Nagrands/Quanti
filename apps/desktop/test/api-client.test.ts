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

function createBinaryResponse(data: Uint8Array, headers: Record<string, string>): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers(headers),
    arrayBuffer: vi.fn().mockResolvedValue(data.buffer)
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

  test("returns binary data and attachment metadata", async () => {
    const bytes = new TextEncoder().encode("%PDF-test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createBinaryResponse(bytes, {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="SO-001.pdf"'
    })));

    const result = await new ApiClient("https://api.example.test").requestBinary("/documents/1/print");

    expect(Array.from(new Uint8Array(result.data))).toEqual(Array.from(bytes));
    expect(result.contentType).toBe("application/pdf");
    expect(result.fileName).toBe("SO-001.pdf");
  });

  test("maps binary endpoint error envelopes to ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({
      error: {
        code: "PDF_RENDER_ERROR",
        message: "Chromium unavailable.",
        statusCode: 503
      }
    }, 503)));

    await expect(new ApiClient().requestBinary("/documents/1/print")).rejects.toMatchObject({
      status: 503,
      code: "PDF_RENDER_ERROR",
      message: "Chromium unavailable."
    });
  });
});
