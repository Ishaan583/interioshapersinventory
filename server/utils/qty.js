// Quantities are entered by hand and can be large or fractional (e.g. 2.5 bags,
// 1250 nos), so they are parsed as floats rather than integers.
const parseQty = (value) => {
  const parsed = parseFloat(value);
  if (isNaN(parsed) || !isFinite(parsed)) return null;
  // Trim floating point noise (0.1 + 0.2 style) to 3 decimal places.
  return Math.round(parsed * 1000) / 1000;
};

// Units are free text typed by the site staff: "kg", "nos", "sq ft", "bags"...
const parseUnit = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 20);
};

module.exports = { parseQty, parseUnit };
