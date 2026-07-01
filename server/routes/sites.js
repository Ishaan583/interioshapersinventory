const express = require('express');
const { DB } = require('../models/db');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/sites
// @desc    Get all project sites
// @access  Private (Admin & Worker)
router.get('/', verifyToken, async (req, res) => {
  try {
    const sites = await DB.Sites.find();
    res.json(sites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching sites.' });
  }
});

// @route   POST /api/sites
// @desc    Register a new project site
// @access  Private (Admin Only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Site name is required.' });
  }

  try {
    const siteName = name.trim();
    const site = await DB.Sites.create({ name: siteName });
    
    // Seed new site with all predefined items at 0 quantity
    const { PREDEFINED_ITEMS } = require('../utils/predefined');
    for (let category in PREDEFINED_ITEMS) {
      const itemNames = PREDEFINED_ITEMS[category];
      for (let itemName of itemNames) {
        await DB.Materials.create({
          name: itemName,
          category,
          quantity: 0,
          site: siteName
        });
      }
    }

    // Log Activity
    await DB.History.create({
      userName: req.user.name,
      action: `Created project site "${siteName}" and pre-seeded default materials`
    });

    res.status(201).json({ message: 'Site registered and pre-seeded successfully.', site });
  } catch (err) {
    console.error(err);
    if (err.message === 'Site already exists' || err.code === 11000) {
      return res.status(400).json({ message: 'Site already exists' });
    }
    res.status(500).json({ message: 'Server error registering site.' });
  }
});

// @route   DELETE /api/sites/:id
// @desc    Delete a project site
// @access  Private (Admin Only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const site = await DB.Sites.findByIdAndDelete(req.params.id);
    if (!site) {
      return res.status(404).json({ message: 'Site not found.' });
    }

    // Log Activity
    await DB.History.create({
      userName: req.user.name,
      action: `Deleted project site "${site.name}"`
    });

    res.json({ message: 'Site deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting site.' });
  }
});

module.exports = router;
