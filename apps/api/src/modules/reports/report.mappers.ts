import type {
  CashflowReportRowDto,
  CounterpartyDebtReportRowDto,
  SalesReportRowDto,
  StockBalanceReportRowDto,
  StockTurnoverReportRowDto,
  TopProductsReportRowDto
} from "@quanti/shared";
import { formatScaledFixed, MONEY_SCALE, QUANTITY_SCALE } from "../../common/fixed-point";

type Scaled = bigint;
type Dateish = Date | string;

function iso(value: Dateish) {
  return value instanceof Date ? value.toISOString() : value;
}

export function toStockBalanceRowDto(row: {
  productId: string;
  warehouseId: string;
  quantity: Scaled;
}): StockBalanceReportRowDto {
  return {
    productId: row.productId,
    warehouseId: row.warehouseId,
    quantity: formatScaledFixed(row.quantity, QUANTITY_SCALE)
  };
}

export function toStockTurnoverRowDto(row: {
  productId: string;
  warehouseId: string;
  incoming: Scaled;
  outgoing: Scaled;
}): StockTurnoverReportRowDto {
  return {
    productId: row.productId,
    warehouseId: row.warehouseId,
    incoming: formatScaledFixed(row.incoming, QUANTITY_SCALE),
    outgoing: formatScaledFixed(row.outgoing, QUANTITY_SCALE)
  };
}

export function toCashflowRowDto(row: {
  movementDate: Dateish;
  accountId: string;
  counterpartyId: string | null;
  incoming: Scaled;
  outgoing: Scaled;
}): CashflowReportRowDto {
  return {
    movementDate: iso(row.movementDate),
    accountId: row.accountId,
    counterpartyId: row.counterpartyId,
    incoming: formatScaledFixed(row.incoming, MONEY_SCALE),
    outgoing: formatScaledFixed(row.outgoing, MONEY_SCALE)
  };
}

export function toSalesReportRowDto(row: {
  documentId: string;
  documentDate: Dateish;
  counterpartyId: string | null;
  productId: string;
  quantity: Scaled;
  amount: Scaled;
}): SalesReportRowDto {
  return {
    documentId: row.documentId,
    documentDate: iso(row.documentDate),
    counterpartyId: row.counterpartyId,
    productId: row.productId,
    quantity: formatScaledFixed(row.quantity, QUANTITY_SCALE),
    amount: formatScaledFixed(row.amount, MONEY_SCALE)
  };
}

export function toTopProductsReportRowDto(row: {
  productId: string;
  quantity: Scaled;
  amount: Scaled;
}): TopProductsReportRowDto {
  return {
    productId: row.productId,
    quantity: formatScaledFixed(row.quantity, QUANTITY_SCALE),
    amount: formatScaledFixed(row.amount, MONEY_SCALE)
  };
}

export function toCounterpartyDebtReportRowDto(row: {
  counterpartyId: string;
  documentTotal: Scaled;
  paidTotal: Scaled;
  debtTotal: Scaled;
}): CounterpartyDebtReportRowDto {
  return {
    counterpartyId: row.counterpartyId,
    documentTotal: formatScaledFixed(row.documentTotal, MONEY_SCALE),
    paidTotal: formatScaledFixed(row.paidTotal, MONEY_SCALE),
    debtTotal: formatScaledFixed(row.debtTotal, MONEY_SCALE)
  };
}
