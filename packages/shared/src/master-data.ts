import type {
  AccountId,
  AuditFields,
  CounterpartyId,
  DecimalString,
  ProductCategoryId,
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
  units: ProductUnitDto[];
  purchasePrice: DecimalString | null;
  salePrice: DecimalString | null;
  categoryId: ProductCategoryId | null;
  categoryName: string | null;
  isActive: boolean;
}

export interface ProductUnitDto {
  id: string;
  name: string;
  conversionFactor: DecimalString;
}

export interface CreateProductUnitDto {
  name: string;
  conversionFactor: DecimalString;
}

export interface CreateProductDto {
  sku: string;
  name: string;
  description?: string | null;
  unit: string;
  purchasePrice?: DecimalString | null;
  salePrice?: DecimalString | null;
  units?: CreateProductUnitDto[];
  categoryId?: ProductCategoryId | null;
}

export interface UpdateProductDto {
  sku?: string;
  name?: string;
  description?: string | null;
  unit?: string;
  purchasePrice?: DecimalString | null;
  salePrice?: DecimalString | null;
  units?: CreateProductUnitDto[];
  categoryId?: ProductCategoryId | null;
  isActive?: boolean;
}

export interface ProductCategoryDto extends AuditFields {
  id: ProductCategoryId;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface CreateProductCategoryDto {
  code: string;
  name: string;
  description?: string | null;
}

export interface UpdateProductCategoryDto {
  code?: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
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

export interface UpdateWarehouseDto {
  code?: string;
  name?: string;
  isActive?: boolean;
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

export interface UpdateCounterpartyDto {
  code?: string;
  name?: string;
  type?: CounterpartyType;
  taxId?: string | null;
  isActive?: boolean;
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

export interface UpdateAccountDto {
  code?: string;
  name?: string;
  type?: AccountType;
  currencyCode?: string;
  isActive?: boolean;
}

export interface StockBalanceDto {
  productId: ProductId;
  warehouseId: WarehouseId;
  quantity: DecimalString;
  balanceDate: string;
}
