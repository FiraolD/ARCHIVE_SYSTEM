// backend/src/routes/requests.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const requestController = require('../controllers/requestController');

const requestValidation = [
  body('documentId').notEmpty().withMessage('Document ID is required'),
  body('requesterName').notEmpty().withMessage('Requester name is required'),
  body('expectedReturnDate').isDate().withMessage('Valid return date is required'),
  body('notes').optional()
];

// User routes - any authenticated user can access
router.post('/', 
  authenticate,
  requestValidation,
  requestController.createFileRequest
);

router.get('/my-requests', 
  authenticate,
  requestController.getUserRequests
);

// Admin/File Clerk routes - require specific roles
router.get('/pending', 
  authenticate,
  authorize('Admin', 'File Clerk'),  // Allow both Admin and File Clerk
  requestController.getPendingRequests
);

router.get('/all', 
  authenticate,
  authorize('Admin', 'File Clerk'),  // Changed from just 'Admin' to include File Clerk
  requestController.getAllRequests
);

router.patch('/:id/approve', 
  authenticate,
  authorize('Admin', 'File Clerk'),
  requestController.approveRequest
);

router.patch('/:id/reject', 
  authenticate,
  authorize('Admin', 'File Clerk'),
  [
    body('reason').notEmpty().withMessage('Rejection reason is required')
  ],
  requestController.rejectRequest
);

// Add this route before module.exports
router.patch('/:id/return-by-requester', 
  authenticate,
  requestController.returnDocumentByRequester
);

router.patch('/:id/return', 
  authenticate,
  authorize('Admin', 'File Clerk'),
  requestController.returnDocument
);

// Public route for reference lookup (still requires authentication)
router.get('/reference/:reference', 
  authenticate,
  requestController.getRequestByReference
);

module.exports = router;