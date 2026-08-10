import type { CreatePaymentDto, PaymentDirection, PaymentDto } from "@quanti/shared";

export interface AllocationForm { key: string; documentId: string; amount: string }
export interface PaymentFormValues {
  number: string; direction: PaymentDirection; paymentDate: string; amount: string;
  accountId: string; counterpartyId: string; notes: string; allocations: AllocationForm[];
}

export const emptyAllocation = (): AllocationForm => ({ key: crypto.randomUUID(), documentId: "", amount: "0" });
export function createPaymentNumber(
  existingPayments: readonly Pick<PaymentDto, "number">[],
  paymentDate: string
) {
  const month = paymentDate.slice(0, 7).replace("-", "");
  const prefix = `PAY-${month}`;
  const pattern = new RegExp(`^${prefix}-(\\d{4})$`);
  const maxSequence = existingPayments.reduce((currentMax, payment) => {
    const match = pattern.exec(payment.number);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);

  return `${prefix}-${String(maxSequence + 1).padStart(4, "0")}`;
}

export const createEmptyPayment = (existingPayments: readonly Pick<PaymentDto, "number">[] = []): PaymentFormValues => {
  const paymentDate = new Date().toISOString().slice(0, 10);
  return {
    number: createPaymentNumber(existingPayments, paymentDate), direction: "INCOMING", paymentDate,
    amount: "0", accountId: "", counterpartyId: "", notes: "", allocations: []
  };
};
export const paymentToForm = (payment: PaymentDto): PaymentFormValues => ({
  number: payment.number, direction: payment.direction, paymentDate: payment.paymentDate.slice(0, 10),
  amount: payment.amount, accountId: payment.accountId, counterpartyId: payment.counterpartyId ?? "",
  notes: payment.notes ?? "", allocations: payment.allocations.map((allocation) => ({ key: allocation.documentId, ...allocation }))
});
export const allocatedTotal = (values: PaymentFormValues) => values.allocations.reduce((sum, allocation) => sum + (Number(allocation.amount) || 0), 0);
export const toPaymentPayload = (values: PaymentFormValues): CreatePaymentDto => ({
  number: values.number.trim(), direction: values.direction,
  paymentDate: new Date(`${values.paymentDate}T00:00:00.000Z`).toISOString(),
  amount: Number(values.amount).toFixed(2), accountId: values.accountId,
  counterpartyId: values.counterpartyId || null, notes: values.notes.trim() || null,
  allocations: values.allocations.map(({ documentId, amount }) => ({ documentId, amount: Number(amount).toFixed(2) }))
});
