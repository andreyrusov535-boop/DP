const express = require('express');
const { 
  fetchNomenclature, 
  fetchTypes, 
  fetchTopics, 
  fetchTopicsByType,
  fetchReceiptForms,
  fetchExecutors,
  fetchPriorities
} = require('../services/nomenclatureService');

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

router.get('/topics/by-type/:typeId', async (req, res, next) => {
  try {
    const typeId = parseInt(req.params.typeId, 10);
    const data = await fetchTopicsByType(typeId);
    res.json({ topics: data });
  } catch (error) {
    next(error);
  }
});

router.get('/receipt-forms', async (_req, res, next) => {
  try {
    const data = await fetchReceiptForms();
    res.json({ receiptForms: data });
  } catch (error) {
    next(error);
  }
});

router.get('/executors', async (_req, res, next) => {
  try {
    const data = await fetchExecutors();
    res.json({ executors: data });
  } catch (error) {
    next(error);
  }
});

router.get('/priorities', async (_req, res, next) => {
  try {
    const data = await fetchPriorities();
    res.json({ priorities: data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
