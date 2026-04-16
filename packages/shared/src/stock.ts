import type { DecimalString, ProductId, WarehouseId } from "./identifiers";

export interface StockBalanceQueryDto {
  productId: ProductId;
  warehouseId: WarehouseId;
}

export interface StockBalanceResultDto {
  productId: ProductId;
  warehouseId: WarehouseId;
  quantity: DecimalString;
}

export interface ReserveStockRequestDto extends StockBalanceQueryDto {
  requiredQuantity: DecimalString;
}

export interface ReserveStockResultDto extends StockBalanceResultDto {
  availableQuantity: DecimalString;
  requiredQuantity: DecimalString;
  allowed: boolean;
}
