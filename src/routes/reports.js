const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const { getOverview, getDynamics, generateExcelExport, generatePdfExport } = require('../services/reportService');

const router = express.Router();

const filterValidations = [
  query('status').optional().isIn(['new', 'in_progress', 'paused', 'completed', 'archived']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('type').optional().isInt({ min: 1 }),
  query('topic').optional().isInt({ min: 1 }),
  query('social_group_id').optional().isInt({ min: 1 }),
  query('intake_form_id').optional().isInt({ min: 1 }),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  query('territory').optional().isString().trim(),
  query('executor').optional().isString().trim(),
  query('fio').optional().isString().trim(),
  query('address').optional().isString().trim(),
  query('contact_channel').optional().isString().trim(),
  query('search').optional().isString().trim()
];

router.get(
  '/overview',
  authenticateJWT,
  requireRole('supervisor', 'admin'),
  filterValidations,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const overview = await getOverview(req.query, req.user.userId);
      res.json(overview);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/dynamics',
  authenticateJWT,
  requireRole('supervisor', 'admin'),
  [
    ...filterValidations,
    query('groupBy').optional().isIn(['daily', 'weekly'])
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const dynamics = await getDynamics(req.query, req.user.userId);
      res.json(dynamics);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/export',
  authenticateJWT,
  requireRole('supervisor', 'admin'),
  [
    ...filterValidations,
    query('format').isIn(['excel', 'pdf']).withMessage('Format must be excel or pdf'),
    query('groupBy').optional().isIn(['daily', 'weekly'])
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const format = req.query.format;

      if (format === 'excel') {
        const workbook = await generateExcelExport(req.query, req.user.userId);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="report-${Date.now()}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
      } else if (format === 'pdf') {
        const doc = await generatePdfExport(req.query, req.user.userId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="report-${Date.now()}.pdf"`);
        doc.pipe(res);
      }
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
