const express = require('express');
const { DB } = require('../models/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// How many log entries the daily view pulls back at most.
const MAX_ENTRIES = 500;

// @route   GET /api/daily
// @desc    Material activity log for the date-wise daily update view.
//          Entries are returned flat with their timestamps; the client groups
//          them by date so days break in the viewer's own timezone rather than
//          the server's UTC (an early-morning IST entry would otherwise land
//          on the previous day).
// @access  Private
router.get('/', verifyToken, async (req, res) => {
  const { site } = req.query;
  const query = {};

  if (req.user.role === 'worker') {
    if (!req.user.assignedSite) {
      return res.status(400).json({ message: 'User has no assigned site.' });
    }
    query.site = req.user.assignedSite;
  } else if (site) {
    query.site = site;
  }

  try {
    const entries = await DB.History.find(query, { limit: MAX_ENTRIES });
    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching daily updates.' });
  }
});

module.exports = router;
