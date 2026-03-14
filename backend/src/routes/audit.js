const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const auditController = require('../controllers/auditController');

// simple endpoint to fetch audit logs (admins only)
router.get('/', authenticate, authorize('Admin'), auditController.getAuditLogs);

module.exports = router;
