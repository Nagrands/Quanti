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
import type { Locale, Translate } from "../../i18n";

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
    label: "Остатки на складе",
    dateMode: "at-required",
    filters: ["warehouseId", "productId"],
    columns: [
      { key: "product", label: "Товар", value: (row, maps) => name(maps.products, field(row, "productId")) },
      { key: "warehouse", label: "Склад", value: (row, maps) => name(maps.warehouses, field(row, "warehouseId")) },
      { key: "quantity", label: "Количество", numeric: true, value: (row) => field(row, "quantity") }
    ]
  },
  {
    kind: "stock-turnover",
    label: "Обороты товаров",
    dateMode: "range",
    filters: ["warehouseId", "productId"],
    columns: [
      { key: "product", label: "Товар", value: (row, maps) => name(maps.products, field(row, "productId")) },
      { key: "warehouse", label: "Склад", value: (row, maps) => name(maps.warehouses, field(row, "warehouseId")) },
      { key: "incoming", label: "Приход", numeric: true, tone: "incoming", value: (row) => field(row, "incoming") },
      { key: "outgoing", label: "Расход", numeric: true, tone: "outgoing", value: (row) => field(row, "outgoing") }
    ]
  },
  {
    kind: "balance-at-date",
    label: "Остаток на дату",
    dateMode: "at-required",
    filters: ["warehouseId", "productId"],
    columns: [
      { key: "product", label: "Товар", value: (row, maps) => name(maps.products, field(row, "productId")) },
      { key: "warehouse", label: "Склад", value: (row, maps) => name(maps.warehouses, field(row, "warehouseId")) },
      { key: "quantity", label: "Количество", numeric: true, value: (row) => field(row, "quantity") }
    ]
  },
  {
    kind: "sales",
    label: "Продажи",
    dateMode: "range",
    filters: ["counterpartyId", "productId"],
    columns: [
      { key: "date", label: "Дата", value: (row) => new Date(field(row, "documentDate")).toLocaleDateString("ru-RU") },
      { key: "document", label: "Документ", value: (row) => field(row, "documentId") },
      { key: "counterparty", label: "Контрагент", value: (row, maps) => name(maps.counterparties, field(row, "counterpartyId")) },
      { key: "product", label: "Товар", value: (row, maps) => name(maps.products, field(row, "productId")) },
      { key: "quantity", label: "Количество", numeric: true, value: (row) => field(row, "quantity") },
      { key: "amount", label: "Сумма", numeric: true, value: (row) => field(row, "amount") }
    ]
  },
  {
    kind: "top-products",
    label: "Популярные товары",
    dateMode: "range",
    filters: ["warehouseId", "limit"],
    columns: [
      { key: "product", label: "Товар", value: (row, maps) => name(maps.products, field(row, "productId")) },
      { key: "quantity", label: "Количество", numeric: true, value: (row) => field(row, "quantity") },
      { key: "amount", label: "Сумма", numeric: true, value: (row) => field(row, "amount") }
    ]
  },
  {
    kind: "cashflow",
    label: "Движение денег",
    dateMode: "range",
    filters: ["accountId", "counterpartyId"],
    columns: [
      { key: "date", label: "Дата движения", value: (row) => new Date(field(row, "movementDate")).toLocaleString("ru-RU") },
      { key: "account", label: "Счёт", value: (row, maps) => name(maps.accounts, field(row, "accountId")) },
      { key: "counterparty", label: "Контрагент", value: (row, maps) => name(maps.counterparties, field(row, "counterpartyId")) },
      { key: "incoming", label: "Приход", numeric: true, tone: "incoming", value: (row) => field(row, "incoming") },
      { key: "outgoing", label: "Расход", numeric: true, tone: "outgoing", value: (row) => field(row, "outgoing") }
    ]
  },
  {
    kind: "counterparty-debts",
    label: "Долги контрагентов",
    dateMode: "at-optional",
    filters: ["counterpartyId"],
    columns: [
      { key: "counterparty", label: "Контрагент", value: (row, maps) => name(maps.counterparties, field(row, "counterpartyId")) },
      { key: "documents", label: "Сумма документов", numeric: true, value: (row) => field(row, "documentTotal") },
      { key: "paid", label: "Оплачено", numeric: true, tone: "incoming", value: (row) => field(row, "paidTotal") },
      { key: "debt", label: "Задолженность", numeric: true, tone: "outgoing", value: (row) => field(row, "debtTotal") }
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
    return "Укажите корректный период.";
  }
  if (definition.dateMode === "at-required" && !filters.at) {
    return "Укажите дату отчёта.";
  }
  if (definition.filters.includes("limit") && (!/^\d+$/.test(filters.limit) || Number(filters.limit) < 1)) {
    return "Лимит должен быть положительным целым числом.";
  }

  return "";
}

export function getLocalizedReportDefinitions(t: Translate, locale: Locale) {
  return reportDefinitions.map((definition) => ({
    ...definition,
    label: t(definition.label),
    columns: definition.columns.map((column) => ({
      ...column,
      label: t(column.label),
      value: column.key === "date"
        ? (row: ReportRow) => new Date(field(row, definition.kind === "cashflow" ? "movementDate" : "documentDate"))
            .toLocaleString(locale === "ru" ? "ru-RU" : "en-US")
        : column.value
    }))
  }));
}
