export type EntityId = string;
export type ProductId = EntityId;
export type WarehouseId = EntityId;
export type CounterpartyId = EntityId;
export type DocumentId = EntityId;
export type DocumentItemId = EntityId;
export type AccountId = EntityId;
export type PaymentId = EntityId;

export type IsoDateString = string;
export type DecimalString = string;

export interface AuditFields {
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
