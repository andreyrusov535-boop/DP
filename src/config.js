require('dotenv').config();
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

module.exports = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  DB_PATH:
    process.env.DB_PATH ||
    path.join(ROOT_DIR, 'data', process.env.NODE_ENV === 'test' ? 'requests.test.sqlite' : 'requests.sqlite'),

  // File Upload
  UPLOAD_DIR:
    process.env.UPLOAD_DIR ||
    path.join(ROOT_DIR, process.env.NODE_ENV === 'test' ? 'uploads_test' : 'uploads'),
  MAX_ATTACHMENTS: parseInt(process.env.MAX_ATTACHMENTS || '5', 10),
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || String(10 * 1024 * 1024), 10),
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  // Bcrypt
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Request Constants
  DEADLINE_APPROACHING_THRESHOLD_HOURS: 48,
  REQUEST_STATUSES: ['new', 'in_progress', 'paused', 'completed', 'archived', 'cancelled', 'removed'],
  PRIORITIES: ['low', 'medium', 'high', 'urgent'],

  // Notification Settings
  NOTIFICATION_HOURS_BEFORE_DEADLINE: parseInt(process.env.NOTIFICATION_HOURS_BEFORE_DEADLINE || '24', 10),
  NOTIFICATION_CRON_SCHEDULE: process.env.NOTIFICATION_CRON_SCHEDULE || '0 * * * *',

  // SMTP Settings
  SMTP_HOST: process.env.SMTP_HOST || 'localhost',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '1025', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'noreply@requests.local'
};
