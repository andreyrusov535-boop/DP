const { getRequestTypes, getRequestTopics } = require('../models/nomenclatureModel');

async function fetchNomenclature() {
  const [types, topics] = await Promise.all([getRequestTypes(), getRequestTopics()]);
  return { types, topics };
}

async function fetchTypes() {
  return getRequestTypes();
}

async function fetchTopics() {
  return getRequestTopics();
}

module.exports = {
  fetchNomenclature,
  fetchTypes,
  fetchTopics
};
