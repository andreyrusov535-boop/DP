const { dbService } = require('../db');

const SORTABLE_FIELDS = {
  created_at: 'r.created_at',
  due_date: 'r.due_date',
  priority: 'r.priority_id', // Sort by ID (critical=1) better than text
  status: 'r.status',
  control_status: 'r.control_status',
  citizen_fio: 'r.citizen_fio',
  address: 'r.address',
  territory: 'r.territory',
  is_overdue: 'r.is_overdue'
};

async function insertRequest(record) {
  const sql = `
    INSERT INTO requests (
      citizen_fio,
      contact_phone,
      contact_email,
      contact_channel,
      request_type_id,
      request_topic_id,
      intake_form_id,
      social_group_id,
      description,
      address,
      territory,
      status,
      priority,
      priority_id,
      executor,
      executor_user_id,
      due_date,
      control_status,
      external_id,
      source,
      created_by,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await dbService.execute(sql, [
    record.citizen_fio,
    record.contact_phone ?? null,
    record.contact_email ?? null,
    record.contact_channel ?? null,
    record.request_type_id ?? null,
    record.request_topic_id ?? null,
    record.intake_form_id ?? record.receipt_form_id ?? null, // Support both names
    record.social_group_id ?? null,
    record.description ?? null,
    record.address ?? null,
    record.territory ?? null,
    record.status,
    record.priority ?? 'medium', // Phase 3 text
    record.priority_id ?? 3, // Default to medium (3) if not provided
    record.executor ?? null,
    record.executor_user_id ?? record.executor_id ?? null, // Support both names
    record.due_date ?? null,
    record.control_status,
    record.external_id ?? null,
    record.source ?? 'manual',
    record.created_by ?? null,
    record.created_at,
    record.updated_at
  ]);

  return result.lastID;
}

async function updateRequest(id, updates) {
  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    // Map legacy/aliased keys if needed
    let dbKey = key;
    if (key === 'executorId') dbKey = 'executor_user_id';
    if (key === 'receiptFormId') dbKey = 'intake_form_id';
    if (key === 'priorityId') dbKey = 'priority_id';
    
    fields.push(`${dbKey} = ?`);
    values.push(value);
  });

  if (fields.length === 0) {
    return 0;
  }

  values.push(id);
  const sql = `UPDATE requests SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  const result = await dbService.execute(sql, values);
  return result.changes;
}

async function getRequestById(id) {
  const sql = `
    SELECT r.*, 
           rt.name AS request_type_name,
           rt.code AS request_type_code,
           topic.name AS request_topic_name,
           topic.code AS request_topic_code,
           inf.name AS intake_form_name,
           inf.name AS receipt_form_name, -- alias
           inf.code AS receipt_form_code,
           sg.name AS social_group_name,
           p.name AS priority_name,
           p.code AS priority_code,
           u.name AS executor_name,
           u.full_name AS executor_full_name,
           u.username AS executor_username,
           rm.name AS removed_by_user_name
    FROM requests r
    LEFT JOIN nomenclature rt ON r.request_type_id = rt.id
    LEFT JOIN nomenclature topic ON r.request_topic_id = topic.id
    LEFT JOIN nomenclature inf ON r.intake_form_id = inf.id
    LEFT JOIN nomenclature sg ON r.social_group_id = sg.id
    LEFT JOIN nomenclature p ON r.priority_id = p.id
    LEFT JOIN users u ON r.executor_user_id = u.id
    LEFT JOIN users rm ON r.removed_from_control_by_user_id = rm.id
    WHERE r.id = ?
  `;
  return dbService.getOne('get_request_by_id', [sql, id]);
}

