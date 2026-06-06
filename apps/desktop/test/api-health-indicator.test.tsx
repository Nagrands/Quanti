import { screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { apiClient } from "../src/api/client";
import { ApiHealthIndicator } from "../src/components/status/ApiHealthIndicator";
import { renderWithAppProviders } from "./render-app";

vi.mock("../src/api/client", () => ({
  apiClient: {
    request: vi.fn()
  }
}));

const mockedRequest = vi.mocked(apiClient.request);

describe("API health indicator", () => {
  test("shows loading while the health request is pending", () => {
    mockedRequest.mockReturnValue(new Promise(() => undefined));

    renderWithAppProviders(<ApiHealthIndicator />);

    expect(screen.getByText("Connecting to API")).toBeInTheDocument();
  });

  test("shows connected when the API responds", async () => {
    mockedRequest.mockResolvedValue({
      service: "quanti-api",
      status: "ok",
      modules: []
    });

    renderWithAppProviders(<ApiHealthIndicator />);

    expect(await screen.findByText("API connected")).toBeInTheDocument();
  });

  test("shows unavailable when the health request fails", async () => {
    mockedRequest.mockRejectedValue(new Error("offline"));

    renderWithAppProviders(<ApiHealthIndicator />);

    expect(await screen.findByText("API unavailable")).toBeInTheDocument();
  });
});
