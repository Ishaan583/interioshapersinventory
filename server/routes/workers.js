const express = require('express');
const { DB } = require('../models/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// A supervisor may only touch the roster at the site they are assigned to.
const siteAllowed = (user, site) => user.role === 'admin' || user.assignedSite === site;

// @route   GET /api/workers
// @desc    List the people working a trade at a site
// @access  Private
router.get('/', verifyToken, async (req, res) => {
  const { category, site } = req.query;
  const query = {};

  if (category) query.category = category;

  if (req.user.role === 'worker') {
    if (!req.user.assignedSite) {
      return res.status(400).json({ message: 'User has no assigned site.' });
    }
    query.site = req.user.assignedSite;
  } else if (site) {
    query.site = site;
  }

  try {
    const workers = await DB.SiteWorkers.find(query);
    res.json(workers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching workers.' });
  }
});

// @route   POST /api/workers
// @desc    Add a worker name to a trade at a site
// @access  Private
router.post('/', verifyToken, async (req, res) => {
  const { name, category, site } = req.body;

  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed || !category || !site) {
    return res.status(400).json({ message: 'Please provide a name, category, and site.' });
  }
  if (trimmed.length > 60) {
    return res.status(400).json({ message: 'Name must be 60 characters or fewer.' });
  }

  if (!siteAllowed(req.user, site)) {
    return res.status(403).json({ message: `You can only manage workers at your assigned site: ${req.user.assignedSite}` });
  }

  try {
    // Same person listed twice under one trade is almost always a mistake
    const existing = await DB.SiteWorkers.find({ category, site });
    if (existing.some(w => w.name.toLowerCase() === trimmed.toLowerCase())) {
      return res.status(400).json({ message: `"${trimmed}" is already listed here.` });
    }

    const worker = await DB.SiteWorkers.create({ name: trimmed, category, site });

    await DB.History.create({
      userName: req.user.name,
      action: `Added ${category} worker "${trimmed}"`,
      site
    });

    res.status(201).json({ message: 'Worker added.', worker });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error adding worker.' });
  }
});

// @route   DELETE /api/workers/:id
// @desc    Remove a worker from a trade roster
// @access  Private
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const worker = await DB.SiteWorkers.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found.' });
    }

    if (!siteAllowed(req.user, worker.site)) {
      return res.status(403).json({ message: 'You can only manage workers at your assigned site.' });
    }

    await DB.SiteWorkers.findByIdAndDelete(req.params.id);

    await DB.History.create({
      userName: req.user.name,
      action: `Removed ${worker.category} worker "${worker.name}"`,
      site: worker.site
    });

    res.json({ message: 'Worker removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error removing worker.' });
  }
});

module.exports = router;
