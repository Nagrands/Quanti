import type {
  CreateDraftDocumentDto,
  DocumentDto,
  DocumentType
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

function nextSequence(existingValues: readonly string[], prefix: string) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedPrefix}-(\\d{6})-(\\d{4})$`);
  const max = existingValues.reduce((currentMax, value) => {
    const match = pattern.exec(value);
    return match ? Math.max(currentMax, Number(match[2])) : currentMax;
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
