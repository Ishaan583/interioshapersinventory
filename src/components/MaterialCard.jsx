import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Quantities are typed by hand (they can be in the thousands), so there are no
// +/- steppers here — just a text field that saves on blur or Enter.
const MaterialCard = ({ material, onQtyChange, onEdit, onDelete }) => {
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [qtyValue, setQtyValue] = useState(String(material.quantity ?? 0));
  const [unitValue, setUnitValue] = useState(material.unit || '');

  const isAdmin = user?.role === 'admin';

  // Sync local state whenever the material is refreshed from the server
  useEffect(() => {
    setQtyValue(String(material.quantity ?? 0));
  }, [material.quantity]);

  useEffect(() => {
    setUnitValue(material.unit || '');
  }, [material.unit]);

  // The inputs deliberately stay enabled while a save is in flight: disabling
  // them would steal focus from the field the user just tabbed/clicked into and
  // swallow their keystrokes.
  const save = async ({ quantity, unit }) => {
    setUpdating(true);
    try {
      await onQtyChange(material._id, undefined, quantity, unit);
    } finally {
      setUpdating(false);
    }
  };

  const saveQuantity = async () => {
    const raw = qtyValue.trim();
    const parsed = parseFloat(raw);

    if (raw === '' || isNaN(parsed) || parsed < 0) {
      setQtyValue(String(material.quantity ?? 0)); // revert invalid input
      return;
    }
    if (parsed === material.quantity) return;

    if (!isAdmin && parsed < material.quantity) {
      alert('Only admin can reduce stock. Use "Return leftover" instead.');
      setQtyValue(String(material.quantity ?? 0));
      return;
    }

    await save({ quantity: parsed });
  };

  const saveUnit = async () => {
    const trimmed = unitValue.trim();
    if (trimmed === (material.unit || '')) return;
    setUnitValue(trimmed);
    await save({ unit: trimmed });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur(); // blur handler performs the save
    }
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <span className="badge badge-pending" style={{ fontSize: '10px' }}>
          {material.category}
        </span>
        {isAdmin && (
          <span className="badge badge-success" style={{ fontSize: '10px' }}>
            📍 {material.site}
          </span>
        )}
      </div>

      <h3
        style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
        title={material.name}
      >
        {material.name}
      </h3>

      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
        Stock Available:{' '}
        <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
          {material.quantity}{material.unit ? ` ${material.unit}` : ''}
        </span>
        {updating && <span className="qty-saving"> saving…</span>}
      </p>

      <div className="material-qty-actions">
        <div className="qty-entry">
          <div className="qty-field">
            <label className="qty-field-label">Quantity</label>
            <input
              type="text"
              inputMode="decimal"
              className="qty-input"
              value={qtyValue}
              onChange={(e) => setQtyValue(e.target.value)}
              onBlur={saveQuantity}
              onKeyDown={handleKeyDown}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              aria-label={`Quantity of ${material.name}`}
            />
          </div>
          <div className="qty-field qty-field-unit">
            <label className="qty-field-label">Unit</label>
            <input
              type="text"
              className="qty-input"
              value={unitValue}
              onChange={(e) => setUnitValue(e.target.value)}
              onBlur={saveUnit}
              onKeyDown={handleKeyDown}
              placeholder="kg, nos…"
              maxLength={20}
              aria-label={`Unit of ${material.name}`}
            />
          </div>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => onEdit(material)}
              title="Edit Material"
            >
              ✏️
            </button>
            <button
              className="btn btn-danger"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => onDelete(material._id)}
              title="Delete Material"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialCard;
