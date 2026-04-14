import type {
  CounterpartyId,
  DecimalString,
  IsoDateString,
  ProductId,
  WarehouseId
} from "./identifiers";

export interface DateRangeDto {
  from: IsoDateString;
  to: IsoDateString;
}

export interface StockBalanceReportFilterDto {
  at: IsoDateString;
  warehouseId?: WarehouseId;
  productId?: ProductId;
}

export interface StockTurnoverReportFilterDto extends DateRangeDto {
  warehouseId?: WarehouseId;
  productId?: ProductId;
}

export interface CashflowReportFilterDto extends DateRangeDto {
  accountId?: string;
  counterpartyId?: CounterpartyId;
}

export interface StockBalanceReportRowDto {
  productId: ProductId;
  warehouseId: WarehouseId;
  quantity: DecimalString;
}

export interface StockTurnoverReportRowDto {
  productId: ProductId;
  warehouseId: WarehouseId;
  incoming: DecimalString;
  outgoing: DecimalString;
}

export interface CashflowReportRowDto {
  movementDate: IsoDateString;
  accountId: string;
  counterpartyId: CounterpartyId | null;
  incoming: DecimalString;
  outgoing: DecimalString;
}
