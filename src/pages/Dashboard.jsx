import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const Dashboard = () => {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [stats, setStats] = useState(null);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(isAdmin ? '' : user?.assignedSite || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryMaterials, setSummaryMaterials] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summarySearch, setSummarySearch] = useState('');
  const [summaryError, setSummaryError] = useState('');

  // Supervisors only ever see their own site; an admin sees whichever site is
  // picked in the header, so each branch gets its own summary.
  const summarySite = isAdmin ? selectedSite : user?.assignedSite;

  const openSummaryModal = async () => {
    if (!summarySite) return;
    setShowSummaryModal(true);
    setSummarySearch('');
    setSummaryError('');
    // Drop the previous site's rows so a slow fetch never shows the wrong branch
    setSummaryMaterials([]);
    setSummaryLoading(true);

    const requestedSite = summarySite;
    try {
      const data = await API.getMaterials({ site: requestedSite });
      // Ignore a response that arrived after the admin switched sites again
      if (requestedSite !== summarySiteRef.current) return;
      setSummaryMaterials(data.filter(m => m.quantity > 0));
    } catch (err) {
      console.error('Failed to fetch stock summary:', err);
      setSummaryError('Failed to load the stock summary. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const closeSummaryModal = () => {
    setShowSummaryModal(false);
    setSummarySearch('');
  };

  const summarySiteRef = useRef(summarySite);
  useEffect(() => {
    summarySiteRef.current = summarySite;
  }, [summarySite]);

  // Site list is static for the session — fetch it once instead of on every
  // site switch.
  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
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
    if (isAdmin && !selectedSite) return;
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
    window.open(`${apiBase}/api/reports/export?token=${token}`, '_blank');
  };

  const handleExportSite = () => {
    if (!selectedSite) return;
    const apiBase = import.meta.env.VITE_API_URL || '';
    window.open(`${apiBase}/api/reports/export?site=${encodeURIComponent(selectedSite)}&token=${token}`, '_blank');
  };

  if (loading && !stats) {
    return <div className="flex-center" style={{ minHeight: '300px' }}>Loading metrics...</div>;
  }

  const filteredSummary = summaryMaterials.filter(m => 
    m.name.toLowerCase().includes(summarySearch.toLowerCase()) ||
    m.category.toLowerCase().includes(summarySearch.toLowerCase())
  );

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
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
              className="btn btn-secondary"
              onClick={openSummaryModal}
              disabled={!selectedSite}
              title={`Stock summary for ${selectedSite || 'the selected site'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              📋 Stock Summary
            </button>

            <button 
              className="btn btn-primary" 
              onClick={handleExportSite}
              title="Download Excel Spreadsheet"
            >
              📥 Export Excel
            </button>
          </div>
        )}
        {!isAdmin && user?.assignedSite && (
          <button 
            className="btn btn-primary" 
            onClick={openSummaryModal}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            📋 View Site Stock Summary
          </button>
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

      {/* Shortcuts / Material Page Links */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '30px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>
          🚀 Quick Material Categories
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <Link to="/carpentry" className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: '32px' }}>🪵</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '2px' }}>Carpentry</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Plywood, Fevicol, Nails...</div>
            </div>
          </Link>
          <Link to="/false-ceiling" className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: '32px' }}>🏗️</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '2px' }}>False Ceiling</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Gypsum, Stud, Floor...</div>
            </div>
          </Link>
          <Link to="/painting" className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: '32px' }}>🎨</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '2px' }}>Painting</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Putty, Primers, Paint...</div>
            </div>
          </Link>
          <Link to="/civil-work" className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: '32px' }}>🧱</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '2px' }}>Civil Work</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Bricks, Sand, Cement, Steel...</div>
            </div>
          </Link>
          <Link to="/electrical" className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: '32px' }}>⚡</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '2px' }}>Electrical</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Wires, Switchboards, MCBs...</div>
            </div>
          </Link>
          <Link to="/modular" className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: '32px' }}>📦</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '2px' }}>Modular</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tables, Locks, Handles...</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Stock Summary Modal Overlay */}
      {showSummaryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', margin: 'auto', borderRadius: 'var(--radius-lg)', padding: '30px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex-between" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700' }}>
                📋 Stock Summary: {summarySite}
              </h3>
              <button 
                className="btn btn-secondary" 
                onClick={closeSummaryModal}
                style={{ padding: '4px 10px', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              className="form-input"
              style={{ marginBottom: '15px' }}
              placeholder="🔍 Search stock summary by name or category..."
              value={summarySearch}
              onChange={(e) => setSummarySearch(e.target.value)}
            />

            <div style={{ overflowY: 'auto', flexGrow: 1, minHeight: '200px' }}>
              {summaryLoading ? (
                <div className="flex-center" style={{ minHeight: '200px' }}>Loading stock summary...</div>
              ) : summaryError ? (
                <div className="badge badge-error" style={{ width: '100%', padding: '15px', borderRadius: 'var(--radius-md)', textTransform: 'none', fontSize: '14px' }}>
                  {summaryError}
                </div>
              ) : filteredSummary.length > 0 ? (
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Material Name</th>
                        <th style={{ textAlign: 'right' }}>Stock Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSummary.map(m => (
                        <tr key={m._id}>
                          <td>
                            <span className="badge badge-pending" style={{ fontSize: '11px' }}>
                              {m.category}
                            </span>
                          </td>
                          <td><strong>{m.name}</strong></td>
                          <td style={{ textAlign: 'right', fontWeight: '700' }}>
                            {m.quantity}
                            {m.unit ? <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}> {m.unit}</span> : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-center" style={{ minHeight: '200px', flexDirection: 'column', color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: '32px', marginBottom: '10px' }}>📦</span>
                  <p>No filled items currently in stock at this site.</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={closeSummaryModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
