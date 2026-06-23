import type { CreateProductDto, ProductCategoryDto, ProductDto } from "@quanti/shared";
import { type FormEvent, useState } from "react";

import { useI18n } from "../../i18n";
import { createSequenceCode } from "../../utils/sequence-code";

interface QuickProductDialogProps {
  products: ProductDto[];
  categories: ProductCategoryDto[];
  isSaving: boolean;
  onCancel: () => void;
  onSave: (payload: CreateProductDto) => Promise<void>;
}

export function QuickProductDialog({
  products,
  categories,
  isSaving,
  onCancel,
  onSave
}: QuickProductDialogProps) {
  const { formatApiError, t } = useI18n();
  const [sku, setSku] = useState(() => createSequenceCode(products.map((product) => product.sku), "PRD"));
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!sku.trim() || !name.trim() || !unit.trim()) {
      setError(t("Заполните SKU, наименование и единицу измерения."));
      return;
    }

    try {
      setError("");
      await onSave({
        sku: sku.trim(),
        name: name.trim(),
        unit: unit.trim(),
        categoryId: categoryId || null,
        description: description.trim() || null
      });
    } catch (saveError) {
      setError(formatApiError(saveError));
    }
  }

  return (
    <div className="dialog-backdrop dialog-backdrop--nested">
      <form className="quick-product-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-product-title" onSubmit={submit}>
        <header>
          <div>
            <p>{t("Быстрое создание")}</p>
            <h2 id="quick-product-title">{t("Новый товар")}</h2>
          </div>
        </header>
        {error ? <div className="form-alert" role="alert">{error}</div> : null}
        <div className="quick-product-dialog__fields">
          <label>{t("SKU")}<input value={sku} onChange={(event) => setSku(event.target.value)} autoFocus /></label>
          <label>{t("Наименование")}<input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>{t("Единица")}<input placeholder={t("шт, кг, л")} value={unit} onChange={(event) => setUnit(event.target.value)} /></label>
          <label>{t("Категория")}<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">{t("Без категории")}</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.code} · {category.name}</option>)}
          </select></label>
          <label className="quick-product-dialog__wide">{t("Описание")}<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        </div>
        <footer>
          <button type="button" className="button button--secondary" onClick={onCancel}>{t("Отмена")}</button>
          <button type="submit" className="button button--primary" disabled={isSaving}>{t(isSaving ? "Сохранение…" : "Создать и выбрать")}</button>
        </footer>
      </form>
    </div>
  );
}
