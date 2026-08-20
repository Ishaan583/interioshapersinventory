import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import UnitSelect from '../components/UnitSelect';

const RequestItem = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tab state (Worker: 'request' or 'return')
  const [tab, setTab] = useState('request');

  // Form states (Worker)
  const [category, setCategory] = useState('Carpentry');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Materials available at the worker's site (for Return dropdown validation)
  const [siteMaterials, setSiteMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (!isAdmin && user?.assignedSite) {
      fetchSiteMaterials();
    }
  }, [category, tab, user, isAdmin]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await API.getRequests();
      setRequests(data);
      setError('');
    } catch (err) {
      setError('Failed to load requests.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSiteMaterials = async () => {
    try {
      const data = await API.getMaterials({ category, site: user.assignedSite });
      setSiteMaterials(data);
      
      // Filter materials that have quantity > 0
      const available = data.filter(m => m.quantity > 0);
      if (available.length > 0) {
        setSelectedMaterial(available[0]);
        setName(available[0].name);
        setUnit(available[0].unit || '');
      } else {
        setSelectedMaterial(null);
        setName('');
      }
    } catch (err) {
      console.error('Error fetching site materials for return:', err);
    }
  };

  const handleMaterialSelect = (e) => {
    const matName = e.target.value;
    setName(matName);
    const mat = siteMaterials.find(m => m.name === matName);
    setSelectedMaterial(mat || null);
    setUnit(mat?.unit || '');
    setQuantity('1'); // Reset quantity to 1 when item changes
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (!name || isNaN(qty) || qty <= 0) {
      alert('Please enter a valid item name and quantity.');
      return;
    }
    
    setSubmitting(true);
    try {
      if (tab === 'request') {
        await API.createRequest({
          category,
          name,
          quantity: qty,
          unit,
          reason,
          site: user.assignedSite
        });
        alert('Material request submitted successfully! Admin will review and add.');
      } else {
        // Return leftover workflow
        if (!selectedMaterial) {
          alert('Select a material to return.');
          setSubmitting(false);
          return;
        }
        if (qty > selectedMaterial.quantity) {
          alert(`You cannot return more than available stock (${selectedMaterial.quantity}${selectedMaterial.unit ? ' ' + selectedMaterial.unit : ''}).`);
          setSubmitting(false);
          return;
        }

        await API.createReturn({
          category,
          name,
          quantity: qty,
          reason,
          site: user.assignedSite
        });
        alert('Leftover material returned and inventory updated instantly!');
      }
      
      setName('');
      setQuantity('1');
      setUnit('');
      setReason('');
      fetchRequests();
      if (tab === 'return') {
        fetchSiteMaterials();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id, status) => {
    if (!window.confirm(`Are you sure you want to ${status} this request?`)) return;
    try {
      await API.actionRequest(id, status);
      fetchRequests();
      alert(`Request has been ${status} successfully.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing request');
    }
  };

  return (
    <div className="grid-cols-1">
      {isAdmin ? (
        // Admin View - Requests List to approve/reject
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
            Pending Material Requests & Returns from Sites
          </h2>
          
          {loading ? (
            <div className="flex-center" style={{ minHeight: '150px' }}>Loading requests...</div>
          ) : error ? (
            <div className="badge badge-error" style={{ padding: '10px 15px', borderRadius: 'var(--radius-md)', textTransform: 'none' }}>{error}</div>
          ) : requests.length > 0 ? (
            <>
              {/* Desktop View - Table */}
              <div className="desktop-view custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Supervisor</th>
                      <th>Site</th>
                      <th>Category</th>
                      <th>Material Name</th>
                      <th>Quantity</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr key={req._id}>
                        <td>{new Date(req.date || req.createdAt).toLocaleDateString()}</td>
                        <td>
                          {req.type === 'return' ? (
                            <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                              Return
                            </span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                              Request
                            </span>
                          )}
                        </td>
                        <td><strong>{req.workerName}</strong></td>
                        <td><span className="badge badge-success">{req.site}</span></td>
                        <td>{req.category}</td>
                        <td>{req.name}</td>
                        <td><strong>{req.quantity}</strong>{req.unit ? ` ${req.unit}` : ''}</td>
                        <td>{req.reason || 'N/A'}</td>
                        <td>
                          <span className={`badge badge-${req.status}`}>
                            {req.status}
                          </span>
                        </td>
                        <td>
                          {req.type === 'return' ? (
                            <span style={{ color: 'var(--status-success)', fontWeight: '600' }}>Returned ✅</span>
                          ) : req.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => handleAction(req._id, 'approved')}
                              >
                                Approve
                              </button>
                              <button 
                                className="btn btn-danger" 
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => handleAction(req._id, 'rejected')}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View - Card List */}
              <div className="mobile-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {requests.map((req) => (
                  <div key={req._id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--card-border)', transform: 'none', boxShadow: 'var(--shadow-md)' }}>
                    {/* Header (Type & Site) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        {req.type === 'return' ? (
                          <span className="badge" style={{ margin: 0, background: 'rgba(139, 92, 246, 0.1)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                            Return
                          </span>
                        ) : (
                          <span className="badge" style={{ margin: 0, background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            Request
                          </span>
                        )}
                        <span className="badge badge-success" style={{ marginLeft: '8px', margin: 0 }}>{req.site}</span>
                      </div>
                      <span className={`badge badge-${req.status}`} style={{ margin: 0 }}>
                        {req.status}
                      </span>
                    </div>

                    {/* Body (Material details) */}
                    <div style={{ padding: '12px 0', borderTop: '1px solid var(--card-border)', borderBottom: '1px solid var(--card-border)' }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>
                        {req.name}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Quantity:</span> <strong style={{ color: 'var(--text-primary)' }}>{req.quantity}{req.unit ? ` ${req.unit}` : ''}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Category:</span> <strong style={{ color: 'var(--text-primary)' }}>{req.category}</strong>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Supervisor:</span> <strong style={{ color: 'var(--text-primary)' }}>{req.workerName}</strong>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Reason:</span> <span style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>"{req.reason || 'N/A'}"</span>
                        </div>
                        <div style={{ gridColumn: 'span 2', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Date: {new Date(req.date || req.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Footer (Actions) */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center' }}>
                      {req.type === 'return' ? (
                        <span style={{ color: 'var(--status-success)', fontWeight: '600', fontSize: '14px' }}>Returned ✅</span>
                      ) : req.status === 'pending' ? (
                        <>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleAction(req._id, 'rejected')}
                          >
                            ❌ Reject
                          </button>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleAction(req._id, 'approved')}
                          >
                            ✔️ Approve
                          </button>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Resolved</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0' }}>
              No transactions pending approval.
            </p>
          )}
        </div>
      ) : (
        // Worker View - Submit Request/Return & View Personal History
        <div className="request-grid">
          {/* Submit Form */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            {/* Tab selection */}
            <div style={{ display: 'flex', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '20px', border: '1px solid var(--card-border)' }}>
              <button
                type="button"
                className="btn"
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  background: tab === 'request' ? 'var(--accent-primary)' : 'transparent',
                  color: tab === 'request' ? '#000' : 'var(--text-secondary)',
                  fontWeight: tab === 'request' ? '600' : '500',
                  fontSize: '13px'
                }}
                onClick={() => { setTab('request'); resetForm(); }}
              >
                📝 Request Item
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  background: tab === 'return' ? '#c084fc' : 'transparent',
                  color: tab === 'return' ? '#000' : 'var(--text-secondary)',
                  fontWeight: tab === 'return' ? '600' : '500',
                  fontSize: '13px'
                }}
                onClick={() => { setTab('return'); resetForm(); }}
              >
                ↩️ Return leftover
              </button>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
              {tab === 'request' ? 'Request New Item' : 'Return Leftover Item'}
            </h3>
            
            {!user?.assignedSite ? (
              <div className="badge badge-error" style={{ width: '100%', padding: '15px', borderRadius: 'var(--radius-md)', textTransform: 'none' }}>
                ⚠️ You are not assigned to any site. Please contact Admin.
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit}>
                <div className="form-group">
                  <label className="form-label">Material Category</label>
                  <select 
                    className="form-input" 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Carpentry">Carpentry</option>
                    <option value="False Ceiling">False Ceiling</option>
                    <option value="Painting">Painting</option>
                    <option value="Civil Work">Civil Work</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Modular">Modular</option>
                  </select>
                </div>

                {tab === 'request' ? (
                  // Request Text Input
                  <div className="form-group">
                    <label className="form-label">Material Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Special Wood Screws 2inch"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  // Return Dropdown Selection
                  <div className="form-group">
                    <label className="form-label">Select Leftover Material</label>
                    {siteMaterials.filter(m => m.quantity > 0).length > 0 ? (
                      <select 
                        className="form-input"
                        value={name}
                        onChange={handleMaterialSelect}
                        required
                      >
                        {siteMaterials.filter(m => m.quantity > 0).map(m => (
                          <option key={m._id} value={m.name}>
                            {m.name} (Stock: {m.quantity}{m.unit ? ` ${m.unit}` : ''})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ color: 'var(--status-error)', fontSize: '13px', padding: '10px 0' }}>
                        ⚠️ No items with positive stock in this category to return.
                      </div>
                    )}
                  </div>
                )}

                <div className="qty-unit-row">
                  <div className="form-group">
                    <label className="form-label">
                      {tab === 'request' ? 'Quantity Needed' : 'Quantity to Return'}
                      {tab === 'return' && selectedMaterial && ` (Max: ${selectedMaterial.quantity})`}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="form-input"
                      placeholder="e.g. 1250 or 12.5"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                      disabled={tab === 'return' && !selectedMaterial}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    {/* On a return the unit is fixed by the stocked item */}
                    <UnitSelect value={unit} onChange={setUnit} disabled={tab === 'return'} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {tab === 'request' ? 'Reason / Notes' : 'Return Reason / Condition'}
                  </label>
                  <textarea
                    className="form-input"
                    rows="3"
                    style={{ resize: 'none' }}
                    placeholder={tab === 'request' ? "Why is this needed..." : "Leftover condition (e.g. Unopened box, extra painting putty)..."}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className={`btn ${tab === 'request' ? 'btn-primary' : ''}`} 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: tab === 'return' ? '#c084fc' : undefined,
                    color: '#000',
                    fontWeight: '700'
                  }}
                  disabled={submitting || (tab === 'return' && !selectedMaterial)}
                >
                  {submitting ? 'Processing...' : tab === 'request' ? 'Send Request' : 'Process Return'}
                </button>
              </form>
            )}
          </div>

          {/* Past Requests History */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
              My Transaction History
            </h3>
            
            {loading ? (
              <p>Loading history...</p>
            ) : requests.length > 0 ? (
              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Material</th>
                      <th>Qty</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(req => (
                      <tr key={req._id}>
                        <td>{new Date(req.date || req.createdAt).toLocaleDateString()}</td>
                        <td>
                          {req.type === 'return' ? (
                            <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.2)', fontSize: '10px' }}>
                              Return
                            </span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '10px' }}>
                              Request
                            </span>
                          )}
                        </td>
                        <td><strong>{req.name}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({req.category})</span></td>
                        <td>{req.quantity}{req.unit ? ` ${req.unit}` : ''}</td>
                        <td>{req.reason || '-'}</td>
                        <td>
                          <span className={`badge badge-${req.status}`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
                You have no history yet.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  function resetForm() {
    setName('');
    setQuantity('1');
    setUnit('');
    setReason('');
    setSelectedMaterial(null);
  }
};

export default RequestItem;
