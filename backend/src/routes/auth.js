const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Validation rules
const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Routes - registration is disabled; users are created by admins via /api/users
router.post('/login', loginValidation, authController.login);
router.get('/profile', authenticate, authController.getProfile); // Make sure this line exists

module.exports = router;