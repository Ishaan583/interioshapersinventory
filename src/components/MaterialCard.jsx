import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const MaterialCard = ({ material, onQtyChange, onEdit, onDelete }) => {
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [inputValue, setInputValue] = useState(material.quantity);

  const isAdmin = user?.role === 'admin';

  // Sync state if material quantity changes from props
  useEffect(() => {
    setInputValue(material.quantity);
  }, [material.quantity]);

  const handleIncrement = async () => {
    if (updating) return;
    setUpdating(true);
    await onQtyChange(material._id, 1);
    setUpdating(false);
  };

  const handleDecrement = async () => {
    if (updating || material.quantity <= 0) return;
    if (!isAdmin) {
      alert("Only admin can change that");
      return;
    }
    setUpdating(true);
    await onQtyChange(material._id, -1);
    setUpdating(false);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const saveDirectQuantity = async (val) => {
    const parsed = parseInt(val);
    if (isNaN(parsed) || parsed < 0) {
      // Revert if invalid input
      setInputValue(material.quantity);
      return;
    }
    if (parsed === material.quantity) return;

    if (!isAdmin && parsed < material.quantity) {
      alert("Only admin can change that");
      setInputValue(material.quantity);
      return;
    }

    setUpdating(true);
    await onQtyChange(material._id, undefined, parsed);
    setUpdating(false);
  };

  const handleInputBlur = () => {
    saveDirectQuantity(inputValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur(); // Triggers blur which saves the quantity
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

      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={material.name}>
        {material.name}
      </h3>
      
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
        Stock Available: <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{material.quantity}</span>
      </p>

      <div className="material-qty-actions">
        <div className="qty-counter">
          <button 
            className="qty-btn" 
            onClick={handleDecrement} 
            disabled={updating || material.quantity <= 0 || !isAdmin}
            title={!isAdmin ? "Only Admin can decrease stock directly" : "Decrease Quantity"}
            type="button"
          >
            −
          </button>
          <input
            type="number"
            className="qty-input"
            value={updating ? '...' : inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            disabled={updating}
            style={{
              width: '65px',
              textAlign: 'center',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontWeight: '700',
              fontSize: '14px',
              outline: 'none',
              margin: 0,
              padding: 0
            }}
          />
          <button 
            className="qty-btn" 
            onClick={handleIncrement} 
            disabled={updating}
            title="Increase Quantity"
            type="button"
          >
            +
          </button>
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
