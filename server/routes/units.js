const express = require('express');
const { DB } = require('../models/db');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/units
// @desc    List the measurement units offered in the unit dropdown
// @access  Private
router.get('/', verifyToken, async (req, res) => {
  try {
    const units = await DB.Units.find();
    res.json(units);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching units.' });
  }
});

// @route   POST /api/units
// @desc    Add a unit to the shared list
// @access  Private (any signed-in user — supervisors need it while requesting)
router.post('/', verifyToken, async (req, res) => {
  const { name } = req.body;

  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    return res.status(400).json({ message: 'Please enter a unit name.' });
  }
  if (trimmed.length > 20) {
    return res.status(400).json({ message: 'Unit name must be 20 characters or fewer.' });
  }

  const key = trimmed.toLowerCase();

  try {
    // Case-insensitive duplicate check keeps "Bag"/"bag" from both landing
    const existing = await DB.Units.findOne({ key });
    if (existing) {
      return res.status(400).json({ message: `Unit "${existing.name}" already exists.` });
    }

    const unit = await DB.Units.create({ name: trimmed, key, order: 100 });

    await DB.History.create({
      userName: req.user.name,
      action: `Added measurement unit "${trimmed}"`
    });

    res.status(201).json({ message: 'Unit added successfully.', unit });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Unit already exists.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error adding unit.' });
  }
});

// @route   DELETE /api/units/:id
// @desc    Remove a unit from the list (existing materials keep their value)
// @access  Private (Admin Only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const deleted = await DB.Units.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Unit not found.' });
    }

    await DB.History.create({
      userName: req.user.name,
      action: `Removed measurement unit "${deleted.name}"`
    });

    res.json({ message: 'Unit removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error removing unit.' });
  }
});

module.exports = router;
