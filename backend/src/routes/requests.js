const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const requestController = require('../controllers/requestController');

const requestValidation = [
  body('documentId').notEmpty().withMessage('Document ID is required'),
  body('expectedReturnDate').isDate().withMessage('Valid return date is required'),
  body('notes').optional()
];

router.post('/', 
  authenticate,
  requestValidation,
  requestController.createFileRequest
);

router.get('/my-requests', 
  authenticate,
  requestController.getUserRequests
);

router.get('/all', 
  authenticate,
  authorize('Admin', 'Manager'),
  requestController.getAllRequests
);

router.patch('/:id/approve', 
  authenticate,
  authorize('Admin'),
  requestController.approveRequest
);

router.patch('/:id/return', 
  authenticate,
  authorize('Admin'),
  requestController.returnDocument
);

module.exports = router;