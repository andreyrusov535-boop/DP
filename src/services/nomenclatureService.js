const { 
  getRequestTypes, 
  getRequestTopics, 
  getTopicsByRequestType,
  getSocialGroups, 
  getIntakeForms,
  getExecutors,
  getPriorities
} = require('../models/nomenclatureModel');

async function fetchNomenclature() {
  const [types, topics, socialGroups, intakeForms, executors, priorities] = await Promise.all([
    getRequestTypes(), 
    getRequestTopics(), 
    getSocialGroups(),
    getIntakeForms(),
    getExecutors(),
    getPriorities()
  ]);
  return { 
    types, 
    topics, 
    socialGroups, 
    intakeForms, 
    receiptForms: intakeForms, // alias for compatibility
    executors, 
    priorities 
  };
}

async function fetchTypes() {
  return getRequestTypes();
}

async function fetchTopics() {
  return getRequestTopics();
}

async function fetchTopicsByType(requestTypeId) {
  return getTopicsByRequestType(requestTypeId);
}

async function fetchSocialGroups() {
  return getSocialGroups();
}

async function fetchIntakeForms() {
  return getIntakeForms();
}

async function fetchReceiptForms() {
  return getIntakeForms(); // Alias
}

async function fetchExecutors() {
  return getExecutors();
}

async function fetchPriorities() {
  return getPriorities();
}

module.exports = {
  fetchNomenclature,
  fetchTypes,
  fetchTopics,
  fetchTopicsByType,
  fetchSocialGroups,
  fetchIntakeForms,
  fetchReceiptForms,
  fetchExecutors,
  fetchPriorities
};
