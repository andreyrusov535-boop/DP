const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const {
  listNomenclatureEntities,
  getNomenclatureItem,
  createNomenclatureItem,
  updateNomenclatureItem,
  toggleNomenclatureItemActive
} = require('../services/nomenclatureAdminService');

const router = express.Router();

// Middleware to validate entity param
const validateEntityParam = param('entity')
  .isIn(['request_types', 'request_topics', 'intake_forms', 'social_groups'])
  .withMessage('Invalid entity type');

// Middleware to check pagination
const paginationValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be >= 0'),
  query('includeInactive')
    .optional()
    .isBoolean()
    .withMessage('includeInactive must be a boolean')
];

// List all items in an entity with pagination
router.get(
  '/:entity',
  authenticateJWT,
  requireRole('admin', 'supervisor'),
  validateEntityParam,
  paginationValidation,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { entity } = req.params;
      const { limit = 50, offset = 0, includeInactive = false } = req.query;

      const result = await listNomenclatureEntities(
        entity,
        req.user.id,
        {
          includeInactive: includeInactive === 'true' || includeInactive === true,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get a specific item
router.get(
  '/:entity/:id',
  authenticateJWT,
  requireRole('admin', 'supervisor'),
  validateEntityParam,
  param('id')
    .isInt()
    .withMessage('ID must be an integer'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { entity, id } = req.params;
      const { includeInactive = false } = req.query;

      const item = await getNomenclatureItem(
        entity,
        parseInt(id),
        req.user.id,
        includeInactive === 'true' || includeInactive === true
      );

      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

// Create a new item
router.post(
  '/:entity',
  authenticateJWT,
  requireRole('admin', 'supervisor'),
  validateEntityParam,
  body('code')
    .notEmpty()
    .withMessage('Code is required')
    .isString()
    .withMessage('Code must be a string'),
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isString()
    .withMessage('Name must be a string'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { entity } = req.params;
      const { code, name } = req.body;

      const item = await createNomenclatureItem(entity, req.user.id, { code, name });

      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }
);

// Update an item
router.patch(
  '/:entity/:id',
  authenticateJWT,
  requireRole('admin', 'supervisor'),
  validateEntityParam,
  param('id')
    .isInt()
    .withMessage('ID must be an integer'),
  body('code')
    .optional()
    .isString()
    .withMessage('Code must be a string'),
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { entity, id } = req.params;
      const { code, name } = req.body;

      if (!code && !name) {
        return res.status(400).json({ message: 'At least one field (code or name) must be provided' });
      }

      const existing = await getNomenclatureItem(entity, parseInt(id), req.user.id, true);

      const updated = await updateNomenclatureItem(entity, parseInt(id), req.user.id, {
        code: code || existing.code,
        name: name || existing.name
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// Toggle active status
router.patch(
  '/:entity/:id/toggle',
  authenticateJWT,
  requireRole('admin', 'supervisor'),
  validateEntityParam,
  param('id')
    .isInt()
    .withMessage('ID must be an integer'),
  body('active')
    .isBoolean()
    .withMessage('active must be a boolean'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { entity, id } = req.params;
      const { active } = req.body;

      const updated = await toggleNomenclatureItemActive(entity, parseInt(id), req.user.id, active);

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
