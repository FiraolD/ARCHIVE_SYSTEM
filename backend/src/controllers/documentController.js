const { query, withTransaction } = require('../config/database');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

// ==================== REFERENCE NUMBER GENERATOR ====================

/**
 * Generate a sequential file reference number
 * Format: AI/BRANCH_CODE/SEQUENCE/YY
 * Sequence starts from 001 and increments per branch and calendar year.
 */
const generateSequentialReference = async (branchCode) => {
  const year = new Date().getFullYear().toString().slice(-2);
  
  // Get the next sequence number for this branch and year
  const result = await query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(archive_reference_number FROM 'AI/[^/]+/([0-9]{3})/') AS INTEGER)), 0) + 1 as next_number
     FROM documents 
     WHERE archive_reference_number LIKE $1
     AND archive_reference_number ~ $2`,
    [`AI/${branchCode}/%`, `^AI/${branchCode}/[0-9]{3}/${year}$`]
  );
  
  const nextNumber = parseInt(result.rows[0].next_number);
  const formattedNumber = nextNumber.toString().padStart(3, '0');
  
  return `AI/${branchCode}/${formattedNumber}/${year}`;
};

// ==================== INGEST DOCUMENT ====================

const ingestDocument = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get the branch code for reference generation.
    let branchCode = 'XXX';

    if (req.body.branchId) {
      const branchResult = await query(
        'SELECT code FROM branches WHERE id = $1',
        [req.body.branchId]
      );
      if (branchResult.rows.length > 0) {
        branchCode = branchResult.rows[0].code;
      }
    }

    // Generate sequential reference number
    const archiveRef = await generateSequentialReference(branchCode);
    
    // Handle file upload
    let filePath = null;
    let fileSize = null;
    if (req.file) {
      filePath = req.file.path;
      fileSize = req.file.size;
    }

    let productCustomFields = null;
    if (req.body.productCustomFields) {
      try {
        productCustomFields = JSON.parse(req.body.productCustomFields);
      } catch {
        return res.status(400).json({ error: 'Invalid product custom fields' });
      }
    }

    // Prepare document data object
    const documentData = {
      archive_reference_number: archiveRef,
      physical_placement: req.body.physicalPlacement,
      title: req.body.title,
      type: req.body.type,
      status: 'Active',
      owner_id: req.user.id,
      file_path: filePath,
      file_size: fileSize,
      
      // Claim File specific
      insured_name: req.body.insuredName || null,
      policy_number: req.body.policyNumber || null,
      claim_number: req.body.claimNumber || null,
      estimated_loss: req.body.estimatedLoss || null,
      branch_id: req.body.branchId,
      department_id: req.body.departmentId || null,
      product_id: req.body.productId || null,
      product_custom_fields: productCustomFields,
      
        // NEW: Insurance-specific fields
  sum_insured: req.body.sumInsured ? parseFloat(req.body.sumInsured) : null,
  period_of_policy: req.body.periodOfPolicy || null,
  date_of_accident: req.body.dateOfAccident || null,

      // Cabinet and drawer fields
      cabinet_id: req.body.cabinetId || null,
      drawer_number: req.body.drawerNumber || null,
      
      // Common fields
      date_added: req.body.dateAdded || new Date().toISOString().split('T')[0],
      received_by: req.body.receivedBy,
      delivered_by: req.body.deliveredBy,
      receiver_remark: req.body.receiverRemark || null
    };

    // Build the INSERT query dynamically
    const fields = [];
    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    // Only include fields that have values
    Object.entries(documentData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        fields.push(key);
        values.push(value);
        placeholders.push(`$${paramIndex}`);
        paramIndex++;
      }
    });

    const queryText = `
      INSERT INTO documents (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    // Insert document, initial version and audit log atomically
    const result = await withTransaction(async (client) => {
      const docResult = await client.query(queryText, values);

      // Create initial version
      await client.query(
        `INSERT INTO document_versions (
          document_id, version_number, updated_by, changes, file_path
        ) VALUES ($1, 1, $2, $3, $4)`,
        [docResult.rows[0].id, req.user.id, 'Initial document archival', filePath]
      );

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.user.id, req.user.name, 'Document Ingested', docResult.rows[0].archive_reference_number,
         `Document "${req.body.title}" ingested with reference: ${archiveRef}`, req.ip, req.get('user-agent')]
      );

      return docResult;
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Document ingestion error:', error);
    res.status(500).json({ error: 'Server error during document ingestion: ' + error.message });
  }
};

// ==================== GET DOCUMENTS (with all filters) ====================

