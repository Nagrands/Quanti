import type { Account, Counterparty, Product, Warehouse } from "@quanti/db";
import type { AccountDto, CounterpartyDto, ProductDto, WarehouseDto } from "@quanti/shared";

const toIso = (value: Date) => value.toISOString();

export function toProductDto(record: Product): ProductDto {
  return {
    id: record.id,
    sku: record.sku,
    name: record.name,
    description: record.description,
    unit: record.unit,
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
