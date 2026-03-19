// backend/src/routes/documents.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const documentController = require('../controllers/documentController');

// Validation rules
const documentValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('type').isIn(['Claim File', 'Circular', 'Policy', 'Billing', 'Correspondence'])
    .withMessage('Invalid document type'),
  body('physicalPlacement').notEmpty().withMessage('Physical placement is required'),
];

// Routes
router.post('/ingest', 
  authenticate,
  authorize('Admin'),
  upload.single('file'),
  documentValidation,
  documentController.ingestDocument
);

router.get('/', 
  authenticate,
  documentController.getDocuments
);

router.get('/:id', 
  authenticate,
  documentController.getDocumentById
);

router.patch('/:id/status', 
  authenticate,
  authorize('Admin', 'Manager'),
  body('status').isIn(['Active', 'Checked-out', 'Settled Claims'])
    .withMessage('Invalid status'),
  documentController.updateDocumentStatus
);

router.patch('/:id/placement', 
  authenticate,
  authorize('Admin'),
  body('physicalPlacement').notEmpty().withMessage('Physical placement is required'),
  documentController.updatePhysicalPlacement
);

// NEW ROUTE - Make sure this is line 51 and that documentController.assignToBox exists
router.post('/assign-to-box', 
  authenticate,
  authorize('Admin'),
  [
    body('documentId').notEmpty().withMessage('Document ID is required'),
    body('boxId').notEmpty().withMessage('Box ID is required')
  ],
  documentController.assignToBox  // Make sure this function exists
);

module.exports = router;