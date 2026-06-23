import { NavLink } from "react-router-dom";

import { primaryNavigation } from "../../app/navigation";
import { useI18n } from "../../i18n";

interface SidebarProps {
  isOpen: boolean;
  onNavigate: () => void;
}

export function Sidebar({ isOpen, onNavigate }: SidebarProps) {
  const { t } = useI18n();
  return (
    <aside className={`sidebar${isOpen ? " sidebar--open" : ""}`} aria-label={t("Основная навигация")}>
      <div className="sidebar__brand">Quanti</div>
      <nav className="sidebar__navigation">
        {primaryNavigation.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `sidebar__link${isActive ? " sidebar__link--active" : ""}`}
            onClick={onNavigate}
          >
            <Icon aria-hidden="true" />
            <span>{t(label)}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">
        <span>Quanti ERP</span>
        <span>{t("Версия 0.1")}</span>
      </div>
    </aside>
  );
}
