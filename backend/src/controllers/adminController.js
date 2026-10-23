// src/controllers/adminController.js
const pool = require('../config/database');

/* ================================================================
 * Inline audit helper (fire-and-forget, never throws)
 * ================================================================ */
async function audit(user, action, resource, details) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, action, resource, details, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [user?.id ?? null, user?.name ?? 'System', action, resource, details]
    );
  } catch (err) {
    console.error('audit() failed:', err.message);
  }
}

/* ================================================================
 * POST /api/admin/query
 * ================================================================ */
exports.executeQuery = async (req, res) => {
  const { sql, allowWrite = false } = req.body;
  const startTime = process.hrtime();

  if (!sql || !sql.trim()) {
    return res.status(400).json({ error: 'SQL query is required' });
  }

  const trimmedSql = sql.trim();

  // 1. Basic Security Checks
  const isWrite = /\b(INSERT|UPDATE|DELETE|MERGE)\b/i.test(trimmedSql);
  const isDDL = /\b(CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|RENAME)\b/i.test(trimmedSql);

  if ((isWrite || isDDL) && !allowWrite) {
    return res.status(403).json({
      error: 'Write operations are disabled. Please check "Allow write operations" to proceed.',
    });
  }

  // 2. Execution
  try {
    // Set a 30-second timeout for this specific query to prevent locking the DB
    await pool.query('SET statement_timeout = 30000');

    // Execute the query
    const result = await pool.query(trimmedSql);

    // Calculate execution time
    const diff = process.hrtime(startTime);
    const duration = Math.round((diff[0] * 1000) + (diff[1] / 1e6));

    // Determine Postgres command type (SELECT, INSERT, UPDATE, etc.)
    const command = result.command; 
    
    // Limit rows to prevent frontend freezing (Admin console is for debugging, not bulk export)
    const MAX_ROWS = 1000;
    const truncated = result.rowCount > MAX_ROWS;
    const rows = truncated ? result.rows.slice(0, MAX_ROWS) : result.rows;

    // Format response exactly as AdminQueryPage.tsx expects
    const responsePayload = {
      statementType: command,
      command: command,
      rowCount: result.rowCount || 0,
      duration,
      truncated,
      rows,
      fields: result.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
      isWrite: isWrite && !isDDL,
      isDDL: isDDL
    };

    // Log to audit trail
    const actionStr = isDDL ? 'admin.sql.ddl' : isWrite ? 'admin.sql.write' : 'admin.sql.read';
    const truncatedSql = trimmedSql.length > 150 ? trimmedSql.substring(0, 147) + '...' : trimmedSql;
    await audit(req.user, actionStr, 'database', truncatedSql);

    // Reset timeout so it doesn't leak to standard app queries
    await pool.query('SET statement_timeout = 0');

    res.json(responsePayload);
  } catch (err) {
    // Format Postgres error for the frontend UI
    const errorResponse = {
      error: err.message,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      position: err.position,
      statementType: isDDL ? 'DDL' : isWrite ? 'WRITE' : 'READ'
    };

    // Log failed attempts too
    await audit(req.user, 'admin.sql.error', 'database', err.message);

    res.status(400).json(errorResponse);
  }
};