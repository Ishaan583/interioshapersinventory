import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [stats, setStats] = useState(null);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(isAdmin ? '' : user?.assignedSite || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSites();
    fetchDashboardStats();
  }, [selectedSite]);

  const fetchSites = async () => {
    if (!isAdmin) return;
    try {
      const data = await API.getSites();
      setSites(data);
      if (data.length > 0 && !selectedSite) {
        setSelectedSite(data[0].name);
      }
    } catch (err) {
      console.error('Failed to fetch sites', err);
    }
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const data = await API.getStats(selectedSite);
      setStats(data);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard metrics.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = () => {
    const apiBase = import.meta.env.VITE_API_URL || '';
    window.open(`${apiBase}/api/reports/export`, '_blank');
  };

  const handleExportSite = () => {
    if (!selectedSite) return;
    const apiBase = import.meta.env.VITE_API_URL || '';
    window.open(`${apiBase}/api/reports/export?site=${encodeURIComponent(selectedSite)}`, '_blank');
  };

  if (loading && !stats) {
    return <div className="flex-center" style={{ minHeight: '300px' }}>Loading metrics...</div>;
  }

  return (
    <div>
      {/* Welcome header */}
      <div className="flex-between" style={{ marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
            Welcome back, {user?.name}!
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Here is the current inventory status for {isAdmin ? selectedSite : user?.assignedSite}.
          </p>
        </div>
        
        {isAdmin && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Site:</span>
              <select 
                className="form-input" 
                style={{ padding: '8px 12px', minWidth: '160px', marginBottom: 0 }}
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
              >
                {sites.map(s => (
                  <option key={s._id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            
            <button 
              className="btn btn-primary" 
              onClick={handleExportSite}
              title="Download Excel Spreadsheet"
            >
              📥 Export Excel
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="badge badge-error" style={{ width: '100%', padding: '15px', borderRadius: 'var(--radius-md)', marginBottom: '25px', textTransform: 'none', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="stat-card-grid">
        {isAdmin ? (
          <>
            <div className="glass-card stat-card">
              <div className="stat-card-icon">📦</div>
              <div className="stat-card-info">
                <h3>Total Materials</h3>
                <p>{stats?.totalMaterials || 0}</p>
              </div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-card-icon">📍</div>
              <div className="stat-card-info">
                <h3>Project Sites</h3>
                <p>{stats?.totalSites || 0}</p>
              </div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-card-icon">➕</div>
              <div className="stat-card-info">
                <h3>Pending Requests</h3>
                <p>{stats?.pendingRequests || 0}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="glass-card stat-card">
              <div className="stat-card-icon">📍</div>
              <div className="stat-card-info">
                <h3>Assigned Site</h3>
                <p>{user?.assignedSite || 'None'}</p>
              </div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-card-icon">📦</div>
              <div className="stat-card-info">
                <h3>Items in Site</h3>
                <p>{stats?.totalMaterials || 0}</p>
              </div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-card-icon">➕</div>
              <div className="stat-card-info">
                <h3>My Pending Requests</h3>
                <p>{stats?.pendingRequests || 0}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Grid for recent logs and shortcuts */}
      <div className="grid-cols-2">
        {/* Recent Activity Card */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔔 Recent Activity History
          </h3>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="recent-activity-list">
              {stats.recentActivity.map((activity, idx) => (
                <div key={idx} className="recent-activity-item">
                  <div>
                    <span className="activity-user">{activity.userName}</span>{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>{activity.action}</span>
                    {activity.site && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        {' '}at site <strong style={{ color: 'var(--text-secondary)' }}>{activity.site}</strong>
                      </span>
                    )}
                  </div>
                  <div className="activity-time">
                    {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
              No recent activity recorded.
            </p>
          )}
        </div>

        {/* Shortcuts / Material Page Links */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
            🚀 Quick Material Categories
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <Link to="/carpentry" className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🪵</span>
              <div>
                <div style={{ fontWeight: '600' }}>Carpentry</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Plywood, Fevicol...</div>
              </div>
            </Link>
            <Link to="/false-ceiling" className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🏗️</span>
              <div>
                <div style={{ fontWeight: '600' }}>False Ceiling</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Gypsum, Compound...</div>
              </div>
            </Link>
            <Link to="/painting" className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🎨</span>
              <div>
                <div style={{ fontWeight: '600' }}>Painting</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Putty, Primers...</div>
              </div>
            </Link>
            <Link to="/aluminium" className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🪟</span>
              <div>
                <div style={{ fontWeight: '600' }}>Aluminium Work</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sections, Glass...</div>
              </div>
            </Link>
            <Link to="/electrical" className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>⚡</span>
              <div>
                <div style={{ fontWeight: '600' }}>Electrical</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Wires, Switchboards...</div>
              </div>
            </Link>
            <Link to="/modular" className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>📦</span>
              <div>
                <div style={{ fontWeight: '600' }}>Modular</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tables, Hinges...</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
