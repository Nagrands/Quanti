export const counterpartyTypes = ["CUSTOMER", "SUPPLIER", "BOTH", "INTERNAL"] as const;
export type CounterpartyType = (typeof counterpartyTypes)[number];

export const documentTypes = [
  "SALE",
  "PURCHASE",
  "TRANSFER",
  "STOCK_ADJUSTMENT",
  "RETURN_IN",
  "RETURN_OUT"
] as const;
export type DocumentType = (typeof documentTypes)[number];

export const documentStatuses = ["DRAFT", "POSTED"] as const;
export type DocumentStatus = (typeof documentStatuses)[number];

export const stockMovementDirections = ["IN", "OUT"] as const;
export type StockMovementDirection = (typeof stockMovementDirections)[number];

export const accountTypes = ["CASH", "BANK"] as const;
export type AccountType = (typeof accountTypes)[number];

export const paymentDirections = ["INCOMING", "OUTGOING"] as const;
export type PaymentDirection = (typeof paymentDirections)[number];

export const paymentStatuses = ["DRAFT", "POSTED", "CANCELLED"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const moneyMovementDirections = ["IN", "OUT"] as const;
export type MoneyMovementDirection = (typeof moneyMovementDirections)[number];

export const auditEntityTypes = [
  "PRODUCT",
  "WAREHOUSE",
  "COUNTERPARTY",
  "DOCUMENT",
  "PAYMENT",
  "ACCOUNT"
] as const;
export type AuditEntityType = (typeof auditEntityTypes)[number];

export const auditActions = ["CREATE", "UPDATE", "DELETE", "POST", "UNPOST"] as const;
export type AuditAction = (typeof auditActions)[number];
