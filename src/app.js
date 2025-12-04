const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const { initDb } = require('./db');
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS, NODE_ENV } = require('./config');
const requestsRouter = require('./routes/requests');
const nomenclatureRouter = require('./routes/nomenclature');
const filesRouter = require('./routes/files');
const sampleRouter = require('./routes/sample');
const reportsRouter = require('./routes/reports');
const { ensureUploadDir } = require('./utils/fileStorage');
const { scheduleDeadlineRefresh, runDeadlineRefreshOnce } = require('./jobs/deadlineJob');

const app = express();

// Rate limiter instances
const rateLimiter = new RateLimiterMemory({
  points: RATE_LIMIT_MAX_REQUESTS,
  duration: RATE_LIMIT_WINDOW_MS / 1000
});

// Stricter rate limiter for auth routes
const authRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 900 // 15 minutes
});

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Logging middleware
if (NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting middleware (skip in test environment)
if (NODE_ENV !== 'test') {
  app.use(async (req, res, next) => {
    try {
      await rateLimiter.consume(req.ip || req.connection.remoteAddress);
      next();
    } catch (err) {
      res.status(429).json({ message: 'Too many requests' });
    }
  });
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes with stricter rate limiting (skip in test environment)
const authRouter = require('./routes/auth');
if (NODE_ENV !== 'test') {
  app.use('/api/auth', async (req, res, next) => {
    try {
      await authRateLimiter.consume(req.ip || req.connection.remoteAddress);
      next();
    } catch (err) {
      res.status(429).json({ message: 'Too many auth attempts. Please try again later.' });
    }
  });
}
app.use('/api/auth', authRouter);
app.use('/api/users', authRouter);

app.use('/api/requests', requestsRouter);
app.use('/api/nomenclature', nomenclatureRouter);
app.use('/api/files', filesRouter);
app.use('/api/sample', sampleRouter);
app.use('/api/reports', reportsRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (err.message) {
    const lower = err.message.toLowerCase();
    const clientKeywords = ['invalid', 'unsupported', 'limit', 'reference', 'required', 'cannot'];
    if (clientKeywords.some((keyword) => lower.includes(keyword))) {
      return res.status(400).json({ message: err.message });
    }
  }

  console.error(err);
  return res.status(500).json({ message: 'Unexpected server error' });
});

async function bootstrap() {
  await initDb();
  ensureUploadDir();
  await runDeadlineRefreshOnce();
  if (process.env.NODE_ENV !== 'test') {
    scheduleDeadlineRefresh();
  }
}

module.exports = { app, bootstrap };
