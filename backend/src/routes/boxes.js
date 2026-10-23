// src/routes/boxes.js
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');   // ← matches your auth.js
const role = require('../middleware/role');
const ctrl = require('../controllers/boxController');

router.use(authenticate);

router.get('/',                                role('Admin', 'Manager'), ctrl.listBoxes);
router.get('/:id',                             role('Admin', 'Manager'), ctrl.getBoxDetail);
router.patch('/:id/status',                    role('Admin', 'Manager'), ctrl.updateBoxStatus);
router.delete('/:id/documents/:documentId',    role('Admin', 'Manager'), ctrl.removeDocumentFromBox);

module.exports = router;