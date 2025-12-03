const { getDb } = require('../db');

const SORTABLE_FIELDS = {
  created_at: 'r.created_at',
  due_date: 'r.due_date',
  priority: 'r.priority',
  status: 'r.status',
  control_status: 'r.control_status',
  citizen_fio: 'r.citizen_fio'
};

async function insertRequest(record) {
  const db = getDb();
  const sql = `
    INSERT INTO requests (
      citizen_fio,
      contact_phone,
      contact_email,
      request_type_id,
      request_topic_id,
      description,
      status,
      executor,
      priority,
      due_date,
      control_status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await db.run(sql, [
    record.citizen_fio,
    record.contact_phone ?? null,
    record.contact_email ?? null,
    record.request_type_id ?? null,
    record.request_topic_id ?? null,
    record.description ?? null,
    record.status,
    record.executor ?? null,
    record.priority,
    record.due_date ?? null,
    record.control_status,
    record.created_at,
    record.updated_at
  ]);

  return result.lastID;
}

async function updateRequest(id, updates) {
  const db = getDb();
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
  const sql = `UPDATE requests SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`;
  values.splice(values.length - 1, 0, new Date().toISOString());
  const result = await db.run(sql, values);
  return result.changes;
}

async function getRequestById(id) {
  const db = getDb();
  const sql = `
    SELECT r.*, t.name AS request_type_name, topic.name AS request_topic_name
    FROM requests r
    LEFT JOIN request_types t ON r.request_type_id = t.id
    LEFT JOIN request_topics topic ON r.request_topic_id = topic.id
    WHERE r.id = ?
  `;
  return db.get(sql, id);
}

async function listRequests({ filters, limit, offset, sortBy, sortOrder }) {
  const db = getDb();
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
  if (filters.executor) {
    where.push('LOWER(r.executor) LIKE LOWER(?)');
    params.push(`%${filters.executor}%`);
  }
  if (filters.priority) {
    where.push('r.priority = ?');
    params.push(filters.priority);
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
      'LOWER(r.executor) LIKE LOWER(?)',
      'LOWER(r.contact_email) LIKE LOWER(?)'
    ].join(' OR ');
    where.push(`(${searchClause})`);
    const term = `%${filters.search}%`;
    params.push(term, term, term, term);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortField = SORTABLE_FIELDS[sortBy] || SORTABLE_FIELDS.created_at;
  const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countSql = `SELECT COUNT(*) as total FROM requests r ${whereClause}`;
  const countParams = [...params];
  const { total } = await db.get(countSql, countParams);

  const dataSql = `
    SELECT r.*, t.name AS request_type_name, topic.name AS request_topic_name
    FROM requests r
    LEFT JOIN request_types t ON r.request_type_id = t.id
    LEFT JOIN request_topics topic ON r.request_topic_id = topic.id
    ${whereClause}
    ORDER BY ${sortField} ${sortDirection}
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...params, limit, offset];
  const rows = await db.all(dataSql, dataParams);
  return { rows, total };
}

async function insertFiles(records) {
  if (!records.length) {
    return;
  }
  const db = getDb();
  const stmt = await db.prepare(`
    INSERT INTO files (request_id, original_name, stored_name, mime_type, size, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  try {
    for (const record of records) {
      await stmt.run(
        record.request_id,
        record.original_name,
        record.stored_name,
        record.mime_type,
        record.size,
        record.created_at
      );
    }
  } finally {
    await stmt.finalize();
  }
}

async function getFilesByRequestId(requestId) {
  const db = getDb();
  return db.all(
    'SELECT id, original_name, mime_type, size, created_at FROM files WHERE request_id = ? ORDER BY id ASC',
    requestId
  );
}

async function getFileById(fileId) {
  const db = getDb();
  return db.get('SELECT * FROM files WHERE id = ?', fileId);
}

async function logAction(tableName, log) {
  const db = getDb();
  const sql = `INSERT INTO ${tableName} (request_id, action, ${tableName === 'audit_log' ? 'payload' : 'notes'}, created_at) VALUES (?, ?, ?, ?)`;
  return db.run(sql, [log.request_id, log.action, log.details, log.created_at]);
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
