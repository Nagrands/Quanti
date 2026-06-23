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
    mockedRequest.mockImplementation(async (path) => {
      if (path === "/health") {
        return {
          service: "quanti-api",
          status: "ok",
          database: "ok",
          modules: ["products", "documents", "stock", "payments", "reports"]
        };
      }

      return [];
    });
  });

  test("renders the dashboard workspace", async () => {
    renderWithAppProviders(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "Главная" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Рабочее пространство ERP" })).toBeInTheDocument();
    expect(await screen.findByText("API подключён")).toBeInTheDocument();
  });

  test("navigates through every foundation route", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<App />);

    const routes = [
      { link: "Справочники", heading: "Товары" },
      { link: "Документы", heading: "Документы" },
      { link: "Платежи", heading: "Платежи" },
      { link: "Отчёты", heading: "Отчёты" },
      { link: "Настройки", heading: "Настройки" }
    ];

    for (const route of routes) {
      await user.click(screen.getByRole("link", { name: route.link }));
      expect(screen.getByRole("heading", { level: 1, name: route.heading })).toBeInTheDocument();
    }
  });

  test("marks the current sidebar route as active", () => {
    renderWithAppProviders(<App />, "/reports");

    expect(screen.getByRole("link", { name: "Отчёты" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Главная" })).not.toHaveAttribute("aria-current");
  });

  test("renders a fallback for unknown routes", () => {
    renderWithAppProviders(<App />, "/missing");

    expect(screen.getByRole("heading", { level: 1, name: "Страница не найдена" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Вернуться на главную" })).toBeInTheDocument();
  });
});
