import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import API from '../services/api';

const UnitsContext = createContext(null);

// The unit list is shared by every material card and form, so it is fetched
// once per session here rather than by each component that needs it.
export const UnitsProvider = ({ children }) => {
  const { token } = useAuth();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setUnits(await API.getUnits());
    } catch (err) {
      console.error('Failed to load units', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) refresh();
    else setUnits([]);
  }, [token, refresh]);

  // Returns the saved unit name so callers can select it straight away.
  const addUnit = useCallback(async (name) => {
    const result = await API.addUnit(name);
    const created = result.unit?.name || name.trim();
    setUnits(prev =>
      prev.some(u => u.name.toLowerCase() === created.toLowerCase())
        ? prev
        : [...prev, result.unit || { _id: created, name: created, order: 100 }]
    );
    return created;
  }, []);

  return (
    <UnitsContext.Provider value={{ units, loading, refresh, addUnit }}>
      {children}
    </UnitsContext.Provider>
  );
};

export const useUnits = () => {
  const context = useContext(UnitsContext);
  if (!context) {
    throw new Error('useUnits must be used within a UnitsProvider');
  }
  return context;
};
