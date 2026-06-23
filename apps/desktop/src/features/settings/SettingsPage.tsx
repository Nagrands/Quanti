import { useI18n, type Locale } from "../../i18n";

export function SettingsPage() {
  const { locale, setLocale, t } = useI18n();

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
      </div>
    </section>
  );
}
