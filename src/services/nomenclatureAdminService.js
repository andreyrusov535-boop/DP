const {
  listEntities,
  countEntities,
  getEntityById,
  findEntityByCode,
  createEntity,
  updateEntity,
  toggleEntityActive
} = require('../models/nomenclatureModel');
const { logAuditEntry } = require('../utils/audit');

const VALID_ENTITIES = ['request_types', 'request_topics', 'intake_forms', 'social_groups'];

function validateEntity(entity) {
  if (!VALID_ENTITIES.includes(entity)) {
    throw new Error(`Invalid entity: ${entity}`);
  }
}

async function listNomenclatureEntities(entity, userId, options = {}) {
  validateEntity(entity);
  
  const { includeInactive = false, limit = 50, offset = 0, sortBy = 'name', sortOrder = 'ASC' } = options;
  
  const [items, total] = await Promise.all([
    listEntities(entity, { includeInactive, limit, offset, sortBy, sortOrder }),
    countEntities(entity, { includeInactive })
  ]);
  
  return {
    items,
    total,
    limit,
    offset,
    page: Math.floor(offset / limit) + 1
  };
}

async function getNomenclatureItem(entity, id, userId, includeInactive = false) {
  validateEntity(entity);
  
  const item = await getEntityById(entity, id, { includeInactive });
  if (!item) {
    throw new Error(`${entity} item not found: ${id}`);
  }
  
  return item;
}

async function createNomenclatureItem(entity, userId, data) {
  validateEntity(entity);
  
  const { code, name } = data;
  
  if (!code || typeof code !== 'string') {
    throw new Error('Code is required and must be a string');
  }
  
  if (!name || typeof name !== 'string') {
    throw new Error('Name is required and must be a string');
  }
  
  const trimmedCode = code.trim().toUpperCase();
  const trimmedName = name.trim();
  
  if (trimmedCode.length === 0) {
    throw new Error('Code cannot be empty');
  }
  
  if (trimmedName.length === 0) {
    throw new Error('Name cannot be empty');
  }
  
  const existing = await findEntityByCode(entity, trimmedCode);
  if (existing) {
    throw new Error(`Code "${trimmedCode}" already exists for ${entity}`);
  }
  
  const item = await createEntity(entity, trimmedCode, trimmedName);
  
  await logAuditEntry({
    user_id: userId,
    action: 'create',
    entity_type: entity,
    payload: {
      id: item.id,
      code: item.code,
      name: item.name
    },
    created_at: new Date().toISOString()
  });
  
  return item;
}

async function updateNomenclatureItem(entity, id, userId, data) {
  validateEntity(entity);
  
  const { code, name } = data;
  
  const existing = await getNomenclatureItem(entity, id, userId, true);
  
  if (!code || typeof code !== 'string') {
    throw new Error('Code is required and must be a string');
  }
  
  if (!name || typeof name !== 'string') {
    throw new Error('Name is required and must be a string');
  }
  
  const trimmedCode = code.trim().toUpperCase();
  const trimmedName = name.trim();
  
  if (trimmedCode.length === 0) {
    throw new Error('Code cannot be empty');
  }
  
  if (trimmedName.length === 0) {
    throw new Error('Name cannot be empty');
  }
  
  if (trimmedCode !== existing.code) {
    const codeExists = await findEntityByCode(entity, trimmedCode);
    if (codeExists) {
      throw new Error(`Code "${trimmedCode}" already exists for ${entity}`);
    }
  }
  
  const updated = await updateEntity(entity, id, trimmedCode, trimmedName);
  
  await logAuditEntry({
    user_id: userId,
    action: 'update',
    entity_type: entity,
    payload: {
      id: updated.id,
      code: updated.code,
      name: updated.name
    },
    created_at: new Date().toISOString()
  });
  
  return updated;
}

async function toggleNomenclatureItemActive(entity, id, userId, active) {
  validateEntity(entity);
  
  const existing = await getNomenclatureItem(entity, id, userId, true);
  
  if (existing.active === (active ? 1 : 0)) {
    return existing;
  }
  
  const updated = await toggleEntityActive(entity, id, active);
  
  await logAuditEntry({
    user_id: userId,
    action: active ? 'activate' : 'deactivate',
    entity_type: entity,
    payload: {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      active: updated.active
    },
    created_at: new Date().toISOString()
  });
  
  return updated;
}

module.exports = {
  listNomenclatureEntities,
  getNomenclatureItem,
  createNomenclatureItem,
  updateNomenclatureItem,
  toggleNomenclatureItemActive
};
