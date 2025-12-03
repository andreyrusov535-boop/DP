const express = require('express');
const { body } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const validateRequest = require('../middleware/validateRequest');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const {
  register,
  login,
  refreshAccessToken,
  VALID_ROLES
} = require('../services/authService');
const { getUserById, listUsers, updateUser } = require('../models/userModel');
const { logAuditEntry } = require('../utils/audit');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .withMessage('Invalid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain lowercase letter')
      .matches(/\d/)
      .withMessage('Password must contain number'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 255 })
      .withMessage('Name must be at most 255 characters'),
    body('role')
      .optional()
      .toLowerCase()
      .isIn(VALID_ROLES)
      .withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`)
  ],
  (req, res, next) => {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({ message: firstError.msg });
    }
    next();
  },
  async (req, res, next) => {
    try {
      const result = await register({
        email: req.body.email,
        password: req.body.password,
        name: sanitizeHtml(req.body.name, { allowedTags: [] }),
        role: req.body.role || 'citizen'
      });

      res.status(201).json({
        userId: result.userId,
        email: result.email,
        name: result.name,
        role: result.role,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Invalid email')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const result = await login(req.body.email, req.body.password);

      res.json({
        userId: result.userId,
        email: result.email,
        name: result.name,
        role: result.role,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      if (error.message.includes('Invalid') || error.message.includes('locked')) {
        return res.status(401).json({ message: error.message });
      }
      next(error);
    }
  }
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const result = await refreshAccessToken(req.body.refreshToken);

      res.json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return res.status(401).json({ message: error.message });
      }
      next(error);
    }
  }
);

// GET /api/users/profile
router.get('/profile', authenticateJWT, async (req, res, next) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      created_at: user.created_at
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users
router.get(
  '/',
  authenticateJWT,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
      const offset = (page - 1) * limit;
      const sortBy = req.query.sort_by || 'created_at';
      const sortOrder = req.query.sort_order || 'desc';

      const filters = {};
      if (req.query.role) {
        filters.role = req.query.role.toLowerCase();
      }
      if (req.query.status) {
        filters.status = req.query.status.toLowerCase();
      }
      if (req.query.search) {
        filters.search = req.query.search;
      }

      const result = await listUsers({ filters, limit, offset, sortBy, sortOrder });

      res.json({
        data: result.rows.map((user) => ({
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          created_at: user.created_at
        })),
        meta: {
          total: result.total,
          page,
          limit,
          pages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/users (admin only)
router.post(
  '/',
  authenticateJWT,
  requireRole('admin'),
  [
    body('email')
      .isEmail()
      .withMessage('Invalid email')
      .normalizeEmail(),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 255 })
      .withMessage('Name must be at most 255 characters'),
    body('role')
      .toLowerCase()
      .isIn(VALID_ROLES)
      .withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`)
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const result = await register({
        email: req.body.email,
        password: 'TempPassword123', // Temporary password - should be sent separately
        name: sanitizeHtml(req.body.name, { allowedTags: [] }),
        role: req.body.role
      });

      const now = new Date().toISOString();
      await logAuditEntry({
        user_id: req.user.userId,
        action: 'user_created',
        entity_type: 'user',
        payload: { email: result.email, name: result.name, role: result.role },
        created_at: now
      });

      res.status(201).json({
        userId: result.userId,
        email: result.email,
        name: result.name,
        role: result.role
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  }
);

// PATCH /api/users/:id (admin only)
router.patch(
  '/:id',
  authenticateJWT,
  requireRole('admin'),
  [
    body('role')
      .optional()
      .toLowerCase()
      .isIn(VALID_ROLES)
      .withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`),
    body('status')
      .optional()
      .toLowerCase()
      .isIn(['active', 'locked'])
      .withMessage('Status must be either active or locked')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const updates = {};
      if (req.body.role) {
        updates.role = req.body.role;
      }
      if (req.body.status) {
        updates.status = req.body.status;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No updates provided' });
      }

      const changes = await updateUser(userId, updates);
      if (changes === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const now = new Date().toISOString();
      await logAuditEntry({
        user_id: req.user.userId,
        action: 'user_updated',
        entity_type: 'user',
        payload: { userId, updates },
        created_at: now
      });

      const updated = await getUserById(userId);
      res.json({
        userId: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        status: updated.status,
        created_at: updated.created_at
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
