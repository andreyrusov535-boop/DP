const { getDb } = require('../db');

async function logAuditEntry(auditData) {
  const db = getDb();
  const sql = `
    INSERT INTO audit_log (
      user_id,
      request_id,
      action,
      entity_type,
      payload,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  return db.run(sql, [
    auditData.user_id || null,
    auditData.request_id || null,
    auditData.action,
    auditData.entity_type || null,
    auditData.payload ? JSON.stringify(auditData.payload) : null,
    auditData.created_at
  ]);
}

module.exports = {
  logAuditEntry
};
