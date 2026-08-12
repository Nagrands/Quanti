import type { Document, DocumentItem } from "@quanti/db";
import type { DocumentDto } from "@quanti/shared";
import { FACTOR_SCALE, formatScaled, MONEY_SCALE, QUANTITY_SCALE } from "../../common/fixed-point";

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
    totalAmount: formatScaled(document.totalAmount, MONEY_SCALE),
    warehouseId: document.warehouseId,
    sourceWarehouseId: document.sourceWarehouseId,
    destinationWarehouseId: document.destinationWarehouseId,
    counterpartyId: document.counterpartyId,
    items: document.items.map((item) => ({
      id: item.id,
      lineNo: item.lineNo,
      productId: item.productId,
      unit: item.unit,
      unitFactor: formatScaled(item.unitFactor, FACTOR_SCALE),
      quantity: formatScaled(item.quantity, QUANTITY_SCALE),
      price: formatScaled(item.price, MONEY_SCALE),
      amount: formatScaled(item.amount, MONEY_SCALE),
      warehouseId: item.warehouseId
    }))
  };
}
