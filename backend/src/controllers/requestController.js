const { query } = require('../config/database');
const { validationResult } = require('express-validator');


const createFileRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { documentId, expectedReturnDate, notes } = req.body;

    // Check if document exists and is available
    const docResult = await query(
      'SELECT * FROM documents WHERE id = $1',
    
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = docResult.rows[0];

    if (document.status !== 'Active') {
      return res.status(400).json({ 
        error: `Document is not available for checkout. Current status: ${document.status}` 
      });
    }

    // Create request
    const requestResult = await query(
      `INSERT INTO file_requests (
        document_id, requested_by, request_date, expected_return_date, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [documentId, req.user.id, new Date().toISOString().split('T')[0], expectedReturnDate, 'Pending', notes]
    );

    // Create notification for admin
    await query(
      `INSERT INTO notifications (
        title, message, type, user_id, related_id, admin_only
      ) VALUES ($1, $2, $3, 
        (SELECT id FROM users WHERE role = 'Admin' LIMIT 1),
        $4, $5)`,
      ['New File Request', `${req.user.name} requested "${document.title}"`, 
       'info', requestResult.rows[0].id, true]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, req.user.name, 'File Requested', document.archive_reference_number,
       `Requested for checkout, expected return: ${expectedReturnDate}`, req.ip, req.get('user-agent')]
    );

    res.status(201).json(requestResult.rows[0]);
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const approveRequest = async (req, res) => {
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

    // Update request status
    await query(
      'UPDATE file_requests SET status = $1 WHERE id = $2',
      ['Approved', id]
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
      ['Request Approved', `Your request for "${request.title}" has been approved`, 
       'success', request.requested_by, id]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, req.user.name, 'Request Approved', request.archive_reference_number,
       `Request approved for checkout`, req.ip, req.get('user-agent')]
    );

    res.json({ message: 'Request approved successfully' });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const returnDocument = async (req, res) => {
  try {
    const { id } = req.params; // request id

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

const getUserRequests = async (req, res) => {
  try {
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
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get user requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT fr.*, 
             d.title as document_title,
             d.archive_reference_number,
             u.name as requester_name,
             u.email as requester_email
      FROM file_requests fr
      JOIN documents d ON fr.document_id = d.id
      JOIN users u ON fr.requested_by = u.id
    `;
    
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` WHERE fr.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    queryText += ` ORDER BY fr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    res.json(result.rows);
  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};


module.exports = {
  createFileRequest,
  approveRequest,
  returnDocument,
  getUserRequests,
  getAllRequests
};