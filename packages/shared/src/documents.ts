import type {
  CounterpartyId,
  DecimalString,
  DocumentId,
  DocumentItemId,
  IsoDateString,
  ProductId,
  WarehouseId
} from "./identifiers";
import type { DocumentStatus, DocumentType } from "./enums";

export interface DocumentItemDto {
  id: DocumentItemId;
  lineNo: number;
  productId: ProductId;
  quantity: DecimalString;
  price: DecimalString;
  amount: DecimalString;
  warehouseId: WarehouseId | null;
}

export interface DocumentDto {
  id: DocumentId;
  number: string;
  type: DocumentType;
  status: DocumentStatus;
  documentDate: IsoDateString;
  postedAt: IsoDateString | null;
  notes: string | null;
  totalAmount: DecimalString;
  warehouseId: WarehouseId | null;
  sourceWarehouseId: WarehouseId | null;
  destinationWarehouseId: WarehouseId | null;
  counterpartyId: CounterpartyId | null;
  items: DocumentItemDto[];
}

export interface CreateDocumentItemDto {
  productId: ProductId;
  quantity: DecimalString;
  price: DecimalString;
  amount: DecimalString;
  warehouseId?: WarehouseId | null;
}

export interface CreateDraftDocumentDto {
  number: string;
  type: DocumentType;
  documentDate: IsoDateString;
  notes?: string | null;
  warehouseId?: WarehouseId | null;
  sourceWarehouseId?: WarehouseId | null;
  destinationWarehouseId?: WarehouseId | null;
  counterpartyId?: CounterpartyId | null;
  items: CreateDocumentItemDto[];
}

export interface UpdateDraftDocumentDto extends CreateDraftDocumentDto {
  id: DocumentId;
}

export interface PostDocumentCommand {
  id: DocumentId;
  postedAt?: IsoDateString;
}

export interface UnpostDocumentCommand {
  id: DocumentId;
}

export interface StockMovementDto {
  productId: ProductId;
  warehouseId: WarehouseId;
  documentId: DocumentId;
  documentItemId: DocumentItemId | null;
  movementDate: IsoDateString;
  direction: "IN" | "OUT";
  quantity: DecimalString;
}
