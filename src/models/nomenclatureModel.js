const { dbService } = require('../db');

async function getRequestTypes() {
  return dbService.getAll('get_request_types', [
    `SELECT id, code, name, description, metadata 
     FROM nomenclature 
     WHERE type = 'request_type' AND is_active = 1 
     ORDER BY sort_order ASC, name ASC`
  ]);
}

async function getRequestTopics() {
  return dbService.getAll('get_request_topics', [
    `SELECT t.id, t.code, t.name, t.description, t.parent_id, rt.name as request_type_name
     FROM nomenclature t
     LEFT JOIN nomenclature rt ON t.parent_id = rt.id
     WHERE t.type = 'topic' AND t.is_active = 1 
     ORDER BY t.parent_id, t.sort_order ASC, t.name ASC`
  ]);
}

async function getTopicsByRequestType(requestTypeId) {
  return dbService.getAll('get_topics_by_type', [
    `SELECT t.id, t.code, t.name, t.description
     FROM nomenclature t
     WHERE t.type = 'topic' AND t.is_active = 1 AND t.parent_id = ?
     ORDER BY t.sort_order ASC, t.name ASC`,
    requestTypeId
  ]);
}

async function getSocialGroups() {
  return dbService.getAll('get_social_groups', [
    `SELECT id, code, name, description, metadata 
     FROM nomenclature 
     WHERE type = 'social_group' AND is_active = 1 
     ORDER BY sort_order ASC, name ASC`
  ]);
}

async function getIntakeForms() {
  return dbService.getAll('get_intake_forms', [
    `SELECT id, code, name, description, metadata 
     FROM nomenclature 
     WHERE type = 'intake_form' AND is_active = 1 
     ORDER BY sort_order ASC, name ASC`
  ]);
}

async function getExecutors() {
  return dbService.getAll('get_executors', [
    `SELECT id, code, name, description, metadata 
     FROM nomenclature 
     WHERE type = 'executor' AND is_active = 1 
     ORDER BY sort_order ASC, name ASC`
  ]);
}

async function getPriorities() {
  return dbService.getAll('get_priorities', [
    `SELECT id, code, name, description, metadata 
     FROM nomenclature 
     WHERE type = 'priority' AND is_active = 1 
     ORDER BY sort_order ASC, name ASC`
  ]);
}

async function findNomenclatureById(id) {
  return dbService.getOne('find_nomenclature_by_id', [
    `SELECT id, type, code, name, description, metadata, is_active, sort_order, parent_id
     FROM nomenclature 
     WHERE id = ? AND is_active = 1`,
    id
  ]);
}

async function findTypeById(id) {
  return dbService.getOne('find_type_by_id', [
    `SELECT id, code, name, description, metadata
     FROM nomenclature 
     WHERE id = ? AND type = 'request_type' AND is_active = 1`,
    id
  ]);
}

async function findTopicById(id) {
  return dbService.getOne('find_topic_by_id', [
    `SELECT id, code, name, description, parent_id, metadata
     FROM nomenclature 
     WHERE id = ? AND type = 'topic' AND is_active = 1`,
    id
  ]);
}

async function findSocialGroupById(id) {
  return dbService.getOne('find_social_group_by_id', [
    `SELECT id, code, name, description, metadata
     FROM nomenclature 
     WHERE id = ? AND type = 'social_group' AND is_active = 1`,
    id
  ]);
}

async function findIntakeFormById(id) {
  return dbService.getOne('find_intake_form_by_id', [
    `SELECT id, code, name, description, metadata
     FROM nomenclature 
     WHERE id = ? AND type = 'intake_form' AND is_active = 1`,
    id
  ]);
}

async function findExecutorById(id) {
  return dbService.getOne('find_executor_by_id', [
    `SELECT id, code, name, description, metadata
     FROM nomenclature 
     WHERE id = ? AND type = 'executor' AND is_active = 1`,
    id
  ]);
}

async function findPriorityById(id) {
  return dbService.getOne('find_priority_by_id', [
    `SELECT id, code, name, description, metadata
     FROM nomenclature 
     WHERE id = ? AND type = 'priority' AND is_active = 1`,
    id
  ]);
}

