const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { DB } = require('../models/db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide both email and password.' });
  }

  try {
    // Find user
    const user = await DB.Users.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Verify password
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedSite: user.assignedSite
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user (First registered user is Admin, others are Workers)
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please enter all fields.' });
  }

  try {
    // Check if user already exists
    const existingUser = await DB.Users.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    // Check if there are any users in the DB
    const allUsers = await DB.Users.find();
    const isFirstUser = allUsers.length === 0;

    // First user is Admin, rest are Workers
    const role = isFirstUser ? 'admin' : 'worker';

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHashed = bcrypt.hashSync(password, salt);

    // Create user
    const newUser = await DB.Users.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: passwordHashed,
      role,
      assignedSite: '' // Workers start with no assigned site
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        assignedSite: newUser.assignedSite
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: isFirstUser ? 'Admin account registered successfully!' : 'Worker account registered successfully!',
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

module.exports = router;
