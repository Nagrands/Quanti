import type {
  CounterpartyDebtDto,
  CounterpartyDto,
  DocumentDto,
  PaymentDto,
  ProductDto,
  StockBalanceReportRowDto,
  WarehouseDto
} from "@quanti/shared";

import { getDocuments } from "../documents/documents-api";
import { getPaymentDebts, getPayments } from "../payments/payments-api";
import { getReport, getReportLookups } from "../reports/reports-api";

export interface DashboardData {
  documents: DocumentDto[];
  payments: PaymentDto[];
  debts: CounterpartyDebtDto[];
  stockRows: StockBalanceReportRowDto[];
  products: ProductDto[];
  warehouses: WarehouseDto[];
  counterparties: CounterpartyDto[];
}

export async function getDashboardData(at = new Date()): Promise<DashboardData> {
  const atIso = new Date(`${at.toISOString().slice(0, 10)}T23:59:59.999Z`).toISOString();
  const [documents, payments, debts, stockRows, lookups] = await Promise.all([
    getDocuments(),
    getPayments(),
    getPaymentDebts(),
    getReport("stock-balance", { at: atIso }) as Promise<StockBalanceReportRowDto[]>,
    getReportLookups()
  ]);

  return {
    documents,
    payments,
    debts,
    stockRows,
    products: lookups.products,
    warehouses: lookups.warehouses,
    counterparties: lookups.counterparties
  };
}
