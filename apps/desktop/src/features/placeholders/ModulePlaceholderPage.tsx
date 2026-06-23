interface ModulePlaceholderPageProps {
  title: string;
  description: string;
}

export function ModulePlaceholderPage({ title, description }: ModulePlaceholderPageProps) {
  const { t } = useI18n();
  return (
    <section className="page" aria-labelledby="module-title">
      <header className="page__header">
        <p className="page__eyebrow">{t("Раздел")}</p>
        <h1 id="module-title">{t(title)}</h1>
      </header>

      <div className="workspace-panel workspace-panel--compact">
        <div className="workspace-panel__content">
          <h2>{t(title)}</h2>
          <p>{t(description)}</p>
        </div>
      </div>
    </section>
  );
}
import { useI18n } from "../../i18n";
