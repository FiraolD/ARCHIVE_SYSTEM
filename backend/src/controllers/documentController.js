// src/controllers/documentController.js
const { query, withTransaction } = require('../config/database');
const notificationService = require('../services/notificationService');
const { normalizePagination } = require('../utils/pagination');
const { buildWhere } = require('../utils/documentFilters');

/* ================================================================
 * Helpers
 * ================================================================ */

/** Fire-and-forget audit log. Never throws — failures are logged only. */
async function audit(user, action, resource, details) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, user_name, action, resource, details, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [user?.id ?? null, user?.name ?? 'System', action, resource, details]
    );
  } catch (err) {
    console.error('audit() failed:', err.message);
  }
}

/**
 * Generate the next archive reference for a given branch.
 * Format: AI/<BRANCH_CODE>/<SEQ 3-digit>/<YY>
 */
async function generateArchiveReference(client, branchCode) {
  const year = new Date().getFullYear().toString().slice(-2);
  const res = await client.query(
    `SELECT COALESCE(
       MAX(CAST(SPLIT_PART(archive_reference_number, '/', 3) AS INTEGER)),
       0
     ) AS max_seq
       FROM documents
      WHERE SPLIT_PART(archive_reference_number, '/', 1) = 'AI'
        AND SPLIT_PART(archive_reference_number, '/', 2) = $1
        AND SPLIT_PART(archive_reference_number, '/', 4) = $2`,
    [branchCode, year]
  );
  const next = (parseInt(res.rows[0]?.max_seq, 10) || 0) + 1;
  return `AI/${branchCode}/${String(next).padStart(3, '0')}/${year}`;
}

/**
 * Build a WHERE clause + params for the documents query.
 */

/* ================================================================
 * GET /api/documents
 * ================================================================ */
