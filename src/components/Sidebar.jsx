import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ collapsed }) => {
  const { user, logout } = useAuth();
  
  if (!user) return null;
  const isAdmin = user.role === 'admin';

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/carpentry', label: 'Carpentry', icon: '🪵' },
    { path: '/false-ceiling', label: 'False Ceiling', icon: '🏗️' },
    { path: '/painting', label: 'Painting', icon: '🎨' },
    { path: '/aluminium', label: 'Aluminium Work', icon: '🪟' },
    { path: '/electrical', label: 'Electrical', icon: '⚡' },
    { path: '/modular', label: 'Modular', icon: '📦' },
    { path: '/request', label: isAdmin ? 'Material Requests' : 'Request Material', icon: '➕' },
  ];

  if (isAdmin) {
    menuItems.push(
      { path: '/sites', label: 'Sites Management', icon: '📍' },
      { path: '/users', label: 'Users Management', icon: '👥' }
    );
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-logo-icon">IS</div>
        {!collapsed && <span className="sidebar-logo">Interio Shapers</span>}
      </div>
      
      <nav className="sidebar-menu">
        {menuItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-logout-btn" onClick={logout} title={collapsed ? 'Logout' : undefined}>
          <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
