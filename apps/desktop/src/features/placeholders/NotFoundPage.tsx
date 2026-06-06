import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="page" aria-labelledby="not-found-title">
      <header className="page__header">
        <p className="page__eyebrow">404</p>
        <h1 id="not-found-title">Page not found</h1>
      </header>

      <div className="workspace-panel workspace-panel--compact">
        <div className="workspace-panel__content">
          <h2>This workspace does not exist</h2>
          <p>Use the primary navigation or return to the dashboard.</p>
          <Link className="text-link" to="/dashboard">Return to Dashboard</Link>
        </div>
      </div>
    </section>
  );
}
