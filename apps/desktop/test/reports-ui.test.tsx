import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ReportsPage } from "../src/features/reports/ReportsPage";
import { reportToCsv, reportToSnapshot } from "../src/features/reports/report-export";
import * as api from "../src/features/reports/reports-api";
import { reportDefinitions } from "../src/features/reports/reports-model";
import * as shell from "../src/tauri-shell";
import { renderWithAppProviders } from "./render-app";

vi.mock("../src/features/reports/reports-api");

const lookups = {
  products: [{
    id: "p1",
    sku: "SKU-1",
    name: "Widget",
    description: null,
    unit: "кг",
    units: [{ id: "unit-bunch", name: "пучок", conversionFactor: "0.100000" }],
    lastSalePrice: null,
    lastSaleUnit: null,
    lastPurchasePrice: null,
    lastPurchaseUnit: null,
    categoryId: null,
    categoryName: null,
    isActive: true,
    createdAt: "",
    updatedAt: ""
  }],
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

  test("shows base and additional units in both stock balance reports", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getReport).mockResolvedValue([{
      productId: "p1",
      warehouseId: "w1",
      quantity: "8.000"
    }] as never);
    renderWithAppProviders(<ReportsPage />, "/reports");

    await user.click(screen.getByRole("button", { name: "Остатки на складе" }));
    expect(await screen.findByRole("cell", { name: "кг, пучок" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Остаток на дату" }));
    expect(await screen.findByRole("cell", { name: "кг, пучок" })).toBeInTheDocument();
  });

  test("localizes the units column in English", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("quanti.locale", "en");
    renderWithAppProviders(<ReportsPage />, "/reports");

    await user.click(screen.getByRole("button", { name: "Stock balance" }));
    expect(await screen.findByRole("columnheader", { name: "Units" })).toBeInTheDocument();
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
      productUnits: new Map([["p1", "pcs"]]),
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

  test("exports stock balance units and keeps a base-only unit unchanged", () => {
    const definition = reportDefinitions.find((item) => item.kind === "stock-balance")!;
    const maps = {
      products: new Map([["p1", "SKU-1 · Basil"], ["p2", "SKU-2 · Salt"]]),
      productUnits: new Map([["p1", "кг, пучок"], ["p2", "кг"]]),
      warehouses: new Map([["w1", "MAIN · Main warehouse"]]),
      counterparties: new Map(),
      accounts: new Map()
    };
    const csv = reportToCsv(definition, [
      { productId: "p1", warehouseId: "w1", quantity: "8.000" },
      { productId: "p2", warehouseId: "w1", quantity: "4.000" }
    ], maps);

    expect(csv).toContain("\"Товар\",\"Склад\",\"Количество\",\"Единицы\"");
    expect(csv).toContain("\"SKU-1 · Basil\",\"MAIN · Main warehouse\",\"8.000\",\"кг, пучок\"");
    expect(csv).toContain("\"SKU-2 · Salt\",\"MAIN · Main warehouse\",\"4.000\",\"кг\"");
  });

  test("serializes a portable read-only report snapshot", () => {
    const definition = reportDefinitions.find((item) => item.kind === "stock-turnover")!;
    const filters = { from: "2026-06-01", to: "2026-06-30", at: "", warehouseId: "", productId: "", accountId: "", counterpartyId: "", limit: "" };
    const snapshot = reportToSnapshot(definition, filters, [{ productId: "product-1", warehouseId: "warehouse-1", incoming: "12", outgoing: "5" }], {
      products: new Map([["product-1", "SKU-1 · Widget"]]), productUnits: new Map(), warehouses: new Map([["warehouse-1", "MAIN · Main warehouse"]]), counterparties: new Map(), accounts: new Map()
    }, "ru");
    expect(snapshot).toMatchObject({ format: "quanti-transfer", version: 1, section: "report-snapshot" });
    expect(snapshot.payload.rows[0]).toEqual({ product: "SKU-1 · Widget", warehouse: "MAIN · Main warehouse", incoming: "12", outgoing: "5" });
  });

  test("imports a report snapshot in read-only mode", async () => {
    const user = userEvent.setup();
    const snapshot = {
      format: "quanti-transfer", version: 1, section: "report-snapshot", exportedAt: "2026-06-15T10:00:00.000Z",
      payload: { kind: "stock-turnover", title: "Сохранённый оборот", locale: "ru", filters: [], columns: [{ key: "product", label: "Товар" }], rows: [{ product: "Снимок товара" }] }
    } as const;
    vi.spyOn(shell, "pickJsonImport").mockResolvedValue({ fileName: "report.json", size: 200, contents: JSON.stringify(snapshot) });
    renderWithAppProviders(<ReportsPage />, "/reports");
    await screen.findByRole("cell", { name: "SKU-1 · Widget" });
    await user.click(screen.getByRole("button", { name: "Импорт снимка" }));
    expect(await screen.findByText("Сохранённый оборот")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Снимок товара" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Закрыть снимок" }));
    expect(screen.queryByText("Снимок товара")).not.toBeInTheDocument();
  });
});
