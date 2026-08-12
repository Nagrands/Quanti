import { type PropsWithChildren, useEffect, useState } from "react";
import { BrandMark } from "../components/branding/BrandMark";
import { DataTransferControls } from "../features/transfer/DataTransferControls";
import { useI18n } from "../i18n";
import { chooseAndRestoreBackup, getRuntimeInfo, readRuntimeLog, restoreLatestBackup, retryRuntime, type RuntimeInfo } from "../tauri-shell";

type RuntimeState = "loading" | "ready" | "failed";

export function RuntimeGate({ children }: PropsWithChildren) {
  const [state, setState] = useState<RuntimeState>("loading");
  const [error, setError] = useState("");
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const { t } = useI18n();

  const load = (retry = false) => {
    setState("loading");
    setError("");
    void (retry ? retryRuntime() : getRuntimeInfo())
      .then((info) => {
        setRuntime(info);
        setOnboarding(info.firstRun);
        setState("ready");
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : String(reason));
        setState("failed");
      });
  };

  useEffect(() => load(), []);

  if (state === "loading") {
    return <main className="runtime-screen" aria-live="polite"><BrandMark className="runtime-screen__brand" /><h1>Quanti</h1><p>{t("Подготовка локальной базы…")}</p></main>;
  }

  if (state === "failed") {
    return (
      <main className="runtime-screen runtime-screen--error" role="alert">
        <BrandMark className="runtime-screen__brand" />
        <h1>{t("Не удалось запустить Quanti")}</h1>
        <p>{error}</p>
        <div className="runtime-screen__actions">
          <button className="button button--primary" onClick={() => load(true)}>{t("Повторить запуск")}</button>
          <button className="button button--secondary" onClick={() => void restoreLatestBackup()
            .then(() => load(true))
            .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)))}>
            {t("Восстановить последнюю копию")}
          </button>
          <button className="button button--secondary" onClick={() => void chooseAndRestoreBackup()
            .then((path) => { if (path) load(true); })
            .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)))}>
            {t("Выбрать резервную копию")}
          </button>
          <button className="button button--secondary" onClick={() => void readRuntimeLog().then((log) => {
            const blob = new Blob([log], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "quanti-runtime.log";
            link.click();
            URL.revokeObjectURL(url);
          })}>{t("Сохранить журнал")}</button>
        </div>
      </main>
    );
  }

  if (onboarding && runtime?.firstRun) {
    return (
      <main className="runtime-screen runtime-screen--onboarding">
        <BrandMark className="runtime-screen__brand" />
        <h1>{t("Перенос данных в локальную Quanti")}</h1>
        <p>{t("Выберите полный quanti-transfer v1 пакет из прежней PostgreSQL-версии. Quanti сначала покажет предпросмотр и импортирует данные одной транзакцией.")}</p>
        <DataTransferControls section="payments" importOnly onImported={() => setOnboarding(false)} />
        <button className="button button--secondary" onClick={() => setOnboarding(false)}>{t("Начать с пустой базы")}</button>
      </main>
    );
  }

  return children;
}