async function listRequests({ filters, limit, offset, sortBy, sortOrder }) {
  const where = [];
  const params = [];

  if (filters.fio) {
    where.push('LOWER(r.citizen_fio) LIKE LOWER(?)');
    params.push(`%${filters.fio}%`);
  }
  if (filters.typeId) {
    where.push('r.request_type_id = ?');
    params.push(filters.typeId);
  }
  if (filters.topicId) {
    where.push('r.request_topic_id = ?');
    params.push(filters.topicId);
  }
  if (filters.status) {
    where.push('r.status = ?');
    params.push(filters.status);
  }
  // Support searching by text executor OR user ID
  if (filters.executor) {
    // If it looks like an ID, assume ID, otherwise partial match on text
    if (!isNaN(Number(filters.executor))) {
      where.push('r.executor_user_id = ?');
      params.push(Number(filters.executor));
    } else {
      where.push('LOWER(r.executor) LIKE LOWER(?)');
      params.push(`%${filters.executor}%`);
    }
  }
  if (filters.executorId) {
    where.push('r.executor_user_id = ?');
    params.push(filters.executorId);
  }
  
  // Support priority text or ID
  if (filters.priority) {
    where.push('r.priority = ?');
    params.push(filters.priority);
  }
  if (filters.priorityId) {
    where.push('r.priority_id = ?');
    params.push(filters.priorityId);
  }
  
  if (filters.address) {
    where.push('LOWER(r.address) LIKE LOWER(?)');
    params.push(`%${filters.address}%`);
  }
  if (filters.territory) {
    where.push('LOWER(r.territory) LIKE LOWER(?)');
    params.push(`%${filters.territory}%`);
  }
  if (filters.socialGroupId) {
    where.push('r.social_group_id = ?');
    params.push(filters.socialGroupId);
  }
  if (filters.intakeFormId) {
    where.push('r.intake_form_id = ?');
    params.push(filters.intakeFormId);
  }
  if (filters.contactChannel) {
    where.push('r.contact_channel = ?');
    params.push(filters.contactChannel);
  }
  if (filters.dateFrom) {
    where.push('date(r.due_date) >= date(?)');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    where.push('date(r.due_date) <= date(?)');
    params.push(filters.dateTo);
  }
  
  if (filters.search) {
    // Combine FTS5 and LIKE
    // If FTS available
    where.push('(r.id IN (SELECT id FROM request_search WHERE request_search MATCH ?) OR LOWER(r.description) LIKE LOWER(?) OR LOWER(r.citizen_fio) LIKE LOWER(?) OR LOWER(r.contact_email) LIKE LOWER(?))');
    const term = filters.search;
    params.push(term, `%${term}%`, `%${term}%`, `%${term}%`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortField = SORTABLE_FIELDS[sortBy] || SORTABLE_FIELDS.created_at;
  const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countSql = `SELECT COUNT(*) as total FROM requests r ${whereClause}`;
  const { total } = await dbService.get(countSql, params);

  const dataSql = `
    SELECT r.*, 
           rt.name AS request_type_name, 
           topic.name AS request_topic_name,
           inf.name AS intake_form_name,
           inf.name AS receipt_form_name,
           sg.name AS social_group_name,
           p.name AS priority_name,
           u.name AS executor_name,
           u.full_name AS executor_full_name,
           rm.name AS removed_by_user_name
    FROM requests r
    LEFT JOIN nomenclature rt ON r.request_type_id = rt.id
    LEFT JOIN nomenclature topic ON r.request_topic_id = topic.id
    LEFT JOIN nomenclature inf ON r.intake_form_id = inf.id
    LEFT JOIN nomenclature sg ON r.social_group_id = sg.id
    LEFT JOIN nomenclature p ON r.priority_id = p.id
    LEFT JOIN users u ON r.executor_user_id = u.id
    LEFT JOIN users rm ON r.removed_from_control_by_user_id = rm.id
    ${whereClause}
    ORDER BY ${sortField} ${sortDirection}
    LIMIT ? OFFSET ?
  `;

  const rows = await dbService.all(dataSql, [...params, limit, offset]);
  return { rows, total };
}

async function insertFiles(records) {
  if (!records.length) {
    return;
  }
  
  const sql = `
    INSERT INTO files (request_id, original_name, stored_name, mime_type, size, file_hash, description, category, uploaded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  for (const record of records) {
    await dbService.execute(sql, [
      record.request_id,
      record.original_name,
      record.stored_name,
      record.mime_type,
      record.size,
      record.file_hash || null,
      record.description || null,
      record.category || 'attachment',
      record.uploaded_by || null,
      record.created_at
    ]);
  }
}

async function getFilesByRequestId(requestId) {
  const sql = `
    SELECT id, original_name, mime_type, size, file_hash, description, category, uploaded_by, created_at 
    FROM files 
    WHERE request_id = ? 
    ORDER BY id ASC
  `;
  return dbService.all(sql, requestId);
}

async function getFileById(fileId) {
  const sql = 'SELECT * FROM files WHERE id = ?';
  return dbService.get(sql, fileId);
}

async function deleteFileById(fileId) {
  const sql = 'DELETE FROM files WHERE id = ?';
  return dbService.execute(sql, fileId);
}

async function logProceeding(log) {
  const sql = `
    INSERT INTO request_proceedings (request_id, action, notes, created_at)
    VALUES (?, ?, ?, ?)
  `;
  return dbService.execute(sql, [log.request_id, log.action, log.details, log.created_at]);
}

async function logAction(tableName, log) {
  const sql = `INSERT INTO ${tableName} (request_id, action, ${tableName === 'audit_log' ? 'payload' : 'notes'}, created_at) VALUES (?, ?, ?, ?)`;
  return dbService.execute(sql, [
    log.request_id, log.action, log.details, log.created_at
  ]);
}

module.exports = {
  insertRequest,
  updateRequest,
  getRequestById,
  listRequests,
  insertFiles,
  getFilesByRequestId,
  getFileById,
  deleteFileById,
  logProceeding,
  logAction,
  SORTABLE_FIELDS
};
