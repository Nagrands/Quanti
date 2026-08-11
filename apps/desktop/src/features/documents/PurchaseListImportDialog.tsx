import type { CreateProductDto, ProductCategoryDto, ProductDto } from "@quanti/shared";
import { Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useI18n } from "../../i18n";
import { QuickProductDialog } from "./QuickProductDialog";
import {
  mergePurchaseRows,
  parsePurchaseList,
  resolvePurchaseRow,
  type PurchaseImportRow
} from "./purchase-list-parser";

interface PurchaseListImportDialogProps {
  products: ProductDto[];
  categories: ProductCategoryDto[];
  isSaving: boolean;
  onCancel: () => void;
  onCreateProduct: (payload: CreateProductDto) => Promise<ProductDto>;
  onSaveAliases: (productId: string, aliases: string[]) => Promise<ProductDto>;
  onApply: (rows: PurchaseImportRow[], products: ProductDto[]) => void;
}

export function PurchaseListImportDialog({
  products: initialProducts,
  categories,
  isSaving,
  onCancel,
  onCreateProduct,
  onSaveAliases,
  onApply
}: PurchaseListImportDialogProps) {
  const { formatApiError, t } = useI18n();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<PurchaseImportRow[] | null>(null);
  const [products, setProducts] = useState(initialProducts);
  const [quickCreateKey, setQuickCreateKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const unresolvedCount = rows?.filter((row) => row.status !== "ready").length ?? 0;
  const mergedCount = useMemo(() => rows ? mergePurchaseRows(rows.filter((row) => row.status === "ready")).length : 0, [rows]);

  function updateRow(key: string, update: Partial<PurchaseImportRow>) {
    setRows((current) => current?.map((row) => row.key === key
      ? resolvePurchaseRow({ ...row, ...update }, products)
      : row) ?? null);
  }

  async function apply() {
    if (!rows || unresolvedCount) return;
    try {
      setError("");
      let updatedProducts = products;
      for (const row of rows.filter((candidate) => candidate.rememberAlias)) {
        const product = updatedProducts.find((candidate) => candidate.id === row.productId);
        const normalizedAlias = row.productQuery.trim();
        if (!product || !normalizedAlias || product.aliases.some((alias) => alias.toLocaleLowerCase("ru-RU") === normalizedAlias.toLocaleLowerCase("ru-RU"))) continue;
        const updated = await onSaveAliases(product.id, [...product.aliases, normalizedAlias]);
        updatedProducts = updatedProducts.map((candidate) => candidate.id === updated.id ? updated : candidate);
      }
      onApply(mergePurchaseRows(rows), updatedProducts);
    } catch (saveError) {
      setError(formatApiError(saveError));
    }
  }

  return (
    <div className="dialog-backdrop purchase-import-backdrop">
      <section className="purchase-import-dialog" role="dialog" aria-modal="true" aria-labelledby="purchase-import-title">
        <header className="purchase-import-dialog__header">
          <div><p>{t("Массовое добавление")}</p><h2 id="purchase-import-title">{t("Импорт списка закупки")}</h2></div>
          <button type="button" className="icon-button" aria-label={t("Закрыть импорт")} onClick={onCancel}><X /></button>
        </header>
        {error ? <div className="form-alert" role="alert">{error}</div> : null}
        {!rows ? (
          <div className="purchase-import-dialog__input">
            <p>{t("Вставьте заявки из сообщения или документа. Заголовки «Заявка» будут пропущены.")}</p>
            <textarea aria-label={t("Текст списка закупки")} rows={18} value={text} onChange={(event) => setText(event.target.value)} autoFocus />
          </div>
        ) : (
          <div className="purchase-import-preview">
            <div className="purchase-import-preview__summary">
              <span>{t("Строк: {count}", { count: rows.length })}</span>
              <span>{t("После объединения: {count}", { count: mergedCount })}</span>
              <strong className={unresolvedCount ? "purchase-import-preview__unresolved" : ""}>{t("Требуют проверки: {count}", { count: unresolvedCount })}</strong>
            </div>
            <div className="purchase-import-preview__table">
              <div className="purchase-import-preview__head"><span>{t("Исходная строка")}</span><span>{t("Товар")}</span><span>{t("Количество")}</span><span>{t("Единица")}</span><span>{t("Статус")}</span><span /></div>
              {rows.map((row) => {
                const product = products.find((candidate) => candidate.id === row.productId);
                const units = product ? [product.unit, ...product.units.map((unit) => unit.name)] : [];
                return <div className="purchase-import-preview__row" key={row.key}>
                  <span title={row.source}>{row.source}</span>
                  <div className="purchase-import-preview__product">
                    <select aria-label={t("Товар для строки {line}", { line: row.source })} value={row.productId} onChange={(event) => updateRow(row.key, { productId: event.target.value, unit: products.find((candidate) => candidate.id === event.target.value)?.unit ?? "", rememberAlias: true })}>
                      <option value="">{t("Выберите товар")}</option>
                      {products.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.sku} · {candidate.name}</option>)}
                    </select>
                    {!product ? <button type="button" className="button button--secondary button--compact" onClick={() => setQuickCreateKey(row.key)}><Plus />{t("Создать товар")}</button> : null}
                    {product && row.rememberAlias ? <label className="purchase-import-preview__alias"><input type="checkbox" checked={row.rememberAlias} onChange={(event) => updateRow(row.key, { rememberAlias: event.target.checked })} />{t("Запомнить «{alias}»", { alias: row.productQuery })}</label> : null}
                  </div>
                  <input aria-label={t("Количество для строки {line}", { line: row.source })} inputMode="decimal" value={row.quantity} onChange={(event) => updateRow(row.key, { quantity: event.target.value.replace(",", ".") })} />
                  <select aria-label={t("Единица для строки {line}", { line: row.source })} value={row.unit} disabled={!product} onChange={(event) => updateRow(row.key, { unit: event.target.value })}>
                    {!product ? <option value="">—</option> : units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                  <span className={`purchase-import-status purchase-import-status--${row.status}`}>{t({ ready: "Готово", unmatched: "Товар не найден", ambiguous: "Неоднозначно", "missing-quantity": "Нет количества", "invalid-unit": "Несовместимая единица" }[row.status])}</span>
                  <button type="button" className="icon-button icon-button--danger" aria-label={t("Удалить строку {line}", { line: row.source })} onClick={() => setRows((current) => current?.filter((candidate) => candidate.key !== row.key) ?? null)}><Trash2 /></button>
                </div>;
              })}
            </div>
          </div>
        )}
        <footer className="purchase-import-dialog__footer">
          <button type="button" className="button button--secondary" onClick={rows ? () => setRows(null) : onCancel}>{t(rows ? "Назад" : "Отмена")}</button>
          {!rows ? <button type="button" className="button button--primary" disabled={!text.trim()} onClick={() => setRows(parsePurchaseList(text, products))}>{t("Разобрать список")}</button>
            : <button type="button" className="button button--primary" disabled={Boolean(unresolvedCount) || isSaving || rows.length === 0} onClick={() => void apply()}>{t("Перенести в закупку")}</button>}
        </footer>
      </section>
      {quickCreateKey ? <QuickProductDialog products={products} categories={categories} isSaving={isSaving} onCancel={() => setQuickCreateKey(null)} onSave={async (payload) => {
        const product = await onCreateProduct({ ...payload, aliases: [...(payload.aliases ?? []), rows?.find((row) => row.key === quickCreateKey)?.productQuery ?? ""].filter(Boolean) });
        setProducts((current) => [...current, product]);
        setRows((current) => current?.map((row) => row.key === quickCreateKey ? resolvePurchaseRow({ ...row, productId: product.id, unit: product.unit, rememberAlias: false }, [...products, product]) : row) ?? null);
        setQuickCreateKey(null);
      }} /> : null}
    </div>
  );
}
