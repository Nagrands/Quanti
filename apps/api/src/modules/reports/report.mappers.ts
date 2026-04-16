import type {
  CashflowReportRowDto,
  CounterpartyDebtReportRowDto,
  SalesReportRowDto,
  StockBalanceReportRowDto,
  StockTurnoverReportRowDto,
  TopProductsReportRowDto
} from "@quanti/shared";

type Decimalish = { toString(): string } | string | number;
type Dateish = Date | string;

function decimal(value: Decimalish) {
  return value.toString();
}

function iso(value: Dateish) {
  return value instanceof Date ? value.toISOString() : value;
}

export function toStockBalanceRowDto(row: {
  productId: string;
  warehouseId: string;
  quantity: Decimalish;
}): StockBalanceReportRowDto {
  return {
    productId: row.productId,
    warehouseId: row.warehouseId,
    quantity: decimal(row.quantity)
  };
}

export function toStockTurnoverRowDto(row: {
  productId: string;
  warehouseId: string;
  incoming: Decimalish;
  outgoing: Decimalish;
}): StockTurnoverReportRowDto {
  return {
    productId: row.productId,
    warehouseId: row.warehouseId,
    incoming: decimal(row.incoming),
    outgoing: decimal(row.outgoing)
  };
}

export function toCashflowRowDto(row: {
  movementDate: Dateish;
  accountId: string;
  counterpartyId: string | null;
  incoming: Decimalish;
  outgoing: Decimalish;
}): CashflowReportRowDto {
  return {
    movementDate: iso(row.movementDate),
    accountId: row.accountId,
    counterpartyId: row.counterpartyId,
    incoming: decimal(row.incoming),
    outgoing: decimal(row.outgoing)
  };
}

export function toSalesReportRowDto(row: {
  documentId: string;
  documentDate: Dateish;
  counterpartyId: string | null;
  productId: string;
  quantity: Decimalish;
  amount: Decimalish;
}): SalesReportRowDto {
  return {
    documentId: row.documentId,
    documentDate: iso(row.documentDate),
    counterpartyId: row.counterpartyId,
    productId: row.productId,
    quantity: decimal(row.quantity),
    amount: decimal(row.amount)
  };
}

export function toTopProductsReportRowDto(row: {
  productId: string;
  quantity: Decimalish;
  amount: Decimalish;
}): TopProductsReportRowDto {
  return {
    productId: row.productId,
    quantity: decimal(row.quantity),
    amount: decimal(row.amount)
  };
}

export function toCounterpartyDebtReportRowDto(row: {
  counterpartyId: string;
  documentTotal: Decimalish;
  paidTotal: Decimalish;
  debtTotal: Decimalish;
}): CounterpartyDebtReportRowDto {
  return {
    counterpartyId: row.counterpartyId,
    documentTotal: decimal(row.documentTotal),
    paidTotal: decimal(row.paidTotal),
    debtTotal: decimal(row.debtTotal)
  };
}
