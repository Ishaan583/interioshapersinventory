import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

// What to call the people working each trade, so the Carpentry page reads
// "Carpenters Working" rather than a generic label.
const TRADE_LABELS = {
  'Carpentry': { singular: 'Carpenter', plural: 'Carpenters' },
  'Painting': { singular: 'Painter', plural: 'Painters' },
  'Electrical': { singular: 'Electrician', plural: 'Electricians' },
  'Civil Work': { singular: 'Civil Worker', plural: 'Civil Workers' },
  'False Ceiling': { singular: 'False Ceiling Worker', plural: 'False Ceiling Workers' },
  'Modular': { singular: 'Modular Fitter', plural: 'Modular Fitters' }
};

const WorkersPanel = ({ category, site }) => {
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(true);

  const labels = TRADE_LABELS[category] || { singular: 'Worker', plural: 'Workers' };

  // A supervisor may only edit their own site's roster; admins edit any.
  const canEdit = user?.role === 'admin' || user?.assignedSite === site;

  const load = useCallback(async () => {
    if (!site) return;
    setLoading(true);
    try {
      setWorkers(await API.getWorkers({ category, site }));
    } catch (err) {
      console.error('Failed to load workers', err);
    } finally {
      setLoading(false);
    }
  }, [category, site]);

  useEffect(() => {
    load();
    // CategoryPage renders the same component across trades, so React keeps
    // this instance alive on navigation — clear a half-typed name rather than
    // carrying it from Carpentry over to Painting.
    setName('');
    setError('');
  }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    setError('');
    try {
      await API.addWorker({ name: trimmed, category, site });
      setName('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add that name.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (worker) => {
    if (!window.confirm(`Remove ${worker.name} from ${labels.plural.toLowerCase()} at ${site}?`)) return;
    try {
      await API.deleteWorker(worker._id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not remove that name.');
    }
  };

  if (!site) return null;

  return (
    <div className="glass-panel workers-panel">
      <button
        type="button"
        className="workers-panel-header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="workers-panel-title">
          👷 {labels.plural} Working
          <span className="workers-count">{loading ? '…' : workers.length}</span>
        </span>
        <span className="workers-panel-caret">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="workers-panel-body">
          {workers.length > 0 ? (
            <ol className="workers-list">
              {workers.map((w, i) => (
                <li key={w._id} className="workers-list-item">
                  <span className="workers-list-index">{i + 1}.</span>
                  <span className="workers-list-name">{w.name}</span>
                  {canEdit && (
                    <button
                      type="button"
                      className="workers-remove-btn"
                      onClick={() => handleDelete(w)}
                      title={`Remove ${w.name}`}
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            !loading && (
              <p className="workers-empty">
                No {labels.plural.toLowerCase()} listed at {site} yet.
              </p>
            )
          )}

          {canEdit && (
            <form className="workers-add-row" onSubmit={handleAdd}>
              <input
                type="text"
                className="form-input"
                placeholder={`${labels.singular} name —`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                aria-label={`New ${labels.singular} name`}
              />
              <button type="submit" className="btn btn-secondary" disabled={saving || !name.trim()}>
                {saving ? 'Adding…' : '➕ Add'}
              </button>
            </form>
          )}

          {error && <p className="workers-error">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default WorkersPanel;
