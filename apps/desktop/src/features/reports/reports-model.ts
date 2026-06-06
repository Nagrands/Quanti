import type {
  CashflowReportFilterDto,
  CashflowReportRowDto,
  CounterpartyDebtReportFilterDto,
  CounterpartyDebtReportRowDto,
  SalesReportFilterDto,
  SalesReportRowDto,
  StockBalanceReportFilterDto,
  StockBalanceReportRowDto,
  StockTurnoverReportFilterDto,
  StockTurnoverReportRowDto,
  TopProductsReportFilterDto,
  TopProductsReportRowDto
} from "@quanti/shared";

export type ReportKind =
  | "stock-balance"
  | "stock-turnover"
  | "balance-at-date"
  | "sales"
  | "top-products"
  | "cashflow"
  | "counterparty-debts";

export type ReportRequest =
  | StockBalanceReportFilterDto
  | StockTurnoverReportFilterDto
  | SalesReportFilterDto
  | TopProductsReportFilterDto
  | CashflowReportFilterDto
  | CounterpartyDebtReportFilterDto;

export type ReportRow =
  | StockBalanceReportRowDto
  | StockTurnoverReportRowDto
  | SalesReportRowDto
  | TopProductsReportRowDto
  | CashflowReportRowDto
  | CounterpartyDebtReportRowDto;

export type ReportRows = ReportRow[];

export interface ReportFilters {
  from: string;
  to: string;
  at: string;
  warehouseId: string;
  productId: string;
  accountId: string;
  counterpartyId: string;
  limit: string;
}

export interface ReportLookupMaps {
  products: Map<string, string>;
  warehouses: Map<string, string>;
  counterparties: Map<string, string>;
  accounts: Map<string, string>;
}

export interface ReportColumn {
  key: string;
  label: string;
  numeric?: boolean;
  tone?: "incoming" | "outgoing";
  value: (row: ReportRow, lookups: ReportLookupMaps) => string;
}

export interface ReportDefinition {
  kind: ReportKind;
  label: string;
  dateMode: "range" | "at-required" | "at-optional";
  filters: readonly ("warehouseId" | "productId" | "accountId" | "counterpartyId" | "limit")[];
  columns: readonly ReportColumn[];
}

const name = (map: Map<string, string>, id: string | null) => id ? map.get(id) ?? id : "—";
const field = (row: ReportRow, key: string) => String((row as unknown as Record<string, unknown>)[key] ?? "—");

