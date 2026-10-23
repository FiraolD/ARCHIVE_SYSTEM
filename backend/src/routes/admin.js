// src/routes/admin.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const role = require('../middleware/role');
const adminController = require('../controllers/adminController');

// All admin routes require authentication and Admin role
router.use(authenticate);
router.use(role('Admin'));

// SQL Console endpoint
router.post('/query', adminController.executeQuery);

module.exports = router;