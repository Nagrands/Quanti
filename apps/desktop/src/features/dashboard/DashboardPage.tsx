export function DashboardPage() {
  return (
    <section className="page" aria-labelledby="dashboard-title">
      <header className="page__header">
        <p className="page__eyebrow">Overview</p>
        <h1 id="dashboard-title">Dashboard</h1>
      </header>

      <div className="workspace-panel">
        <div className="workspace-panel__content">
          <h2>ERP workspace</h2>
          <p>Select a module from the navigation to begin working.</p>
        </div>
      </div>
    </section>
  );
}