const getDocuments = async (req, res) => {
  try {
    const {
      search,
      type,
      status,
      branch_id,
      branch,                 // legacy alias for branch_id
      plate_number,
      insured_name,
      date_of_accident_from,
      date_of_accident_to,
      sum_insured_min,
      sum_insured_max,
      legacy,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // ========== BUILD WHERE CLAUSE ONCE ==========
    const whereClauses = [];
    const whereParams = [];
    let paramIndex = 1;

    // --- Search (multi-term, AND across terms, OR across fields) ---
    if (search && String(search).trim()) {
      const terms = String(search).trim().split(/\s+/).filter(Boolean);
      for (const term of terms) {
        whereClauses.push(`(
          d.title ILIKE $${paramIndex} OR
          d.archive_reference_number ILIKE $${paramIndex} OR
          COALESCE(d.insured_name, '') ILIKE $${paramIndex} OR
          COALESCE(d.policy_number, '') ILIKE $${paramIndex} OR
          COALESCE(d.claim_number, '') ILIKE $${paramIndex} OR
          COALESCE(d.period_of_policy, '') ILIKE $${paramIndex} OR
          COALESCE(d.plate_number, '') ILIKE $${paramIndex} OR
          COALESCE(d.receiver_remark, '') ILIKE $${paramIndex} OR
          d.product_custom_fields::text ILIKE $${paramIndex}
        )`);
        whereParams.push(`%${term}%`);
        paramIndex++;
      }
    }

    // --- Type ---
    if (type) {
      whereClauses.push(`d.type = $${paramIndex}`);
      whereParams.push(type);
      paramIndex++;
    }

    // --- Status ---
    if (status) {
      whereClauses.push(`d.status = $${paramIndex}`);
      whereParams.push(status);
      paramIndex++;
    }

    // --- Branch (accept both branch_id and branch) ---
    const branchFilter = branch_id || branch;
    if (branchFilter && branchFilter !== 'undefined') {
      whereClauses.push(`d.branch_id = $${paramIndex}`);
      whereParams.push(branchFilter);
      paramIndex++;
    }

    // --- Plate number ---
    if (plate_number && String(plate_number).trim()) {
      whereClauses.push(`COALESCE(d.plate_number, '') ILIKE $${paramIndex}`);
      whereParams.push(`%${String(plate_number).trim()}%`);
      paramIndex++;
    }

    // --- Insured name ---
    if (insured_name && String(insured_name).trim()) {
      whereClauses.push(`COALESCE(d.insured_name, '') ILIKE $${paramIndex}`);
      whereParams.push(`%${String(insured_name).trim()}%`);
      paramIndex++;
    }

    // --- Date of accident range ---
    if (date_of_accident_from) {
      whereClauses.push(`d.date_of_accident >= $${paramIndex}::date`);
      whereParams.push(date_of_accident_from);
      paramIndex++;
    }
    if (date_of_accident_to) {
      whereClauses.push(`d.date_of_accident <= $${paramIndex}::date`);
      whereParams.push(date_of_accident_to);
      paramIndex++;
    }

    // --- Sum insured range ---
    if (sum_insured_min !== undefined && sum_insured_min !== '' && sum_insured_min !== 'undefined') {
      whereClauses.push(`d.sum_insured >= $${paramIndex}`);
      whereParams.push(Number(sum_insured_min));
      paramIndex++;
    }
    if (sum_insured_max !== undefined && sum_insured_max !== '' && sum_insured_max !== 'undefined') {
      whereClauses.push(`d.sum_insured <= $${paramIndex}`);
      whereParams.push(Number(sum_insured_max));
      paramIndex++;
    }

    // --- Legacy flag ---
    if (legacy === 'true') {
      whereClauses.push(`d.product_custom_fields ? 'legacy_source'`);
    } else if (legacy === 'false') {
      whereClauses.push(`(d.product_custom_fields IS NULL OR NOT (d.product_custom_fields ? 'legacy_source'))`);
    }

    const whereSql = whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1';

    // ========== MAIN LIST QUERY ==========
    const listSql = `
      SELECT 
        d.*,
        u.name as owner_name,
        b.name as branch_name,
        b.code as branch_code,
        dept.name as department_name,
        p.name as product_name
      FROM documents d
      LEFT JOIN users u ON d.owner_id = u.id
      LEFT JOIN branches b ON d.branch_id = b.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      LEFT JOIN products p ON d.product_id = p.id
      WHERE ${whereSql}
      ORDER BY d.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const listParams = [...whereParams, limitNum, offset];

    // ========== COUNT QUERY (same WHERE, no LIMIT) ==========
    const countSql = `SELECT COUNT(*)::int as total FROM documents d WHERE ${whereSql}`;

    // ========== FACETS (based on search only, ignoring dimension-specific filters) ==========
    // This gives users useful counts even when other filters are applied
    const facetBaseClauses = [];
    const facetBaseParams = [];
    let fp = 1;
    if (search && String(search).trim()) {
      const terms = String(search).trim().split(/\s+/).filter(Boolean);
      for (const term of terms) {
        facetBaseClauses.push(`(
          d.title ILIKE $${fp} OR
          d.archive_reference_number ILIKE $${fp} OR
          COALESCE(d.insured_name, '') ILIKE $${fp} OR
          COALESCE(d.policy_number, '') ILIKE $${fp} OR
          COALESCE(d.claim_number, '') ILIKE $${fp} OR
          COALESCE(d.period_of_policy, '') ILIKE $${fp} OR
          COALESCE(d.plate_number, '') ILIKE $${fp} OR
          COALESCE(d.receiver_remark, '') ILIKE $${fp} OR
          d.product_custom_fields::text ILIKE $${fp}
        )`);
        facetBaseParams.push(`%${term}%`);
        fp++;
      }
    }
    const facetWhereSql = facetBaseClauses.length > 0 ? facetBaseClauses.join(' AND ') : '1=1';

    // ========== EXECUTE ALL QUERIES IN PARALLEL ==========
    const [
      listResult,
      countResult,
      typeFacets,
      statusFacets,
      branchFacets,
      yearFacets,
      sumRange,
    ] = await Promise.all([
      query(listSql, listParams),
      query(countSql, whereParams),
      query(
        `SELECT d.type as value, COUNT(*)::int as count 
         FROM documents d WHERE ${facetWhereSql} 
         GROUP BY d.type ORDER BY count DESC`,
        facetBaseParams
      ),
      query(
        `SELECT d.status as value, COUNT(*)::int as count 
         FROM documents d WHERE ${facetWhereSql} 
         GROUP BY d.status ORDER BY count DESC`,
        facetBaseParams
      ),
      query(
        `SELECT d.branch_id as id, COALESCE(b.name, 'Unassigned') as value, COUNT(*)::int as count
         FROM documents d 
         LEFT JOIN branches b ON d.branch_id = b.id 
         WHERE ${facetWhereSql} 
         GROUP BY d.branch_id, b.name 
         ORDER BY count DESC`,
        facetBaseParams
      ),
      query(
        `SELECT EXTRACT(YEAR FROM d.date_of_accident)::text as value, COUNT(*)::int as count
         FROM documents d 
         WHERE ${facetWhereSql} AND d.date_of_accident IS NOT NULL
         GROUP BY 1 ORDER BY 1 DESC`,
        facetBaseParams
      ),
      query(
        `SELECT MIN(d.sum_insured)::numeric as min, MAX(d.sum_insured)::numeric as max
         FROM documents d WHERE ${facetWhereSql} AND d.sum_insured IS NOT NULL`,
        facetBaseParams
      ),
    ]);

    const total = countResult.rows[0].total;
    const totalPages = Math.ceil(total / limitNum);

    // ========== DEBUG LOG ==========
    console.log('📋 getDocuments:', {
      filters: { search, type, status, branch_id: branchFilter, plate_number, insured_name, date_of_accident_from, date_of_accident_to, sum_insured_min, sum_insured_max, legacy },
      resultsCount: listResult.rows.length,
      total,
    });

    // ========== RESPONSE ==========
    res.json({
      documents: listResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: totalPages,
        pages: totalPages, // alias used by some components
      },
      facets: {
        by_type: typeFacets.rows,
        by_status: statusFacets.rows,
        by_branch: branchFacets.rows,
        by_accident_year: yearFacets.rows,
        ranges: {
          sum_insured_min: sumRange.rows[0]?.min ? Number(sumRange.rows[0].min) : null,
          sum_insured_max: sumRange.rows[0]?.max ? Number(sumRange.rows[0].max) : null,
        },
      },
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};
const searchByCustomField = async (req, res) => {
  try {
    const { key, value } = req.query;
    
    if (!key || !value) {
      return res.status(400).json({ error: 'key and value required' });
    }
    
    const result = await query(
      `SELECT id, archive_reference_number, title, type, product_custom_fields
       FROM documents
       WHERE product_custom_fields->>$1 ILIKE $2
       ORDER BY created_at DESC
       LIMIT 50`,
      [key, `%${value}%`]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Add to module.exports

// Also update getDocumentById for single document views
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        d.*, 
        u.name as owner_name,
        b.name as branch_name,
        b.code as branch_code,
        dept.name as department_name,
        p.name as product_name,
        c.number as cabinet_number,
        d.drawer_number,
        box.identifier as box_identifier
       FROM documents d
       LEFT JOIN users u ON d.owner_id = u.id
       LEFT JOIN branches b ON d.branch_id = b.id
       LEFT JOIN departments dept ON d.department_id = dept.id
       LEFT JOIN products p ON d.product_id = p.id
       LEFT JOIN cabinets c ON d.cabinet_id = c.id
       LEFT JOIN boxes box ON d.box_id = box.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get versions
    const versions = await query(
      `SELECT * FROM document_versions 
       WHERE document_id = $1 
       ORDER BY version_number DESC`,
      [id]
    );

    const document = result.rows[0];
    document.versions = versions.rows;

    res.json(document);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== GET DOCUMENT BY ID ====================
/*
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT d.*, 
              u.name as owner_name,
              b.name as branch_name,
              dept.name as department_name,
              p.name as product_name,
              box.identifier as box_identifier
       FROM documents d
       LEFT JOIN users u ON d.owner_id = u.id
       LEFT JOIN branches b ON d.branch_id = b.id
       LEFT JOIN departments dept ON d.department_id = dept.id
       LEFT JOIN products p ON d.product_id = p.id
       LEFT JOIN boxes box ON d.box_id = box.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get versions
    const versions = await query(
      `SELECT * FROM document_versions 
       WHERE document_id = $1 
       ORDER BY version_number DESC`,
      [id]
    );

    const document = result.rows[0];
    document.versions = versions.rows;

    res.json(document);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}; */

// ==================== UPDATE DOCUMENT STATUS ====================

const updateDocumentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await query(
      `UPDATE documents 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Create version for status change
    await query(
      `INSERT INTO document_versions (
        document_id, version_number, updated_by, changes
      ) VALUES ($1, (SELECT COALESCE(MAX(version_number), 0) + 1 FROM document_versions WHERE document_id = $1), $2, $3)`,
      [id, req.user.id, `Status changed to ${status}`]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, req.user.name, 'Status Updated', result.rows[0].archive_reference_number,
       `Status changed to ${status}`, req.ip, req.get('user-agent')]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== UPDATE PHYSICAL PLACEMENT ====================


// Add to documentController.js

// Add this to your documentController.js if it's missing

const assignToBox = async (req, res) => {
  try {
    const { documentId, boxId } = req.body;

    if (!documentId || !boxId) {
      return res.status(400).json({ error: 'Document ID and Box ID are required' });
    }

    // Check if document exists
    const docResult = await query(
      'SELECT * FROM documents WHERE id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if box exists
    const boxResult = await query(
      'SELECT * FROM boxes WHERE id = $1',
      [boxId]
    );

    if (boxResult.rows.length === 0) {
      return res.status(404).json({ error: 'Box not found' });
    }

    // Update document with box_id
    const result = await query(
      `UPDATE documents 
       SET box_id = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [boxId, documentId]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, req.user.name, 'Document Assigned to Box', result.rows[0].archive_reference_number,
       `Document assigned to box: ${boxId}`, req.ip, req.get('user-agent')]
    );

    res.json({
      message: 'Document assigned to box successfully',
      document: result.rows[0]
    });
  } catch (error) {
    console.error('Assign to box error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updatePhysicalPlacement = async (req, res) => {
  try {
    const { id } = req.params;
    const { physicalPlacement } = req.body;

    const result = await query(
      `UPDATE documents 
       SET physical_placement = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [physicalPlacement, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Create version
    await query(
      `INSERT INTO document_versions (
        document_id, version_number, updated_by, changes
      ) VALUES ($1, (SELECT COALESCE(MAX(version_number), 0) + 1 FROM document_versions WHERE document_id = $1), $2, $3)`,
      [id, req.user.id, `Physical placement updated to: ${physicalPlacement}`]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, req.user.name, 'Placement Updated', result.rows[0].archive_reference_number,
       `Physical placement updated`, req.ip, req.get('user-agent')]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update placement error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== EXPORTS ====================

module.exports = {
  ingestDocument,
  getDocuments,
  getDocumentById,
  updateDocumentStatus,
  updatePhysicalPlacement,
  assignToBox,  // Make sure this line exists
  searchByCustomField
};