import type { Document, DocumentItem } from "@quanti/db";
import type { DocumentDto } from "@quanti/shared";

const toIso = (value: Date | null) => value?.toISOString() ?? null;

export function toDocumentDto(
  document: Document & { items: DocumentItem[] }
): DocumentDto {
  return {
    id: document.id,
    number: document.number,
    type: document.type,
    status: document.status,
    documentDate: document.documentDate.toISOString(),
    postedAt: toIso(document.postedAt),
    notes: document.notes,
    totalAmount: document.totalAmount.toString(),
    warehouseId: document.warehouseId,
    sourceWarehouseId: document.sourceWarehouseId,
    destinationWarehouseId: document.destinationWarehouseId,
    counterpartyId: document.counterpartyId,
    items: document.items.map((item) => ({
      id: item.id,
      lineNo: item.lineNo,
      productId: item.productId,
      unit: item.unit,
      unitFactor: item.unitFactor.toString(),
      quantity: item.quantity.toString(),
      price: item.price.toString(),
      amount: item.amount.toString(),
      warehouseId: item.warehouseId
    }))
  };
}
