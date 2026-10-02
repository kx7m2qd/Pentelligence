import React from 'react';
import { NAV, NAV_GROUPS } from '../../data/constants';
import { Icon } from '../common/Icon';

export const Sidebar = ({ active, setActive, collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  return (
    <>
      {mobileOpen && <button type="button" className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-mark">P</div>
        {!collapsed && (
          <span className="brand-name">PENTELLIGENCE</span>
        )}
      </div>
      <nav className="sidebar-nav">
        {NAV_GROUPS.map(group => {
          const items = NAV.filter(item => item.group === group.id);
          return (
            <div key={group.id} className="nav-group">
              {!collapsed && <div className="nav-group-label">{group.label}</div>}
              {items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(item.id)}
                  title={item.label}
                  aria-current={active === item.id ? 'page' : undefined}
                  className={`nav-item ${active === item.id ? 'active' : ''}`}
                >
                  <span className="nav-icon"><Icon name={item.icon} size={16} /></span>
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                </button>
              ))}
            </div>
          );
        })}
      </nav>
      <button type="button" className="sidebar-collapse" onClick={() => setCollapsed(value => !value)}>
        <span style={{ transform: collapsed ? 'rotate(180deg)' : 'none', display: 'inline-flex', transition: 'transform .22s' }}><Icon name="chevron-left" size={13} /></span>
        {!collapsed && <span>Collapse</span>}
      </button>
      </aside>
    </>
  );
};
