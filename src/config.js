const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

module.exports = {
  PORT: process.env.PORT || 3000,
  DB_PATH:
    process.env.DB_PATH ||
    path.join(ROOT_DIR, 'data', process.env.NODE_ENV === 'test' ? 'requests.test.sqlite' : 'requests.sqlite'),
  UPLOAD_DIR:
    process.env.UPLOAD_DIR ||
    path.join(ROOT_DIR, process.env.NODE_ENV === 'test' ? 'uploads_test' : 'uploads'),
  MAX_ATTACHMENTS: 5,
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  DEADLINE_APPROACHING_THRESHOLD_HOURS: 48,
  REQUEST_STATUSES: ['new', 'in_progress', 'paused', 'completed', 'archived'],
  PRIORITIES: ['low', 'medium', 'high', 'urgent']
};
