import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { primaryNavigation } from "../../app/navigation";
import { ApiHealthIndicator } from "../status/ApiHealthIndicator";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const location = useLocation();
  const currentRoute = primaryNavigation.find((item) => location.pathname.startsWith(item.path));
  const pageTitle = currentRoute?.label ?? "Page not found";

  return (
    <div className="app-shell">
      <Sidebar isOpen={isNavigationOpen} onNavigate={() => setIsNavigationOpen(false)} />
      <button
        type="button"
        className={`navigation-scrim${isNavigationOpen ? " navigation-scrim--visible" : ""}`}
        aria-label="Close navigation"
        onClick={() => setIsNavigationOpen(false)}
      />

      <div className="app-shell__workspace">
        <header className="app-header">
          <button
            type="button"
            className="icon-button app-header__menu"
            aria-label={isNavigationOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isNavigationOpen}
            onClick={() => setIsNavigationOpen((isOpen) => !isOpen)}
          >
            {isNavigationOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
          <span className="app-header__context">{pageTitle}</span>
          <ApiHealthIndicator />
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
