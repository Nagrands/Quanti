import type { Payment, PaymentAllocation } from "@quanti/db";
import type { CounterpartyDebtDto, PaymentDto } from "@quanti/shared";

type PaymentRecord = Payment & { allocations: PaymentAllocation[] };

export function toPaymentDto(payment: PaymentRecord): PaymentDto {
  return {
    id: payment.id,
    number: payment.number,
    direction: payment.direction,
    status: payment.status,
    paymentDate: payment.paymentDate.toISOString(),
    amount: payment.amount.toString(),
    notes: payment.notes,
    accountId: payment.accountId,
    counterpartyId: payment.counterpartyId,
    allocations: payment.allocations.map((allocation) => ({
      documentId: allocation.documentId,
      amount: allocation.amount.toString()
    }))
  };
}

export function toCounterpartyDebtDto(row: {
  counterpartyId: string;
  documentTotal: { toString(): string } | string | number;
  paidTotal: { toString(): string } | string | number;
  debtTotal: { toString(): string } | string | number;
}): CounterpartyDebtDto {
  return {
    counterpartyId: row.counterpartyId,
    documentTotal: row.documentTotal.toString(),
    paidTotal: row.paidTotal.toString(),
    debtTotal: row.debtTotal.toString()
  };
}
