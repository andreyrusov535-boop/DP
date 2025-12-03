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

async function getReceiptForms() {
  return dbService.getAll('get_receipt_forms', [
    `SELECT id, code, name, description, metadata 
     FROM nomenclature 
     WHERE type = 'receipt_form' AND is_active = 1 
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

module.exports = {
  getRequestTypes,
  getRequestTopics,
  getTopicsByRequestType,
  getReceiptForms,
  getExecutors,
  getPriorities,
  findNomenclatureById,
  findTypeById,
  findTopicById,
  findExecutorById,
  findPriorityById,
  createNomenclature,
  updateNomenclature,
  deleteNomenclature
};
