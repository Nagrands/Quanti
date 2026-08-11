import type {
  CreateDraftDocumentDto,
  DocumentDto,
  DocumentType,
  ProductDto
} from "@quanti/shared";

export const supportedDocumentTypes = [
  "SALE",
  "PURCHASE",
  "TRANSFER",
  "RETURN_IN",
  "RETURN_OUT"
] as const satisfies readonly DocumentType[];

export interface DocumentLineForm {
  key: string;
  productId: string;
  unit: string;
  unitFactor: string;
  quantity: string;
  price: string;
  warehouseId: string;
}

export interface DocumentFormValues {
  number: string;
  type: DocumentType;
  documentDate: string;
  notes: string;
  warehouseId: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  counterpartyId: string;
  items: DocumentLineForm[];
}

export type DocumentLineSortKey = "product" | "unit" | "quantity" | "price" | "amount";
export type SortDirection = "ascending" | "descending";

const documentNumberPrefixes: Record<DocumentType, string> = {
  SALE: "SALE",
  PURCHASE: "PUR",
  TRANSFER: "TRF",
  STOCK_ADJUSTMENT: "ADJ",
  RETURN_IN: "RIN",
  RETURN_OUT: "ROUT"
};

const emptyLine = (): DocumentLineForm => ({
  key: crypto.randomUUID(),
  productId: "",
  unit: "",
  unitFactor: "1",
  quantity: "1",
  price: "0",
  warehouseId: ""
});

export function createEmptyDocument(number = ""): DocumentFormValues {
  return {
    number,
    type: "SALE",
    documentDate: new Date().toISOString().slice(0, 10),
    notes: "",
    warehouseId: "",
    sourceWarehouseId: "",
    destinationWarehouseId: "",
    counterpartyId: "",
    items: [emptyLine()]
  };
}

export function createImportedPurchase(
  rows: Array<{ productId: string; quantity: string; unit: string }>,
  products: ProductDto[],
  documents: readonly Pick<DocumentDto, "number">[]
): DocumentFormValues {
  return {
    ...createEmptyDocument(createDocumentNumber("PURCHASE", documents)),
    type: "PURCHASE",
    items: rows.map((row) => {
      const product = products.find((candidate) => candidate.id === row.productId);
      const alternative = product?.units.find((unit) => unit.name === row.unit);
      return {
        key: crypto.randomUUID(),
        productId: row.productId,
        unit: row.unit,
        unitFactor: row.unit === product?.unit ? "1" : alternative?.conversionFactor ?? "1",
        quantity: row.quantity,
        price: product ? productUnitPrice(product, "PURCHASE", row.unit) : "0",
        warehouseId: ""
      };
    })
  };
}

function nextSequence(existingValues: readonly string[], prefix: string) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedPrefix}-(\\d{4})$`);
  const max = existingValues.reduce((currentMax, value) => {
    const match = pattern.exec(value);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);

  return String(max + 1).padStart(4, "0");
}

export function createDocumentNumber(
  type: DocumentType,
  existingDocuments: readonly Pick<DocumentDto, "number">[],
  date = new Date()
) {
  const month = date.toISOString().slice(0, 7).replace("-", "");
  const prefix = `${documentNumberPrefixes[type]}-${month}`;
  return `${prefix}-${nextSequence(existingDocuments.map((document) => document.number), prefix)}`;
}

export function documentToForm(document: DocumentDto): DocumentFormValues {
  return {
    number: document.number,
    type: document.type,
    documentDate: document.documentDate.slice(0, 10),
    notes: document.notes ?? "",
    warehouseId: document.warehouseId ?? "",
    sourceWarehouseId: document.sourceWarehouseId ?? "",
    destinationWarehouseId: document.destinationWarehouseId ?? "",
    counterpartyId: document.counterpartyId ?? "",
    items: document.items.map((item) => ({
      key: item.id,
      productId: item.productId,
      unit: item.unit,
      unitFactor: item.unitFactor,
      quantity: item.quantity,
      price: item.price,
      warehouseId: item.warehouseId ?? ""
    }))
  };
}

export function calculateAmount(quantity: string, price: string) {
  const quantityValue = Number(quantity);
  const priceValue = Number(price);
  return Number.isFinite(quantityValue) && Number.isFinite(priceValue)
    ? (quantityValue * priceValue).toFixed(2)
    : "0.00";
}

export function calculateTotal(items: DocumentLineForm[]) {
  return items.reduce((total, item) => total + Number(calculateAmount(item.quantity, item.price)), 0);
}

export function sortDocumentLines(
  items: DocumentLineForm[],
  products: ProductDto[],
  key: DocumentLineSortKey,
  direction: SortDirection
) {
  const collator = new Intl.Collator("ru-RU", { numeric: true, sensitivity: "base" });
  const productById = new Map(products.map((product) => [product.id, product]));
  const numericValue = (item: DocumentLineForm) => {
    const raw = key === "quantity" ? item.quantity
      : key === "price" ? item.price
        : calculateAmount(item.quantity, item.price);
    if (raw.trim() === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };
  const stringValue = (item: DocumentLineForm) => {
    if (key === "unit") return item.unit.trim() || null;
    const product = productById.get(item.productId);
    return product ? [product.name, product.sku] as const : null;
  };

  return items.map((item, index) => ({ item, index })).sort((left, right) => {
    const leftValue = ["quantity", "price", "amount"].includes(key) ? numericValue(left.item) : stringValue(left.item);
    const rightValue = ["quantity", "price", "amount"].includes(key) ? numericValue(right.item) : stringValue(right.item);
    if (leftValue === null) return rightValue === null ? left.index - right.index : 1;
    if (rightValue === null) return -1;
    let compared: number;
    if (typeof leftValue === "number" && typeof rightValue === "number") compared = leftValue - rightValue;
    else if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
      compared = collator.compare(leftValue[0], rightValue[0]) || collator.compare(leftValue[1], rightValue[1]);
    } else compared = collator.compare(String(leftValue), String(rightValue));
    return compared === 0 ? left.index - right.index : direction === "ascending" ? compared : -compared;
  }).map(({ item }) => item);
}

export function toDocumentPayload(values: DocumentFormValues): CreateDraftDocumentDto {
  return {
    number: values.number.trim(),
    type: values.type,
    documentDate: new Date(`${values.documentDate}T00:00:00.000Z`).toISOString(),
    notes: values.notes.trim() || null,
    warehouseId: values.warehouseId || null,
    sourceWarehouseId: values.sourceWarehouseId || null,
    destinationWarehouseId: values.destinationWarehouseId || null,
    counterpartyId: values.counterpartyId || null,
    items: values.items.map((item) => ({
      productId: item.productId,
      unit: item.unit,
      quantity: Number(item.quantity).toFixed(3),
      price: Number(item.price).toFixed(2),
      amount: calculateAmount(item.quantity, item.price),
      warehouseId: item.warehouseId || null
    }))
  };
}

export function addDocumentLine(items: DocumentLineForm[]) {
  return [...items, emptyLine()];
}

export function referencePrice(product: ProductDto, type: DocumentType) {
  if (type === "SALE" || type === "RETURN_IN") {
    return product.salePrice ?? "0";
  }

  if (type === "PURCHASE" || type === "RETURN_OUT") {
    return product.purchasePrice ?? "0";
  }

  return "0";
}

export function productUnitPrice(product: ProductDto, type: DocumentType, unit: string) {
  const factor = unit === product.unit
    ? 1
    : Number(product.units.find((candidate) => candidate.name === unit)?.conversionFactor ?? 1);
  return (Number(referencePrice(product, type)) * factor).toFixed(2);
}
