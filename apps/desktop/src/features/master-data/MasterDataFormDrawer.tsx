import { Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { useI18n } from "../../i18n";
import type {
  FormValues,
  MasterDataDefinition,
  MasterDataEntity,
  ProductUnitFormValue
} from "./master-data";

interface MasterDataFormDrawerProps {
  definition: MasterDataDefinition;
  entity: MasterDataEntity | null;
  initialValues: FormValues;
  isSaving: boolean;
  onClose: () => void;
  onSave: (values: FormValues) => Promise<void>;
}

function productUnits(value: FormValues[string] | undefined): ProductUnitFormValue[] {
  return Array.isArray(value) ? value : [];
}

export function MasterDataFormDrawer({
  definition,
  entity,
  initialValues,
  isSaving,
  onClose,
  onSave
}: MasterDataFormDrawerProps) {
  const { formatApiError, t } = useI18n();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    setValues(entity ? definition.toFormValues(entity) : initialValues);
    setFieldErrors({});
    setRequestError("");
  }, [definition, entity, initialValues]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = Object.fromEntries(
      definition.fields
        .filter((field) => field.required && String(values[field.key] ?? "").trim() === "")
        .map((field) => [field.key, t("Поле «{field}» обязательно.", { field: field.label })])
    );

    if (definition.resource === "accounts") {
      const currencyCode = String(values.currencyCode ?? "").trim();
      if (currencyCode && !/^[A-Za-z]{3}$/.test(currencyCode)) {
        errors.currencyCode = t("Код валюты должен состоять из трёх букв.");
      }
    }

    if (definition.resource === "products") {
      const baseUnit = String(values.unit ?? "").trim().toLocaleLowerCase();
      const units = productUnits(values.units);
      const normalizedNames = units.map((unit) => unit.name.trim().toLocaleLowerCase());
      const invalidUnits = units.some((unit) =>
        !unit.name.trim()
        || !/^\d+(\.\d{1,6})?$/.test(unit.conversionFactor)
        || Number(unit.conversionFactor) <= 0
      );
      const duplicateUnits = new Set(normalizedNames).size !== normalizedNames.length
        || normalizedNames.includes(baseUnit);

      if (invalidUnits) {
        errors.units = t("Для каждой дополнительной единицы укажите название и положительный коэффициент.");
      } else if (duplicateUnits) {
        errors.units = t("Названия единиц не должны повторяться или совпадать с базовой единицей.");
      }

      for (const key of ["purchasePrice", "salePrice"] as const) {
        const price = String(values[key] ?? "").trim();
        if (price && !/^\d+(\.\d{1,2})?$/.test(price)) {
          errors[key] = t("Цена должна быть неотрицательным числом максимум с двумя знаками после точки.");
        }
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setRequestError("");
    try {
      await onSave(values);
    } catch (error) {
      setRequestError(formatApiError(error));
    }
  }

  return (
    <div className="drawer-backdrop">
      <aside className="form-drawer" aria-label={t(entity ? "Изменение записи" : "Новая запись")}>
        <header className="form-drawer__header">
          <div>
            <p>{t(entity ? "Изменение записи" : "Создание записи")}</p>
            <h2>{entity ? t("Изменить: {name}", { name: entity.name }) : t("Новый {name}", { name: definition.singularLabel })}</h2>
          </div>
          <button type="button" className="icon-button" aria-label={t("Закрыть форму")} onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <form className="entity-form" onSubmit={handleSubmit}>
          <div className="entity-form__fields">
            {requestError ? <div className="form-alert" role="alert">{requestError}</div> : null}
            {definition.fields.map((field) => {
              const inputId = `${definition.resource}-${field.key}`;
              const rawFieldValue = values[field.key];
              const fieldValue = typeof rawFieldValue === "string" || typeof rawFieldValue === "boolean"
                ? String(rawFieldValue)
                : "";
              const error = fieldErrors[field.key];

              return (
                <div className="form-field" key={field.key}>
                  <label htmlFor={inputId}>
                    {field.label}
                    {field.required ? <span aria-hidden="true"> *</span> : null}
                  </label>
                  {field.type === "product-units" ? (
                    <div className="product-units-editor" id={inputId}>
                      <p>{t("Коэффициент показывает количество базовой единицы в одной дополнительной.")}</p>
                      {productUnits(rawFieldValue).map((unit) => (
                        <div className="product-unit-row" key={unit.key}>
                          <input
                            aria-label={t("Название единицы")}
                            placeholder={t("Например, пучок")}
                            value={unit.name}
                            onChange={(event) => setValues((current) => ({
                              ...current,
                              [field.key]: productUnits(current[field.key]).map((item) =>
                                item.key === unit.key ? { ...item, name: event.target.value } : item
                              )
                            }))}
                          />
                          <input
                            aria-label={t("Коэффициент пересчёта")}
                            inputMode="decimal"
                            placeholder="0.100"
                            value={unit.conversionFactor}
                            onChange={(event) => setValues((current) => ({
                              ...current,
                              [field.key]: productUnits(current[field.key]).map((item) =>
                                item.key === unit.key ? { ...item, conversionFactor: event.target.value } : item
                              )
                            }))}
                          />
                          <button
                            type="button"
                            className="icon-button icon-button--danger"
                            aria-label={t("Удалить единицу {name}", { name: unit.name || t("без названия") })}
                            onClick={() => setValues((current) => ({
                              ...current,
                              [field.key]: productUnits(current[field.key])
                                .filter((item) => item.key !== unit.key)
                            }))}
                          >
                            <Trash2 aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="button button--secondary product-units-editor__add"
                        onClick={() => setValues((current) => ({
                          ...current,
                          [field.key]: [
                            ...productUnits(current[field.key]),
                            { key: crypto.randomUUID(), name: "", conversionFactor: "1" }
                          ]
                        }))}
                      >
                        <Plus aria-hidden="true" />
                        {t("Добавить единицу")}
                      </button>
                    </div>
                  ) : field.type === "textarea" ? (
                    <textarea
                      id={inputId}
                      rows={5}
                      value={fieldValue}
                      aria-invalid={Boolean(error)}
                      onChange={(event) => setValues((current) => ({
                        ...current,
                        [field.key]: event.target.value
                      }))}
                    />
                  ) : field.type === "select" ? (
                    <select
                      id={inputId}
                      value={fieldValue}
                      aria-invalid={Boolean(error)}
                      onChange={(event) => setValues((current) => ({
                        ...current,
                        [field.key]: event.target.value
                      }))}
                    >
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={inputId}
                      value={fieldValue}
                      inputMode={field.type === "price" ? "decimal" : undefined}
                      placeholder={field.placeholder}
                      aria-invalid={Boolean(error)}
                      onChange={(event) => setValues((current) => ({
                        ...current,
                        [field.key]: event.target.value
                      }))}
                    />
                  )}
                  {error ? <span className="form-field__error">{error}</span> : null}
                </div>
              );
            })}
          </div>

          <footer className="form-drawer__footer">
            <button type="button" className="button button--secondary" onClick={onClose}>
              {t("Отмена")}
            </button>
            <button type="submit" className="button button--primary" disabled={isSaving}>
              {t(isSaving ? "Сохранение…" : entity ? "Сохранить" : "Создать")}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
