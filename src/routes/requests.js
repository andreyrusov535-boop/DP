const express = require('express');
const { body, param } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const { optionalAttachments } = require('../middleware/upload');
const {
  createRequest,
  fetchRequestsList,
  fetchRequestWithFiles,
  updateRequestById
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
  body('receiptFormId').optional().toInt().isInt({ min: 1 }).withMessage('receiptFormId must be numeric'),
  body('dueDate').optional().isISO8601().withMessage('dueDate must be ISO8601 date'),
  body('priorityId').optional().toInt().isInt({ min: 1 }).withMessage('priorityId must be numeric'),
  body('priority').optional().toInt().isInt({ min: 1 }).withMessage('priority must be numeric'),
  body('executorId').optional().toInt().isInt({ min: 1 }).withMessage('executorId must be numeric'),
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

module.exports = router;
