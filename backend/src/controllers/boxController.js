// src/controllers/boxController.js
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
 * Box lifecycle state machine
 * ================================================================ */
const ALLOWED_TRANSITIONS = {
  'Draft':      [{ to: 'Packed',     roles: ['Admin', 'Manager'] }],
  'Packed':     [{ to: 'In Transit', roles: ['Admin', 'Manager'] },
                 { to: 'Draft',      roles: ['Admin'] }],
  'In Transit': [{ to: 'Archived',   roles: ['Admin', 'Manager'] },
                 { to: 'Packed',     roles: ['Admin'] }],
  'Archived':   [{ to: 'Dissolved',  roles: ['Admin'] },
                 { to: 'In Transit', roles: ['Admin'] }],
  'Dissolved':  [],
};

function allowedFor(currentStatus, role) {
  return (ALLOWED_TRANSITIONS[currentStatus] || [])
    .filter(t => t.roles.includes(role))
    .map(t => t.to);
}

/* ================================================================
 * GET /api/boxes
 * ================================================================ */
exports.listBoxes = async (req, res) => {
  const { search } = req.query;
  const params = [];
  let where = '1=1';

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (b.identifier ILIKE $${params.length}
                 OR b.file_type  ILIKE $${params.length}
                 OR b.branch_code ILIKE $${params.length}
                 OR br.name      ILIKE $${params.length})`;
  }

  try {
    const result = await pool.query(
      `SELECT b.id,
              b.identifier,
              b.file_type,
              COALESCE(b.status, 'Draft') AS status,
              b.branch_code,
              br.name AS branch_name,
              COUNT(d.id)::int AS document_count
         FROM boxes b
         LEFT JOIN branches br ON br.code = b.branch_code
         LEFT JOIN documents d ON d.box_id = b.id
        WHERE ${where}
        GROUP BY b.id, b.branch_code, br.name
        ORDER BY b.identifier`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('listBoxes error:', err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================================================
 * GET /api/boxes/:id
 * ================================================================ */
exports.getBoxDetail = async (req, res) => {
  const { id } = req.params;
  const role = req.user?.role;

  try {
    const boxRes = await pool.query(
      `SELECT b.*, br.name AS branch_name
         FROM boxes b
         LEFT JOIN branches br ON br.code = b.branch_code
        WHERE b.id = $1`,
      [id]
    );
    if (boxRes.rows.length === 0) {
      return res.status(404).json({ error: 'Box not found' });
    }
    const box = boxRes.rows[0];
    const status = box.status || 'Draft';

    const docsRes = await pool.query(
      `SELECT d.id, d.title, d.type, d.status,
              d.archive_reference_number, d.claim_number,
              d.policy_number, d.insured_name
         FROM documents d
        WHERE d.box_id = $1
        ORDER BY d.updated_at DESC NULLS LAST`,
      [id]
    );

    res.json({
      ...box,
      status,
      document_count: docsRes.rowCount,
      documents: docsRes.rows,
      allowed_transitions: allowedFor(status, role),
    });
  } catch (err) {
    console.error('getBoxDetail error:', err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================================================
 * PATCH /api/boxes/:id/status
 * (unchanged from before — no branch reference)
 * ================================================================ */
exports.updateBoxStatus = async (req, res) => {
  const { id } = req.params;
  const { status: nextStatus, note } = req.body;
  const role = req.user?.role;
  const actorId = req.user?.id;

  if (!nextStatus) return res.status(400).json({ error: 'status is required' });

  try {
    const boxRes = await pool.query('SELECT * FROM boxes WHERE id = $1', [id]);
    if (boxRes.rows.length === 0) {
      return res.status(404).json({ error: 'Box not found' });
    }
    const box = boxRes.rows[0];
    const currentStatus = box.status || 'Draft';

    const transition = (ALLOWED_TRANSITIONS[currentStatus] || [])
      .find(t => t.to === nextStatus);
    if (!transition) {
      return res.status(400).json({
        error: `Cannot move box from "${currentStatus}" to "${nextStatus}"`,
        current_status: currentStatus,
        allowed_transitions: allowedFor(currentStatus, role),
      });
    }
    if (!transition.roles.includes(role)) {
      return res.status(403).json({
        error: `Role "${role}" is not allowed to perform this transition`,
      });
    }

    if (nextStatus === 'Dissolved') {
      const docCount = await pool.query(
        'SELECT COUNT(*)::int AS c FROM documents WHERE box_id = $1',
        [id]
      );
      if (docCount.rows[0].c > 0) {
        return res.status(409).json({
          error:
            'Cannot dissolve box while documents are still linked. Shelve them into File Box drawers first.',
        });
      }
    }

    const stamps = {
      'Packed':     { at: 'packed_at',     by: 'packed_by' },
      'In Transit': { at: 'dispatched_at', by: 'dispatched_by' },
      'Archived':   { at: 'archived_at',   by: 'archived_by' },
      'Dissolved':  { at: 'dissolved_at',  by: 'dissolved_by' },
    };
    const stamp = stamps[nextStatus];

    const setClauses = ['status = $1', 'updated_at = NOW()'];
    const params = [nextStatus];

    if (stamp) {
      params.push(actorId ?? null);
      setClauses.push(`${stamp.at} = NOW()`);
      setClauses.push(`${stamp.by} = $${params.length}`);
    }

    params.push(id);
    await pool.query(
      `UPDATE boxes SET ${setClauses.join(', ')} WHERE id = $${params.length}`,
      params
    );

    await audit(
      req.user,
      'box.status.changed',
      box.identifier,
      `${currentStatus} → ${nextStatus}${note ? ` — Note: ${note}` : ''}`
    );

    return exports.getBoxDetail(req, res);
  } catch (err) {
    console.error('updateBoxStatus error:', err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================================================
 * DELETE /api/boxes/:id/documents/:documentId
 * (unchanged — no branch reference)
 * ================================================================ */
exports.removeDocumentFromBox = async (req, res) => {
  const { id, documentId } = req.params;

  try {
    const boxRes = await pool.query(
      'SELECT status, identifier FROM boxes WHERE id = $1',
      [id]
    );
    if (boxRes.rows.length === 0) {
      return res.status(404).json({ error: 'Box not found' });
    }
    const status = boxRes.rows[0].status || 'Draft';
    if (status !== 'Draft') {
      return res.status(409).json({
        error: `Cannot remove documents from a box in status "${status}". Reopen the box first.`,
      });
    }

    const result = await pool.query(
      `UPDATE documents
          SET box_id = NULL, updated_at = NOW()
        WHERE id = $1 AND box_id = $2
        RETURNING id, archive_reference_number, title`,
      [documentId, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Document not found in this box' });
    }

    const doc = result.rows[0];
    await audit(
      req.user,
      'box.document.removed',
      doc.archive_reference_number || doc.id,
      `Removed from box ${boxRes.rows[0].identifier}`
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('removeDocumentFromBox error:', err);
    res.status(500).json({ error: err.message });
  }
};