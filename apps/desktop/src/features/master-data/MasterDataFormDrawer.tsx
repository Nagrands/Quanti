import { X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { ApiError } from "../../api/errors";
import type {
  FormValues,
  MasterDataDefinition,
  MasterDataEntity
} from "./master-data";

interface MasterDataFormDrawerProps {
  definition: MasterDataDefinition;
  entity: MasterDataEntity | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (values: FormValues) => Promise<void>;
}

export function MasterDataFormDrawer({
  definition,
  entity,
  isSaving,
  onClose,
  onSave
}: MasterDataFormDrawerProps) {
  const [values, setValues] = useState<FormValues>(definition.createDefaults);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    setValues(entity ? definition.toFormValues(entity) : definition.createDefaults);
    setFieldErrors({});
    setRequestError("");
  }, [definition, entity]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = Object.fromEntries(
      definition.fields
        .filter((field) => field.required && String(values[field.key] ?? "").trim() === "")
        .map((field) => [field.key, `${field.label} is required.`])
    );

    if (definition.resource === "accounts") {
      const currencyCode = String(values.currencyCode ?? "").trim();
      if (currencyCode && !/^[A-Za-z]{3}$/.test(currencyCode)) {
        errors.currencyCode = "Currency must contain three letters.";
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
      setRequestError(error instanceof ApiError ? error.message : "Unable to save changes.");
    }
  }

  return (
    <div className="drawer-backdrop">
      <aside className="form-drawer" aria-label={`${entity ? "Edit" : "New"} ${definition.singularLabel}`}>
        <header className="form-drawer__header">
          <div>
            <p>{entity ? "Edit record" : "Create record"}</p>
            <h2>{entity ? `Edit ${definition.singularLabel}` : `New ${definition.singularLabel}`}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close form" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <form className="entity-form" onSubmit={handleSubmit}>
          <div className="entity-form__fields">
            {requestError ? <div className="form-alert" role="alert">{requestError}</div> : null}
            {definition.fields.map((field) => {
              const inputId = `${definition.resource}-${field.key}`;
              const fieldValue = String(values[field.key] ?? "");
              const error = fieldErrors[field.key];

              return (
                <div className="form-field" key={field.key}>
                  <label htmlFor={inputId}>
                    {field.label}
                    {field.required ? <span aria-hidden="true"> *</span> : null}
                  </label>
                  {field.type === "textarea" ? (
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
              Cancel
            </button>
            <button type="submit" className="button button--primary" disabled={isSaving}>
              {isSaving ? "Saving…" : entity ? "Save changes" : `Create ${definition.singularLabel}`}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
