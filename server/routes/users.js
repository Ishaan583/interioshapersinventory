const express = require('express');
const { DB } = require('../models/db');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users in system (Admin Only)
// @access  Private (Admin Only)
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const users = await DB.Users.find();
    // Map to exclude password
    const safeUsers = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      assignedSite: u.assignedSite,
      createdAt: u.createdAt
    }));
    res.json(safeUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching users list.' });
  }
});

// @route   PATCH /api/users/:id/site
// @desc    Assign site to worker (Admin Only)
// @access  Private (Admin Only)
router.patch('/:id/site', verifyToken, isAdmin, async (req, res) => {
  const { assignedSite } = req.body;

  try {
    // If assignedSite is set, check if site exists
    if (assignedSite) {
      const sites = await DB.Sites.find({ name: assignedSite });
      if (sites.length === 0) {
        return res.status(400).json({ message: `Site "${assignedSite}" does not exist.` });
      }
    }

    const updatedUser = await DB.Users.findByIdAndUpdate(req.params.id, {
      assignedSite: assignedSite || ''
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Log Activity
    await DB.History.create({
      userName: req.user.name,
      action: `Assigned worker "${updatedUser.name}" to site "${assignedSite || 'None'}"`
    });

    res.json({ message: 'Site assignment updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating site assignment.' });
  }
});

module.exports = router;
