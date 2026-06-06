interface ModulePlaceholderPageProps {
  title: string;
  description: string;
}

export function ModulePlaceholderPage({ title, description }: ModulePlaceholderPageProps) {
  return (
    <section className="page" aria-labelledby="module-title">
      <header className="page__header">
        <p className="page__eyebrow">Module</p>
        <h1 id="module-title">{title}</h1>
      </header>

      <div className="workspace-panel workspace-panel--compact">
        <div className="workspace-panel__content">
          <h2>{title} workspace</h2>
          <p>{description}</p>
        </div>
      </div>
    </section>
  );
}
