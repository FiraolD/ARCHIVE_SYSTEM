const { query } = require('../config/database');
const { generateArchiveReferenceNumber } = require('../utils/generators');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

const ingestDocument = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const archiveRef = await generateArchiveReferenceNumber();
    
    // Handle file upload
    let filePath = null;
    let fileSize = null;
    if (req.file) {
      filePath = req.file.path;
      fileSize = req.file.size;
    }

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
      insured_name: req.body.insuredName,
      policy_number: req.body.policyNumber,
      claim_number: req.body.claimNumber,
      estimated_loss: req.body.estimatedLoss,
      branch_id: req.body.branchId,
      department_id: req.body.departmentId,
      product_id: req.body.productId,
      
      // Common fields
      date_added: req.body.dateAdded || new Date().toISOString().split('T')[0],
      received_by: req.body.receivedBy,
      delivered_by: req.body.deliveredBy,
      receiver_remark: req.body.receiverRemark

      
    };


    // In ingestDocument function, after successful insertion
const document = result.rows[0];

// Return the generated reference
res.status(201).json({
  ...document,
  message: 'Document ingested successfully',
  referenceNumber: document.archive_reference_number
});
    const result = await query(
      `INSERT INTO documents (
        archive_reference_number, physical_placement, title, type, status,
        owner_id, file_path, file_size, insured_name, policy_number,
        claim_number, estimated_loss, branch_id, department_id, product_id,
        date_added, received_by, delivered_by, receiver_remark
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      Object.values(documentData)
    );

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
       `Document "${req.body.title}" ingested`, req.ip, req.get('user-agent')]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Document ingestion error:', error);
    res.status(500).json({ error: 'Server error during document ingestion' });
  }
};

// In backend/src/controllers/documentController.js, update the getDocuments function

// backend/src/controllers/documentController.js

const getDocuments = async (req, res) => {
  try {
    const { search, type, status, branch, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    console.log('\n========== BACKEND SEARCH DEBUG ==========');
    console.log('Request query:', req.query);
    console.log('Search term:', search);

    let queryText = `
      SELECT d.*, 
             u.name as owner_name,
             b.name as branch_name,
             dept.name as department_name,
             p.name as product_name
      FROM documents d
      LEFT JOIN users u ON d.owner_id = u.id
      LEFT JOIN branches b ON d.branch_id = b.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      LEFT JOIN products p ON d.product_id = p.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;

    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      
      console.log('Search pattern:', searchTerm);
      
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
    if (result.rows.length > 0) {
      console.log('First result:', {
        id: result.rows[0].id,
        title: result.rows[0].title,
        claim_number: result.rows[0].claim_number,
        policy_number: result.rows[0].policy_number,
        insured_name: result.rows[0].insured_name
      });
    }

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM documents';
    const countResult = await query(countQuery);
    const total = parseInt(countResult.rows[0].count);

    console.log('Total documents in DB:', total);
    console.log('========== END BACKEND DEBUG ==========\n');

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
};

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

module.exports = {
  ingestDocument,
  getDocuments,
  getDocumentById,
  updateDocumentStatus,
  updatePhysicalPlacement
};

// TEMPORARY TEST ENDPOINT - Add this to documentController.js
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

// Add to documentController.js for testing
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