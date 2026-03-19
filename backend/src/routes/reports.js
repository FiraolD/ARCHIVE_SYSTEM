// backend/src/routes/reports.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const ReportsController = require('../controllers/reportsController');

// Get report statistics (accessible by all authenticated users)
router.get('/stats', authenticate, ReportsController.getReportStats);

// Get list of generated reports (admin only)
router.get('/generated', 
  authenticate, 
  authorize('Admin'), 
  ReportsController.getGeneratedReports
);

// Generate a new report (admin only)
router.post('/generate',
  authenticate,
  authorize('Admin'),
  [
    body('type').isIn(['Monthly Summary', 'Claims Analysis', 'Department Usage']),
    body('format').optional().isIn(['PDF', 'EXCEL', 'CSV'])
  ],
  ReportsController.generateReport
);

// Download a specific report (admin only)
router.get('/download/:id',
  authenticate,
  authorize('Admin'),
  ReportsController.downloadReport
);

// Delete a specific report (admin only)
router.delete('/:id',
  authenticate,
  authorize('Admin'),
  ReportsController.deleteReport  // This line was causing the error
);

module.exports = router;