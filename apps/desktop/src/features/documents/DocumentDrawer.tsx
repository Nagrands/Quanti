import type {
  CounterpartyDto,
  CreateProductDto,
  DocumentDto,
  ProductCategoryDto,
  ProductDto,
  UpdateProductDto,
  WarehouseDto
} from "@quanti/shared";
import { useQueries } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { FormModal } from "../../components/forms/FormModal";
import { useI18n } from "../../i18n";
import { MasterDataFormDrawer } from "../master-data/MasterDataFormDrawer";
import { getLocalizedMasterDataDefinitions } from "../master-data/master-data";
import {
  addDocumentLine,
  calculateAmount,
  calculateTotal,
  createDocumentNumber,
  createEmptyDocument,
  documentToForm,
  type DocumentLineSortKey,
  type DocumentFormValues,
  productUnitPrice,
  type SortDirection,
  sortDocumentLines,
  supportedDocumentTypes
} from "./document-model";
import { getRequiredStockChecks, getStockWarnings } from "./document-preview";
import { getStockBalance } from "./documents-api";
import { ProductCombobox } from "./ProductCombobox";
import { QuickProductDialog } from "./QuickProductDialog";

interface DocumentDrawerProps {
  document: DocumentDto | null;
  products: ProductDto[];
  categories: ProductCategoryDto[];
  warehouses: WarehouseDto[];
  counterparties: CounterpartyDto[];
  documents: DocumentDto[];
  initialValues?: DocumentFormValues | null;
  isSaving: boolean;
  isUpdatingProduct: boolean;
  onClose: () => void;
  onSave: (values: DocumentFormValues) => Promise<void>;
  onCreateProduct: (payload: CreateProductDto) => Promise<ProductDto>;
  onUpdateProduct: (id: string, payload: UpdateProductDto) => Promise<ProductDto>;
}

