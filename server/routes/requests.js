const express = require('express');
const { DB } = require('../models/db');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/requests
// @desc    Get requests (Admin sees all, Worker sees their own)
// @access  Private
router.get('/', verifyToken, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'worker') {
      query.workerId = req.user.id;
    }
    const requests = await DB.Requests.find(query);
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching requests.' });
  }
});

// @route   POST /api/requests
// @desc    Submit a material request (Worker Only)
// @access  Private
router.post('/', verifyToken, async (req, res) => {
  const { name, category, quantity, reason, site } = req.body;

  if (req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can submit material requests.' });
  }

  if (!name || !category || !quantity || !site) {
    return res.status(400).json({ message: 'Please provide material name, category, quantity, and site.' });
  }

  try {
    const request = await DB.Requests.create({
      name: name.trim(),
      category,
      quantity: parseInt(quantity),
      reason: reason ? reason.trim() : '',
      workerName: req.user.name,
      workerId: req.user.id,
      site
    });

    // Log Activity
    await DB.History.create({
      userName: req.user.name,
      action: `Submitted request for "${name.trim()}" (${quantity} units)`,
      site
    });

    res.status(201).json({ message: 'Request submitted successfully.', request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error submitting request.' });
  }
});

// @route   PATCH /api/requests/:id
// @desc    Approve or Reject request (Admin Only)
// @access  Private (Admin Only)
router.patch('/:id', verifyToken, isAdmin, async (req, res) => {
  const { status } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status. Must be "approved" or "rejected".' });
  }

  try {
    const request = await DB.Requests.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request has already been processed.' });
    }

    // Resolve request
    await DB.Requests.findByIdAndUpdate(req.params.id, { status });

    if (status === 'approved') {
      // Add or merge approved quantity into materials database
      const existing = await DB.Materials.find({
        category: request.category,
        site: request.site
      });

      const duplicate = existing.find(m => m.name.toLowerCase() === request.name.toLowerCase());

      if (duplicate) {
        const newQty = duplicate.quantity + request.quantity;
        await DB.Materials.findByIdAndUpdate(duplicate._id, { quantity: newQty });
      } else {
        await DB.Materials.create({
          name: request.name,
          category: request.category,
          quantity: request.quantity,
          site: request.site
        });
      }
    }

    // Log Activity
    await DB.History.create({
      userName: req.user.name,
      action: `${status === 'approved' ? 'Approved' : 'Rejected'} request for "${request.name}" by worker ${request.workerName}`,
      site: request.site
    });

    res.json({ message: `Request successfully ${status}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating request.' });
  }
});

// @route   POST /api/requests/return
// @desc    Submit a return log for leftover items (Worker Only, updates inventory instantly)
// @access  Private
router.post('/return', verifyToken, async (req, res) => {
  const { name, category, quantity, reason, site } = req.body;

  if (req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can log return items.' });
  }

  if (!name || !category || !quantity || !site) {
    return res.status(400).json({ message: 'Please provide material name, category, quantity, and site.' });
  }

  const parsedQty = parseInt(quantity);
  if (parsedQty <= 0) {
    return res.status(400).json({ message: 'Return quantity must be greater than 0.' });
  }

  try {
    // Check if the material exists at the site and has enough quantity
    const materials = await DB.Materials.find({
      name: name.trim(),
      category,
      site
    });

    if (materials.length === 0) {
      return res.status(404).json({ message: `Material "${name}" does not exist in site "${site}" to return.` });
    }

    const material = materials[0];
    if (material.quantity < parsedQty) {
      return res.status(400).json({ message: `Failed to return. You only have ${material.quantity} units of "${name}" at your site, but tried to return ${parsedQty} units.` });
    }

    // 1. Deduct quantity from site inventory
    const newQty = material.quantity - parsedQty;
    await DB.Materials.findByIdAndUpdate(material._id, { quantity: newQty });

    // 2. Create the return request record (marked as instantly resolved/returned)
    const returnRecord = await DB.Requests.create({
      name: name.trim(),
      category,
      quantity: parsedQty,
      reason: reason ? reason.trim() : '',
      workerName: req.user.name,
      workerId: req.user.id,
      site,
      type: 'return',
      status: 'returned'
    });

    // 3. Log Activity
    await DB.History.create({
      userName: req.user.name,
      action: `Returned leftover material "${name.trim()}" (${parsedQty} units)`,
      site
    });

    res.status(201).json({ message: 'Leftover items returned and inventory updated successfully!', request: returnRecord });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error processing return.' });
  }
});

module.exports = router;
