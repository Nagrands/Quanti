import { isQuantiTransferPackage, type ImportResolution, type QuantiTransferPackage } from "@quanti/shared";
import { useMutation } from "@tanstack/react-query";
import { Download, Upload, X } from "lucide-react";
import { useState } from "react";

import { ActionIconButton } from "../../components/actions/ActionIconButton";
import { useI18n } from "../../i18n";
import { pickJsonImport, saveTextExport } from "../../tauri-shell";
import { applyImport, exportSection, previewImport, type DataTransferSection } from "./transfer-api";

interface DataTransferControlsProps {
  section: DataTransferSection;
  onImported: () => Promise<unknown> | void;
}

export function DataTransferControls({ section, onImported }: DataTransferControlsProps) {
  const { formatApiError, t } = useI18n();
  const [transferPackage, setTransferPackage] = useState<QuantiTransferPackage | null>(null);
  const [fileName, setFileName] = useState("");
  const [resolutions, setResolutions] = useState<Record<string, ImportResolution>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const exportMutation = useMutation({
    mutationFn: async () => {
      const data = await exportSection(section);
      return saveTextExport(`quanti-${section}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
    },
    onError: (reason) => setError(formatApiError(reason))
  });
  const previewMutation = useMutation({
    mutationFn: previewImport,
    onSuccess: (preview) => {
      setResolutions(Object.fromEntries(preview.entries
        .filter((entry) => entry.status === "conflict")
        .map((entry) => [entry.id, entry.defaultResolution ?? "skip"])));
    },
    onError: (reason) => setError(formatApiError(reason))
  });
  const applyMutation = useMutation({
    mutationFn: () => applyImport(transferPackage!, resolutions),
    onSuccess: async (result) => {
      await onImported();
      setMessage(t("Импорт завершён: создано {created}, обновлено {updated}, пропущено {skipped}.", {
        created: result.created, updated: result.updated, skipped: result.skipped
      }));
      closeDialog(false);
    },
    onError: (reason) => setError(formatApiError(reason))
  });

  async function chooseImport() {
    setError(""); setMessage("");
    try {
      const file = await pickJsonImport();
      if (!file) return;
      let parsed: unknown;
      try { parsed = JSON.parse(file.contents); } catch { throw new Error(t("Файл не содержит корректный JSON.")); }
      if (!isQuantiTransferPackage(parsed)) throw new Error(t("Файл не является поддерживаемым пакетом Quanti."));
      if (parsed.section !== section) throw new Error(t("Выбран пакет другого раздела: {section}.", { section: parsed.section }));
      setFileName(file.fileName);
      setTransferPackage(parsed);
      previewMutation.mutate(parsed);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("Не удалось прочитать файл импорта."));
    }
  }

  function closeDialog(clearMessage = true) {
    setTransferPackage(null); setFileName(""); setResolutions({}); setError(""); previewMutation.reset(); applyMutation.reset();
    if (clearMessage) setMessage("");
  }

  const preview = previewMutation.data;
  const hasInvalid = preview?.entries.some((entry) => entry.status === "invalid") ?? false;
  const conflicts = preview?.entries.filter((entry) => entry.status === "conflict") ?? [];

  return (
    <>
      <div className="transfer-controls">
        <button type="button" className="button button--secondary" disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
          <Download aria-hidden="true" />{t(exportMutation.isPending ? "Экспорт…" : "Экспорт")}
        </button>
        <button type="button" className="button button--secondary" disabled={previewMutation.isPending} onClick={() => void chooseImport()}>
          <Upload aria-hidden="true" />{t(previewMutation.isPending ? "Чтение…" : "Импорт")}
        </button>
      </div>
      {message ? <div className="form-alert form-alert--success transfer-message" role="status">{message}</div> : null}
      {error && !transferPackage ? <div className="form-alert transfer-message" role="alert">{error}</div> : null}
      {transferPackage ? (
        <div className="dialog-backdrop">
          <div className="transfer-dialog" role="dialog" aria-modal="true" aria-labelledby="transfer-dialog-title">
            <header className="transfer-dialog__header">
              <div><h2 id="transfer-dialog-title">{t("Предпросмотр импорта")}</h2><p>{fileName}</p></div>
              <ActionIconButton label={t("Закрыть")} icon={<X aria-hidden="true" />} onClick={() => closeDialog()} />
            </header>
            <div className="transfer-dialog__body">
              {previewMutation.isPending ? <div className="table-state" role="status">{t("Проверка файла…")}</div> : null}
              {error ? <div className="form-alert" role="alert">{error}</div> : null}
              {preview ? (
                <>
                  <div className="transfer-summary">
                    <span>{t("Новые")}: <strong>{preview.entries.filter((entry) => entry.status === "new").length}</strong></span>
                    <span>{t("Совпадения")}: <strong>{conflicts.length}</strong></span>
                    <span>{t("Ошибки")}: <strong>{preview.entries.filter((entry) => entry.status === "invalid").length}</strong></span>
                  </div>
                  {conflicts.length ? <div className="transfer-bulk-actions"><button type="button" onClick={() => setResolutions(Object.fromEntries(conflicts.map((entry) => [entry.id, "update"])))}>{t("Обновить все")}</button><button type="button" onClick={() => setResolutions(Object.fromEntries(conflicts.map((entry) => [entry.id, "skip"])))}>{t("Пропустить все")}</button></div> : null}
                  <div className="transfer-entries">
                    {preview.entries.map((entry) => <div className={`transfer-entry transfer-entry--${entry.status}`} key={entry.id}>
                      <span>{t(({ category: "Категория", product: "Товар", warehouse: "Склад", counterparty: "Контрагент", account: "Счёт", document: "Документ", payment: "Платёж" } as const)[entry.entityType])}</span>
                      <strong>{entry.key}</strong>
                      {entry.status === "conflict" ? <select aria-label={t("Решение для {key}", { key: entry.key })} value={resolutions[entry.id] ?? "skip"} onChange={(event) => setResolutions((current) => ({ ...current, [entry.id]: event.target.value as ImportResolution }))}><option value="update">{t("Обновить")}</option><option value="skip">{t("Пропустить")}</option></select> : <span>{t(entry.status === "new" ? "Будет создано" : "Ошибка")}</span>}
                      {entry.message ? <small>{entry.message}</small> : null}
                    </div>)}
                  </div>
                </>
              ) : null}
            </div>
            <footer className="transfer-dialog__actions">
              <button type="button" className="button button--secondary" disabled={applyMutation.isPending} onClick={() => closeDialog()}>{t("Отмена")}</button>
              <button type="button" className="button button--primary" disabled={!preview || hasInvalid || applyMutation.isPending} onClick={() => applyMutation.mutate()}>{t(applyMutation.isPending ? "Импорт…" : "Импортировать")}</button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
