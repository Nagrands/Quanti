import type { Payment, PaymentAllocation } from "@quanti/db";
import type { CounterpartyDebtDto, PaymentDto } from "@quanti/shared";
import { formatScaled, formatScaledFixed, MONEY_SCALE } from "../../common/fixed-point";

type PaymentRecord = Payment & { allocations: PaymentAllocation[] };

export function toPaymentDto(payment: PaymentRecord): PaymentDto {
  return {
    id: payment.id,
    number: payment.number,
    direction: payment.direction,
    status: payment.status,
    paymentDate: payment.paymentDate.toISOString(),
    amount: formatScaled(payment.amount, MONEY_SCALE),
    notes: payment.notes,
    accountId: payment.accountId,
    counterpartyId: payment.counterpartyId,
    allocations: payment.allocations.map((allocation) => ({
      documentId: allocation.documentId,
      amount: formatScaled(allocation.amount, MONEY_SCALE)
    }))
  };
}

export function toCounterpartyDebtDto(row: {
  counterpartyId: string;
  documentTotal: bigint;
  paidTotal: bigint;
  debtTotal: bigint;
}): CounterpartyDebtDto {
  return {
    counterpartyId: row.counterpartyId,
    documentTotal: formatScaledFixed(row.documentTotal, MONEY_SCALE),
    paidTotal: formatScaledFixed(row.paidTotal, MONEY_SCALE),
    debtTotal: formatScaledFixed(row.debtTotal, MONEY_SCALE)
  };
}
