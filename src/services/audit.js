// src/services/audit.js
const pool = require('../config/db');

async function writeAuditLog(user, action, details, resource = null) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, action, resource, details, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [user?.id ?? null, user?.name ?? 'System', action, resource, details]
    );
  } catch (err) {
    console.error('writeAuditLog failed:', err.message);
  }
}

module.exports = { writeAuditLog };