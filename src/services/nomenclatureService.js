const { getRequestTypes, getRequestTopics, getSocialGroups, getIntakeForms } = require('../models/nomenclatureModel');

async function fetchNomenclature() {
  const [types, topics, socialGroups, intakeForms] = await Promise.all([
    getRequestTypes(),
    getRequestTopics(),
    getSocialGroups(),
    getIntakeForms()
  ]);
  return { types, topics, socialGroups, intakeForms };
}

async function fetchTypes() {
  return getRequestTypes();
}

async function fetchTopics() {
  return getRequestTopics();
}

async function fetchSocialGroups() {
  return getSocialGroups();
}

async function fetchIntakeForms() {
  return getIntakeForms();
}

module.exports = {
  fetchNomenclature,
  fetchTypes,
  fetchTopics,
  fetchSocialGroups,
  fetchIntakeForms
};
