import type { Account, Counterparty, Product, ProductCategory, ProductUnit, Warehouse } from "@quanti/db";
import type { AccountDto, CounterpartyDto, ProductCategoryDto, ProductDto, WarehouseDto } from "@quanti/shared";

const toIso = (value: Date) => value.toISOString();

type ProductRecord = Product & {
  category?: ProductCategory | null;
  units?: ProductUnit[];
};

export function toProductDto(record: ProductRecord): ProductDto {
  return {
    id: record.id,
    sku: record.sku,
    name: record.name,
    description: record.description,
    unit: record.unit,
    units: (record.units ?? []).map((unit) => ({
      id: unit.id,
      name: unit.name,
      conversionFactor: unit.conversionFactor.toString()
    })),
    purchasePrice: record.purchasePrice?.toString() ?? null,
    salePrice: record.salePrice?.toString() ?? null,
    categoryId: record.categoryId,
    categoryName: record.category?.name ?? null,
    isActive: record.isActive,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt)
  };
}

export function toProductCategoryDto(record: ProductCategory): ProductCategoryDto {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    isActive: record.isActive,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt)
  };
}

export function toWarehouseDto(record: Warehouse): WarehouseDto {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    isActive: record.isActive,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt)
  };
}

export function toCounterpartyDto(record: Counterparty): CounterpartyDto {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    type: record.type,
    taxId: record.taxId,
    isActive: record.isActive,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt)
  };
}

export function toAccountDto(record: Account): AccountDto {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    type: record.type,
    currencyCode: record.currencyCode,
    isActive: record.isActive,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt)
  };
}
