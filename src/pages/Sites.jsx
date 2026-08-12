import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const Sites = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [sites, setSites] = useState([]);
  const [newSiteName, setNewSiteName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchSites();
    }
  }, [isAdmin]);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const data = await API.getSites();
      setSites(data);
      setError('');
    } catch (err) {
      setError('Failed to load project sites.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSite = async (e) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;
    
    try {
      const result = await API.addSite(newSiteName.trim());
      setNewSiteName('');
      fetchSites();
      alert(result.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add project site');
    }
  };

  const handleDeleteSite = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete project site: "${name}"? This does NOT delete existing materials assigned to this site, but will prevent assigning new materials/supervisors to this site.`)) return;
    try {
      await API.deleteSite(id);
      fetchSites();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project site');
    }
  };

  if (!isAdmin) {
    return <div className="badge badge-error" style={{ padding: '15px', borderRadius: 'var(--radius-md)', textTransform: 'none' }}>⚠️ Access Denied. Admin privilege required.</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
      {/* Add New Site Panel */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
          📍 Register Project Site
        </h3>
        
        <form onSubmit={handleAddSite}>
          <div className="form-group">
            <label className="form-label" htmlFor="siteName">Site Name / City</label>
            <input
              type="text"
              id="siteName"
              className="form-input"
              placeholder="e.g. Jaipur, Delhi"
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px' }}
          >
            Create Project Site
          </button>
        </form>
      </div>

      {/* Active Sites List Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
          Active Project Sites
        </h3>

        {loading ? (
          <p>Loading sites...</p>
        ) : error ? (
          <div className="badge badge-error" style={{ textTransform: 'none', padding: '10px' }}>{error}</div>
        ) : sites.length > 0 ? (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Site Name / Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sites.map(site => (
                  <tr key={site._id}>
                    <td>
                      <span style={{ fontSize: '16px', fontWeight: '600' }}>📍 {site.name}</span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleDeleteSite(site._id, site.name)}
                      >
                        Delete Site
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
            No project sites registered yet. Use the form to add one.
          </p>
        )}
      </div>
    </div>
  );
};

export default Sites;
