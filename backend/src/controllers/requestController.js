// backend/src/controllers/requestController.js

const { query } = require('../config/database');
const { validationResult } = require('express-validator');
const RequestReferenceGenerator = require('../services/RequestReferenceGenerator');

// ==================== USER FUNCTIONS ====================

// In requestController.js

const createFileRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { documentId, expectedReturnDate, notes } = req.body;

    // Get document details including policy and claim numbers
    const docResult = await query(
      `SELECT d.*, 
              u.name as owner_name,
              b.name as branch_name
       FROM documents d
       LEFT JOIN users u ON d.owner_id = u.id
       LEFT JOIN branches b ON d.branch_id = b.id
       WHERE d.id = $1`,
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = docResult.rows[0];

    console.log('Document retrieved for request:', {
      id: document.id,
      title: document.title,
      policy_number: document.policy_number,
      claim_number: document.claim_number,
      insured_name: document.insured_name
    });

    if (document.status !== 'Active') {
      return res.status(400).json({ 
        error: `Document is not available for checkout. Current status: ${document.status}` 
      });
    }

    // Generate unique request reference
    const requestReference = await RequestReferenceGenerator.generateRequestReference();

    // Create request with reference and document details
    const requestResult = await query(
      `INSERT INTO file_requests (
        document_id, requested_by, request_date, expected_return_date, 
        status, notes, request_reference,
        policy_number, claim_number, insured_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        documentId, 
        req.user.id, 
        new Date().toISOString().split('T')[0], 
        expectedReturnDate, 
        'Pending', 
        notes, 
        requestReference,
        document.policy_number || null,  // Ensure null if undefined
        document.claim_number || null,    // Ensure null if undefined
        document.insured_name || null     // Ensure null if undefined
      ]
    );

    console.log('Request created with policy/claim:', {
      policy: requestResult.rows[0].policy_number,
      claim: requestResult.rows[0].claim_number,
      insured: requestResult.rows[0].insured_name
    });

    // Create notification for admin
    await query(
      `INSERT INTO notifications (
        title, message, type, admin_only, related_id
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        'New File Request',
        `${req.user.name} requested "${document.title || 'Untitled'}" - Ref: ${requestReference}`,
        'info',
        true,
        requestResult.rows[0].id
      ]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, req.user.name, 'File Requested', document.archive_reference_number,
       `Request created with reference: ${requestReference}`, req.ip, req.get('user-agent')]
    );

    res.status(201).json({
      ...requestResult.rows[0],
      message: `Request created successfully. Reference: ${requestReference}`
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

// ✅ FIXED: Added this missing function
const getUserRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT fr.*, 
              d.title as document_title,
              d.archive_reference_number,
              d.insured_name,
              d.policy_number,
              d.claim_number
       FROM file_requests fr
       JOIN documents d ON fr.document_id = d.id
       WHERE fr.requested_by = $1
       ORDER BY fr.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get user requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== ADMIN FUNCTIONS ====================

const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Get request details
    const requestResult = await query(
      `SELECT fr.*, d.title, d.archive_reference_number, 
              u.name as requester_name, u.email as requester_email, d.claim_number, d.policy_number, d.insured_name
       FROM file_requests fr
       JOIN documents d ON fr.document_id = d.id
       JOIN users u ON fr.requested_by = u.id
       WHERE fr.id = $1`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    // Update request status
    await query(
      `UPDATE file_requests 
       SET status = $1, 
           approved_by = $2, 
           approved_at = CURRENT_TIMESTAMP,
           processed_by = $2,
           processed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      ['Approved', req.user.id, id]
    );

    // Update document status to Checked-out
    await query(
      'UPDATE documents SET status = $1 WHERE id = $2',
      ['Checked-out', request.document_id]
    );

    // Create notification for requester
    await query(
      `INSERT INTO notifications (title, message, type, user_id, related_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'Request Approved',
        `Your request for "${request.title}" (Ref: ${request.request_reference}) has been approved. ` +
        `Please collect the file from the archive with this reference number.`,
        'success',
        request.requested_by,
        id
      ]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, req.user.name, 'Request Approved', request.archive_reference_number,
       `Request ${request.request_reference} approved. User can collect file.`, 
       req.ip, req.get('user-agent')]
    );

    res.json({ 
      message: 'Request approved successfully',
      requestReference: request.request_reference,
      instructions: 'User can now collect the file from the archive using this reference number.'
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Get request details
    const requestResult = await query(
      `SELECT fr.*, d.title, d.archive_reference_number 
       FROM file_requests fr
       JOIN documents d ON fr.document_id = d.id
       WHERE fr.id = $1`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    // Update request status to 'Rejected' (must match enum value)
    await query(
      `UPDATE file_requests 
       SET status = $1, 
           rejection_reason = $2,
           processed_by = $3,
           processed_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      ['Rejected', reason, req.user.id, id]  // 'Rejected' must match enum
    );

    // Create notification for requester
    await query(
      `INSERT INTO notifications (title, message, type, user_id, related_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'Request Rejected',
        `Your request for "${request.title}" (Ref: ${request.request_reference}) has been rejected. ` +
        `Reason: ${reason}`,
        'error',
        request.requested_by,
        id
      ]
    );

    res.json({ message: 'Request rejected successfully' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const result = await query(
      `SELECT fr.*, 
              d.title as document_title,
              d.archive_reference_number,
              d.physical_placement,
              u.name as requester_name,
              u.email as requester_email,
              d.claim_number,
              d.policy_number,
              d.insured_name
       FROM file_requests fr
       JOIN documents d ON fr.document_id = d.id
       JOIN users u ON fr.requested_by = u.id
       WHERE fr.status = 'Pending'
       ORDER BY fr.created_at ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        fr.id,
        fr.request_reference,
        fr.status,
        fr.request_date,
        fr.expected_return_date,
        fr.actual_return_date,
        fr.notes,
        fr.rejection_reason,
        fr.created_at,
        d.policy_number,
        d.claim_number,
        d.insured_name,
        d.id as document_id,
        d.title as document_title,
        d.archive_reference_number,
        d.physical_placement,
        u.id as requester_id,
        u.name as requester_name,
        u.email as requester_email
      FROM file_requests fr
      LEFT JOIN documents d ON fr.document_id = d.id
      LEFT JOIN users u ON fr.requested_by = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];

    if (status && status !== 'all' && status !== 'undefined') {
      const validStatuses = ['Pending', 'Approved', 'Rejected', 'Returned', 'Overdue'];
      if (validStatuses.includes(status)) {
        queryText += ` AND fr.status = $${queryParams.length + 1}`;
        queryParams.push(status);
      }
    }

    queryText += ` ORDER BY fr.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

const getRequestByReference = async (req, res) => {
  try {
    const { reference } = req.params;

    const result = await query(
      `SELECT fr.*, 
              d.title as document_title,
              d.archive_reference_number,
              d.physical_placement,
              u.name as requester_name,
              u.email as requester_email,
              d.claim_number,
              d.policy_number,
              d.insured_name,
              a.name as approved_by_name
       FROM file_requests fr
       JOIN documents d ON fr.document_id = d.id
       JOIN users u ON fr.requested_by = u.id
       LEFT JOIN users a ON fr.approved_by = a.id
       WHERE fr.request_reference = $1`,
      [reference]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get request by reference error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const returnDocument = async (req, res) => {
  try {
    const { id } = req.params;

    // Get request details
    const requestResult = await query(
      `SELECT fr.*, d.title, d.archive_reference_number 
       FROM file_requests fr
       JOIN documents d ON fr.document_id = d.id
       WHERE fr.id = $1`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    // Update request status and actual return date
    await query(
      `UPDATE file_requests 
       SET status = $1, actual_return_date = $2 
       WHERE id = $3`,
      ['Returned', new Date().toISOString().split('T')[0], id]
    );

    // Update document status back to Active
    await query(
      'UPDATE documents SET status = $1 WHERE id = $2',
      ['Active', request.document_id]
    );

    // Create notification for requester
    await query(
      `INSERT INTO notifications (title, message, type, user_id, related_id)
       VALUES ($1, $2, $3, $4, $5)`,
      ['Document Returned', `"${request.title}" has been returned to the archive`, 
       'info', request.requested_by, id]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, req.user.name, 'Document Returned', request.archive_reference_number,
       `Document returned to archive`, req.ip, req.get('user-agent')]
    );

    res.json({ message: 'Document returned successfully' });
  } catch (error) {
    console.error('Return document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== EXPORTS ====================

module.exports = {
  createFileRequest,
  getUserRequests,      // ✅ Now properly defined
  approveRequest,
  rejectRequest,
  getPendingRequests,
  getAllRequests,
  getRequestByReference,
  returnDocument
};