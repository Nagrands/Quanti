import type { AccountDto, CounterpartyDebtDto, CounterpartyDto, DocumentDto, PaymentDto } from "@quanti/shared";
import { Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError } from "../../api/errors";
import { allocatedTotal, createEmptyPayment, emptyAllocation, paymentToForm, type PaymentFormValues } from "./payment-model";

interface Props {
  payment: PaymentDto | null; accounts: AccountDto[]; counterparties: CounterpartyDto[];
  documents: DocumentDto[]; debts: CounterpartyDebtDto[]; isSaving: boolean;
  onClose: () => void; onSave: (values: PaymentFormValues) => Promise<void>;
}

export function PaymentDrawer({ payment, accounts, counterparties, documents, debts, isSaving, onClose, onSave }: Props) {
  const [values, setValues] = useState<PaymentFormValues>(createEmptyPayment);
  const [error, setError] = useState("");
  const readOnly = payment?.status !== undefined && payment.status !== "DRAFT";
  useEffect(() => { setValues(payment ? paymentToForm(payment) : createEmptyPayment()); setError(""); }, [payment]);
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
    if (!values.number.trim() || !values.paymentDate || !values.accountId || !/^\d+(\.\d{1,2})?$/.test(values.amount) || Number(values.amount) <= 0) setError("Complete required fields and enter a positive payment amount.");
    else if (invalidAllocations || duplicateDocuments) setError("Allocations require unique documents and positive amounts.");
    else if (allocated > Number(values.amount)) setError("Allocated amount cannot exceed payment amount.");
    else try { setError(""); await onSave(values); } catch (saveError) { setError(saveError instanceof ApiError ? saveError.message : "Unable to save payment."); }
  }
  function updateAllocation(key: string, field: "documentId" | "amount", value: string) {
    setValues((current) => ({ ...current, allocations: current.allocations.map((item) => item.key === key ? { ...item, [field]: value } : item) }));
  }
  return <div className="drawer-backdrop"><aside className="payment-drawer" aria-label={payment ? "Payment details" : "New payment"}>
    <header className="document-drawer__header"><div><h2>Payment details</h2><p>{payment ? `Payment: ${payment.number}` : "New draft payment"}</p></div>{payment ? <span className={`status-label status-label--${payment.status.toLowerCase()}`}>{payment.status}</span> : null}<button className="icon-button" aria-label="Close payment" onClick={onClose}><X /></button></header>
    <form className="payment-form" onSubmit={submit}><div className="payment-form__body">
      {error ? <div className="form-alert" role="alert">{error}</div> : null}
      {debt ? <p className="debt-context">Counterparty debt: <strong>{debt.debtTotal}</strong> (documents {debt.documentTotal}, paid {debt.paidTotal})</p> : null}
      <div className="document-fields">
        <label>Number<input value={values.number} disabled={readOnly} onChange={(e) => setValues({ ...values, number: e.target.value })} /></label>
        <label>Direction<select value={values.direction} disabled={readOnly} onChange={(e) => setValues({ ...values, direction: e.target.value as PaymentFormValues["direction"] })}><option value="INCOMING">Incoming</option><option value="OUTGOING">Outgoing</option></select></label>
        <label>Payment date<input type="date" value={values.paymentDate} disabled={readOnly} onChange={(e) => setValues({ ...values, paymentDate: e.target.value })} /></label>
        <label>Account<select value={values.accountId} disabled={readOnly} onChange={(e) => setValues({ ...values, accountId: e.target.value })}><option value="">Select account</option>{values.accountId && !selectedAccountAvailable ? <option value={values.accountId}>Unavailable account</option> : null}{accounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name} ({a.currencyCode})</option>)}</select></label>
        <label className="document-fields__wide">Counterparty<select value={values.counterpartyId} disabled={readOnly} onChange={(e) => setValues({ ...values, counterpartyId: e.target.value, allocations: [] })}><option value="">No counterparty</option>{values.counterpartyId && !selectedCounterpartyAvailable ? <option value={values.counterpartyId}>Unavailable counterparty</option> : null}{counterparties.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></label>
        <label className="document-fields__wide">Amount<input inputMode="decimal" value={values.amount} disabled={readOnly} onChange={(e) => setValues({ ...values, amount: e.target.value })} /></label>
        <label className="document-fields__wide">Notes<textarea rows={3} value={values.notes} disabled={readOnly} onChange={(e) => setValues({ ...values, notes: e.target.value })} /></label>
      </div>
      <section className="allocations"><h3>Allocations</h3><div className="allocations__table">
        <div className="allocations__header"><span>Document</span><span>Document total</span><span>Allocate amount</span><span /></div>
        {values.allocations.map((allocation) => { const doc = documents.find((item) => item.id === allocation.documentId); return <div className="allocation-row" key={allocation.key}>
          <select aria-label="Allocation document" disabled={readOnly} value={allocation.documentId} onChange={(e) => updateAllocation(allocation.key, "documentId", e.target.value)}><option value="">Select document</option>{allocation.documentId && !availableDocuments.some((item) => item.id === allocation.documentId) ? <option value={allocation.documentId}>Unavailable document</option> : null}{availableDocuments.filter((item) => item.id === allocation.documentId || !values.allocations.some((a) => a.documentId === item.id)).map((item) => <option key={item.id} value={item.id}>{item.number}</option>)}</select>
          <span>{doc?.totalAmount ?? "—"}</span><input aria-label="Allocate amount" disabled={readOnly} value={allocation.amount} onChange={(e) => updateAllocation(allocation.key, "amount", e.target.value)} />
          <button type="button" className="icon-button icon-button--danger" disabled={readOnly} aria-label="Remove allocation" onClick={() => setValues({ ...values, allocations: values.allocations.filter((item) => item.key !== allocation.key) })}><Trash2 /></button>
        </div>; })}
      </div>{!readOnly ? <button type="button" className="button button--secondary" disabled={values.allocations.length >= 100 || availableDocuments.length === 0} onClick={() => setValues({ ...values, allocations: [...values.allocations, emptyAllocation()] })}><Plus /> Add allocation</button> : null}</section>
      <div className="payment-summary"><div><span>Payment amount</span><strong>{(Number(values.amount) || 0).toFixed(2)}</strong></div><div><span>Allocated</span><strong>{allocated.toFixed(2)}</strong></div><div><span>Unallocated</span><strong className={unallocated < 0 ? "negative" : ""}>{unallocated.toFixed(2)}</strong></div></div>
    </div><footer className="form-drawer__footer"><button type="button" className="button button--secondary" onClick={onClose}>Cancel</button>{!readOnly ? <button className="button button--primary" disabled={isSaving}>{isSaving ? "Saving…" : "Save draft"}</button> : null}</footer></form>
  </aside></div>;
}
