const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { authenticate } = require('../middleware/auth');
const role = require('../middleware/role');
const documentController = require('../controllers/documentController');

const router = express.Router();

/* ---------- Multer config for ingest ---------- */
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR, 'documents')
  : path.resolve(__dirname, '../../uploads/documents');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

/* ---------- All document routes require auth ---------- */
router.use(authenticate);

/* ---------- Read ---------- */
router.get('/', documentController.getDocuments);
router.get('/:id', documentController.getDocumentById);

/* ---------- Write ---------- */
router.post(
  '/ingest',
  role('Admin', 'File Clerk'),
  upload.single('file'),
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