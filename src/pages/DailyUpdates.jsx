import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

// Group entries by their LOCAL calendar day. Doing this on the client keeps a
// 5am IST entry on today rather than yesterday, which is what grouping by the
// server's UTC date would do.
const localDayKey = (value) => {
  const d = new Date(value);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

const dayHeading = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (localDayKey(today) === key) return 'Today';
  if (localDayKey(yesterday) === key) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
};

const timeOfDay = (value) =>
  new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const DailyUpdates = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [entries, setEntries] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    API.getSites()
      .then(setSites)
      .catch(err => console.error('Failed to fetch sites', err));
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await API.getDailyUpdates(isAdmin ? selectedSite : undefined));
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load the daily updates.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedSite]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matching = term
      ? entries.filter(e =>
          e.action.toLowerCase().includes(term) ||
          e.userName.toLowerCase().includes(term) ||
          (e.site || '').toLowerCase().includes(term))
      : entries;

    const grouped = new Map();
    for (const entry of matching) {
      const key = localDayKey(entry.date);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(entry);
    }

    // Newest day first, and newest entry first within each day
    return [...grouped.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, items]) => ({
        key,
        heading: dayHeading(key),
        items: items.sort((a, b) => new Date(b.date) - new Date(a.date))
      }));
  }, [entries, search]);

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
            🗓️ Daily Updates
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Every material movement, grouped by date
            {isAdmin ? (selectedSite ? ` — ${selectedSite}` : ' — all sites') : ` — ${user?.assignedSite}`}.
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Site:</span>
            <select
              className="form-input"
              style={{ padding: '8px 12px', minWidth: '160px', marginBottom: 0 }}
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
            >
              <option value="">All sites</option>
              {sites.map(s => (
                <option key={s._id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '24px' }}>
        <input
          type="text"
          className="form-input"
          style={{ marginBottom: 0 }}
          placeholder="🔍 Search updates by material, person or site..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="badge badge-error" style={{ width: '100%', padding: '15px', borderRadius: 'var(--radius-md)', marginBottom: '20px', textTransform: 'none', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex-center" style={{ minHeight: '200px' }}>Loading daily updates...</div>
      ) : days.length > 0 ? (
        days.map(day => (
          <div key={day.key} className="daily-day">
            <div className="daily-day-header">
              <h3 className="daily-day-title">{day.heading}</h3>
              <span className="daily-day-count">
                {day.items.length} {day.items.length === 1 ? 'update' : 'updates'}
              </span>
            </div>

            <div className="glass-panel daily-day-body">
              {day.items.map(entry => (
                <div key={entry._id} className="daily-entry">
                  <span className="daily-entry-time">{timeOfDay(entry.date)}</span>
                  <div className="daily-entry-main">
                    <p className="daily-entry-action">{entry.action}</p>
                    <p className="daily-entry-meta">
                      {entry.userName}
                      {entry.site ? ` • 📍 ${entry.site}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="glass-panel flex-center" style={{ minHeight: '220px', flexDirection: 'column', color: 'var(--text-secondary)', borderRadius: 'var(--radius-lg)' }}>
          <span style={{ fontSize: '32px', marginBottom: '10px' }}>🗓️</span>
          <p>{search ? 'No updates match your search.' : 'No material updates recorded yet.'}</p>
        </div>
      )}
    </div>
  );
};

export default DailyUpdates;
