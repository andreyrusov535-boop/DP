const express = require('express');
const { authenticateJWT, requireRole } = require('../middleware/auth');

const router = express.Router();

// Sample protected route requiring authentication
router.get('/protected', authenticateJWT, (req, res) => {
  res.json({
    message: 'This is a protected route',
    user: {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Sample route requiring admin role
router.get('/admin-only', authenticateJWT, requireRole('admin'), (req, res) => {
  res.json({
    message: 'This route is only accessible to admins',
    user: {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Sample route accessible by specific roles
router.get('/supervisor-data', authenticateJWT, requireRole('supervisor', 'admin'), (req, res) => {
  res.json({
    message: 'This route is accessible to supervisors and admins',
    user: {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role
    }
  });
});

module.exports = router;
