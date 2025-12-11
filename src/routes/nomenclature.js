const express = require('express');
const { 
  fetchNomenclature, 
  fetchTypes, 
  fetchTopics, 
  fetchTopicsByType,
  fetchReceiptForms,
  fetchExecutors,
  fetchPriorities,
  fetchSocialGroups,
  fetchIntakeForms
} = require('../services/nomenclatureService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const entity = req.query.entity;
    
    // If entity parameter is provided, return only that entity
    if (entity === 'request_types') {
      const data = await fetchTypes();
      return res.json({ types: data });
    } else if (entity === 'request_topics') {
      const data = await fetchTopics();
      return res.json({ topics: data });
    } else if (entity === 'receipt_forms' || entity === 'intake_forms') {
      const data = await fetchIntakeForms();
      return res.json({ intakeForms: data });
    } else if (entity === 'social_groups') {
      const data = await fetchSocialGroups();
      return res.json({ socialGroups: data });
    } else if (entity === 'executors') {
      const data = await fetchExecutors();
      return res.json({ executors: data });
    } else if (entity === 'priorities') {
      const data = await fetchPriorities();
      return res.json({ priorities: data });
    }
    
    // If no entity specified, return all nomenclature
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

router.get('/intake-forms', async (_req, res, next) => {
  try {
    const data = await fetchIntakeForms();
    res.json({ intakeForms: data });
  } catch (error) {
    next(error);
  }
});

router.get('/social-groups', async (_req, res, next) => {
  try {
    const data = await fetchSocialGroups();
    res.json({ socialGroups: data });
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
