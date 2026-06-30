const express = require('express');
const { DB } = require('../models/db');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/materials
// @desc    Get materials filtered by category and/or site
// @access  Private
router.get('/', verifyToken, async (req, res) => {
  const { category, site } = req.query;
  const query = {};
  
  if (category) query.category = category;

  // Access check
  if (req.user.role === 'worker') {
    // Worker is locked to their assigned site
    if (!req.user.assignedSite) {
      return res.status(400).json({ message: 'User has no assigned site.' });
    }
    query.site = req.user.assignedSite;
  } else {
    // Admin can filter by site, or view all if site query is empty
    if (site) query.site = site;
  }

  try {
    const materials = await DB.Materials.find(query);
    res.json(materials);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching materials.' });
  }
});

// @route   POST /api/materials
// @desc    Add material (Admin Only, incorporates duplicate merging)
// @access  Private (Admin Only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  const { name, category, quantity, site } = req.body;

  if (!name || !category || quantity === undefined || !site) {
    return res.status(400).json({ message: 'Please provide name, category, quantity, and site.' });
  }

  const trimmedName = name.trim();
  const parsedQty = parseInt(quantity);

  try {
    // Check if site exists
    const sites = await DB.Sites.find({ name: site });
    if (sites.length === 0) {
      return res.status(400).json({ message: `Project site "${site}" is not registered.` });
    }

    // Duplicate Item Check (case-insensitive merging for name, site, and category)
    const existing = await DB.Materials.find({
      category,
      site
    });

    const duplicate = existing.find(m => m.name.toLowerCase() === trimmedName.toLowerCase());

    if (duplicate) {
      // Merge with existing
      const newQty = duplicate.quantity + parsedQty;
      const updated = await DB.Materials.findByIdAndUpdate(duplicate._id, { quantity: newQty });
      
      // Log Activity
      await DB.History.create({
        userName: req.user.name,
        action: `Merged ${parsedQty} units into existing item "${duplicate.name}" (New Qty: ${newQty})`,
        site
      });

      return res.json({ 
        message: `Merged quantity of "${duplicate.name}" in site "${site}" to ${newQty}.`,
        material: updated 
      });
    }

    // Create new item
    const newMaterial = await DB.Materials.create({
      name: trimmedName,
      category,
      quantity: parsedQty,
      site
    });

    // Log Activity
    await DB.History.create({
      userName: req.user.name,
      action: `Created material "${trimmedName}" with quantity ${parsedQty}`,
      site
    });

    res.status(201).json({ message: 'Material added successfully.', material: newMaterial });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error adding material.' });
  }
});

// @route   PUT /api/materials/:id
// @desc    Edit material details (Admin Only)
// @access  Private (Admin Only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  const { name, site, quantity } = req.body;

  try {
    const material = await DB.Materials.find({ _id: req.params.id });
    if (material.length === 0) {
      return res.status(404).json({ message: 'Material not found.' });
    }

    const updated = await DB.Materials.findByIdAndUpdate(req.params.id, {
      name: name ? name.trim() : material[0].name,
      site: site || material[0].site,
      quantity: quantity !== undefined ? parseInt(quantity) : material[0].quantity
    });

    // Log Activity
    await DB.History.create({
      userName: req.user.name,
      action: `Updated material "${updated.name}" details`,
      site: updated.site
    });

    res.json({ message: 'Material updated successfully.', material: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating material.' });
  }
});

// @route   DELETE /api/materials/:id
// @desc    Delete material permanently (Admin Only)
// @access  Private (Admin Only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const deleted = await DB.Materials.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Material not found.' });
    }

    // Log Activity
    await DB.History.create({
      userName: req.user.name,
      action: `Permanently deleted material "${deleted.name}"`,
      site: deleted.site
    });

    res.json({ message: 'Material deleted permanently.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting material.' });
  }
});

// @route   PATCH /api/materials/:id/quantity
// @desc    Adjust quantity by +change or -change (Admin & assigned site Worker)
// @access  Private
router.patch('/:id/quantity', verifyToken, async (req, res) => {
  const { change, newValue } = req.body;

  if (change === undefined && newValue === undefined) {
    return res.status(400).json({ message: 'Please provide either a relative change or a newValue.' });
  }

  try {
    const materials = await DB.Materials.find({ _id: req.params.id });
    if (materials.length === 0) {
      return res.status(404).json({ message: 'Material not found.' });
    }
    const material = materials[0];

    // Access control: Worker can only adjust quantity at their assigned site
    if (req.user.role === 'worker' && material.site !== req.user.assignedSite) {
      return res.status(403).json({ message: `Forbidden. You are only allowed to modify materials at your assigned site: ${req.user.assignedSite}` });
    }

    // SCAM PROTECTION: Workers cannot decrease stock directly!
    if (req.user.role === 'worker') {
      if (change !== undefined && change < 0) {
        return res.status(403).json({ message: 'Security Block: Workers are not allowed to decrease stock directly. To return leftover material, please use the Returns tab under Requests.' });
      }
      if (newValue !== undefined && newValue < material.quantity) {
        return res.status(403).json({ message: `Security Block: Workers are not allowed to decrease stock. You cannot reduce stock from ${material.quantity} to ${newValue}.` });
      }
    }

    let newQty;
    let logAction = '';

    if (newValue !== undefined) {
      newQty = parseInt(newValue);
      if (isNaN(newQty) || newQty < 0) {
        return res.status(400).json({ message: 'New quantity must be a valid non-negative number.' });
      }
      logAction = `Set "${material.name}" quantity directly to ${newQty}`;
    } else {
      newQty = material.quantity + change;
      if (newQty < 0) {
        return res.status(400).json({ message: 'Action failed. Material quantity cannot fall below 0.' });
      }
      logAction = `${change > 0 ? 'Increased' : 'Decreased'} "${material.name}" quantity by ${Math.abs(change)} (Current Qty: ${newQty})`;
    }

    const updated = await DB.Materials.findByIdAndUpdate(req.params.id, { quantity: newQty });

    // Log Activity
    await DB.History.create({
      userName: req.user.name,
      action: logAction,
      site: material.site
    });

    res.json({ message: 'Quantity adjusted successfully.', material: { ...updated, quantity: newQty } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error adjusting quantity.' });
  }
});

module.exports = router;
