import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Anchor, ChevronDown } from 'lucide-react';
import { adminMenu, type MenuItem } from './menuConfig';
import './Sidebar.css';

interface SidebarProps {
  menu?: MenuItem[];
  brandLabel?: string;
  homePath?: string;
}

export default function Sidebar({ menu = adminMenu, brandLabel = 'VMU MANAGEMENT', homePath = '/admin' }: SidebarProps) {
  const location = useLocation();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menu.forEach((item) => {
      if (item.children?.some((c) => location.pathname.startsWith(c.path))) {
        initial[item.label] = true;
      }
    });
    return initial;
  });

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Anchor size={22} />
        <span>{brandLabel}</span>
      </div>

      <nav className="sidebar-nav">
        {menu.map((item) => {
          const Icon = item.icon;

          if (!item.children) {
            return (
              <NavLink
                key={item.label}
                to={item.path!}
                end={item.path === homePath}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          }

          const isOpen = !!openGroups[item.label];
          const isGroupActive = item.children.some((c) => location.pathname.startsWith(c.path));

          return (
            <div className="sidebar-group" key={item.label}>
              <button
                type="button"
                className={`sidebar-link sidebar-group-toggle ${isGroupActive ? 'active' : ''}`}
                onClick={() => toggleGroup(item.label)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                <ChevronDown size={16} className={`chevron ${isOpen ? 'open' : ''}`} />
              </button>

              {isOpen && (
                <div className="sidebar-submenu">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
