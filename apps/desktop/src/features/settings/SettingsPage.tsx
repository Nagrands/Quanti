import { useI18n, type Locale } from "../../i18n";
import { useTheme, type ThemePreference } from "../../theme";

export function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = useTheme();

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
    </section>
  );
}
