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
    expect(await screen.findByText("Создать продажу")).toBeInTheDocument();
    expect(screen.getByText("Продажи за месяц")).toBeInTheDocument();
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

  test("starts compact and persists the expanded sidebar preference", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithAppProviders(<App />);
    const navigation = screen.getByRole("complementary", { name: "Основная навигация" });
    const expandButton = screen.getByRole("button", { name: "Развернуть боковую панель" });

    expect(navigation).not.toHaveClass("sidebar--expanded");
    expect(expandButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Документы" })).toBeInTheDocument();
    expect(screen.getByText("Документы", { selector: ".sidebar__tooltip" })).toBeInTheDocument();

    await user.click(expandButton);
    expect(navigation).toHaveClass("sidebar--expanded");
    expect(screen.getByRole("button", { name: "Свернуть боковую панель" })).toHaveAttribute("aria-expanded", "true");
    expect(window.localStorage.getItem("quanti.sidebar.expanded")).toBe("true");

    unmount();
    renderWithAppProviders(<App />);
    expect(screen.getByRole("complementary", { name: "Основная навигация" })).toHaveClass("sidebar--expanded");
  });

  test("falls back to compact mode when sidebar storage is unavailable", () => {
    const getItem = vi.spyOn(window.localStorage, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    renderWithAppProviders(<App />);

    expect(screen.getByRole("complementary", { name: "Основная навигация" })).not.toHaveClass("sidebar--expanded");
    getItem.mockRestore();
  });

  test("renders a fallback for unknown routes", () => {
    renderWithAppProviders(<App />, "/missing");

    expect(screen.getByRole("heading", { level: 1, name: "Страница не найдена" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Вернуться на главную" })).toBeInTheDocument();
  });
});
