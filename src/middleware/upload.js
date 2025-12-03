const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { ensureUploadDir } = require('../utils/fileStorage');
const { UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_MIME_TYPES, MAX_ATTACHMENTS } = require('../config');

ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${unique}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_ATTACHMENTS
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: JPEG, PNG, GIF, PDF'));
    }
  }
});

function optionalAttachments(req, res, next) {
  if (req.is('multipart/form-data')) {
    upload.array('attachments', MAX_ATTACHMENTS)(req, res, (error) => {
      if (error) {
        next(error);
      } else {
        next();
      }
    });
  } else {
    next();
  }
}

module.exports = {
  upload,
  optionalAttachments
};