async function createNomenclature(item) {
  const result = await dbService.execute('create_nomenclature', [
    `INSERT INTO nomenclature (type, code, name, description, metadata, sort_order, parent_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      item.type,
      item.code,
      item.name,
      item.description || null,
      item.metadata ? JSON.stringify(item.metadata) : null,
      item.sort_order || 0,
      item.parent_id || null
    ]
  ]);
  return result.lastID;
}

async function updateNomenclature(id, updates) {
  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (key === 'metadata' && value) {
      fields.push(`${key} = ?`);
      values.push(JSON.stringify(value));
    } else {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) {
    return 0;
  }

  values.push(id);
  const result = await dbService.execute('update_nomenclature', [
    `UPDATE nomenclature SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  ]);
  return result.changes;
}

async function deleteNomenclature(id) {
  const result = await dbService.execute('delete_nomenclature', [
    'UPDATE nomenclature SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    id
  ]);
  return result.changes;
}

// Phase 3 Generic helpers adaptation
// These were expecting tableName, but now everything is in `nomenclature`.
// We need to map legacy table names to 'type' column values.
const TABLE_TYPE_MAP = {
  'request_types': 'request_type',
  'request_topics': 'topic',
  'social_groups': 'social_group',
  'intake_forms': 'intake_form',
  'nomenclature': null // raw access if needed?
};

async function listEntities(tableName, options = {}) {
  const type = TABLE_TYPE_MAP[tableName];
  if (!type) {
    // If passed 'nomenclature' or unknown, handle accordingly
    // For now, assume Phase 3 only calls with known tables
    throw new Error(`Unknown table/type map for ${tableName}`);
  }

  const { includeInactive = false, limit = 50, offset = 0, sortBy = 'name', sortOrder = 'ASC' } = options;
  
  let query = 'SELECT id, code, name, is_active as active FROM nomenclature WHERE type = ?';
  const params = [type];
  
  if (!includeInactive) {
    query += ' AND is_active = 1';
  }
  
  query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  return dbService.all(query, params);
}

async function countEntities(tableName, options = {}) {
  const type = TABLE_TYPE_MAP[tableName];
  const { includeInactive = false } = options;
  
  let query = 'SELECT COUNT(*) as count FROM nomenclature WHERE type = ?';
  const params = [type];

  if (!includeInactive) {
    query += ' AND is_active = 1';
  }
  
  const result = await dbService.get(query, params);
  return result?.count || 0;
}

async function getEntityById(tableName, id, options = {}) {
  const type = TABLE_TYPE_MAP[tableName];
  const { includeInactive = false } = options;
  
  let query = 'SELECT id, code, name, is_active as active FROM nomenclature WHERE id = ? AND type = ?';
  const params = [id, type];
  
  if (!includeInactive) {
    query += ' AND is_active = 1';
  }
  
  return dbService.get(query, params);
}

async function findEntityByCode(tableName, code) {
  const type = TABLE_TYPE_MAP[tableName];
  return dbService.get(
    'SELECT id, code, name, is_active as active FROM nomenclature WHERE type = ? AND code = ?', 
    [type, code]
  );
}

async function createEntity(tableName, code, name) {
  const type = TABLE_TYPE_MAP[tableName];
  const result = await dbService.execute(
    'INSERT INTO nomenclature (type, code, name, is_active) VALUES (?, ?, ?, 1)',
    [type, code, name]
  );
  
  return {
    id: result.lastID,
    code,
    name,
    active: 1
  };
}

async function updateEntity(tableName, id, code, name) {
  const type = TABLE_TYPE_MAP[tableName];
  await dbService.execute(
    'UPDATE nomenclature SET code = ?, name = ? WHERE id = ? AND type = ?',
    [code, name, id, type]
  );
  return getEntityById(tableName, id, { includeInactive: true });
}

async function toggleEntityActive(tableName, id, active) {
  const type = TABLE_TYPE_MAP[tableName];
  await dbService.execute(
    'UPDATE nomenclature SET is_active = ? WHERE id = ? AND type = ?',
    [active ? 1 : 0, id, type]
  );
  return getEntityById(tableName, id, { includeInactive: true });
}

module.exports = {
  getRequestTypes,
  getRequestTopics,
  getTopicsByRequestType,
  getSocialGroups,
  getIntakeForms,
  getExecutors,
  getPriorities,
  findNomenclatureById,
  findTypeById,
  findTopicById,
  findSocialGroupById,
  findIntakeFormById,
  findExecutorById,
  findPriorityById,
  createNomenclature,
  updateNomenclature,
  deleteNomenclature,
  
  // Generic adapters
  listEntities,
  countEntities,
  getEntityById,
  findEntityByCode,
  createEntity,
  updateEntity,
  toggleEntityActive
};
