import { Link } from "react-router-dom";
import { useI18n } from "../../i18n";

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <section className="page" aria-labelledby="not-found-title">
      <header className="page__header">
        <p className="page__eyebrow">404</p>
        <h1 id="not-found-title">{t("Страница не найдена")}</h1>
      </header>

      <div className="workspace-panel workspace-panel--compact">
        <div className="workspace-panel__content">
          <h2>{t("Такого раздела не существует")}</h2>
          <p>{t("Используйте основное меню или вернитесь на главную страницу.")}</p>
          <Link className="text-link" to="/dashboard">{t("Вернуться на главную")}</Link>
        </div>
      </div>
    </section>
  );
}
