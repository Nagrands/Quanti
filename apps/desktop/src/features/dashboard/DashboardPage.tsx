import { useI18n } from "../../i18n";

export function DashboardPage() {
  const { t } = useI18n();
  return (
    <section className="page" aria-labelledby="dashboard-title">
      <header className="page__header">
        <p className="page__eyebrow">{t("Обзор")}</p>
        <h1 id="dashboard-title">{t("Главная")}</h1>
      </header>

      <div className="workspace-panel">
        <div className="workspace-panel__content">
          <h2>{t("Рабочее пространство ERP")}</h2>
          <p>{t("Выберите раздел в меню, чтобы начать работу.")}</p>
        </div>
      </div>
    </section>
  );
}
