const express = require('express');
const { initDb } = require('./db');
const requestsRouter = require('./routes/requests');
const nomenclatureRouter = require('./routes/nomenclature');
const filesRouter = require('./routes/files');
const { ensureUploadDir } = require('./utils/fileStorage');
const { scheduleDeadlineRefresh, runDeadlineRefreshOnce } = require('./jobs/deadlineJob');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/requests', requestsRouter);
app.use('/api/nomenclature', nomenclatureRouter);
app.use('/api/files', filesRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

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
