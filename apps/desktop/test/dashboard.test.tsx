import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { DashboardPage } from "../src/features/dashboard/DashboardPage";
import { getDashboardData } from "../src/features/dashboard/dashboard-api";
import { createDashboardSummary } from "../src/features/dashboard/dashboard-model";
import { renderWithAppProviders } from "./render-app";

vi.mock("../src/features/dashboard/dashboard-api", () => ({
  getDashboardData: vi.fn()
}));

const now = new Date();
const currentMonthDate = now.toISOString();

const dashboardData = {
  documents: [
    {
      id: "document-1",
      number: "SALE-001",
      type: "SALE" as const,
      status: "POSTED" as const,
      documentDate: currentMonthDate,
      postedAt: currentMonthDate,
      notes: null,
      totalAmount: "120.00",
      warehouseId: "warehouse-1",
      sourceWarehouseId: null,
      destinationWarehouseId: null,
      counterpartyId: "counterparty-1",
      items: []
    },
    {
      id: "document-2",
      number: "DRAFT-001",
      type: "PURCHASE" as const,
      status: "DRAFT" as const,
      documentDate: currentMonthDate,
      postedAt: null,
      notes: null,
      totalAmount: "50.00",
      warehouseId: "warehouse-1",
      sourceWarehouseId: null,
      destinationWarehouseId: null,
      counterpartyId: null,
      items: []
    }
  ],
  payments: [{
    id: "payment-1",
    number: "PAY-001",
    direction: "INCOMING" as const,
    status: "POSTED" as const,
    paymentDate: currentMonthDate,
    amount: "70.00",
    notes: null,
    accountId: "account-1",
    counterpartyId: "counterparty-1",
    allocations: []
  }],
  debts: [{
    counterpartyId: "counterparty-1",
    documentTotal: "120.00",
    paidTotal: "70.00",
    debtTotal: "50.00"
  }],
  stockRows: [{
    productId: "product-1",
    warehouseId: "warehouse-1",
    quantity: "3.000"
  }],
  products: [{
    id: "product-1",
    sku: "SKU-1",
    name: "Widget",
    description: null,
    unit: "pcs",
    units: [],
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
  warehouses: [{
    id: "warehouse-1",
    code: "MAIN",
    name: "Main",
    isActive: true,
    createdAt: "",
    updatedAt: ""
  }],
  counterparties: [{
    id: "counterparty-1",
    code: "C-1",
    name: "Acme",
    type: "CUSTOMER" as const,
    taxId: null,
    isActive: true,
    createdAt: "",
    updatedAt: ""
  }]
};

describe("dashboard workspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(getDashboardData).mockResolvedValue(dashboardData);
  });

  test("builds dashboard summary from operational data", () => {
    const summary = createDashboardSummary(dashboardData, now);

    expect(summary.postedSalesTotal).toBe(120);
    expect(summary.incomingPaymentsTotal).toBe(70);
    expect(summary.openDebtTotal).toBe(50);
    expect(summary.draftDocumentsCount).toBe(1);
    expect(summary.lowStockRows[0]?.productLabel).toBe("SKU-1 · Widget");
  });

  test("renders metrics, recent activity, low stock, and debts", async () => {
    renderWithAppProviders(<DashboardPage />, "/dashboard");

    expect(await screen.findByText("Продажи за месяц")).toBeInTheDocument();
    expect(screen.getByText("120,00")).toBeInTheDocument();
    expect(screen.getByText("70,00")).toBeInTheDocument();
    expect(screen.getByText("SALE-001")).toBeInTheDocument();
    expect(screen.getByText("PAY-001")).toBeInTheDocument();
    expect(screen.getByText("SKU-1 · Widget")).toBeInTheDocument();
    expect(screen.getByText("C-1 · Acme")).toBeInTheDocument();

    const quickActions = screen.getByLabelText("Быстрые действия");
    expect(within(quickActions).getByRole("link", { name: "Создать продажу" })).toHaveAttribute("href", "/documents");
    expect(within(quickActions).getByRole("link", { name: "Создать платёж" })).toHaveAttribute("href", "/payments");
  });
});
