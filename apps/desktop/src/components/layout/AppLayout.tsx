import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { primaryNavigation } from "../../app/navigation";
import { useI18n } from "../../i18n";
import { ApiHealthIndicator } from "../status/ApiHealthIndicator";
import { Sidebar } from "./Sidebar";

const SIDEBAR_STORAGE_KEY = "quanti.sidebar.expanded";

function getStoredSidebarState() {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function AppLayout() {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(getStoredSidebarState);
  const { t } = useI18n();
  const location = useLocation();
  const currentRoute = primaryNavigation.find((item) => location.pathname.startsWith(item.path));
  const pageTitle = t(currentRoute?.label ?? "Страница не найдена");

  return (
    <div className={`app-shell${isSidebarExpanded ? " app-shell--sidebar-expanded" : ""}`}>
      <Sidebar
        isExpanded={isSidebarExpanded}
        isOpen={isNavigationOpen}
        onNavigate={() => setIsNavigationOpen(false)}
        onToggleExpanded={() => setIsSidebarExpanded((isExpanded) => {
          const next = !isExpanded;
          try {
            window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
          } catch {
            // Persistence is optional in restricted browser environments.
          }
          return next;
        })}
      />
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
