const { verifyToken } = require('../services/authService');
const { getUserById } = require('../models/userModel');

async function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const user = await getUserById(decoded.userId);
  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }

  if (user.status === 'locked') {
    return res.status(403).json({ message: 'Account is locked' });
  }

  req.user = {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
    status: user.status
  };

  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
}

function optional(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (decoded) {
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
  }

  next();
}

module.exports = {
  authenticateJWT,
  requireRole,
  optional
};
