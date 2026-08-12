import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { apiClient } from "../src/api/client";
import { App } from "../src/app/App";
import { renderWithAppProviders } from "./render-app";

vi.mock("../src/api/client", () => ({
  apiClient: {
    request: vi.fn()
  }
}));

describe("application settings", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(apiClient.request).mockImplementation(async (path) => path === "/health" ? {
      service: "quanti-api",
      status: "ok",
      database: "ok",
      modules: []
    } : []);
  });

  test("switches the complete application shell to English and persists it", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<App />, "/settings");

    await user.selectOptions(screen.getByLabelText("Язык интерфейса"), "en");

    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByLabelText("Interface language")).toHaveValue("en");
    expect(window.localStorage.getItem("quanti.locale")).toBe("en");
    expect(document.documentElement.lang).toBe("en");

    await user.click(screen.getByRole("link", { name: "Documents" }));
    expect(screen.getByRole("heading", { level: 1, name: "Documents" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New document" })).toBeInTheDocument();
    expect(screen.getByLabelText("Status filter")).toBeInTheDocument();
  });

  test("restores the saved English locale on mount", () => {
    window.localStorage.setItem("quanti.locale", "en");
    renderWithAppProviders(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  test("switches to dark theme immediately and persists it", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<App />, "/settings");

    await user.selectOptions(screen.getByLabelText("Тема интерфейса"), "dark");

    expect(screen.getByLabelText("Тема интерфейса")).toHaveValue("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(window.localStorage.getItem("quanti.theme")).toBe("dark");
  });

  test("shows Quanti branding in About and diagnostics", () => {
    const { container } = renderWithAppProviders(<App />, "/settings");

    expect(container.querySelector(".settings-diagnostics__brand span")).toHaveTextContent("Quanti ERP");
    expect(screen.getByRole("heading", { level: 2, name: "О программе и диагностика" })).toBeInTheDocument();
    expect(container.querySelector(".settings-diagnostics__brand-mark")).toHaveAttribute("aria-hidden", "true");
  });

  test("restores the saved dark theme on mount", () => {
    window.localStorage.setItem("quanti.theme", "dark");
    renderWithAppProviders(<App />, "/settings");

    expect(screen.getByLabelText("Тема интерфейса")).toHaveValue("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
