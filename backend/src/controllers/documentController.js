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

// ==================== GET DOCUMENTS ====================

// In documentController.js, update the getDocuments function

const getDocuments = async (req, res) => {
  try {
    const { search, type, status, branch, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        d.*, 
        u.name as owner_name,
        b.name as branch_name,
        b.code as branch_code,
        dept.name as department_name,
        p.name as product_name,
        c.number as cabinet_number,
        c.id as cabinet_id,
        d.drawer_number
      FROM documents d
      LEFT JOIN users u ON d.owner_id = u.id
      LEFT JOIN branches b ON d.branch_id = b.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN cabinets c ON d.cabinet_id = c.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;

 if (search && search.trim() !== '') {
  const raw = search.trim();
  const searchTerm = `%${raw}%`;
  const searchNum = Number.isFinite(parseFloat(raw)) && /^-?\d+(\.\d+)?$/.test(raw)
    ? parseFloat(raw)
    : null;

  // ✅ Only treat as date if it matches a real ISO pattern (YYYY-MM-DD)
  const isISODate = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const searchDate = isISODate ? raw : null;

  // Text/number search across all string + numeric fields
  queryText += ` AND (
    d.title ILIKE $${paramIndex} OR
    d.archive_reference_number ILIKE $${paramIndex} OR
    COALESCE(d.insured_name, '') ILIKE $${paramIndex} OR
    COALESCE(d.policy_number, '') ILIKE $${paramIndex} OR
    COALESCE(d.claim_number, '') ILIKE $${paramIndex} OR
    COALESCE(d.period_of_policy, '') ILIKE $${paramIndex} OR
    COALESCE(d.plate_number, '') ILIKE $${paramIndex} OR
    COALESCE(d.vehicle_registration, '') ILIKE $${paramIndex} OR
    COALESCE(d.make, '') ILIKE $${paramIndex} OR
    COALESCE(d.model, '') ILIKE $${paramIndex} OR
    d.product_custom_fields::text ILIKE $${paramIndex}
  )`;
  queryParams.push(searchTerm);
  paramIndex++;

  // Numeric search: sum insured
  if (searchNum !== null) {
    queryText += ` OR d.sum_insured = $${paramIndex}`;
    queryParams.push(searchNum);
    paramIndex++;
  }

  // Date search: only if valid ISO date format
  if (searchDate) {
    queryText += ` OR d.date_of_accident = $${paramIndex}::date`;
    queryParams.push(searchDate);
    paramIndex++;
  }
}

    if (type) {
      queryText += ` AND d.type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND d.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (branch) {
      queryText += ` AND d.branch_id = $${paramIndex}`;
      queryParams.push(branch);
      paramIndex++;
    }

    queryText += ` ORDER BY d.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM documents';
    const countResult = await query(countQuery);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      documents: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Server error' });
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