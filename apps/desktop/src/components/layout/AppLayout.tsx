import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { primaryNavigation } from "../../app/navigation";
import { useI18n } from "../../i18n";
import { ApiHealthIndicator } from "../status/ApiHealthIndicator";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const { t } = useI18n();
  const location = useLocation();
  const currentRoute = primaryNavigation.find((item) => location.pathname.startsWith(item.path));
  const pageTitle = t(currentRoute?.label ?? "Страница не найдена");

  return (
    <div className="app-shell">
      <Sidebar isOpen={isNavigationOpen} onNavigate={() => setIsNavigationOpen(false)} />
      <button
        type="button"
        className={`navigation-scrim${isNavigationOpen ? " navigation-scrim--visible" : ""}`}
        aria-label={t("Закрыть навигацию")}
        onClick={() => setIsNavigationOpen(false)}
      />

      <div className="app-shell__workspace">
        <header className="app-header">
          <button
            type="button"
            className="icon-button app-header__menu"
            aria-label={t(isNavigationOpen ? "Закрыть навигацию" : "Открыть навигацию")}
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
