// backend/src/controllers/requestController.js

const { query, withTransaction } = require('../config/database');
const { validationResult } = require('express-validator');
const RequestReferenceGenerator = require('../services/RequestReferenceGenerator');
const { normalizePagination } = require('../utils/pagination');

// ==================== USER FUNCTIONS ====================

// In backend/src/controllers/requestController.js

const createFileRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { documentId, requesterName, expectedReturnDate, notes } = req.body;

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

    // Get user's department (users.department_name stores the department name)
    const userResult = await query(
      `SELECT u.*, d.name as department_name 
       FROM users u
       LEFT JOIN departments d ON u.department_name = d.name
       WHERE u.id = $1`,
      [req.user.id]
    );

    const user = userResult.rows[0];

    if (document.status !== 'Active') {
      return res.status(400).json({ 
        error: `Document is not available for checkout. Current status: ${document.status}` 
      });
    }

    // Generate unique request reference
    const requestReference = await RequestReferenceGenerator.generateRequestReference();

    // Create request, notification and audit log atomically
    const newRequest = await withTransaction(async (client) => {
      const requestResult = await client.query(
        `INSERT INTO file_requests (
          document_id, requested_by, request_date, requester_name, expected_return_date, 
          status, notes, request_reference,
          policy_number, claim_number, insured_name,
          requester_department
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          documentId, 
          req.user.id, 
          new Date().toISOString().split('T')[0], 
          requesterName,
          expectedReturnDate, 
          'Pending', 
          notes, 
          requestReference,
          document.policy_number || null,
          document.claim_number || null,
          document.insured_name || null,
          user?.department_name || null,
        ]
      );

      // Create notification for admin
      await client.query(
        `INSERT INTO notifications (
          title, message, type, admin_only, related_id
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          'New File Request',
          `${req.user.name} from ${user?.department_name || 'No Department'} requested "${document.title}" - Ref: ${requestReference}`,
          'info',
          true,
          requestResult.rows[0].id
        ]
      );

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.user.id, req.user.name, 'File Requested', document.archive_reference_number,
         `Request created with reference: ${requestReference}`, req.ip, req.get('user-agent')]
      );

      return requestResult.rows[0];
    });

    res.status(201).json({
      ...newRequest,
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
    const result = await withTransaction(async (client) => {
      // Lock the request first so concurrent approve/reject actions serialize.
      const requestResult = await client.query(
        `SELECT fr.*, d.title, d.archive_reference_number
           FROM file_requests fr
           JOIN documents d ON d.id = fr.document_id
          WHERE fr.id = $1
          FOR UPDATE OF fr`,
        [id]
      );
      if (requestResult.rows.length === 0) return { outcome: 'not_found' };
      const request = requestResult.rows[0];
      if (request.status !== 'Pending') return { outcome: 'conflict', status: request.status };

      // Conditional update prevents checkout if another request already checked out this document.
      const documentResult = await client.query(
        `UPDATE documents
            SET status = 'Checked-out', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND status = 'Active'
          RETURNING id`,
        [request.document_id]
      );
      if (documentResult.rowCount === 0) return { outcome: 'document_unavailable' };

      const updated = await client.query(
        `UPDATE file_requests
            SET status = 'Approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP,
                processed_by = $1, processed_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND status = 'Pending'
          RETURNING id`,
        [req.user.id, id]
      );
      if (updated.rowCount === 0) {
        // Transaction rollback ensures the document status change is not committed.
        const error = new Error('Request state changed while approving');
        error.code = 'REQUEST_STATE_CONFLICT';
        throw error;
      }

      await client.query(
        `INSERT INTO notifications (title, message, type, user_id, related_id)
         VALUES ($1, $2, $3, $4, $5)`,
        ['Request Approved',
         `Your request for "${request.title}" (Ref: ${request.request_reference}) has been approved. Please collect the file from the archive with this reference number.`,
         'success', request.requested_by, id]
      );
      await client.query(
        `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.user.id, req.user.name, 'Request Approved', request.archive_reference_number,
         `Request ${request.request_reference} approved. User can collect file.`,
         req.ip, req.get('user-agent')]
      );
      return { outcome: 'approved', reference: request.request_reference };
    });

    if (result.outcome === 'not_found') return res.status(404).json({ error: 'Request not found' });
    if (result.outcome === 'conflict') {
      return res.status(409).json({ error: 'Only pending requests can be approved', currentStatus: result.status });
    }
    if (result.outcome === 'document_unavailable') {
      return res.status(409).json({ error: 'Document is no longer available for checkout' });
    }
    return res.json({
      message: 'Request approved successfully',
      requestReference: result.reference,
      instructions: 'User can now collect the file from the archive using this reference number.'
    });
  } catch (error) {
    console.error('Approve request error:', error);
    if (error.code === 'REQUEST_STATE_CONFLICT') {
      return res.status(409).json({ error: 'Request state changed; refresh and try again' });
    }
    return res.status(500).json({ error: 'Server error' });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const result = await withTransaction(async (client) => {
      const requestResult = await client.query(
        `SELECT fr.*, d.title
           FROM file_requests fr
           JOIN documents d ON d.id = fr.document_id
          WHERE fr.id = $1
          FOR UPDATE OF fr`,
        [id]
      );
      if (requestResult.rows.length === 0) return { outcome: 'not_found' };
      const request = requestResult.rows[0];
      if (request.status !== 'Pending') return { outcome: 'conflict', status: request.status };

      const updated = await client.query(
        `UPDATE file_requests
            SET status = 'Rejected', rejection_reason = $1,
                processed_by = $2, processed_at = CURRENT_TIMESTAMP
          WHERE id = $3 AND status = 'Pending'
          RETURNING id`,
        [reason.trim(), req.user.id, id]
      );
      if (updated.rowCount === 0) return { outcome: 'conflict', status: request.status };

      await client.query(
        `INSERT INTO notifications (title, message, type, user_id, related_id)
         VALUES ($1, $2, $3, $4, $5)`,
        ['Request Rejected',
         `Your request for "${request.title}" (Ref: ${request.request_reference}) has been rejected. Reason: ${reason.trim()}`,
         'error', request.requested_by, id]
      );
      await client.query(
        `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.user.id, req.user.name, 'Request Rejected', request.request_reference,
         `Request ${request.request_reference} rejected: ${reason.trim()}`,
         req.ip, req.get('user-agent')]
      );
      return { outcome: 'rejected' };
    });

    if (result.outcome === 'not_found') return res.status(404).json({ error: 'Request not found' });
    if (result.outcome === 'conflict') {
      return res.status(409).json({ error: 'Only pending requests can be rejected', currentStatus: result.status });
    }
    return res.json({ message: 'Request rejected successfully' });
  } catch (error) {
    console.error('Reject request error:', error);
    return res.status(500).json({ error: 'Server error' });
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

// In requestController.js, update getAllRequests

const getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const { limit, offset } = normalizePagination(req.query);

    let queryText = `
      SELECT 
        fr.id,
        fr.request_reference,
        fr.requested_by,
        fr.status,
        fr.request_date,
        fr.expected_return_date,
        fr.actual_return_date,
        fr.notes,
        fr.rejection_reason,
        fr.created_at,
        fr.policy_number,
        fr.claim_number,
        fr.insured_name,
        fr.requester_department,
        fr.requester_department_name,
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
      queryText += ` AND fr.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }

    queryText += ` ORDER BY fr.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({ error: 'Server error' });
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
    const result = await withTransaction(async (client) => {
      const requestResult = await client.query(
        `SELECT fr.*, d.title, d.archive_reference_number, d.status AS document_status
           FROM file_requests fr
           JOIN documents d ON d.id = fr.document_id
          WHERE fr.id = $1
          FOR UPDATE OF fr`,
        [id]
      );
      if (requestResult.rows.length === 0) return { outcome: 'not_found' };
      const request = requestResult.rows[0];

      // Admin can complete a direct return (Approved/Checked-out) or verify a
      // requester-submitted return (Returned/Returned). Other states are conflicts.
      const directReturn = request.status === 'Approved' && request.document_status === 'Checked-out';
      const verifyReturn = request.status === 'Returned' && request.document_status === 'Returned';
      if (!directReturn && !verifyReturn) {
        return { outcome: 'conflict', requestStatus: request.status, documentStatus: request.document_status };
      }

      const doc = await client.query(
        `UPDATE documents SET status = 'Active', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND status = $2 RETURNING id`,
        [request.document_id, request.document_status]
      );
      if (doc.rowCount === 0) return { outcome: 'conflict', requestStatus: request.status, documentStatus: request.document_status };

      const fr = await client.query(
        `UPDATE file_requests
            SET status = 'Returned', actual_return_date = COALESCE(actual_return_date, CURRENT_DATE)
          WHERE id = $1 AND status = $2 RETURNING id`,
        [id, request.status]
      );
      if (fr.rowCount === 0) {
        const error = new Error('Request state changed while returning');
        error.code = 'REQUEST_STATE_CONFLICT';
        throw error;
      }

      await client.query(
        `INSERT INTO notifications (title, message, type, user_id, related_id)
         VALUES ($1, $2, $3, $4, $5)`,
        ['Document Returned', `"${request.title}" has been returned to the archive`, 'info', request.requested_by, id]
      );
      await client.query(
        `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.user.id, req.user.name, 'Document Returned', request.archive_reference_number,
         'Document return verified; document is available again', req.ip, req.get('user-agent')]
      );
      return { outcome: 'returned' };
    });

    if (result.outcome === 'not_found') return res.status(404).json({ error: 'Request not found' });
    if (result.outcome === 'conflict') {
      return res.status(409).json({
        error: 'Request/document is not in a returnable state',
        requestStatus: result.requestStatus,
        documentStatus: result.documentStatus
      });
    }
    return res.json({ message: 'Document returned successfully' });
  } catch (error) {
    console.error('Return document error:', error);
    if (error.code === 'REQUEST_STATE_CONFLICT') return res.status(409).json({ error: 'Request state changed; refresh and try again' });
    return res.status(500).json({ error: 'Server error' });
  }
};

