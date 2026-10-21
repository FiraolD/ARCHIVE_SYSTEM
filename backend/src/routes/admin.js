// backend/src/routes/admin.js

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { executeQuery } = require('../controllers/queryController');

// Direct SQL query (Admin only)
router.post('/query', authenticate, authorize('Admin'), executeQuery);

module.exports = router;