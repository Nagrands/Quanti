import { ChevronLeft, ChevronRight } from "lucide-react";
import { NavLink } from "react-router-dom";

import { primaryNavigation } from "../../app/navigation";
import { useI18n } from "../../i18n";
import { BrandMark } from "../branding/BrandMark";

interface SidebarProps {
  isExpanded: boolean;
  isOpen: boolean;
  onNavigate: () => void;
  onToggleExpanded: () => void;
}

export function Sidebar({ isExpanded, isOpen, onNavigate, onToggleExpanded }: SidebarProps) {
  const { t } = useI18n();
  return (
    <aside className={`sidebar${isExpanded ? " sidebar--expanded" : ""}${isOpen ? " sidebar--open" : ""}`} aria-label={t("Основная навигация")}>
      <div className="sidebar__brand">
        <BrandMark className="sidebar__brand-mark" />
        <span className="sidebar__brand-name">Quanti</span>
      </div>
      <nav className="sidebar__navigation">
        {primaryNavigation.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `sidebar__link${isActive ? " sidebar__link--active" : ""}`}
            onClick={onNavigate}
          >
            <Icon aria-hidden="true" />
            <span className="sidebar__link-label">{t(label)}</span>
            <span className="sidebar__tooltip" role="tooltip" aria-hidden="true">{t(label)}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">
        <button
          type="button"
          className="sidebar__toggle"
          aria-label={t(isExpanded ? "Свернуть боковую панель" : "Развернуть боковую панель")}
          aria-expanded={isExpanded}
          onClick={onToggleExpanded}
        >
          {isExpanded ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          <span className="sidebar__toggle-label">{t(isExpanded ? "Свернуть" : "Развернуть")}</span>
        </button>
        <div className="sidebar__meta">
          <span>Quanti ERP</span>
          <span>{t("Версия 0.1")}</span>
        </div>
      </div>
    </aside>
  );
}
