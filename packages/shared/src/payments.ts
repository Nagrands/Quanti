import type {
  AccountId,
  CounterpartyId,
  DecimalString,
  DocumentId,
  IsoDateString,
  PaymentId
} from "./identifiers";
import type {
  MoneyMovementDirection,
  PaymentDirection,
  PaymentStatus
} from "./enums";

export interface PaymentAllocationDto {
  documentId: DocumentId;
  amount: DecimalString;
}

export interface PaymentDto {
  id: PaymentId;
  number: string;
  direction: PaymentDirection;
  status: PaymentStatus;
  paymentDate: IsoDateString;
  amount: DecimalString;
  notes: string | null;
  accountId: AccountId;
  counterpartyId: CounterpartyId | null;
  allocations: PaymentAllocationDto[];
}

export interface CreatePaymentDto {
  number: string;
  direction: PaymentDirection;
  paymentDate: IsoDateString;
  amount: DecimalString;
  accountId: AccountId;
  counterpartyId?: CounterpartyId | null;
  notes?: string | null;
  allocations?: PaymentAllocationDto[];
}

export interface UpdateDraftPaymentPatchDto {
  number?: string;
  direction?: PaymentDirection;
  paymentDate?: IsoDateString;
  amount?: DecimalString;
  accountId?: AccountId;
  counterpartyId?: CounterpartyId | null;
  notes?: string | null;
  allocations?: PaymentAllocationDto[];
}

export interface PostPaymentCommand {
  id: PaymentId;
}

export interface RepostPaymentCommand {
  id: PaymentId;
}

export interface MoneyMovementDto {
  paymentId: PaymentId;
  accountId: AccountId;
  counterpartyId: CounterpartyId | null;
  movementDate: IsoDateString;
  direction: MoneyMovementDirection;
  amount: DecimalString;
}

export interface CounterpartyDebtDto {
  counterpartyId: CounterpartyId;
  documentTotal: DecimalString;
  paidTotal: DecimalString;
  debtTotal: DecimalString;
}
