import { NavLink } from "react-router-dom";

import { primaryNavigation } from "../../app/navigation";

interface SidebarProps {
  isOpen: boolean;
  onNavigate: () => void;
}

export function Sidebar({ isOpen, onNavigate }: SidebarProps) {
  return (
    <aside className={`sidebar${isOpen ? " sidebar--open" : ""}`} aria-label="Primary navigation">
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
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">
        <span>Quanti ERP</span>
        <span>Foundation 0.1</span>
      </div>
    </aside>
  );
}
