import type {
  AccountDto,
  CounterpartyDebtDto,
  CounterpartyDto,
  CreatePaymentDto,
  DocumentDto,
  PaymentDto,
  UpdateDraftPaymentPatchDto
} from "@quanti/shared";

import { apiClient } from "../../api/client";

const jsonHeaders = { "Content-Type": "application/json" };

export const getPayments = () => apiClient.request<PaymentDto[]>("/payments");
export const getPaymentDebts = () => apiClient.request<CounterpartyDebtDto[]>("/payments/debts/counterparties");
export const getPaymentLookups = async () => {
  const [accounts, counterparties, documents] = await Promise.all([
    apiClient.request<AccountDto[]>("/accounts"),
    apiClient.request<CounterpartyDto[]>("/counterparties"),
    apiClient.request<DocumentDto[]>("/documents")
  ]);
  return { accounts, counterparties, documents };
};
export const createPayment = (payload: CreatePaymentDto) => apiClient.request<PaymentDto>("/payments", { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) });
export const updatePayment = (id: string, payload: UpdateDraftPaymentPatchDto) => apiClient.request<PaymentDto>(`/payments/${id}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(payload) });
export const deletePayment = (id: string) => apiClient.request<void>(`/payments/${id}`, { method: "DELETE" });
export const postPayment = (id: string) => apiClient.request<PaymentDto>(`/payments/${id}/post`, { method: "POST", headers: jsonHeaders, body: "{}" });
export const unpostPayment = (id: string) => apiClient.request<PaymentDto>(`/payments/${id}/unpost`, { method: "POST", headers: jsonHeaders, body: "{}" });
export const repostPayment = (id: string) => apiClient.request<PaymentDto>(`/payments/${id}/repost`, { method: "POST", headers: jsonHeaders, body: "{}" });
