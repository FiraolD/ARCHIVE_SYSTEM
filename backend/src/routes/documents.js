const express = require('express');

const { authenticate } = require('../middleware/auth');
const role = require('../middleware/role');
const { createDocumentUpload } = require('../middleware/documentUpload');
const documentController = require('../controllers/documentController');

const router = express.Router();
const uploadDocument = createDocumentUpload();

/* ---------- All document routes require auth ---------- */
router.use(authenticate);

/* ---------- Read ---------- */
router.get('/', documentController.getDocuments);
router.get('/:id/file', documentController.downloadDocumentFile);
router.get('/:id', documentController.getDocumentById);

/* ---------- Write ---------- */
router.post(
  '/ingest',
  role('Admin', 'File Clerk'),
  uploadDocument,
  documentController.ingestDocument
);

// NEW: Modify and Delete endpoints
router.patch(
  '/:id',
  role('Admin', 'File Clerk'),
  documentController.updateDocument
);

router.delete(
  '/:id',
  role('Admin', 'File Clerk'),
  documentController.deleteDocument
);

router.patch(
  '/:id/status',
  role('Admin', 'File Clerk'),
  documentController.updateDocumentStatus
);

router.patch(
  '/:id/placement',
  role('Admin', 'File Clerk'),
  documentController.updatePhysicalPlacement
);

router.post(
  '/assign-to-box',
  role('Admin', 'File Clerk'),
  documentController.assignToBox
);

module.exports = router;