const returnDocumentByRequester = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await withTransaction(async (client) => {
      const requestResult = await client.query(
        `SELECT fr.*, d.id AS document_id, d.title, d.archive_reference_number,
                d.status AS doc_status
           FROM file_requests fr
           JOIN documents d ON d.id = fr.document_id
          WHERE fr.id = $1 AND fr.requested_by = $2
          FOR UPDATE OF fr`,
        [id, userId]
      );
      if (requestResult.rows.length === 0) return { outcome: 'not_found' };
      const request = requestResult.rows[0];
      if (request.status !== 'Approved' || request.doc_status !== 'Checked-out') {
        return { outcome: 'conflict', requestStatus: request.status, documentStatus: request.doc_status };
      }

      const doc = await client.query(
        `UPDATE documents SET status = 'Returned', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND status = 'Checked-out' RETURNING id`,
        [request.document_id]
      );
      if (doc.rowCount === 0) return { outcome: 'conflict', requestStatus: request.status, documentStatus: request.doc_status };

      const fr = await client.query(
        `UPDATE file_requests SET status = 'Returned', actual_return_date = CURRENT_DATE
          WHERE id = $1 AND status = 'Approved' RETURNING id`,
        [id]
      );
      if (fr.rowCount === 0) {
        const error = new Error('Request state changed while returning');
        error.code = 'REQUEST_STATE_CONFLICT';
        throw error;
      }

      await client.query(
        `INSERT INTO notifications (title, message, type, admin_only, related_id)
         VALUES ($1, $2, $3, $4, $5)`,
        ['Document Returned',
         `${req.user.name} returned "${request.title}" (Ref: ${request.request_reference}). Please verify the file.`,
         'info', true, id]
      );
      await client.query(
        `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, req.user.name, 'Document Returned by Requester', request.archive_reference_number,
         `Returned request ${request.request_reference}; awaiting admin verification`,
         req.ip, req.get('user-agent')]
      );
      return { outcome: 'returned' };
    });

    if (result.outcome === 'not_found') return res.status(404).json({ error: 'Request not found or you are not authorized' });
    if (result.outcome === 'conflict') {
      return res.status(409).json({
        error: 'Only an approved request with a checked-out document can be returned',
        requestStatus: result.requestStatus,
        documentStatus: result.documentStatus
      });
    }
    return res.json({ message: 'Document returned successfully. Awaiting admin verification.' });
  } catch (error) {
    console.error('Return document error:', error);
    if (error.code === 'REQUEST_STATE_CONFLICT') return res.status(409).json({ error: 'Request state changed; refresh and try again' });
    return res.status(500).json({ error: 'Server error' });
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
  returnDocument,
  returnDocumentByRequester
};