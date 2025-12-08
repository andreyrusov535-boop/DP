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

// Generic CRUD helpers for nomenclature entities
async function listEntities(tableName, options = {}) {
  const db = getDb();
  const { includeInactive = false, limit = 50, offset = 0, sortBy = 'name', sortOrder = 'ASC' } = options;
  
  let query = `SELECT id, code, name, active FROM ${tableName}`;
  const params = [];
  
  if (!includeInactive) {
    query += ' WHERE active = 1';
  }
  
  query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  return db.all(query, params);
}

async function countEntities(tableName, options = {}) {
  const db = getDb();
  const { includeInactive = false } = options;
  
  let query = `SELECT COUNT(*) as count FROM ${tableName}`;
  
  if (!includeInactive) {
    query += ' WHERE active = 1';
  }
  
  const result = await db.get(query);
  return result?.count || 0;
}

async function getEntityById(tableName, id, options = {}) {
  const db = getDb();
  const { includeInactive = false } = options;
  
  let query = `SELECT id, code, name, active FROM ${tableName} WHERE id = ?`;
  const params = [id];
  
  if (!includeInactive) {
    query += ' AND active = 1';
  }
  
  return db.get(query, params);
}

async function findEntityByCode(tableName, code) {
  const db = getDb();
  return db.get(`SELECT id, code, name, active FROM ${tableName} WHERE code = ?`, code);
}

async function createEntity(tableName, code, name) {
  const db = getDb();
  
  const result = await db.run(
    `INSERT INTO ${tableName} (code, name, active) VALUES (?, ?, 1)`,
    [code, name]
  );
  
  return {
    id: result.lastID,
    code,
    name,
    active: 1
  };
}

async function updateEntity(tableName, id, code, name) {
  const db = getDb();
  
  await db.run(
    `UPDATE ${tableName} SET code = ?, name = ? WHERE id = ?`,
    [code, name, id]
  );
  
  return getEntityById(tableName, id, { includeInactive: true });
}

async function toggleEntityActive(tableName, id, active) {
  const db = getDb();
  
  await db.run(
    `UPDATE ${tableName} SET active = ? WHERE id = ?`,
    [active ? 1 : 0, id]
  );
  
  return getEntityById(tableName, id, { includeInactive: true });
}

module.exports = {
  getRequestTypes,
  getRequestTopics,
  getSocialGroups,
  getIntakeForms,
  findTypeById,
  findTopicById,
  findSocialGroupById,
  findIntakeFormById,
  listEntities,
  countEntities,
  getEntityById,
  findEntityByCode,
  createEntity,
  updateEntity,
  toggleEntityActive
};
