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
    let totalMaterials = 0;
    let totalSites = 0;
    let pendingRequests = 0;
    let recentActivity = [];

    const isAdmin = req.user.role === 'admin';

    if (isAdmin) {
      // Admin dashboard metrics
      const siteFilter = site ? { site } : {};
      const materials = await DB.Materials.find(siteFilter);
      totalMaterials = materials.length;

      const sites = await DB.Sites.find();
      totalSites = sites.length;

      const reqFilter = site ? { site, status: 'pending' } : { status: 'pending' };
      const requests = await DB.Requests.find(reqFilter);
      pendingRequests = requests.length;

      const histFilter = site ? { site } : {};
      recentActivity = await DB.History.find(histFilter);

    } else {
      // Worker dashboard metrics (locked to assigned site)
      const assignedSiteName = req.user.assignedSite;
      
      if (assignedSiteName) {
        const materials = await DB.Materials.find({ site: assignedSiteName });
        totalMaterials = materials.length;

        // Pending requests submitted by this specific worker
        const requests = await DB.Requests.find({ 
          workerId: req.user.id,
          status: 'pending' 
        });
        pendingRequests = requests.length;

        // Recent activity history for their assigned site
        recentActivity = await DB.History.find({ site: assignedSiteName });
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
