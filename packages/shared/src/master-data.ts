import type {
  AccountId,
  AuditFields,
  CounterpartyId,
  DecimalString,
  ProductId,
  WarehouseId
} from "./identifiers";
import type { AccountType, CounterpartyType } from "./enums";

export interface ProductDto extends AuditFields {
  id: ProductId;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  isActive: boolean;
}

export interface CreateProductDto {
  sku: string;
  name: string;
  description?: string | null;
  unit: string;
}

export interface WarehouseDto extends AuditFields {
  id: WarehouseId;
  code: string;
  name: string;
  isActive: boolean;
}

export interface CreateWarehouseDto {
  code: string;
  name: string;
}

export interface CounterpartyDto extends AuditFields {
  id: CounterpartyId;
  code: string;
  name: string;
  type: CounterpartyType;
  taxId: string | null;
  isActive: boolean;
}

export interface CreateCounterpartyDto {
  code: string;
  name: string;
  type: CounterpartyType;
  taxId?: string | null;
}

export interface AccountDto extends AuditFields {
  id: AccountId;
  code: string;
  name: string;
  type: AccountType;
  currencyCode: string;
  isActive: boolean;
}

export interface CreateAccountDto {
  code: string;
  name: string;
  type: AccountType;
  currencyCode?: string;
}

export interface StockBalanceDto {
  productId: ProductId;
  warehouseId: WarehouseId;
  quantity: DecimalString;
  balanceDate: string;
}
