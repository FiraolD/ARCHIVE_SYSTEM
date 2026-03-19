const { query } = require('../config/database');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

// ==================== REFERENCE NUMBER GENERATOR ====================

/**
 * Generate a sequential file reference number
 * Format: FL/BRANCH_CODE/PRODUCT_CODE/SEQUENCE/YY
 * Sequence starts from 000001 and increments by 1 for each document
 */
const generateSequentialReference = async (branchCode, productCode) => {
  const year = new Date().getFullYear().toString().slice(-2);
  
  // Get the next sequence number for this branch and year
  const result = await query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(archive_reference_number FROM 'FL/[^/]+/[^/]+/([0-9]+)/') AS INTEGER)), 0) + 1 as next_number
     FROM documents 
     WHERE archive_reference_number LIKE $1
     AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)`,
    [`FL/${branchCode}/%`]
  );
  
  const nextNumber = parseInt(result.rows[0].next_number);
  const formattedNumber = nextNumber.toString().padStart(6, '0');
  
  return `FL/${branchCode}/${productCode}/${formattedNumber}/${year}`;
};

// ==================== INGEST DOCUMENT ====================

const ingestDocument = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get branch and product codes for reference generation
    let branchCode = 'XXX';
    let productCode = 'PRD';

    if (req.body.branchId) {
      const branchResult = await query(
        'SELECT code FROM branches WHERE id = $1',
        [req.body.branchId]
      );
      if (branchResult.rows.length > 0) {
        branchCode = branchResult.rows[0].code;
      }
    }

    if (req.body.productId) {
      const productResult = await query(
        'SELECT name FROM products WHERE id = $1',
        [req.body.productId]
      );
      if (productResult.rows.length > 0) {
        // Generate full product code (remove spaces, uppercase)
        productCode = productResult.rows[0].name.replace(/\s+/g, '').toUpperCase();
      }
    }

    // Generate sequential reference number
    const archiveRef = await generateSequentialReference(branchCode, productCode);
    
    // Handle file upload
    let filePath = null;
    let fileSize = null;
    if (req.file) {
      filePath = req.file.path;
      fileSize = req.file.size;
    }

    // Log received data for debugging
    console.log('Received document data:', {
      title: req.body.title,
      type: req.body.type,
      branchId: req.body.branchId,
      branchCode,
      productCode,
      archiveRef,
      insuredName: req.body.insuredName,
      policyNumber: req.body.policyNumber,
      claimNumber: req.body.claimNumber
    });

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

    console.log('Insert Query:', queryText);
    console.log('Insert Values:', values);

    // Execute the query
    const result = await query(queryText, values);

    // Now we can safely use result
    console.log('Document inserted:', result.rows[0]);

    // Create initial version
    await query(
      `INSERT INTO document_versions (
        document_id, version_number, updated_by, changes, file_path
      ) VALUES ($1, 1, $2, $3, $4)`,
      [result.rows[0].id, req.user.id, 'Initial document archival', filePath]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, req.user.name, 'Document Ingested', result.rows[0].archive_reference_number,
       `Document "${req.body.title}" ingested with reference: ${archiveRef}`, req.ip, req.get('user-agent')]
    );

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

    console.log('\n========== BACKEND SEARCH DEBUG ==========');
    console.log('Request query:', req.query);

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
      const searchTerm = `%${search.trim()}%`;
      
      queryText += ` AND (
        d.title ILIKE $${paramIndex} OR
        d.archive_reference_number ILIKE $${paramIndex} OR
        COALESCE(d.insured_name, '') ILIKE $${paramIndex} OR
        COALESCE(d.policy_number, '') ILIKE $${paramIndex} OR
        COALESCE(d.claim_number, '') ILIKE $${paramIndex}
      )`;
      
      queryParams.push(searchTerm);
      paramIndex++;
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

    console.log('SQL Query:', queryText);
    console.log('SQL Params:', queryParams);

    const result = await query(queryText, queryParams);
    
    console.log(`Query returned ${result.rows.length} documents`);

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

// ==================== TEST SEARCH FUNCTIONS ====================

const testSearch = async (req, res) => {
  try {
    const { field, value } = req.query;
    
    if (!field || !value) {
      return res.status(400).json({ error: 'Field and value required' });
    }
    
    // Test which fields actually have data
    const result = await query(
      `SELECT id, title, insured_name, policy_number, claim_number 
       FROM documents 
       WHERE ${field} IS NOT NULL AND ${field} != '' 
       LIMIT 5`
    );
    
    res.json({
      field,
      sampleValues: result.rows
    });
  } catch (error) {
    console.error('Test search error:', error);
    res.status(500).json({ error: error.message });
  }
};

const testSearchField = async (req, res) => {
  try {
    const { field, value } = req.query;
    
    if (!field || !value) {
      return res.status(400).json({ error: 'Field and value required' });
    }
    
    console.log(`Testing search on ${field} for "${value}"`);
    
    // Test exact match
    const exactMatch = await query(
      `SELECT id, ${field} FROM documents WHERE ${field} = $1`,
      [value]
    );
    
    // Test ILIKE match
    const likeMatch = await query(
      `SELECT id, ${field} FROM documents WHERE ${field} ILIKE $1`,
      [`%${value}%`]
    );
    
    // Test without slashes
    const noSlashesMatch = await query(
      `SELECT id, ${field} FROM documents WHERE REPLACE(${field}, '/', '') ILIKE $1`,
      [`%${value.replace(/\//g, '')}%`]
    );
    
    res.json({
      field,
      value,
      exactMatch: exactMatch.rows,
      likeMatch: likeMatch.rows,
      noSlashesMatch: noSlashesMatch.rows
    });
  } catch (error) {
    console.error('Test search error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== EXPORTS ====================

// At the end of your documentController.js, check the module.exports

module.exports = {
  ingestDocument,
  getDocuments,
  getDocumentById,
  updateDocumentStatus,
  updatePhysicalPlacement,
  assignToBox,  // Make sure this line exists
  testSearch,
  testSearchField
};