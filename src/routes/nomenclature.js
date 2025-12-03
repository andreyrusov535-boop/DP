const express = require('express');
const { fetchNomenclature, fetchTypes, fetchTopics } = require('../services/nomenclatureService');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const data = await fetchNomenclature();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/types', async (_req, res, next) => {
  try {
    const data = await fetchTypes();
    res.json({ types: data });
  } catch (error) {
    next(error);
  }
});

router.get('/topics', async (_req, res, next) => {
  try {
    const data = await fetchTopics();
    res.json({ topics: data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
