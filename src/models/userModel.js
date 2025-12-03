const { getDb } = require('../db');

async function createUser(userData) {
  const db = getDb();
  const sql = `
    INSERT INTO users (
      email,
      password_hash,
      name,
      role,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await db.run(sql, [
    userData.email,
    userData.password_hash,
    userData.name,
    userData.role || 'citizen',
    userData.status || 'active',
    userData.created_at,
    userData.updated_at
  ]);

  return result.lastID;
}

async function getUserById(id) {
  const db = getDb();
  const sql = 'SELECT id, email, name, role, status, created_at, updated_at FROM users WHERE id = ?';
  return db.get(sql, id);
}

async function getUserByEmail(email) {
  const db = getDb();
  const sql = 'SELECT * FROM users WHERE email = ?';
  return db.get(sql, email);
}

async function getUserWithPassword(email) {
  const db = getDb();
  const sql = 'SELECT * FROM users WHERE email = ?';
  return db.get(sql, email);
}

async function updateUser(id, updates) {
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
  const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`;
  values.splice(values.length - 1, 0, new Date().toISOString());
  const result = await db.run(sql, values);
  return result.changes;
}

async function listUsers({ filters = {}, limit = 20, offset = 0, sortBy = 'created_at', sortOrder = 'desc' } = {}) {
  const db = getDb();
  const where = [];
  const params = [];

  if (filters.role) {
    where.push('role = ?');
    params.push(filters.role);
  }

  if (filters.status) {
    where.push('status = ?');
    params.push(filters.status);
  }

  if (filters.search) {
    where.push('(LOWER(email) LIKE LOWER(?) OR LOWER(name) LIKE LOWER(?))');
    const term = `%${filters.search}%`;
    params.push(term, term);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
  const sortField = ['created_at', 'email', 'name', 'role', 'status'].includes(sortBy) ? sortBy : 'created_at';

  const countSql = `SELECT COUNT(*) as total FROM users ${whereClause}`;
  const { total } = await db.get(countSql, params);

  const dataSql = `
    SELECT id, email, name, role, status, created_at, updated_at FROM users
    ${whereClause}
    ORDER BY ${sortField} ${sortDirection}
    LIMIT ? OFFSET ?
  `;

  const rows = await db.all(dataSql, [...params, limit, offset]);
  return { rows, total };
}

async function deleteUser(id) {
  const db = getDb();
  const result = await db.run('DELETE FROM users WHERE id = ?', id);
  return result.changes;
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  getUserWithPassword,
  updateUser,
  listUsers,
  deleteUser
};
