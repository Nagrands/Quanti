import type {
  AccountDto,
  CounterpartyDto,
  ProductDto,
  WarehouseDto
} from "@quanti/shared";

export type MasterDataEntity = ProductDto | WarehouseDto | CounterpartyDto | AccountDto;
export type MasterDataResource = "products" | "warehouses" | "counterparties" | "accounts";
export type FormValue = string | boolean;
export type FormValues = Record<string, FormValue>;

export interface MasterDataColumn {
  key: string;
  label: string;
  render: (entity: MasterDataEntity) => string;
}

export interface MasterDataField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select";
  required?: boolean;
  options?: readonly { label: string; value: string }[];
  placeholder?: string;
}

export interface MasterDataDefinition {
  resource: MasterDataResource;
  label: string;
  singularLabel: string;
  searchPlaceholder: string;
  columns: readonly MasterDataColumn[];
  fields: readonly MasterDataField[];
  createDefaults: FormValues;
  toFormValues: (entity: MasterDataEntity) => FormValues;
  toPayload: (values: FormValues) => Record<string, unknown>;
}

function value(entity: MasterDataEntity, key: string): string {
  const fieldValue = (entity as unknown as Record<string, unknown>)[key];
  return typeof fieldValue === "string" ? fieldValue : "";
}

function commonFormValues(entity: MasterDataEntity, keys: readonly string[]): FormValues {
  return Object.fromEntries(keys.map((key) => [key, value(entity, key)]));
}

function trimPayload(values: FormValues, nullableKeys: readonly string[] = []) {
  return Object.fromEntries(
    Object.entries(values).map(([key, fieldValue]) => {
      if (typeof fieldValue !== "string") {
        return [key, fieldValue];
      }

      const trimmedValue = fieldValue.trim();
      return [key, nullableKeys.includes(key) && trimmedValue === "" ? null : trimmedValue];
    })
  );
}

const updatedColumn: MasterDataColumn = {
  key: "updatedAt",
  label: "Updated",
  render: (entity) => new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(entity.updatedAt))
};

export const masterDataDefinitions: readonly MasterDataDefinition[] = [
  {
    resource: "products",
    label: "Products",
    singularLabel: "product",
    searchPlaceholder: "Search products",
    columns: [
      { key: "sku", label: "SKU", render: (entity) => value(entity, "sku") },
      { key: "name", label: "Name", render: (entity) => entity.name },
      { key: "unit", label: "Unit", render: (entity) => value(entity, "unit") },
      { key: "description", label: "Description", render: (entity) => value(entity, "description") || "—" },
      updatedColumn
    ],
    fields: [
      { key: "sku", label: "SKU", required: true },
      { key: "name", label: "Name", required: true },
      { key: "unit", label: "Unit", required: true, placeholder: "pcs, kg, l" },
      { key: "description", label: "Description", type: "textarea" }
    ],
    createDefaults: { sku: "", name: "", unit: "", description: "" },
    toFormValues: (entity) => commonFormValues(entity, ["sku", "name", "unit", "description"]),
    toPayload: (values) => trimPayload(values, ["description"])
  },
  {
    resource: "warehouses",
    label: "Warehouses",
    singularLabel: "warehouse",
    searchPlaceholder: "Search warehouses",
    columns: [
      { key: "code", label: "Code", render: (entity) => value(entity, "code") },
      { key: "name", label: "Name", render: (entity) => entity.name },
      updatedColumn
    ],
    fields: [
      { key: "code", label: "Code", required: true },
      { key: "name", label: "Name", required: true }
    ],
    createDefaults: { code: "", name: "" },
    toFormValues: (entity) => commonFormValues(entity, ["code", "name"]),
    toPayload: trimPayload
  },
  {
    resource: "counterparties",
    label: "Counterparties",
    singularLabel: "counterparty",
    searchPlaceholder: "Search counterparties",
    columns: [
      { key: "code", label: "Code", render: (entity) => value(entity, "code") },
      { key: "name", label: "Name", render: (entity) => entity.name },
      { key: "type", label: "Type", render: (entity) => value(entity, "type") },
      { key: "taxId", label: "Tax ID", render: (entity) => value(entity, "taxId") || "—" },
      updatedColumn
    ],
    fields: [
      { key: "code", label: "Code", required: true },
      { key: "name", label: "Name", required: true },
      {
        key: "type",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { label: "Customer", value: "CUSTOMER" },
          { label: "Supplier", value: "SUPPLIER" },
          { label: "Customer and supplier", value: "BOTH" },
          { label: "Internal", value: "INTERNAL" }
        ]
      },
      { key: "taxId", label: "Tax ID" }
    ],
    createDefaults: { code: "", name: "", type: "CUSTOMER", taxId: "" },
    toFormValues: (entity) => commonFormValues(entity, ["code", "name", "type", "taxId"]),
    toPayload: (values) => trimPayload(values, ["taxId"])
  },
  {
    resource: "accounts",
    label: "Accounts",
    singularLabel: "account",
    searchPlaceholder: "Search accounts",
    columns: [
      { key: "code", label: "Code", render: (entity) => value(entity, "code") },
      { key: "name", label: "Name", render: (entity) => entity.name },
      { key: "type", label: "Type", render: (entity) => value(entity, "type") },
      { key: "currencyCode", label: "Currency", render: (entity) => value(entity, "currencyCode") },
      updatedColumn
    ],
    fields: [
      { key: "code", label: "Code", required: true },
      { key: "name", label: "Name", required: true },
      {
        key: "type",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { label: "Cash", value: "CASH" },
          { label: "Bank", value: "BANK" }
        ]
      },
      { key: "currencyCode", label: "Currency", required: true, placeholder: "RUB" }
    ],
    createDefaults: { code: "", name: "", type: "CASH", currencyCode: "RUB" },
    toFormValues: (entity) => commonFormValues(entity, ["code", "name", "type", "currencyCode"]),
    toPayload: (values) => ({
      ...trimPayload(values),
      currencyCode: String(values.currencyCode).trim().toUpperCase()
    })
  }
];

export function getMasterDataDefinition(resource: MasterDataResource) {
  return masterDataDefinitions.find((definition) => definition.resource === resource)
    ?? masterDataDefinitions[0];
}
