import React, { useState } from 'react';
import { useUnits } from '../context/UnitsContext';

const ADD_NEW = '__add_new_unit__';

// Dropdown of the shared unit list, with an inline "add new unit" escape hatch.
// A value already saved on a material is always kept as an option even if it is
// not in the list any more, so editing an item can never silently change it.
const UnitSelect = ({ value, onChange, className = 'form-input', style, disabled, ariaLabel = 'Unit' }) => {
  const { units, addUnit } = useUnits();
  const [saving, setSaving] = useState(false);

  const current = value || '';
  const known = units.some(u => u.name.toLowerCase() === current.toLowerCase());

  const handleChange = async (e) => {
    const picked = e.target.value;

    if (picked !== ADD_NEW) {
      onChange(picked);
      return;
    }

    const entered = window.prompt('Enter the new unit (e.g. Roll, Bundle, Ton):');
    if (entered === null) return; // cancelled — leave the current value alone

    const trimmed = entered.trim();
    if (!trimmed) return;

    // Already in the list? Just select it rather than erroring.
    const existing = units.find(u => u.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      onChange(existing.name);
      return;
    }

    setSaving(true);
    try {
      onChange(await addUnit(trimmed));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not add that unit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      className={className}
      style={style}
      value={current}
      onChange={handleChange}
      disabled={disabled || saving}
      aria-label={ariaLabel}
    >
      <option value="">— Unit —</option>

      {/* Preserve a legacy or removed unit that is still saved on this item */}
      {current && !known && <option value={current}>{current}</option>}

      {units.map(u => (
        <option key={u._id || u.name} value={u.name}>{u.name}</option>
      ))}

      <option value={ADD_NEW}>➕ Add new unit…</option>
    </select>
  );
};

export default UnitSelect;
