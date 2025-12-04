const { getDb } = require('../db');

async function getRequestTypes() {
  const db = getDb();
  return db.all('SELECT id, code, name FROM request_types WHERE active = 1 ORDER BY name ASC');
}

async function getRequestTopics() {
  const db = getDb();
  return db.all('SELECT id, code, name FROM request_topics WHERE active = 1 ORDER BY name ASC');
}

async function getSocialGroups() {
  const db = getDb();
  return db.all('SELECT id, code, name FROM social_groups WHERE active = 1 ORDER BY name ASC');
}

async function getIntakeForms() {
  const db = getDb();
  return db.all('SELECT id, code, name FROM intake_forms WHERE active = 1 ORDER BY name ASC');
}

async function findTypeById(id) {
  const db = getDb();
  return db.get('SELECT id FROM request_types WHERE id = ? AND active = 1', id);
}

async function findTopicById(id) {
  const db = getDb();
  return db.get('SELECT id FROM request_topics WHERE id = ? AND active = 1', id);
}

async function findSocialGroupById(id) {
  const db = getDb();
  return db.get('SELECT id FROM social_groups WHERE id = ? AND active = 1', id);
}

async function findIntakeFormById(id) {
  const db = getDb();
  return db.get('SELECT id FROM intake_forms WHERE id = ? AND active = 1', id);
}

module.exports = {
  getRequestTypes,
  getRequestTopics,
  getSocialGroups,
  getIntakeForms,
  findTypeById,
  findTopicById,
  findSocialGroupById,
  findIntakeFormById
};
