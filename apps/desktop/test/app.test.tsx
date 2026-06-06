import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { App } from "../src/app/App";
import { apiClient } from "../src/api/client";
import { renderWithAppProviders } from "./render-app";

vi.mock("../src/api/client", () => ({
  apiClient: {
    request: vi.fn()
  }
}));

const mockedRequest = vi.mocked(apiClient.request);

describe("Quanti application shell", () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({
      service: "quanti-api",
      status: "ok",
      modules: ["products", "documents", "stock", "payments", "reports"]
    });
  });

  test("renders the dashboard workspace", async () => {
    renderWithAppProviders(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "ERP workspace" })).toBeInTheDocument();
    expect(await screen.findByText("API connected")).toBeInTheDocument();
  });

  test("navigates through every foundation route", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<App />);

    for (const routeName of ["Products", "Documents", "Payments", "Reports", "Settings"]) {
      await user.click(screen.getByRole("link", { name: routeName }));
      expect(screen.getByRole("heading", { level: 1, name: routeName })).toBeInTheDocument();
    }
  });

  test("marks the current sidebar route as active", () => {
    renderWithAppProviders(<App />, "/reports");

    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  test("renders a fallback for unknown routes", () => {
    renderWithAppProviders(<App />, "/missing");

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to Dashboard" })).toBeInTheDocument();
  });
});
