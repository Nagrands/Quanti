import type { AccountDto, CounterpartyDebtDto, CounterpartyDto, DocumentDto, PaymentDto } from "@quanti/shared";
import { Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { allocatedTotal, createEmptyPayment, createPaymentNumber, emptyAllocation, paymentToForm, type PaymentFormValues } from "./payment-model";

interface Props {
  payment: PaymentDto | null; accounts: AccountDto[]; counterparties: CounterpartyDto[];
  documents: DocumentDto[]; payments: PaymentDto[]; debts: CounterpartyDebtDto[]; isSaving: boolean;
  onClose: () => void; onSave: (values: PaymentFormValues) => Promise<void>;
}

export function PaymentDrawer({ payment, accounts, counterparties, documents, payments, debts, isSaving, onClose, onSave }: Props) {
  const { formatApiError, paymentStatusLabels, t } = useI18n();
  const [values, setValues] = useState<PaymentFormValues>(createEmptyPayment);
  const [error, setError] = useState("");
  const readOnly = payment?.status !== undefined && payment.status !== "DRAFT";
  useEffect(() => { setValues(payment ? paymentToForm(payment) : createEmptyPayment(payments)); setError(""); }, [payment]);
  const allocated = allocatedTotal(values);
  const unallocated = Number(values.amount || 0) - allocated;
  const debt = debts.find((item) => item.counterpartyId === values.counterpartyId);
  const availableDocuments = values.counterpartyId
    ? documents.filter((document) => document.status === "POSTED" && document.counterpartyId === values.counterpartyId)
    : [];
  const selectedAccountAvailable = accounts.some((account) => account.id === values.accountId);
  const selectedCounterpartyAvailable = counterparties.some((counterparty) => counterparty.id === values.counterpartyId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const duplicateDocuments = new Set(values.allocations.map((item) => item.documentId)).size !== values.allocations.length;
    const invalidAllocations = values.allocations.some((item) => !item.documentId || !/^\d+(\.\d{1,2})?$/.test(item.amount) || Number(item.amount) <= 0);
    if (!values.number.trim() || !values.paymentDate || !values.accountId || !/^\d+(\.\d{1,2})?$/.test(values.amount) || Number(values.amount) <= 0) setError(t("Заполните обязательные поля и укажите положительную сумму платежа."));
    else if (invalidAllocations || duplicateDocuments) setError(t("Для распределения выберите уникальные документы и положительные суммы."));
    else if (allocated > Number(values.amount)) setError(t("Распределённая сумма не может превышать сумму платежа."));
    else try { setError(""); await onSave(values); } catch (saveError) { setError(formatApiError(saveError)); }
  }
  function updateAllocation(key: string, field: "documentId" | "amount", value: string) {
    setValues((current) => ({ ...current, allocations: current.allocations.map((item) => item.key === key ? { ...item, [field]: value } : item) }));
  }
  return <div className="drawer-backdrop"><aside className="payment-drawer" aria-label={t(payment ? "Платёж" : "Новый платёж")}>
    <header className="document-drawer__header"><div><h2>{t("Платёж")}</h2><p>{payment ? `${t("Номер")}: ${payment.number}` : t("Новый черновик")}</p></div>{payment ? <span className={`status-label status-label--${payment.status.toLowerCase()}`}>{paymentStatusLabels[payment.status]}</span> : null}<button className="icon-button" aria-label={t("Закрыть платёж")} onClick={onClose}><X /></button></header>
    <form className="payment-form" onSubmit={submit}><div className="payment-form__body">
      {error ? <div className="form-alert" role="alert">{error}</div> : null}
      {debt ? <p className="debt-context">{t("Задолженность контрагента: {debt} (документы: {documents}, оплачено: {paid})", { debt: debt.debtTotal, documents: debt.documentTotal, paid: debt.paidTotal })}</p> : null}
      <div className="document-fields">
        <label>{t("Номер")}<input value={values.number} disabled={readOnly} onChange={(e) => setValues({ ...values, number: e.target.value })} /></label>
        <label>{t("Направление")}<select value={values.direction} disabled={readOnly} onChange={(e) => setValues({ ...values, direction: e.target.value as PaymentFormValues["direction"] })}><option value="INCOMING">{t("Входящий")}</option><option value="OUTGOING">{t("Исходящий")}</option></select></label>
        <label>{t("Дата платежа")}<input type="date" value={values.paymentDate} disabled={readOnly} onChange={(e) => {
          const nextDate = e.target.value;
          const currentAutoNumber = createPaymentNumber(payments, values.paymentDate);
          setValues({
            ...values,
            paymentDate: nextDate,
            number: values.number === currentAutoNumber
              ? createPaymentNumber(payments, nextDate)
              : values.number
          });
        }} /></label>
        <label>{t("Счёт")}<select value={values.accountId} disabled={readOnly} onChange={(e) => setValues({ ...values, accountId: e.target.value })}><option value="">{t("Выберите счёт")}</option>{values.accountId && !selectedAccountAvailable ? <option value={values.accountId}>{t("Счёт недоступен")}</option> : null}{accounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name} ({a.currencyCode})</option>)}</select></label>
        <label className="document-fields__wide">{t("Контрагент")}<select value={values.counterpartyId} disabled={readOnly} onChange={(e) => setValues({ ...values, counterpartyId: e.target.value, allocations: [] })}><option value="">{t("Без контрагента")}</option>{values.counterpartyId && !selectedCounterpartyAvailable ? <option value={values.counterpartyId}>{t("Контрагент недоступен")}</option> : null}{counterparties.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></label>
        <label className="document-fields__wide">{t("Сумма")}<input inputMode="decimal" value={values.amount} disabled={readOnly} onChange={(e) => setValues({ ...values, amount: e.target.value })} /></label>
        <label className="document-fields__wide">{t("Комментарий")}<textarea rows={3} value={values.notes} disabled={readOnly} onChange={(e) => setValues({ ...values, notes: e.target.value })} /></label>
      </div>
      <section className="allocations"><h3>{t("Распределение оплаты")}</h3><div className="allocations__table">
        <div className="allocations__header"><span>{t("Документ")}</span><span>{t("Сумма документа")}</span><span>{t("Сумма оплаты")}</span><span /></div>
        {values.allocations.map((allocation) => { const doc = documents.find((item) => item.id === allocation.documentId); return <div className="allocation-row" key={allocation.key}>
          <select aria-label={t("Документ распределения")} disabled={readOnly} value={allocation.documentId} onChange={(e) => updateAllocation(allocation.key, "documentId", e.target.value)}><option value="">{t("Выберите документ")}</option>{allocation.documentId && !availableDocuments.some((item) => item.id === allocation.documentId) ? <option value={allocation.documentId}>{t("Документ недоступен")}</option> : null}{availableDocuments.filter((item) => item.id === allocation.documentId || !values.allocations.some((a) => a.documentId === item.id)).map((item) => <option key={item.id} value={item.id}>{item.number}</option>)}</select>
          <span>{doc?.totalAmount ?? "—"}</span><input aria-label={t("Сумма распределения")} disabled={readOnly} value={allocation.amount} onChange={(e) => updateAllocation(allocation.key, "amount", e.target.value)} />
          <button type="button" className="icon-button icon-button--danger" disabled={readOnly} aria-label={t("Удалить распределение")} onClick={() => setValues({ ...values, allocations: values.allocations.filter((item) => item.key !== allocation.key) })}><Trash2 /></button>
        </div>; })}
      </div>{!readOnly ? <button type="button" className="button button--secondary" disabled={values.allocations.length >= 100 || availableDocuments.length === 0} onClick={() => setValues({ ...values, allocations: [...values.allocations, emptyAllocation()] })}><Plus /> {t("Добавить распределение")}</button> : null}</section>
      <div className="payment-summary"><div><span>{t("Сумма платежа")}</span><strong>{(Number(values.amount) || 0).toFixed(2)}</strong></div><div><span>{t("Распределено")}</span><strong>{allocated.toFixed(2)}</strong></div><div><span>{t("Не распределено")}</span><strong className={unallocated < 0 ? "negative" : ""}>{unallocated.toFixed(2)}</strong></div></div>
    </div><footer className="form-drawer__footer"><button type="button" className="button button--secondary" onClick={onClose}>{t("Отмена")}</button>{!readOnly ? <button className="button button--primary" disabled={isSaving}>{t(isSaving ? "Сохранение…" : "Сохранить черновик")}</button> : null}</footer></form>
  </aside></div>;
}
