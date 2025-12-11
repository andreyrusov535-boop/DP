const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const { getOverview } = require('../services/statsService');

const router = express.Router();

router.get('/overview', authenticateJWT, async (_req, res, next) => {
  try {
    const stats = await getOverview();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
