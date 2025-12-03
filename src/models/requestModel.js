const { dbService } = require('../db');

const SORTABLE_FIELDS = {
  created_at: 'r.created_at',
  due_date: 'r.due_date',
  priority_id: 'r.priority_id',
  status: 'r.status',
  control_status: 'r.control_status',
  citizen_fio: 'r.citizen_fio',
  is_overdue: 'r.is_overdue'
};

async function insertRequest(record) {
  const sql = `
    INSERT INTO requests (
      citizen_fio,
      contact_phone,
      contact_email,
      request_type_id,
      request_topic_id,
      receipt_form_id,
      description,
      status,
      executor_id,
      priority_id,
      due_date,
      control_status,
      external_id,
      source,
      created_by,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await dbService.execute(sql, [
    record.citizen_fio,
    record.contact_phone ?? null,
    record.contact_email ?? null,
    record.request_type_id ?? null,
    record.request_topic_id ?? null,
    record.receipt_form_id ?? null,
    record.description ?? null,
    record.status,
    record.executor_id ?? null,
    record.priority_id,
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
    fields.push(`${key} = ?`);
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
           rf.name AS receipt_form_name,
           rf.code AS receipt_form_code,
           p.name AS priority_name,
           p.code AS priority_code,
           u.full_name AS executor_name,
           u.username AS executor_username
    FROM requests r
    LEFT JOIN nomenclature rt ON r.request_type_id = rt.id
    LEFT JOIN nomenclature topic ON r.request_topic_id = topic.id
    LEFT JOIN nomenclature rf ON r.receipt_form_id = rf.id
    LEFT JOIN nomenclature p ON r.priority_id = p.id
    LEFT JOIN users u ON r.executor_id = u.id
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
  if (filters.executorId) {
    where.push('r.executor_id = ?');
    params.push(filters.executorId);
  }
  if (filters.priorityId) {
    where.push('r.priority_id = ?');
    params.push(filters.priorityId);
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
    const searchClause = [
      'LOWER(r.description) LIKE LOWER(?)',
      'LOWER(r.citizen_fio) LIKE LOWER(?)',
      'LOWER(r.contact_email) LIKE LOWER(?)'
    ].join(' OR ');
    where.push(`(${searchClause})`);
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortField = SORTABLE_FIELDS[sortBy] || SORTABLE_FIELDS.created_at;
  const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countSql = `SELECT COUNT(*) as total FROM requests r ${whereClause}`;
  const countParams = [...params];
  const { total } = await dbService.get(countSql, countParams);

  const dataSql = `
    SELECT r.*, 
           rt.name AS request_type_name,
           topic.name AS request_topic_name,
           rf.name AS receipt_form_name,
           p.name AS priority_name,
           u.full_name AS executor_name
    FROM requests r
    LEFT JOIN nomenclature rt ON r.request_type_id = rt.id
    LEFT JOIN nomenclature topic ON r.request_topic_id = topic.id
    LEFT JOIN nomenclature rf ON r.receipt_form_id = rf.id
    LEFT JOIN nomenclature p ON r.priority_id = p.id
    LEFT JOIN users u ON r.executor_id = u.id
    ${whereClause}
    ORDER BY ${sortField} ${sortDirection}
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...params, limit, offset];
  const rows = await dbService.all(dataSql, dataParams);
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
  logAction,
  SORTABLE_FIELDS
};
