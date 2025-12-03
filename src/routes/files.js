const express = require('express');
const fs = require('fs');
const { param } = require('express-validator');
const { getAttachmentById } = require('../services/requestService');
const validateRequest = require('../middleware/validateRequest');
const { buildStoredFilePath } = require('../utils/fileStorage');

const router = express.Router();

router.get(
  '/:id/download',
  param('id').isInt({ min: 1 }).withMessage('File id must be numeric'),
  validateRequest,
  async (req, res, next) => {
    try {
      const attachment = await getAttachmentById(Number(req.params.id));
      if (!attachment) {
        return res.status(404).json({ message: 'File not found' });
      }

      const filePath = buildStoredFilePath(attachment.stored_name);
      try {
        await fs.promises.access(filePath, fs.constants.R_OK);
      } catch (error) {
        return res.status(404).json({ message: 'File not available' });
      }

      return res.download(filePath, attachment.original_name);
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