export const reportDefinitions: readonly ReportDefinition[] = [
  {
    kind: "stock-balance",
    label: "Stock balance",
    dateMode: "at-required",
    filters: ["warehouseId", "productId"],
    columns: [
      { key: "product", label: "Product", value: (row, maps) => name(maps.products, field(row, "productId")) },
      { key: "warehouse", label: "Warehouse", value: (row, maps) => name(maps.warehouses, field(row, "warehouseId")) },
      { key: "quantity", label: "Quantity", numeric: true, value: (row) => field(row, "quantity") }
    ]
  },
  {
    kind: "stock-turnover",
    label: "Stock turnover",
    dateMode: "range",
    filters: ["warehouseId", "productId"],
    columns: [
      { key: "product", label: "Product", value: (row, maps) => name(maps.products, field(row, "productId")) },
      { key: "warehouse", label: "Warehouse", value: (row, maps) => name(maps.warehouses, field(row, "warehouseId")) },
      { key: "incoming", label: "Incoming", numeric: true, tone: "incoming", value: (row) => field(row, "incoming") },
      { key: "outgoing", label: "Outgoing", numeric: true, tone: "outgoing", value: (row) => field(row, "outgoing") }
    ]
  },
  {
    kind: "balance-at-date",
    label: "Balance at date",
    dateMode: "at-required",
    filters: ["warehouseId", "productId"],
    columns: [
      { key: "product", label: "Product", value: (row, maps) => name(maps.products, field(row, "productId")) },
      { key: "warehouse", label: "Warehouse", value: (row, maps) => name(maps.warehouses, field(row, "warehouseId")) },
      { key: "quantity", label: "Quantity", numeric: true, value: (row) => field(row, "quantity") }
    ]
  },
  {
    kind: "sales",
    label: "Sales",
    dateMode: "range",
    filters: ["counterpartyId", "productId"],
    columns: [
      { key: "date", label: "Date", value: (row) => new Date(field(row, "documentDate")).toLocaleDateString() },
      { key: "document", label: "Document", value: (row) => field(row, "documentId") },
      { key: "counterparty", label: "Counterparty", value: (row, maps) => name(maps.counterparties, field(row, "counterpartyId")) },
      { key: "product", label: "Product", value: (row, maps) => name(maps.products, field(row, "productId")) },
      { key: "quantity", label: "Quantity", numeric: true, value: (row) => field(row, "quantity") },
      { key: "amount", label: "Amount", numeric: true, value: (row) => field(row, "amount") }
    ]
  },
  {
    kind: "top-products",
    label: "Top products",
    dateMode: "range",
    filters: ["warehouseId", "limit"],
    columns: [
      { key: "product", label: "Product", value: (row, maps) => name(maps.products, field(row, "productId")) },
      { key: "quantity", label: "Quantity", numeric: true, value: (row) => field(row, "quantity") },
      { key: "amount", label: "Amount", numeric: true, value: (row) => field(row, "amount") }
    ]
  },
  {
    kind: "cashflow",
    label: "Cashflow",
    dateMode: "range",
    filters: ["accountId", "counterpartyId"],
    columns: [
      { key: "date", label: "Movement date", value: (row) => new Date(field(row, "movementDate")).toLocaleString() },
      { key: "account", label: "Account", value: (row, maps) => name(maps.accounts, field(row, "accountId")) },
      { key: "counterparty", label: "Counterparty", value: (row, maps) => name(maps.counterparties, field(row, "counterpartyId")) },
      { key: "incoming", label: "Incoming", numeric: true, tone: "incoming", value: (row) => field(row, "incoming") },
      { key: "outgoing", label: "Outgoing", numeric: true, tone: "outgoing", value: (row) => field(row, "outgoing") }
    ]
  },
  {
    kind: "counterparty-debts",
    label: "Counterparty debts",
    dateMode: "at-optional",
    filters: ["counterpartyId"],
    columns: [
      { key: "counterparty", label: "Counterparty", value: (row, maps) => name(maps.counterparties, field(row, "counterpartyId")) },
      { key: "documents", label: "Document total", numeric: true, value: (row) => field(row, "documentTotal") },
      { key: "paid", label: "Paid total", numeric: true, tone: "incoming", value: (row) => field(row, "paidTotal") },
      { key: "debt", label: "Debt total", numeric: true, tone: "outgoing", value: (row) => field(row, "debtTotal") }
    ]
  }
];

export function createReportFilters(date = new Date()): ReportFilters {
  const today = date.toISOString().slice(0, 10);
  const firstDay = `${today.slice(0, 8)}01`;

  return {
    from: firstDay,
    to: today,
    at: today,
    warehouseId: "",
    productId: "",
    accountId: "",
    counterpartyId: "",
    limit: "10"
  };
}

const startOfDay = (value: string) => new Date(`${value}T00:00:00.000Z`).toISOString();
const endOfDay = (value: string) => new Date(`${value}T23:59:59.999Z`).toISOString();

export function toReportRequest(definition: ReportDefinition, filters: ReportFilters): ReportRequest {
  const optional = Object.fromEntries(definition.filters
    .filter((key) => filters[key] !== "")
    .map((key) => [key, key === "limit" ? Number(filters[key]) : filters[key]]));

  if (definition.dateMode === "range") {
    return { from: startOfDay(filters.from), to: endOfDay(filters.to), ...optional };
  }

  return {
    ...(filters.at ? { at: endOfDay(filters.at) } : {}),
    ...optional
  };
}

export function validateReportFilters(definition: ReportDefinition, filters: ReportFilters) {
  if (definition.dateMode === "range" && (!filters.from || !filters.to || filters.from > filters.to)) {
    return "Choose a valid date range.";
  }
  if (definition.dateMode === "at-required" && !filters.at) {
    return "Choose a report date.";
  }
  if (definition.filters.includes("limit") && (!/^\d+$/.test(filters.limit) || Number(filters.limit) < 1)) {
    return "Limit must be a positive whole number.";
  }

  return "";
}
