const { 
  getRequestTypes, 
  getRequestTopics, 
  getTopicsByRequestType,
  getReceiptForms,
  getExecutors,
  getPriorities
} = require('../models/nomenclatureModel');

async function fetchNomenclature() {
  const [types, topics, receiptForms, executors, priorities] = await Promise.all([
    getRequestTypes(), 
    getRequestTopics(), 
    getReceiptForms(),
    getExecutors(),
    getPriorities()
  ]);
  return { types, topics, receiptForms, executors, priorities };
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

async function fetchReceiptForms() {
  return getReceiptForms();
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
  fetchReceiptForms,
  fetchExecutors,
  fetchPriorities
};
