const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// Get dashboard statistics based on user role
router.get('/', authenticate, dashboardController.getUserDashboard);

module.exports = router;