exports.getDocuments = async (req, res) => {
  try {
    const { page, limit, offset } = normalizePagination(req.query);
    const sort = req.query.sort === 'title' ? 'title'
      : req.query.sort === 'status' ? 'status'
      : 'created_at';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

    const filters = {
      search: req.query.search,
      type: req.query.type,
      status: req.query.status,
      branch_id: req.query.branch_id,
      plate_number: req.query.plate_number,
      insured_name: req.query.insured_name,
      date_of_accident_from: req.query.date_of_accident_from,
      date_of_accident_to: req.query.date_of_accident_to,
      sum_insured_min: req.query.sum_insured_min,
      sum_insured_max: req.query.sum_insured_max,
      legacy: req.query.legacy,
    };

    const mainWhere = buildWhere(filters);

    const dataSql = `
      SELECT d.*,
             b.name AS branch_name,
             b.code AS branch_code,
             c.number AS cabinet_number
        FROM documents d
        LEFT JOIN branches b ON d.branch_id = b.id
        LEFT JOIN cabinets c ON d.cabinet_id = c.id
        ${mainWhere.sql}
       ORDER BY d.${sort} ${order}
       LIMIT $${mainWhere.params.length + 1}
       OFFSET $${mainWhere.params.length + 2}
    `;

    const countSql = `SELECT COUNT(*)::int AS total FROM documents d ${mainWhere.sql}`;

    const [dataRes, countRes] = await Promise.all([
      query(dataSql, [...mainWhere.params, limit, offset]),
      query(countSql, mainWhere.params),
    ]);

    const total = countRes.rows[0]?.total ?? 0;
    const total_pages = Math.ceil(total / limit);

    /* ---- Facets ---- */
    const [
      typeFacet, statusFacet, branchFacet, yearFacet, rangeFacet,
    ] = await Promise.all([
      (async () => {
        const w = buildWhere(filters, ['type']);
        return query(
          `SELECT d.type AS value, COUNT(*)::int AS count
             FROM documents d ${w.sql}
            GROUP BY d.type ORDER BY d.type`,
          w.params
        );
      })(),
      (async () => {
        const w = buildWhere(filters, ['status']);
        return query(
          `SELECT d.status AS value, COUNT(*)::int AS count
             FROM documents d ${w.sql}
            GROUP BY d.status ORDER BY d.status`,
          w.params
        );
      })(),
      (async () => {
        const w = buildWhere(filters, ['branch']);
        return query(
          `SELECT b.id, b.name AS value, COUNT(d.id)::int AS count
             FROM documents d
             LEFT JOIN branches b ON d.branch_id = b.id
             ${w.sql}
            GROUP BY b.id, b.name
            ORDER BY b.name`,
          w.params
        );
      })(),
      (async () => {
        const w = buildWhere(filters, ['accident']);
        const clause = w.sql
          ? `${w.sql} AND d.date_of_accident IS NOT NULL`
          : `WHERE d.date_of_accident IS NOT NULL`;
        return query(
          `SELECT EXTRACT(YEAR FROM d.date_of_accident)::text AS value,
                  COUNT(*)::int AS count
             FROM documents d
             ${clause}
            GROUP BY value
            ORDER BY value DESC`,
          w.params
        );
      })(),
      (async () => {
        const w = buildWhere(filters, ['sum']);
        const clause = w.sql
          ? `${w.sql} AND d.sum_insured IS NOT NULL`
          : `WHERE d.sum_insured IS NOT NULL`;
        return query(
          `SELECT COALESCE(MIN(d.sum_insured), 0)::float AS min,
                  COALESCE(MAX(d.sum_insured), 0)::float AS max
             FROM documents d ${clause}`,
          w.params
        );
      })(),
    ]);

    res.json({
      documents: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages,
      },
      facets: {
        by_type: typeFacet.rows,
        by_status: statusFacet.rows,
        by_branch: branchFacet.rows,
        by_accident_year: yearFacet.rows,
        ranges: {
          sum_insured_min: rangeFacet.rows[0]?.min ?? 0,
          sum_insured_max: rangeFacet.rows[0]?.max ?? 0,
        },
      },
    });
  } catch (err) {
    console.error('getDocuments error:', err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================================================
 * GET /api/documents/:id
 * ================================================================ */
exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const docRes = await query(
      `SELECT d.*,
              b.name AS branch_name,
              b.code AS branch_code,
              c.number AS cabinet_number
         FROM documents d
         LEFT JOIN branches b ON d.branch_id = b.id
         LEFT JOIN cabinets c ON d.cabinet_id = c.id
        WHERE d.id = $1`,
      [id]
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const versionsRes = await query(
      `SELECT v.id,
              v.version,
              v.changes,
              v.updated_at AS "updatedAt",
              u.name AS "updatedBy"
         FROM document_versions v
         LEFT JOIN users u ON v.updated_by = u.id
        WHERE v.document_id = $1
        ORDER BY v.version DESC`,
      [id]
    );

    res.json({
      ...docRes.rows[0],
      versions: versionsRes.rows,
    });
  } catch (err) {
    console.error('getDocumentById error:', err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================================================
 * POST /api/documents/ingest
 * ================================================================ */
exports.ingestDocument = async (req, res) => {
  try {
    const b = req.body;

    if (!b.branchId || !b.type) {
      return res.status(400).json({ error: 'branchId and type are required' });
    }

    // Use the withTransaction helper from your database config
    const doc = await withTransaction(async (client) => {
      const branchRes = await client.query(
        'SELECT code FROM branches WHERE id = $1',
        [b.branchId]
      );
      if (branchRes.rows.length === 0) {
        throw new Error('Invalid branch');
      }
      const branchCode = b.branchCode || branchRes.rows[0].code;

      await client.query(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        [`archive:${branchCode}`]
      );

      const archiveRef = await generateArchiveReference(client, branchCode);

      const filePath = req.file?.path ?? null;
      const fileSize = req.file?.size ?? null;
      const fileMime = req.file?.mimetype ?? null;

      let productCustomFields = {};
      if (b.productCustomFields) {
        try {
          productCustomFields = JSON.parse(b.productCustomFields);
        } catch { /* ignore */ }
      }

      const insertRes = await client.query(
        `INSERT INTO documents (
           title, type, status, branch_id, archive_reference_number,
           claim_number, policy_number, insured_name, plate_number,
           sum_insured, estimated_loss, date_of_accident, period_of_policy,
           date_added, received_by, delivered_by, receiver_remark,
           physical_placement, product_id, product_custom_fields,
           cabinet_id, drawer_number, file_url, file_size, file_mime,
           created_by, created_at, updated_at
         ) VALUES (
           $1, $2, 'Active', $3, $4,
           $5, $6, $7, $8,
           $9, $10, $11, $12,
           $13, $14, $15, $16,
           $17, $18, $19,
           $20, $21, $22, $23, $24,
           $25, NOW(), NOW()
         )
         RETURNING *`,
        [
          b.title || `${b.type} - ${new Date().toISOString().slice(0, 10)}`,
          b.type,
          b.branchId,
          archiveRef,
          b.claimNumber || null,
          b.policyNumber || null,
          b.insuredName || null,
          b.plateNumber || null,
          b.sumInsured ? Number(b.sumInsured) : null,
          b.estimatedLoss ? Number(b.estimatedLoss) : null,
          b.dateOfAccident || null,
          b.periodOfPolicy || null,
          b.dateAdded || new Date().toISOString().slice(0, 10),
          b.receivedBy || null,
          b.deliveredBy || null,
          b.receiverRemark || null,
          b.physicalPlacement || 'Temporary Location',
          b.productId || null,
          JSON.stringify(productCustomFields),
          b.cabinetId || null,
          b.drawerNumber || null,
          filePath,
          fileSize,
          fileMime,
          req.user?.id ?? null,
        ]
      );

      const newDoc = insertRes.rows[0];

      await client.query(
        `INSERT INTO document_versions (document_id, version, version_number, changes, updated_by, updated_at)
         VALUES ($1, 1, 1, 'Initial ingestion', $2, NOW())`,
        [newDoc.id, req.user?.id ?? null]
      );

      return newDoc;
    });

    await audit(
      req.user,
      'Document Ingested',
      doc.id,
      `Ref: ${doc.archive_reference_number}`
    );

    if (req.user?.id) {
      await notificationService.sendToUser(
        req.user.id,
        'Document Ingested',
        `Document ${doc.archive_reference_number} was successfully ingested.`,
        'success'
      );
    }

    res.status(201).json(doc);
  } catch (err) {
    console.error('ingestDocument error:', err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================================================
 * PATCH /api/documents/:id
 * ================================================================ */
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body;

    const current = await query(
      'SELECT archive_reference_number, title FROM documents WHERE id = $1',
      [id]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const docRef = current.rows[0].archive_reference_number || current.rows[0].title;

    let productCustomFields = b.productCustomFields || {};
    if (typeof productCustomFields === 'string') {
      try { productCustomFields = JSON.parse(productCustomFields); } catch {}
    }

    await query(
      `UPDATE documents 
          SET title = $1, 
              type = $2,
              branch_id = $3, 
              product_id = $4,
              product_custom_fields = $5,
              claim_number = $6, 
              policy_number = $7, 
              insured_name = $8, 
              plate_number = $9,
              sum_insured = $10, 
              estimated_loss = $11, 
              date_of_accident = $12, 
              period_of_policy = $13,
              date_added = $14,
              received_by = $15,
              delivered_by = $16,
              receiver_remark = $17,
              cabinet_id = $18,
              drawer_number = $19,
              physical_placement = $20,
              updated_at = NOW() 
        WHERE id = $21`,
      [
        b.title, b.type, b.branchId, b.productId || null, JSON.stringify(productCustomFields),
        b.claimNumber || null, b.policyNumber || null, b.insuredName || null, b.plateNumber || null,
        b.sumInsured || null, b.estimatedLoss || null, b.dateOfAccident || null, b.periodOfPolicy || null,
        b.dateAdded || null, b.receivedBy || null, b.deliveredBy || null, b.receiverRemark || null,
        b.cabinetId || null, b.drawerNumber || null, b.physicalPlacement || null, id
      ]
    );

    const changesText = b.fieldsModified && b.fieldsModified.length > 0 
      ? `Modified fields: ${b.fieldsModified.join(', ')}`
      : 'Metadata updated';

    await query(
      `INSERT INTO document_versions (document_id, version, version_number, changes, updated_by, updated_at)
       SELECT $1, COALESCE(MAX(version), 0) + 1, COALESCE(MAX(version_number), 0) + 1, $2, $3, NOW()
       FROM document_versions WHERE document_id = $1`, 
      [id, changesText, req.user?.id ?? null]
    );

    await audit(req.user, 'Document Modified', id, changesText);
    
    if (req.user?.id) {
      await notificationService.sendToUser(
        req.user.id, 'Document Updated',
        `Details for ${docRef} were successfully updated.`, 'info'
      );
    }

    res.json({ ok: true, changes: changesText });
  } catch (err) {
    console.error('updateDocument error:', err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================================================
 * DELETE /api/documents/:id
 * ================================================================ */
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const current = await query(
      'SELECT archive_reference_number, title FROM documents WHERE id = $1', 
      [id]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const docRef = current.rows[0].archive_reference_number || current.rows[0].title;

    await query('DELETE FROM document_versions WHERE document_id = $1', [id]);
    await query('DELETE FROM documents WHERE id = $1', [id]);

    await audit(req.user, 'Document Deleted', id, `Ref: ${docRef}`);
    
    if (req.user?.id) {
      await notificationService.sendToUser(
        req.user.id, 'Document Deleted',
        `Document ${docRef} was permanently deleted from the archive.`, 'error'
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('deleteDocument error:', err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================================================
 * PATCH /api/documents/:id/status
 * ================================================================ */
exports.updateDocumentStatus = async (req, res) => {
  const VALID_STATUSES = ['Active', 'Checked-out', 'Settled Claims', 'Returned'];

  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'status is required' });
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });

    const current = await query(
      'SELECT status, archive_reference_number, title FROM documents WHERE id = $1',
      [id]
    );
    if (current.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    
    const previousStatus = current.rows[0].status;
    const docRef = current.rows[0].archive_reference_number || current.rows[0].title;

    const update = await query(
      `UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    await query(
      `INSERT INTO document_versions (document_id, version, version_number, changes, updated_by, updated_at)
       SELECT $1, COALESCE(MAX(version), 0) + 1, COALESCE(MAX(version_number), 0) + 1, $2, $3, NOW()
         FROM document_versions WHERE document_id = $1`,
      [id, `Status: ${previousStatus} → ${status}`, req.user?.id ?? null]
    );

    await audit(req.user, 'Status Updated', id, `Status: ${previousStatus} → ${status}`);

    if (req.user?.id) {
      await notificationService.sendToUser(
        req.user.id, 'Status Updated',
        `Document ${docRef} is now ${status}.`, 'info'
      );
    }

    res.json(update.rows[0]);
  } catch (err) {
    console.error('updateDocumentStatus error:', err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================================================
 * PATCH /api/documents/:id/placement
 * ================================================================ */
exports.updatePhysicalPlacement = async (req, res) => {
  try {
    const { id } = req.params;
    const { physicalPlacement, placement, cabinetId, drawerNumber } = req.body;

    let finalPlacement = physicalPlacement || placement || null;

    if (!finalPlacement && cabinetId && drawerNumber) {
      const cabRes = await query('SELECT number FROM cabinets WHERE id = $1', [cabinetId]);
      if (cabRes.rows.length === 0) return res.status(400).json({ error: 'Invalid cabinet' });
      finalPlacement = `Cabinet ${cabRes.rows[0].number} - Drawer ${drawerNumber}`;
    }

    if (!finalPlacement) return res.status(400).json({ error: 'Provide either physicalPlacement or cabinetId + drawerNumber' });

    const current = await query(
      'SELECT physical_placement, archive_reference_number, title FROM documents WHERE id = $1', [id]
    );
    if (current.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    
    const previousPlacement = current.rows[0].physical_placement;
    const docRef = current.rows[0].archive_reference_number || current.rows[0].title;

    const update = await query(
      `UPDATE documents SET physical_placement = $1, cabinet_id = COALESCE($2, cabinet_id), drawer_number = COALESCE($3, drawer_number), updated_at = NOW()
        WHERE id = $4 RETURNING *`,
      [finalPlacement, cabinetId || null, drawerNumber || null, id]
    );

    await query(
      `INSERT INTO document_versions (document_id, version, version_number, changes, updated_by, updated_at)
       SELECT $1, COALESCE(MAX(version), 0) + 1, COALESCE(MAX(version_number), 0) + 1, $2, $3, NOW()
         FROM document_versions WHERE document_id = $1`,
      [id, `Placement: "${previousPlacement || '(none)'}" → "${finalPlacement}"`, req.user?.id ?? null]
    );

    await audit(req.user, 'Placement Updated', id, `Placement: ${previousPlacement || '(none)'} → ${finalPlacement}`);

    if (req.user?.id) {
      await notificationService.sendToUser(
        req.user.id, 'Placement Updated',
        `Document ${docRef} moved to ${finalPlacement}.`, 'info'
      );
    }

    res.json(update.rows[0]);
  } catch (err) {
    console.error('updatePhysicalPlacement error:', err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================================================
 * POST /api/documents/assign-to-box
 * ================================================================ */
exports.assignToBox = async (req, res) => {
  try {
    const { documentId, boxId } = req.body;

    if (!documentId || !boxId) return res.status(400).json({ error: 'documentId and boxId are required' });

    const boxRes = await query('SELECT status, identifier FROM boxes WHERE id = $1', [boxId]);
    if (boxRes.rows.length === 0) return res.status(404).json({ error: 'Box not found' });
    if (boxRes.rows[0].status !== 'Draft') {
      return res.status(409).json({ error: `Box ${boxRes.rows[0].identifier} is "${boxRes.rows[0].status}" and cannot accept new documents` });
    }

    const docRes = await query('SELECT id, box_id, title, archive_reference_number FROM documents WHERE id = $1', [documentId]);
    if (docRes.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    
    const previousBoxId = docRes.rows[0].box_id;

    if (previousBoxId === boxId) return res.status(409).json({ error: 'Document is already in this box' });

    await query('UPDATE documents SET box_id = $1, updated_at = NOW() WHERE id = $2', [boxId, documentId]);

    const docLabel = docRes.rows[0].archive_reference_number || docRes.rows[0].title || documentId;

    if (previousBoxId) {
      await audit(req.user, 'Box Document Moved', documentId, `${docLabel} moved from box ${previousBoxId} → ${boxRes.rows[0].identifier}`);
    } else {
      await audit(req.user, 'Box Document Added', documentId, `${docLabel} added to box ${boxRes.rows[0].identifier}`);
    }

    if (req.user?.id) {
      await notificationService.sendToUser(
        req.user.id, 'File Added to Box',
        `Document ${docLabel} was linked to box ${boxRes.rows[0].identifier}.`, 'success'
      );
    }

    res.json({ ok: true, documentId, boxId, boxIdentifier: boxRes.rows[0].identifier });
  } catch (err) {
    console.error('assignToBox error:', err);
    res.status(500).json({ error: err.message });
  }
};