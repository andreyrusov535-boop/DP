const express = require('express');
const { body, param } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const { optionalAttachments } = require('../middleware/upload');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const {
  createRequest,
  fetchRequestsList,
  fetchRequestWithFiles,
  updateRequestById,
  removeRequestFromControl
} = require('../services/requestService');
const { REQUEST_STATUSES, PRIORITIES } = require('../config');

const router = express.Router();

const baseValidations = [
  body('contactEmail').optional().isEmail().withMessage('contactEmail must be valid'),
  body('contactPhone')
    .optional()
    .isLength({ min: 5 })
    .withMessage('contactPhone should be at least 5 characters'),
  body('requestTypeId').optional().toInt().isInt({ min: 1 }).withMessage('requestTypeId must be numeric'),
  body('requestTopicId').optional().toInt().isInt({ min: 1 }).withMessage('requestTopicId must be numeric'),
  
  // Phase 3 fields
  body('socialGroupId').optional().toInt().isInt({ min: 1 }).withMessage('socialGroupId must be numeric'),
  body('intakeFormId').optional().toInt().isInt({ min: 1 }).withMessage('intakeFormId must be numeric'),
  body('address').optional().trim().isLength({ min: 1 }).withMessage('address cannot be empty'),
  body('territory').optional().trim().isLength({ min: 1 }).withMessage('territory cannot be empty'),
  body('contactChannel').optional().trim().isLength({ min: 1 }).withMessage('contactChannel cannot be empty'),
  body('executorUserId').optional().toInt().isInt({ min: 1 }).withMessage('executorUserId must be numeric'),
  
  // Feature aliases
  body('receiptFormId').optional().toInt().isInt({ min: 1 }).withMessage('receiptFormId must be numeric'),
  body('executorId').optional().toInt().isInt({ min: 1 }).withMessage('executorId must be numeric'),
  body('priorityId').optional().toInt().isInt({ min: 1 }).withMessage('priorityId must be numeric'),
  
  body('dueDate').optional().isISO8601().withMessage('dueDate must be ISO8601 date'),
  
  // Hybrid priority validation: string from list OR numeric ID
  body('priority').optional().custom((value) => {
    if (PRIORITIES.includes(value)) return true;
    if (!isNaN(parseInt(value)) && parseInt(value) > 0) return true;
    throw new Error('priority is invalid (must be string from list or numeric ID)');
  }),
  
  body('status').optional().isIn(REQUEST_STATUSES).withMessage('status is invalid')
];

router.get('/', async (req, res, next) => {
  try {
    const data = await fetchRequestsList(req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get(
  '/:id',
  param('id').isInt({ min: 1 }).withMessage('id must be numeric'),
  validateRequest,
  async (req, res, next) => {
    try {
      const request = await fetchRequestWithFiles(Number(req.params.id));
      if (!request) {
        return res.status(404).json({ message: 'Request not found' });
      }
      return res.json(request);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/',
  optionalAttachments,
  [
    body('citizenFio').trim().notEmpty().withMessage('citizenFio is required'),
    body('description').trim().notEmpty().withMessage('description is required'),
    ...baseValidations
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const request = await createRequest(req.body, req.files || []);
      res.status(201).json(request);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id',
  optionalAttachments,
  [
    param('id').isInt({ min: 1 }).withMessage('id must be numeric'),
    body('citizenFio').optional().trim().notEmpty().withMessage('citizenFio cannot be empty'),
    body('description').optional().trim().notEmpty().withMessage('description cannot be empty'),
    ...baseValidations
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      if (!Object.keys(req.body).length && (!req.files || !req.files.length)) {
        return res.status(400).json({ message: 'No updates supplied' });
      }
      const updated = await updateRequestById(Number(req.params.id), req.body, req.files || []);
      if (!updated) {
        return res.status(404).json({ message: 'Request not found' });
      }
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id/remove-from-control',
  authenticateJWT,
  requireRole('operator', 'supervisor', 'admin'),
  [
    param('id').isInt({ min: 1 }).withMessage('id must be numeric'),
    body('note').optional().trim().isLength({ max: 1000 }).withMessage('note must not exceed 1000 characters')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const result = await removeRequestFromControl({
        id: Number(req.params.id),
        note: req.body.note,
        user: req.user
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
