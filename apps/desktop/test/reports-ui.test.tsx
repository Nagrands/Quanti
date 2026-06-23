import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ReportsPage } from "../src/features/reports/ReportsPage";
import { reportToCsv } from "../src/features/reports/report-export";
import * as api from "../src/features/reports/reports-api";
import { reportDefinitions } from "../src/features/reports/reports-model";
import { renderWithAppProviders } from "./render-app";

vi.mock("../src/features/reports/reports-api");

const lookups = {
  products: [{ id: "p1", sku: "SKU-1", name: "Widget", description: null, unit: "pcs", categoryId: null, categoryName: null, isActive: true, createdAt: "", updatedAt: "" }],
  warehouses: [{ id: "w1", code: "MAIN", name: "Main warehouse", isActive: true, createdAt: "", updatedAt: "" }],
  counterparties: [{ id: "c1", code: "CLIENT", name: "Northwind", type: "CUSTOMER" as const, taxId: null, isActive: true, createdAt: "", updatedAt: "" }],
  accounts: [{ id: "a1", code: "BANK", name: "Main bank", type: "BANK" as const, currencyCode: "RUB", isActive: true, createdAt: "", updatedAt: "" }]
};

describe("reports workspace", () => {
  beforeEach(() => {
    vi.mocked(api.getReportLookups).mockResolvedValue(lookups);
    vi.mocked(api.getReport).mockResolvedValue([{
      productId: "p1",
      warehouseId: "w1",
      incoming: "12.000",
      outgoing: "5.000"
    }] as never);
  });

  test("loads stock turnover with lookup labels", async () => {
    renderWithAppProviders(<ReportsPage />, "/reports");

    expect(await screen.findByRole("cell", { name: "SKU-1 · Widget" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "MAIN · Main warehouse" })).toBeInTheDocument();
  });

  test("switches report types and applies explicit filters", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<ReportsPage />, "/reports");
    await screen.findByRole("cell", { name: "SKU-1 · Widget" });

    for (const label of ["Остатки на складе", "Остаток на дату", "Продажи", "Популярные товары", "Движение денег", "Долги контрагентов"]) {
      await user.click(screen.getByRole("button", { name: label }));
      expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
    }

    await user.click(screen.getByRole("button", { name: "Движение денег" }));
    await user.selectOptions(screen.getByLabelText("Счёт"), "a1");
    await user.selectOptions(screen.getByLabelText("Контрагент"), "c1");
    await user.click(screen.getByRole("button", { name: "Сформировать" }));

    expect(api.getReport).toHaveBeenLastCalledWith("cashflow", expect.objectContaining({
      accountId: "a1",
      counterpartyId: "c1"
    }));
    const request = vi.mocked(api.getReport).mock.calls.at(-1)?.[1] as { from: string; to: string };
    expect(request.from).toMatch(/T00:00:00\.000Z$/);
    expect(request.to).toMatch(/T23:59:59\.999Z$/);
  });

  test("validates date ranges before sending a report request", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<ReportsPage />, "/reports");
    await screen.findByRole("cell", { name: "SKU-1 · Widget" });
    const initialCalls = vi.mocked(api.getReport).mock.calls.length;

    await user.clear(screen.getByLabelText("Дата с"));
    await user.type(screen.getByLabelText("Дата с"), "2026-06-20");
    await user.clear(screen.getByLabelText("Дата по"));
    await user.type(screen.getByLabelText("Дата по"), "2026-06-01");
    await user.click(screen.getByRole("button", { name: "Сформировать" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Укажите корректный период.");
    expect(api.getReport).toHaveBeenCalledTimes(initialCalls);
  });

  test("shows report errors and retries", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getReport).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([]);
    renderWithAppProviders(<ReportsPage />, "/reports");

    expect(await screen.findByText("Не удалось загрузить отчёт.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByText("Нет данных")).toBeInTheDocument();
  });

  test("serializes the visible report as CSV", () => {
    const definition = reportDefinitions.find((item) => item.kind === "stock-turnover")!;
    const maps = {
      products: new Map([["p1", "SKU-1 · Widget"]]),
      warehouses: new Map([["w1", "MAIN · Main warehouse"]]),
      counterparties: new Map(),
      accounts: new Map()
    };
    const csv = reportToCsv(definition, [{
      productId: "p1",
      warehouseId: "w1",
      incoming: "12.000",
      outgoing: "5.000"
    }], maps);

    expect(csv).toContain("\"Товар\",\"Склад\",\"Приход\",\"Расход\"");
    expect(csv).toContain("\"SKU-1 · Widget\",\"MAIN · Main warehouse\",\"12.000\",\"5.000\"");
  });
});
