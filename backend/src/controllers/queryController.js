// backend/src/controllers/queryController.js

const { query, pool } = require('../config/database');

const MAX_ROWS = 1000;
const STATEMENT_TIMEOUT_MS = 30000;

/**
 * Detect SQL statement type (skips comments and whitespace)
 */
function detectStatementType(sql) {
  const cleaned = sql
    .replace(/--.*$/gm, '')          // strip -- comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // strip /* */ comments
    .trim();
  const match = cleaned.match(/^([A-Z]+)/i);
  return match ? match[1].toUpperCase() : 'UNKNOWN';
}

/**
 * Reject multi-statement queries (basic check)
 */
function isMultipleStatements(sql) {
  // Remove string literals to avoid counting semicolons inside them
  const withoutStrings = sql
    .replace(/'(?:[^']|'')*'/g, "''")   // single-quoted strings
    .replace(/"(?:[^"]|"")*"/g, '""')   // double-quoted identifiers
    .replace(/\$\$[\s\S]*?\$\$/g, '$$$$'); // dollar-quoted blocks

  // Split on semicolons that aren't at the end
  const parts = withoutStrings.split(';').map(p => p.trim()).filter(Boolean);
  return parts.length > 1;
}

/**
 * Run a direct SQL query (Admin only)
 * POST /api/admin/query
 * Body: { sql: string, allowWrite?: boolean }
 */
const executeQuery = async (req, res) => {
  const startTime = Date.now();
  let statementType = 'UNKNOWN';

  try {
    const { sql, allowWrite = false } = req.body;

    // ===== Validate input =====
    if (!sql || typeof sql !== 'string' || !sql.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const trimmed = sql.trim();

    if (trimmed.length > 100000) {
      return res.status(400).json({ error: 'Query too long (max 100KB)' });
    }

    // ===== Prevent multiple statements =====
    if (isMultipleStatements(trimmed)) {
      return res.status(400).json({
        error: 'Multiple statements are not allowed. Run them one at a time.',
      });
    }

    // ===== Detect statement type =====
    statementType = detectStatementType(trimmed);

    const READ_ONLY_TYPES = ['SELECT', 'WITH', 'EXPLAIN', 'SHOW', 'VALUES'];
    const WRITE_TYPES = ['INSERT', 'UPDATE', 'DELETE', 'MERGE'];
    const DDL_TYPES = ['CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'COMMENT', 'GRANT', 'REVOKE', 'RENAME'];

    // ===== Block writes unless explicitly allowed =====
    if (!allowWrite && !READ_ONLY_TYPES.includes(statementType)) {
      return res.status(403).json({
        error: `${statementType} is a write operation. Toggle "Allow write operations" to proceed.`,
        statementType,
        requiresWriteMode: true,
      });
    }

    // ===== Warn on DDL (client should show confirmation before this) =====
    const isDDL = DDL_TYPES.includes(statementType);
    const isWrite = WRITE_TYPES.includes(statementType);

    // ===== Auto-append LIMIT for SELECTs (unless already present) =====
    let finalSql = trimmed;
    if ((statementType === 'SELECT' || statementType === 'WITH' || statementType === 'VALUES') &&
        !/\bLIMIT\s+\d+/i.test(trimmed)) {
      finalSql = `${trimmed.replace(/;\s*$/, '')} LIMIT ${MAX_ROWS + 1}`;
    }

    // ===== Execute =====
    const client = await pool.connect();
    let result;
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
      result = await client.query(finalSql);
      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    } finally {
      client.release();
    }

    const duration = Date.now() - startTime;
    const allRows = result.rows || [];
    const truncated = allRows.length > MAX_ROWS;
    const rows = truncated ? allRows.slice(0, MAX_ROWS) : allRows;

    // ===== Audit log (fire and forget — don't block response) =====
    query(
      `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user.id,
        req.user.name,
        'SQL Query Executed',
        'Admin SQL Console',
        `${statementType} | ${trimmed.slice(0, 500)}${trimmed.length > 500 ? '...' : ''}`,
        req.ip,
        req.get('user-agent'),
      ]
    ).catch(err => console.error('Audit log failed:', err.message));

    // ===== Respond =====
    res.json({
      statementType,
      command: result.command,
      rowCount: result.rowCount,
      duration,
      truncated,
      rows,
      fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })) || [],
      isWrite,
      isDDL,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    // ===== Log failed queries too =====
    query(
      `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user.id,
        req.user.name,
        'SQL Query Failed',
        'Admin SQL Console',
        `${statementType} | ${req.body?.sql?.slice(0, 500) || ''} | ERROR: ${error.message}`,
        req.ip,
        req.get('user-agent'),
      ]
    ).catch(() => {});

    console.error('Query execution error:', error.message);
    res.status(400).json({
      error: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      duration,
      statementType,
    });
  }
};

module.exports = { executeQuery };