const express = require('express');
const { DB } = require('../models/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/stats
// @desc    Get dashboard summary statistics and recent activity logs
// @access  Private
router.get('/', verifyToken, async (req, res) => {
  const { site } = req.query;

  try {
    const isAdmin = req.user.role === 'admin';

    // Counts are done in the database and the four lookups run in parallel —
    // the dashboard is the first page after login, so this is the request the
    // user waits on most.
    let totalMaterials = 0;
    let totalSites = 0;
    let pendingRequests = 0;
    let recentActivity = [];

    if (isAdmin) {
      const siteFilter = site ? { site } : {};
      const reqFilter = site ? { site, status: 'pending' } : { status: 'pending' };

      [totalMaterials, totalSites, pendingRequests, recentActivity] = await Promise.all([
        DB.Materials.count(siteFilter),
        DB.Sites.count(),
        DB.Requests.count(reqFilter),
        DB.History.find(siteFilter)
      ]);
    } else {
      // Worker dashboard metrics (locked to assigned site)
      const assignedSiteName = req.user.assignedSite;

      if (assignedSiteName) {
        [totalMaterials, pendingRequests, recentActivity] = await Promise.all([
          DB.Materials.count({ site: assignedSiteName }),
          // Pending requests submitted by this specific worker
          DB.Requests.count({ workerId: req.user.id, status: 'pending' }),
          DB.History.find({ site: assignedSiteName })
        ]);
      }
    }

    res.json({
      totalMaterials,
      totalSites,
      pendingRequests,
      recentActivity
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error generating stats metrics.' });
  }
});

module.exports = router;
