const express = require('express');
const { DB } = require('../models/db');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { parseQty, parseUnit } = require('../utils/qty');

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
  const { name, category, quantity, unit, reason, site } = req.body;

  if (req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can submit material requests.' });
  }

  if (!name || !category || quantity === undefined || !site) {
    return res.status(400).json({ message: 'Please provide material name, category, quantity, and site.' });
  }

  const parsedQty = parseQty(quantity);
  const parsedUnit = parseUnit(unit);

  if (parsedQty === null || parsedQty <= 0) {
    return res.status(400).json({ message: 'Quantity must be a number greater than 0.' });
  }

  try {
    const request = await DB.Requests.create({
      name: name.trim(),
      category,
      quantity: parsedQty,
      unit: parsedUnit,
      reason: reason ? reason.trim() : '',
      workerName: req.user.name,
      workerId: req.user.id,
      site
    });

    // Log Activity
    await DB.History.create({
      userName: req.user.name,
      action: `Submitted request for "${name.trim()}" (${parsedQty} ${parsedUnit || 'units'})`,
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

    if (status === 'approved') {
      const existing = await DB.Materials.find({
        category: request.category,
        site: request.site
      });

      const duplicate = existing.find(m => m.name.toLowerCase() === request.name.toLowerCase());

      if (request.type === 'consume') {
        // Consumption takes stock away rather than adding it
        if (!duplicate) {
          return res.status(404).json({ message: `"${request.name}" no longer exists at site "${request.site}".` });
        }
        // Stock may have moved since the worker logged this
        if (duplicate.quantity < request.quantity) {
          return res.status(400).json({ message: `Cannot approve: only ${duplicate.quantity} ${duplicate.unit || 'units'} of "${duplicate.name}" remain, but ${request.quantity} was logged as consumed.` });
        }
        const newQty = Math.round((duplicate.quantity - request.quantity) * 1000) / 1000;
        await DB.Materials.findByIdAndUpdate(duplicate._id, { quantity: newQty });
      } else if (duplicate) {
        // Add or merge approved quantity into materials database
        const newQty = duplicate.quantity + request.quantity;
        await DB.Materials.findByIdAndUpdate(duplicate._id, {
          quantity: newQty,
          unit: duplicate.unit || request.unit || ''
        });
      } else {
        await DB.Materials.create({
          name: request.name,
          category: request.category,
          quantity: request.quantity,
          unit: request.unit || '',
          site: request.site
        });
      }
    }

    // Only mark resolved once the stock move above has succeeded
    await DB.Requests.findByIdAndUpdate(req.params.id, { status });

    const verb = status === 'approved' ? 'Approved' : 'Rejected';
    const noun = request.type === 'consume' ? 'consumption of' : 'request for';
    await DB.History.create({
      userName: req.user.name,
      action: `${verb} ${noun} "${request.name}" (${request.quantity} ${request.unit || 'units'}) by ${request.workerName}`,
      site: request.site
    });

    res.json({ message: `Request successfully ${status}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating request.' });
  }
});

// @route   POST /api/requests/consume
// @desc    Log material consumed on site. Recorded as pending — stock only
//          drops once an admin approves, keeping workers unable to reduce
//          stock on their own.
// @access  Private (Worker Only)
router.post('/consume', verifyToken, async (req, res) => {
  const { name, category, quantity, reason, site } = req.body;

  if (req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can log consumed material.' });
  }

  if (!name || !category || quantity === undefined || !site) {
    return res.status(400).json({ message: 'Please provide material name, category, quantity, and site.' });
  }

  const parsedQty = parseQty(quantity);
  if (parsedQty === null || parsedQty <= 0) {
    return res.status(400).json({ message: 'Consumed quantity must be a number greater than 0.' });
  }

  try {
    const materials = await DB.Materials.find({ category, site });
    const material = materials.find(m => m.name.toLowerCase() === name.trim().toLowerCase());

    if (!material) {
      return res.status(404).json({ message: `Material "${name}" does not exist in site "${site}".` });
    }

    // Caught again at approval time, since stock can move in between
    if (material.quantity < parsedQty) {
      return res.status(400).json({ message: `Only ${material.quantity} ${material.unit || 'units'} of "${material.name}" are in stock, but ${parsedQty} was entered as consumed.` });
    }

    const record = await DB.Requests.create({
      name: material.name,
      category,
      quantity: parsedQty,
      unit: material.unit || '',
      reason: reason ? reason.trim() : '',
      workerName: req.user.name,
      workerId: req.user.id,
      site,
      type: 'consume',
      status: 'pending'
    });

    await DB.History.create({
      userName: req.user.name,
      action: `Logged ${parsedQty} ${material.unit || 'units'} of "${material.name}" as consumed (awaiting approval)`,
      site
    });

    res.status(201).json({ message: 'Consumption logged. It will reduce stock once an admin approves it.', request: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error logging consumption.' });
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

  if (!name || !category || quantity === undefined || !site) {
    return res.status(400).json({ message: 'Please provide material name, category, quantity, and site.' });
  }

  const parsedQty = parseQty(quantity);
  if (parsedQty === null || parsedQty <= 0) {
    return res.status(400).json({ message: 'Return quantity must be a number greater than 0.' });
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
    const newQty = Math.round((material.quantity - parsedQty) * 1000) / 1000;
    await DB.Materials.findByIdAndUpdate(material._id, { quantity: newQty });

    // 2. Create the return request record (marked as instantly resolved/returned)
    const returnRecord = await DB.Requests.create({
      name: name.trim(),
      category,
      quantity: parsedQty,
      unit: material.unit || '',
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
      action: `Returned leftover material "${name.trim()}" (${parsedQty} ${material.unit || 'units'})`,
      site
    });

    res.status(201).json({ message: 'Leftover items returned and inventory updated successfully!', request: returnRecord });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error processing return.' });
  }
});

module.exports = router;
