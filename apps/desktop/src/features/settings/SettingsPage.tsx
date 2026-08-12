import { useEffect, useState } from "react";
import { useI18n, type Locale } from "../../i18n";
import { useTheme, type ThemePreference } from "../../theme";
import {
  checkForUpdate,
  createDatabaseBackup,
  getRuntimeInfo,
  installUpdate,
  readRuntimeLog,
  saveTextExport,
  type RuntimeInfo
} from "../../tauri-shell";

export function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [diagnosticMessage, setDiagnosticMessage] = useState("");
  const [availableUpdate, setAvailableUpdate] = useState<string | null>(null);

  useEffect(() => {
    void getRuntimeInfo().then(setRuntime).catch(() => setRuntime(null));
  }, []);

  const backup = async () => {
    setDiagnosticMessage("");
    try {
      const path = await createDatabaseBackup();
      setDiagnosticMessage(path ? `${t("Резервная копия создана:")} ${path}` : t("Резервное копирование доступно в desktop-версии."));
    } catch (error) {
      setDiagnosticMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const exportLog = async () => {
    try {
      await saveTextExport("quanti-runtime.log", await readRuntimeLog());
    } catch (error) {
      setDiagnosticMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const checkUpdate = async () => {
    setDiagnosticMessage("");
    try {
      const update = await checkForUpdate();
      setAvailableUpdate(update?.version ?? null);
      setDiagnosticMessage(update
        ? t("Доступна версия {version}.", { version: update.version })
        : t("Установлена последняя версия."));
    } catch (error) {
      setDiagnosticMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <section className="page settings-page" aria-labelledby="settings-title">
      <header className="page__header">
        <p className="page__eyebrow">{t("Настройки")}</p>
        <h1 id="settings-title">{t("Настройки")}</h1>
      </header>
      <div className="workspace-card settings-card">
        <label className="form-field">
          <span>{t("Язык интерфейса")}</span>
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
          >
            <option value="ru">{t("Русский")}</option>
            <option value="en">{t("Английский")}</option>
          </select>
        </label>
        <p>{t("Язык применяется сразу и сохраняется для следующих запусков.")}</p>
        <label className="form-field">
          <span>{t("Тема интерфейса")}</span>
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value as ThemePreference)}
          >
            <option value="system">{t("Как в системе")}</option>
            <option value="light">{t("Светлая")}</option>
            <option value="dark">{t("Тёмная")}</option>
          </select>
        </label>
        <p>{t("Тема применяется сразу и сохраняется для следующих запусков.")}</p>
      </div>
      <div className="workspace-card settings-card settings-diagnostics">
        <h2>{t("О программе и диагностика")}</h2>
        <dl>
          <div><dt>{t("Версия приложения")}</dt><dd>{runtime?.appVersion ?? "—"}</dd></div>
          <div><dt>{t("Версия базы данных")}</dt><dd>{runtime?.databaseVersion ?? "—"}</dd></div>
          <div><dt>{t("Расположение данных")}</dt><dd>{runtime?.databasePath ?? "—"}</dd></div>
        </dl>
        <div className="settings-diagnostics__actions">
          <button type="button" className="button button--secondary" onClick={() => void backup()}>{t("Создать резервную копию")}</button>
          <button type="button" className="button button--secondary" onClick={() => void exportLog()}>{t("Сохранить журнал диагностики")}</button>
          <button type="button" className="button button--secondary" onClick={() => void checkUpdate()}>{t("Проверить обновления")}</button>
          {availableUpdate ? <button type="button" className="button button--primary" onClick={() => void installUpdate().catch((error) => setDiagnosticMessage(error instanceof Error ? error.message : String(error)))}>{t("Установить {version}", { version: availableUpdate })}</button> : null}
        </div>
        {diagnosticMessage ? <p role="status">{diagnosticMessage}</p> : null}
      </div>
    </section>
  );
}
