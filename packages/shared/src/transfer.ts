import type {
  AccountType,
  CounterpartyType,
  DocumentStatus,
  DocumentType,
  PaymentDirection,
  PaymentStatus
} from "./enums";

export const transferFormat = "quanti-transfer" as const;
export const transferVersion = 1 as const;
export const transferSections = ["master-data", "documents", "payments", "report-snapshot"] as const;
export type TransferSection = (typeof transferSections)[number];

export interface TransferCategory {
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface TransferProduct {
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  units: Array<{ name: string; conversionFactor: string }>;
  categoryCode: string | null;
  isActive: boolean;
}

export interface TransferWarehouse {
  code: string;
  name: string;
  isActive: boolean;
}

export interface TransferCounterparty {
  code: string;
  name: string;
  type: CounterpartyType;
  taxId: string | null;
  isActive: boolean;
}

export interface TransferAccount {
  code: string;
  name: string;
  type: AccountType;
  currencyCode: string;
  isActive: boolean;
}

export interface MasterDataTransferPayload {
  categories: TransferCategory[];
  products: TransferProduct[];
  warehouses: TransferWarehouse[];
  counterparties: TransferCounterparty[];
  accounts: TransferAccount[];
}

export interface TransferDocument {
  number: string;
  type: DocumentType;
  status: DocumentStatus;
  documentDate: string;
  postedAt: string | null;
  notes: string | null;
  warehouseCode: string | null;
  sourceWarehouseCode: string | null;
  destinationWarehouseCode: string | null;
  counterpartyCode: string | null;
  items: Array<{
    productSku: string;
    unit: string;
    quantity: string;
    price: string;
    amount: string;
    warehouseCode: string | null;
  }>;
}

export interface DocumentsTransferPayload {
  masterData: MasterDataTransferPayload;
  documents: TransferDocument[];
}

export interface TransferPayment {
  number: string;
  direction: PaymentDirection;
  status: PaymentStatus;
  paymentDate: string;
  postedAt: string | null;
  amount: string;
  notes: string | null;
  accountCode: string;
  counterpartyCode: string | null;
  allocations: Array<{ documentNumber: string; amount: string }>;
}

export interface PaymentsTransferPayload extends DocumentsTransferPayload {
  payments: TransferPayment[];
}

export interface ReportSnapshotTransferPayload {
  kind: string;
  title: string;
  locale: "ru" | "en";
  filters: Array<{ label: string; value: string }>;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string>>;
}

export type TransferPayloadBySection = {
  "master-data": MasterDataTransferPayload;
  documents: DocumentsTransferPayload;
  payments: PaymentsTransferPayload;
  "report-snapshot": ReportSnapshotTransferPayload;
};

export interface QuantiTransferPackage<S extends TransferSection = TransferSection> {
  format: typeof transferFormat;
  version: typeof transferVersion;
  section: S;
  exportedAt: string;
  payload: TransferPayloadBySection[S];
}

export type ImportResolution = "update" | "skip";
export type ImportPreviewStatus = "new" | "conflict" | "invalid";

export interface ImportPreviewEntry {
  id: string;
  entityType: "category" | "product" | "warehouse" | "counterparty" | "account" | "document" | "payment";
  key: string;
  status: ImportPreviewStatus;
  defaultResolution: ImportResolution | null;
  message?: string;
}

export interface ImportPreviewResult {
  section: Exclude<TransferSection, "report-snapshot">;
  entries: ImportPreviewEntry[];
}

export interface ApplyImportRequest {
  package: QuantiTransferPackage<Exclude<TransferSection, "report-snapshot">>;
  resolutions: Record<string, ImportResolution>;
}

export interface ApplyImportResult {
  created: number;
  updated: number;
  skipped: number;
}

export function createTransferPackage<S extends TransferSection>(
  section: S,
  payload: TransferPayloadBySection[S],
  exportedAt = new Date().toISOString()
): QuantiTransferPackage<S> {
  return { format: transferFormat, version: transferVersion, section, exportedAt, payload };
}

export function isQuantiTransferPackage(value: unknown): value is QuantiTransferPackage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate.format === transferFormat
    && candidate.version === transferVersion
    && transferSections.includes(candidate.section as TransferSection)
    && typeof candidate.exportedAt === "string"
    && candidate.payload !== null
    && typeof candidate.payload === "object";
}
