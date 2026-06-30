const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'interioshapers-secret-key-12345';

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Fallback to query parameter (needed for file downloads with window.open)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'No authentication token provided. Access denied.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token. Authentication failed.' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Forbidden. Admin privileges required.' });
  }
};

module.exports = { verifyToken, isAdmin, JWT_SECRET };
