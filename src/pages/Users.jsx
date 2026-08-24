import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const Users = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchUsersAndSites();
    }
  }, [isAdmin]);

  const fetchUsersAndSites = async () => {
    setLoading(true);
    try {
      const [usersData, sitesData] = await Promise.all([
        API.getUsers(),
        API.getSites()
      ]);
      setUsers(usersData);
      setSites(sitesData);
      setError('');
    } catch (err) {
      setError('Failed to load users data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSiteAssignment = async (userId, siteName) => {
    try {
      await API.assignSite(userId, siteName);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, assignedSite: siteName } : u));
      alert('Site assignment updated successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update site assignment');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (userId === user.id) {
      alert("You cannot change your own admin role directly to avoid locking yourself out of the admin panel.");
      return;
    }
    try {
      await API.updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole, assignedSite: newRole === 'admin' ? '' : u.assignedSite } : u));
      alert('User role updated successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user role');
    }
  };

  if (!isAdmin) {
    return <div className="badge badge-error" style={{ padding: '15px', borderRadius: 'var(--radius-md)', textTransform: 'none' }}>⚠️ Access Denied. Admin privilege required.</div>;
  }

  return (
    <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
        👥 Manage Supervisor Site Assignments
      </h3>

      {loading ? (
        <p>Loading users...</p>
      ) : error ? (
        <div className="badge badge-error" style={{ textTransform: 'none', padding: '10px' }}>{error}</div>
      ) : users.length > 0 ? (
        <>
          {/* Desktop View - Table */}
          <div className="desktop-view custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email Address</th>
                  <th>Role</th>
                  <th>Assigned Project Site</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <strong>{u.name}</strong>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      {u._id === user.id ? (
                        <span className="badge badge-success">
                          {u.role === 'admin' ? 'Admin' : 'Supervisor'}
                        </span>
                      ) : (
                        <select
                          className="form-input"
                          style={{ margin: 0, padding: '6px 12px', minWidth: '120px' }}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        >
                          <option value="worker">Supervisor</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td>
                      {u.role === 'admin' ? (
                        <span style={{ color: 'var(--text-muted)' }}>All Sites Access</span>
                      ) : (
                        <select
                          className="form-input"
                          style={{ margin: 0, padding: '6px 12px', minWidth: '180px' }}
                          value={u.assignedSite || ''}
                          onChange={(e) => handleSiteAssignment(u._id, e.target.value)}
                        >
                          <option value="">-- No Assigned Site --</option>
                          {sites.map(site => (
                            <option key={site._id} value={site.name}>{site.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View - Card List */}
          <div className="mobile-view" style={{ flexDirection: 'column', gap: '16px' }}>
            {users.map(u => {
              const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div key={u._id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--card-border)', transform: 'none', boxShadow: 'var(--shadow-md)' }}>
                  {/* Header (Avatar & Name) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="navbar-avatar" style={{ background: u.role === 'admin' ? '#f59e0b' : 'var(--accent-primary)', border: 'none', width: '40px', height: '40px' }}>
                      {initials}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>{u.name}</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{u.email}</p>
                    </div>
                  </div>

                  {/* Details / Form Controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--card-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Role:</span>
                      {u._id === user.id ? (
                        <span className="badge badge-success" style={{ margin: 0, padding: '4px 8px', fontSize: '12px' }}>
                          {u.role === 'admin' ? 'Admin' : 'Supervisor'}
                        </span>
                      ) : (
                        <select
                          className="form-input"
                          style={{ margin: 0, padding: '4px 8px', fontSize: '13px', width: '140px', height: '32px', minHeight: '32px' }}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        >
                          <option value="worker">Supervisor</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Site Assignment:</span>
                      {u.role === 'admin' ? (
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500', paddingRight: '8px' }}>All Sites Access</span>
                      ) : (
                        <select
                          className="form-input"
                          style={{ margin: 0, padding: '4px 8px', fontSize: '13px', width: '140px', height: '32px', minHeight: '32px' }}
                          value={u.assignedSite || ''}
                          onChange={(e) => handleSiteAssignment(u._id, e.target.value)}
                        >
                          <option value="">-- None --</option>
                          {sites.map(site => (
                            <option key={site._id} value={site.name}>{site.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--text-secondary)' }}>No supervisors registered in system.</p>
      )}
    </div>
  );
};

export default Users;
