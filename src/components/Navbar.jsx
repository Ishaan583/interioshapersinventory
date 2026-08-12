import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ toggleSidebar }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  // Map route paths to page titles
  const getPageTitle = (path) => {
    const map = {
      '/dashboard': 'Dashboard Overview',
      '/carpentry': 'Carpentry Materials',
      '/false-ceiling': 'False Ceiling Materials',
      '/painting': 'Painting Materials',
      '/civil-work': 'Civil Work Materials',
      '/electrical': 'Electrical Materials',
      '/modular': 'Modular Materials',
      '/request': user?.role === 'admin' ? 'Pending Material Requests' : 'Request Material',
      '/sites': 'Manage Project Sites',
      '/users': 'Manage Supervisors & Assignments',
    };
    return map[path] || 'Inventory Management';
  };

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
          ☰
        </button>
        <h1 className="navbar-title">{getPageTitle(location.pathname)}</h1>
      </div>

      <div className="navbar-user-info">
        <div className="navbar-user-details">
          <div className="navbar-user-name">{user.name}</div>
          <div className="navbar-user-role">
            {user.role === 'admin' ? 'Admin' : 'Supervisor'} {user.assignedSite ? `• Site: ${user.assignedSite}` : ''}
          </div>
        </div>
        <div className={`navbar-avatar ${user.role === 'admin' ? 'admin' : ''}`}>
          {initials}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
