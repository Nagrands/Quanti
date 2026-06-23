import type {
  AccountDto,
  CounterpartyDto,
  ProductCategoryDto,
  ProductDto,
  WarehouseDto
} from "@quanti/shared";
import type { Locale, Translate } from "../../i18n";

export type MasterDataEntity = ProductDto | ProductCategoryDto | WarehouseDto | CounterpartyDto | AccountDto;
export type MasterDataResource = "products" | "product-categories" | "warehouses" | "counterparties" | "accounts";
export type FormValue = string | boolean;
export type FormValues = Record<string, FormValue>;
export type MasterDataOptionMap = Partial<Record<MasterDataResource, readonly { label: string; value: string }[]>>;

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

const codeConfig: Partial<Record<MasterDataResource, { field: string; prefix: string }>> = {
  products: { field: "sku", prefix: "PRD" },
  "product-categories": { field: "code", prefix: "CAT" },
  warehouses: { field: "code", prefix: "WH" },
  counterparties: { field: "code", prefix: "CP" },
  accounts: { field: "code", prefix: "ACC" }
};

function value(entity: MasterDataEntity, key: string): string {
  const fieldValue = (entity as unknown as Record<string, unknown>)[key];
  return typeof fieldValue === "string" ? fieldValue : "";
}

function nextCode(existingValues: readonly string[], prefix: string) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedPrefix}-(\\d+)$`);
  const max = existingValues.reduce((currentMax, item) => {
    const match = pattern.exec(item);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);

  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

export function createMasterDataDefaults(
  definition: MasterDataDefinition,
  entities: readonly MasterDataEntity[]
): FormValues {
  const config = codeConfig[definition.resource];
  if (!config) {
    return definition.createDefaults;
  }

  return {
    ...definition.createDefaults,
    [config.field]: nextCode(entities.map((entity) => value(entity, config.field)), config.prefix)
  };
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
  label: "Изменено",
  render: (entity) => new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(entity.updatedAt))
};

export const masterDataDefinitions: readonly MasterDataDefinition[] = [
  {
    resource: "products",
    label: "Товары",
    singularLabel: "товар",
    searchPlaceholder: "Поиск товаров",
    columns: [
      { key: "sku", label: "SKU", render: (entity) => value(entity, "sku") },
      { key: "name", label: "Наименование", render: (entity) => entity.name },
      { key: "categoryName", label: "Категория", render: (entity) => value(entity, "categoryName") || "—" },
      { key: "unit", label: "Единица", render: (entity) => value(entity, "unit") },
      { key: "description", label: "Описание", render: (entity) => value(entity, "description") || "—" },
      updatedColumn
    ],
    fields: [
      { key: "sku", label: "SKU", required: true },
      { key: "name", label: "Наименование", required: true },
      { key: "categoryId", label: "Категория", type: "select" },
      { key: "unit", label: "Единица", required: true, placeholder: "шт, кг, л" },
      { key: "description", label: "Описание", type: "textarea" }
    ],
    createDefaults: { sku: "", name: "", categoryId: "", unit: "", description: "" },
    toFormValues: (entity) => commonFormValues(entity, ["sku", "name", "categoryId", "unit", "description"]),
    toPayload: (values) => trimPayload(values, ["categoryId", "description"])
  },
  {
    resource: "product-categories",
    label: "Категории товаров",
    singularLabel: "категорию",
    searchPlaceholder: "Поиск категорий",
    columns: [
      { key: "code", label: "Код", render: (entity) => value(entity, "code") },
      { key: "name", label: "Наименование", render: (entity) => entity.name },
      { key: "description", label: "Описание", render: (entity) => value(entity, "description") || "—" },
      updatedColumn
    ],
    fields: [
      { key: "code", label: "Код", required: true },
      { key: "name", label: "Наименование", required: true },
      { key: "description", label: "Описание", type: "textarea" }
    ],
    createDefaults: { code: "", name: "", description: "" },
    toFormValues: (entity) => commonFormValues(entity, ["code", "name", "description"]),
    toPayload: (values) => trimPayload(values, ["description"])
  },
  {
    resource: "warehouses",
    label: "Склады",
    singularLabel: "склад",
    searchPlaceholder: "Поиск складов",
    columns: [
      { key: "code", label: "Код", render: (entity) => value(entity, "code") },
      { key: "name", label: "Наименование", render: (entity) => entity.name },
      updatedColumn
    ],
    fields: [
      { key: "code", label: "Код", required: true },
      { key: "name", label: "Наименование", required: true }
    ],
    createDefaults: { code: "", name: "" },
    toFormValues: (entity) => commonFormValues(entity, ["code", "name"]),
    toPayload: trimPayload
  },
  {
    resource: "counterparties",
    label: "Контрагенты",
    singularLabel: "контрагента",
    searchPlaceholder: "Поиск контрагентов",
    columns: [
      { key: "code", label: "Код", render: (entity) => value(entity, "code") },
      { key: "name", label: "Наименование", render: (entity) => entity.name },
      { key: "type", label: "Тип", render: (entity) => ({ CUSTOMER: "Покупатель", SUPPLIER: "Поставщик", BOTH: "Покупатель и поставщик", INTERNAL: "Внутренний" })[value(entity, "type")] ?? value(entity, "type") },
      { key: "taxId", label: "ИНН", render: (entity) => value(entity, "taxId") || "—" },
      updatedColumn
    ],
    fields: [
      { key: "code", label: "Код", required: true },
      { key: "name", label: "Наименование", required: true },
      {
        key: "type",
        label: "Тип",
        type: "select",
        required: true,
        options: [
          { label: "Покупатель", value: "CUSTOMER" },
          { label: "Поставщик", value: "SUPPLIER" },
          { label: "Покупатель и поставщик", value: "BOTH" },
          { label: "Внутренний", value: "INTERNAL" }
        ]
      },
      { key: "taxId", label: "ИНН" }
    ],
    createDefaults: { code: "", name: "", type: "CUSTOMER", taxId: "" },
    toFormValues: (entity) => commonFormValues(entity, ["code", "name", "type", "taxId"]),
    toPayload: (values) => trimPayload(values, ["taxId"])
  },
  {
    resource: "accounts",
    label: "Счета",
    singularLabel: "счёт",
    searchPlaceholder: "Поиск счетов",
    columns: [
      { key: "code", label: "Код", render: (entity) => value(entity, "code") },
      { key: "name", label: "Наименование", render: (entity) => entity.name },
      { key: "type", label: "Тип", render: (entity) => value(entity, "type") === "CASH" ? "Наличные" : "Банк" },
      { key: "currencyCode", label: "Валюта", render: (entity) => value(entity, "currencyCode") },
      updatedColumn
    ],
    fields: [
      { key: "code", label: "Код", required: true },
      { key: "name", label: "Наименование", required: true },
      {
        key: "type",
        label: "Тип",
        type: "select",
        required: true,
        options: [
          { label: "Наличные", value: "CASH" },
          { label: "Банк", value: "BANK" }
        ]
      },
      { key: "currencyCode", label: "Валюта", required: true, placeholder: "RUB" }
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

export function getLocalizedMasterDataDefinitions(
  t: Translate,
  locale: Locale,
  options: MasterDataOptionMap = {}
) {
  return masterDataDefinitions.map((definition) => ({
    ...definition,
    label: t(definition.label),
    singularLabel: t(definition.singularLabel),
    searchPlaceholder: t(definition.searchPlaceholder),
    columns: definition.columns.map((column) => ({
      ...column,
      label: t(column.label),
      render: column.key === "updatedAt"
        ? (entity: MasterDataEntity) => new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
            dateStyle: "medium",
            timeStyle: "short"
          }).format(new Date(entity.updatedAt))
        : (entity: MasterDataEntity) => t(column.render(entity))
    })),
    fields: definition.fields.map((field) => ({
      ...field,
      label: t(field.label),
      placeholder: field.placeholder ? t(field.placeholder) : undefined,
      options: (field.key === "categoryId"
        ? [{ label: t("Без категории"), value: "" }, ...(options["product-categories"] ?? [])]
        : field.options
      )?.map((option) => ({ ...option, label: t(option.label) }))
    }))
  }));
}
