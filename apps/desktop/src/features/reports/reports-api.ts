import type {
  AccountDto,
  CounterpartyDto,
  ProductDto,
  WarehouseDto
} from "@quanti/shared";

import { apiClient } from "../../api/client";
import type { ReportKind, ReportRequest, ReportRows } from "./reports-model";

function queryString(filter: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

function reportPath(kind: ReportKind, filter: ReportRequest) {
  const paths: Record<ReportKind, string> = {
    "stock-balance": "stock-balance",
    "stock-turnover": "stock-turnover",
    "balance-at-date": "balance-at-date",
    sales: "sales",
    "top-products": "top-products",
    cashflow: "cashflow",
    "counterparty-debts": "counterparty-debts"
  };
  const query = queryString(filter as unknown as Record<string, string | number | undefined>);

  return `/reports/${paths[kind]}?${query}`;
}

export function getReport(kind: ReportKind, filter: ReportRequest): Promise<ReportRows> {
  return apiClient.request<ReportRows>(reportPath(kind, filter));
}

export async function getReportLookups() {
  const [products, warehouses, counterparties, accounts] = await Promise.all([
    apiClient.request<ProductDto[]>("/products"),
    apiClient.request<WarehouseDto[]>("/warehouses"),
    apiClient.request<CounterpartyDto[]>("/counterparties"),
    apiClient.request<AccountDto[]>("/accounts")
  ]);

  return { products, warehouses, counterparties, accounts };
}