export function DocumentDrawer({
  document,
  products,
  categories,
  warehouses,
  counterparties,
  documents,
  initialValues = null,
  isSaving,
  isUpdatingProduct,
  onClose,
  onSave,
  onCreateProduct,
  onUpdateProduct
}: DocumentDrawerProps) {
  const { documentStatusLabels, documentTypeLabels, formatApiError, locale, t } = useI18n();
  const [values, setValues] = useState<DocumentFormValues>(createEmptyDocument);
  const [error, setError] = useState("");
  const [quickProductLineKey, setQuickProductLineKey] = useState<string | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);
  const [sort, setSort] = useState<{ key: DocumentLineSortKey; direction: SortDirection } | null>(null);
  const isReadOnly = document?.status === "POSTED" || document?.type === "STOCK_ADJUSTMENT";
  const productDefinition = useMemo(() => getLocalizedMasterDataDefinitions(t, locale, {
    "product-categories": categories.map((category) => ({ label: category.name, value: category.id }))
  }).find((definition) => definition.resource === "products")!, [categories, locale, t]);
  const requiredStockChecks = useMemo(() => getRequiredStockChecks(values), [values]);
  const stockBalanceQueries = useQueries({
    queries: requiredStockChecks.map((check) => ({
      queryKey: ["stock-balance", check.productId, check.warehouseId],
      queryFn: () => getStockBalance(check.productId, check.warehouseId),
      enabled: !isReadOnly
    }))
  });
  const stockWarnings = useMemo(() => getStockWarnings(
    values,
    stockBalanceQueries.flatMap((query) => query.data ? [query.data] : []),
    products,
    warehouses
  ), [products, stockBalanceQueries, values, warehouses]);

  useEffect(() => {
    setValues(document ? documentToForm(document) : initialValues ?? createEmptyDocument(createDocumentNumber("SALE", documents)));
    setError("");
    setQuickProductLineKey(null);
    setEditingProduct(null);
    setSort(null);
  }, [document, documents, initialValues]);

  function updateLine(key: string, field: string, value: string) {
    setSort(null);
    setValues((current) => ({
      ...current,
      items: current.items.map((item) => item.key === key ? { ...item, [field]: value } : item)
    }));
  }

  function selectProduct(key: string, productId: string, productOverride?: ProductDto) {
    setSort(null);
    const product = productOverride ?? products.find((item) => item.id === productId);
    setValues((current) => ({
      ...current,
      items: current.items.map((item) => item.key === key ? {
        ...item,
        productId,
        unit: product?.unit ?? "",
        unitFactor: "1",
        price: product ? productUnitPrice(product, current.type, product.unit) : "0"
      } : item)
    }));
  }

  function selectUnit(key: string, product: ProductDto | undefined, unit: string) {
    setSort(null);
    const alternative = product?.units?.find((item) => item.name === unit);
    setValues((current) => ({
      ...current,
      items: current.items.map((item) => item.key === key ? {
        ...item,
        unit,
        unitFactor: unit === product?.unit ? "1" : alternative?.conversionFactor ?? "1",
        price: product ? productUnitPrice(product, current.type, unit) : "0"
      } : item)
    }));
  }

  function reconcileUpdatedProduct(product: ProductDto) {
    setSort(null);
    setValues((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.productId !== product.id) return item;
        const alternative = product.units.find((unit) => unit.name === item.unit);
        const isValidUnit = item.unit === product.unit || Boolean(alternative);
        if (!isValidUnit) {
          return {
            ...item,
            unit: product.unit,
            unitFactor: "1",
            price: productUnitPrice(product, current.type, product.unit)
          };
        }
        return {
          ...item,
          unitFactor: item.unit === product.unit ? "1" : alternative?.conversionFactor ?? "1"
        };
      })
    }));
  }

  function sortLines(key: DocumentLineSortKey) {
    const direction: SortDirection = sort?.key === key && sort.direction === "ascending" ? "descending" : "ascending";
    setValues((current) => ({ ...current, items: sortDocumentLines(current.items, products, key, direction) }));
    setSort({ key, direction });
  }

  const sortHeader = (key: DocumentLineSortKey, label: string) => (
    <span role="columnheader" aria-sort={sort?.key === key ? sort.direction : "none"}>
      <button type="button" className="line-items__sort" onClick={() => sortLines(key)} aria-label={t("Сортировать по колонке {column}", { column: label })}>
        {label}
        {sort?.key !== key ? <ArrowUpDown aria-hidden="true" /> : sort.direction === "ascending" ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
      </button>
    </span>
  );

  async function submit(event: FormEvent, requestClose: () => void) {
    event.preventDefault();
    const invalidLine = values.items.some((item) =>
      !item.productId
      || !item.unit
      || !/^\d+(\.\d{1,3})?$/.test(item.quantity)
      || Number(item.quantity) <= 0
      || !/^\d+(\.\d{1,2})?$/.test(item.price)
    );

    if (!values.number.trim() || !values.documentDate || values.items.length === 0 || invalidLine) {
      setError(t("Заполните обязательные поля. Количество должно быть положительным, а цена — корректной."));
      return;
    }

    if (values.type === "TRANSFER" && (!values.sourceWarehouseId || !values.destinationWarehouseId)) {
      setError(t("Для перемещения укажите склад-отправитель и склад-получатель."));
      return;
    }

    if (values.type === "TRANSFER" && values.sourceWarehouseId === values.destinationWarehouseId) {
      setError(t("Склад-отправитель и склад-получатель должны отличаться."));
      return;
    }

    if (values.type !== "TRANSFER" && !values.warehouseId) {
      setError(t("Выберите склад для документа."));
      return;
    }

    try {
      setError("");
      await onSave(values);
      requestClose();
    } catch (saveError) {
      setError(formatApiError(saveError, { products, warehouses }));
    }
  }

  const warehouseOptions = (selected: string) => {
    const hasSelected = !selected || warehouses.some((warehouse) => warehouse.id === selected);
    return (
      <>
        <option value="">{t("Выберите склад")}</option>
        {!hasSelected ? <option value={selected}>{t("Недоступен: {id}", { id: selected })}</option> : null}
        {warehouses.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>
        ))}
      </>
    );
  };

  return (
    <FormModal ariaLabel={t(document ? "Документ" : "Новый документ")} onClose={onClose} size="large">
      {(requestClose) => <>
      <div className="document-drawer">
        <header className="document-drawer__header">
          <div>
            <h2>{t("Документ")}</h2>
            <p>{document ? `${t("Номер")}: ${document.number}` : t("Новый черновик")}</p>
          </div>
          {document ? <span className={`status-label status-label--${document.status.toLowerCase()}`}>{documentStatusLabels[document.status]}</span> : null}
          <button type="button" className="icon-button" aria-label={t("Закрыть документ")} onClick={requestClose}><X /></button>
        </header>

        <form className="document-form" onSubmit={(event) => submit(event, requestClose)}>
          <div className="document-form__body">
            {error ? <div className="form-alert" role="alert">{error}</div> : null}
            {document?.type === "STOCK_ADJUSTMENT" ? (
              <div className="form-alert">{t("Проведение корректировки остатков пока не поддерживается.")}</div>
            ) : null}
            {!isReadOnly && values.type === "TRANSFER" && values.sourceWarehouseId && values.sourceWarehouseId === values.destinationWarehouseId ? (
              <div className="form-alert" role="alert">{t("Склад-отправитель и склад-получатель должны отличаться.")}</div>
            ) : null}
            {!isReadOnly && stockWarnings.length > 0 ? (
              <div className="form-alert form-alert--detailed" role="alert">
                <strong>{t("Недостаточно остатков для проведения")}</strong>
                {stockWarnings.map((warning) => (
                  <span key={warning.key}>
                    {t("{product} на складе {warehouse}: доступно {available}, требуется {required}.", {
                      product: warning.productLabel,
                      warehouse: warning.warehouseLabel,
                      available: warning.availableQuantity,
                      required: warning.requiredQuantity
                    })}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="document-fields">
              <label>{t("Номер")}<input value={values.number} disabled={isReadOnly} onChange={(event) => setValues({ ...values, number: event.target.value })} /></label>
              <label>{t("Тип")}<select value={values.type} disabled={isReadOnly} onChange={(event) => {
                const nextType = event.target.value as DocumentFormValues["type"];
                const currentAutoNumber = createDocumentNumber(values.type, documents);
                setValues({
                  ...values,
                  type: nextType,
                  items: values.items.map((item) => {
                    const product = products.find((candidate) => candidate.id === item.productId);
                    return product ? { ...item, price: productUnitPrice(product, nextType, item.unit) } : item;
                  }),
                  number: values.number === currentAutoNumber || values.number.trim() === ""
                    ? createDocumentNumber(nextType, documents)
                    : values.number
                });
                setSort(null);
              }}>
                {supportedDocumentTypes.map((type) => <option key={type} value={type}>{documentTypeLabels[type]}</option>)}
                {values.type === "STOCK_ADJUSTMENT" ? <option value="STOCK_ADJUSTMENT">{t("Корректировка остатков")}</option> : null}
              </select></label>
              <label>{t("Дата документа")}<input type="date" value={values.documentDate} disabled={isReadOnly} onChange={(event) => setValues({ ...values, documentDate: event.target.value })} /></label>
              <label>{t("Контрагент")}<select value={values.counterpartyId} disabled={isReadOnly} onChange={(event) => setValues({ ...values, counterpartyId: event.target.value })}>
                <option value="">{t("Без контрагента")}</option>
                {counterparties.map((counterparty) => <option key={counterparty.id} value={counterparty.id}>{counterparty.code} · {counterparty.name}</option>)}
              </select></label>
              {values.type === "TRANSFER" ? (
                <>
                  <label>{t("Склад-отправитель")}<select value={values.sourceWarehouseId} disabled={isReadOnly} onChange={(event) => setValues({ ...values, sourceWarehouseId: event.target.value })}>{warehouseOptions(values.sourceWarehouseId)}</select></label>
                  <label>{t("Склад-получатель")}<select value={values.destinationWarehouseId} disabled={isReadOnly} onChange={(event) => setValues({ ...values, destinationWarehouseId: event.target.value })}>{warehouseOptions(values.destinationWarehouseId)}</select></label>
                </>
              ) : (
                <label className="document-fields__wide">{t("Склад")}<select value={values.warehouseId} disabled={isReadOnly} onChange={(event) => setValues({ ...values, warehouseId: event.target.value })}>{warehouseOptions(values.warehouseId)}</select></label>
              )}
              <label className="document-fields__wide">{t("Комментарий")}<textarea rows={3} value={values.notes} disabled={isReadOnly} onChange={(event) => setValues({ ...values, notes: event.target.value })} /></label>
            </div>

            <section className="line-items">
              <h3>{t("Товары")}</h3>
              <div className="line-items__table">
                <div className="line-items__header" role="row">{sortHeader("product", t("Товар"))}{sortHeader("unit", t("Единица"))}{sortHeader("quantity", t("Количество"))}{sortHeader("price", t("Цена"))}{sortHeader("amount", t("Сумма"))}<span role="columnheader" /></div>
                {values.items.map((item) => {
                  const product = products.find((candidate) => candidate.id === item.productId);
                  return (
                  <div className="line-item" key={item.key}>
                    <ProductCombobox
                      value={item.productId}
                      products={products}
                      disabled={isReadOnly}
                      onChange={(productId) => selectProduct(item.key, productId)}
                      onCreate={() => setQuickProductLineKey(item.key)}
                      onEdit={setEditingProduct}
                    />
                    <select
                      aria-label={t("Единица")}
                      value={item.unit}
                      disabled={isReadOnly || !product}
                      onChange={(event) => selectUnit(item.key, product, event.target.value)}
                    >
                      {!product ? <option value="">{t("Выберите товар")}</option> : (
                        <>
                          <option value={product.unit}>{product.unit}</option>
                          {(product.units ?? []).map((unit) => <option key={unit.id} value={unit.name}>{unit.name}</option>)}
                        </>
                      )}
                    </select>
                    <input aria-label={t("Количество")} inputMode="decimal" value={item.quantity} disabled={isReadOnly} onChange={(event) => updateLine(item.key, "quantity", event.target.value)} />
                    <input aria-label={t("Цена")} inputMode="decimal" value={item.price} disabled={isReadOnly} onChange={(event) => updateLine(item.key, "price", event.target.value)} />
                    <output>{calculateAmount(item.quantity, item.price)}</output>
                    <button type="button" className="icon-button icon-button--danger" aria-label={t("Удалить строку")} disabled={isReadOnly || values.items.length === 1} onClick={() => { setSort(null); setValues({ ...values, items: values.items.filter((line) => line.key !== item.key) }); }}><Trash2 /></button>
                  </div>
                )})}
              </div>
              {!isReadOnly ? <button type="button" className="button button--secondary" onClick={() => { setSort(null); setValues({ ...values, items: addDocumentLine(values.items) }); }}><Plus /> {t("Добавить товар")}</button> : null}
            </section>
          </div>

          <footer className="document-drawer__footer">
            <div><span>{t("Итого")}</span><strong>{calculateTotal(values.items).toFixed(2)}</strong></div>
            <button type="button" className="button button--secondary" onClick={requestClose}>{t("Отмена")}</button>
            {!isReadOnly ? <button type="submit" className="button button--primary" disabled={isSaving}>{t(isSaving ? "Сохранение…" : "Сохранить черновик")}</button> : null}
          </footer>
        </form>
      </div>
      {quickProductLineKey ? (
        <QuickProductDialog
          products={products}
          categories={categories}
          isSaving={isCreatingProduct}
          onCancel={() => setQuickProductLineKey(null)}
          onSave={async (payload) => {
            setIsCreatingProduct(true);
            try {
              const product = await onCreateProduct(payload);
              selectProduct(quickProductLineKey, product.id, product);
              setQuickProductLineKey(null);
            } finally {
              setIsCreatingProduct(false);
            }
          }}
        />
      ) : null}
      {editingProduct ? (
        <MasterDataFormDrawer
          definition={productDefinition}
          entity={editingProduct}
          initialValues={productDefinition.toFormValues(editingProduct)}
          isSaving={isUpdatingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={async (formValues) => {
            const updatedProduct = await onUpdateProduct(
              editingProduct.id,
              productDefinition.toPayload(formValues) as UpdateProductDto
            );
            reconcileUpdatedProduct(updatedProduct);
          }}
        />
      ) : null}
      </>}
    </FormModal>
  );
}
