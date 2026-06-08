import type { DecimalString, DocumentId, IsoDateString } from "./identifiers";
import type { DocumentStatus, DocumentType } from "./enums";

export const printTemplateScopes = ["DOCUMENT"] as const;
export type PrintTemplateScope = (typeof printTemplateScopes)[number];

export interface DocumentPrintRequestDto {
  templateVersion?: number;
}

export interface DocumentPrintLineDto {
  lineNo: number;
  sku: string;
  productName: string;
  unit: string;
  quantity: DecimalString;
  price: DecimalString;
  amount: DecimalString;
}

export interface DocumentPrintDataDto {
  documentId: DocumentId;
  number: string;
  type: DocumentType;
  status: DocumentStatus;
  documentDate: IsoDateString;
  counterpartyName: string | null;
  warehouseName: string | null;
  sourceWarehouseName: string | null;
  destinationWarehouseName: string | null;
  notes: string | null;
  totalAmount: DecimalString;
  items: DocumentPrintLineDto[];
  branding: {
    companyName: string;
    documentTitle: string;
  };
}
