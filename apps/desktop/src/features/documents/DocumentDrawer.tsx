import type { CounterpartyDto, DocumentDto, ProductDto, WarehouseDto } from "@quanti/shared";
import { Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { ApiError } from "../../api/errors";
import {
  addDocumentLine,
  calculateAmount,
  calculateTotal,
  createEmptyDocument,
  documentToForm,
  documentTypeLabels,
  type DocumentFormValues,
  supportedDocumentTypes
} from "./document-model";

interface DocumentDrawerProps {
  document: DocumentDto | null;
  products: ProductDto[];
  warehouses: WarehouseDto[];
  counterparties: CounterpartyDto[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (values: DocumentFormValues) => Promise<void>;
}

export function DocumentDrawer({
  document,
  products,
  warehouses,
  counterparties,
  isSaving,
  onClose,
  onSave
}: DocumentDrawerProps) {
  const [values, setValues] = useState<DocumentFormValues>(createEmptyDocument);
  const [error, setError] = useState("");
  const isReadOnly = document?.status === "POSTED" || document?.type === "STOCK_ADJUSTMENT";

  useEffect(() => {
    setValues(document ? documentToForm(document) : createEmptyDocument());
    setError("");
  }, [document]);

  function updateLine(key: string, field: string, value: string) {
    setValues((current) => ({
      ...current,
      items: current.items.map((item) => item.key === key ? { ...item, [field]: value } : item)
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const invalidLine = values.items.some((item) =>
      !item.productId
      || !/^\d+(\.\d{1,3})?$/.test(item.quantity)
      || Number(item.quantity) <= 0
      || !/^\d+(\.\d{1,2})?$/.test(item.price)
    );

    if (!values.number.trim() || !values.documentDate || values.items.length === 0 || invalidLine) {
      setError("Complete required fields and use positive quantities with valid prices.");
      return;
    }

    if (values.type === "TRANSFER" && (!values.sourceWarehouseId || !values.destinationWarehouseId)) {
      setError("Transfer requires source and destination warehouses.");
      return;
    }

    if (values.type !== "TRANSFER" && !values.warehouseId) {
      setError("Select a warehouse for this document.");
      return;
    }

    try {
      setError("");
      await onSave(values);
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : "Unable to save the document.");
    }
  }

  const warehouseOptions = (selected: string) => {
    const hasSelected = !selected || warehouses.some((warehouse) => warehouse.id === selected);
    return (
      <>
        <option value="">Select warehouse</option>
        {!hasSelected ? <option value={selected}>Unavailable: {selected}</option> : null}
        {warehouses.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>
        ))}
      </>
    );
  };

  return (
    <div className="drawer-backdrop">
      <aside className="document-drawer" aria-label={document ? "Document details" : "New document"}>
        <header className="document-drawer__header">
          <div>
            <h2>Document details</h2>
            <p>{document ? `Document: ${document.number}` : "New draft document"}</p>
          </div>
          {document ? <span className={`status-label status-label--${document.status.toLowerCase()}`}>{document.status}</span> : null}
          <button type="button" className="icon-button" aria-label="Close document" onClick={onClose}><X /></button>
        </header>

        <form className="document-form" onSubmit={submit}>
          <div className="document-form__body">
            {error ? <div className="form-alert" role="alert">{error}</div> : null}
            {document?.type === "STOCK_ADJUSTMENT" ? (
              <div className="form-alert">Posting stock adjustments is not supported yet.</div>
            ) : null}
            <div className="document-fields">
              <label>Number<input value={values.number} disabled={isReadOnly} onChange={(event) => setValues({ ...values, number: event.target.value })} /></label>
              <label>Type<select value={values.type} disabled={isReadOnly} onChange={(event) => setValues({ ...values, type: event.target.value as DocumentFormValues["type"] })}>
                {supportedDocumentTypes.map((type) => <option key={type} value={type}>{documentTypeLabels[type]}</option>)}
                {values.type === "STOCK_ADJUSTMENT" ? <option value="STOCK_ADJUSTMENT">Stock adjustment</option> : null}
              </select></label>
              <label>Document date<input type="date" value={values.documentDate} disabled={isReadOnly} onChange={(event) => setValues({ ...values, documentDate: event.target.value })} /></label>
              <label>Counterparty<select value={values.counterpartyId} disabled={isReadOnly} onChange={(event) => setValues({ ...values, counterpartyId: event.target.value })}>
                <option value="">No counterparty</option>
                {counterparties.map((counterparty) => <option key={counterparty.id} value={counterparty.id}>{counterparty.code} · {counterparty.name}</option>)}
              </select></label>
              {values.type === "TRANSFER" ? (
                <>
                  <label>Source warehouse<select value={values.sourceWarehouseId} disabled={isReadOnly} onChange={(event) => setValues({ ...values, sourceWarehouseId: event.target.value })}>{warehouseOptions(values.sourceWarehouseId)}</select></label>
                  <label>Destination warehouse<select value={values.destinationWarehouseId} disabled={isReadOnly} onChange={(event) => setValues({ ...values, destinationWarehouseId: event.target.value })}>{warehouseOptions(values.destinationWarehouseId)}</select></label>
                </>
              ) : (
                <label className="document-fields__wide">Warehouse<select value={values.warehouseId} disabled={isReadOnly} onChange={(event) => setValues({ ...values, warehouseId: event.target.value })}>{warehouseOptions(values.warehouseId)}</select></label>
              )}
              <label className="document-fields__wide">Notes<textarea rows={3} value={values.notes} disabled={isReadOnly} onChange={(event) => setValues({ ...values, notes: event.target.value })} /></label>
            </div>

            <section className="line-items">
              <h3>Line items</h3>
              <div className="line-items__table">
                <div className="line-items__header"><span>Product</span><span>Quantity</span><span>Price</span><span>Amount</span><span /></div>
                {values.items.map((item) => (
                  <div className="line-item" key={item.key}>
                    <select aria-label="Product" value={item.productId} disabled={isReadOnly} onChange={(event) => updateLine(item.key, "productId", event.target.value)}>
                      <option value="">Select product</option>
                      {products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
                    </select>
                    <input aria-label="Quantity" inputMode="decimal" value={item.quantity} disabled={isReadOnly} onChange={(event) => updateLine(item.key, "quantity", event.target.value)} />
                    <input aria-label="Price" inputMode="decimal" value={item.price} disabled={isReadOnly} onChange={(event) => updateLine(item.key, "price", event.target.value)} />
                    <output>{calculateAmount(item.quantity, item.price)}</output>
                    <button type="button" className="icon-button icon-button--danger" aria-label="Remove item" disabled={isReadOnly || values.items.length === 1} onClick={() => setValues({ ...values, items: values.items.filter((line) => line.key !== item.key) })}><Trash2 /></button>
                  </div>
                ))}
              </div>
              {!isReadOnly ? <button type="button" className="button button--secondary" onClick={() => setValues({ ...values, items: addDocumentLine(values.items) })}><Plus /> Add item</button> : null}
            </section>
          </div>

          <footer className="document-drawer__footer">
            <div><span>Total</span><strong>{calculateTotal(values.items).toFixed(2)}</strong></div>
            <button type="button" className="button button--secondary" onClick={onClose}>Cancel</button>
            {!isReadOnly ? <button type="submit" className="button button--primary" disabled={isSaving}>{isSaving ? "Saving…" : "Save draft"}</button> : null}
          </footer>
        </form>
      </aside>
    </div>
  );
}
