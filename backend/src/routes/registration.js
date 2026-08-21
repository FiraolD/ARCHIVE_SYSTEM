const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const registrationController = require('../controllers/registrationController');

// All registration routes require authentication
router.use(authenticate);

// ==================== BRANCH ROUTES ====================
router.get('/branches', registrationController.getBranches);
router.post('/branches', 
  authorize('Admin'),
  [
    body('name').notEmpty().withMessage('Branch name is required'),
    body('code').notEmpty().withMessage('Branch code is required')
  ],
  registrationController.createBranch
);

// ==================== DEPARTMENT ROUTES ====================
router.get('/departments', registrationController.getDepartments);
router.post('/departments',
  authorize('Admin'),
  [
    body('name').notEmpty().withMessage('Department name is required'),
    body('code').notEmpty().withMessage('Department code is required')
  ],
  registrationController.createDepartment
);

// ==================== PRODUCT ROUTES ====================
router.get('/products', registrationController.getProducts);
router.post('/products',
  authorize('Admin'),
  [
    body('name').notEmpty().withMessage('Product name is required')
  ],
  registrationController.createProduct
);

// ==================== BOX ROUTES ====================
router.get('/boxes', registrationController.getBoxes);
router.post('/boxes',
  authorize('Admin'),
  [
    body('branchCode').notEmpty().withMessage('Branch code is required'),
    body('fileType').isIn(['Claim File', 'Circular', 'Policy', 'Billing', 'Correspondence'])
      .withMessage('Invalid file type')
  ],
  registrationController.createBox
);

// ==================== CABINET ROUTES ====================
router.get('/cabinets', registrationController.getCabinets);
router.post('/cabinets',
  authorize('Admin'),
  [
    body('number').notEmpty().withMessage('Cabinet number is required'),
    body('drawers').isArray().withMessage('Drawers must be an array')
  ],
  registrationController.createCabinet
);

// ==================== CABINET ASSIGNMENT ROUTES ====================
router.post('/assign-cabinet',
  authorize('Admin'),
  [
    body('cabinetId').notEmpty().withMessage('Cabinet ID is required'),
    body('branchId').notEmpty().withMessage('Branch ID is required')
  ],
  registrationController.assignCabinet
);

// ==================== DRAWER ASSIGNMENT ROUTES ====================
router.post('/assign-drawer',
  authorize('Admin'),
  [
    body('cabinetId').notEmpty().withMessage('Cabinet ID is required'),
    body('branchId').notEmpty().withMessage('Branch ID is required'),
    body('drawerNumber').notEmpty().withMessage('Drawer number is required')
  ],
  registrationController.assignDrawer
);

router.get('/drawer-assignments',
  authorize('Admin'),
  registrationController.getDrawerAssignments
);

router.get('/drawer-history',
  authorize('Admin'),
  registrationController.getDrawerHistory
);

// ==================== BOX ASSIGNMENT ROUTES ====================
router.post('/assign-box',
  authorize('Admin'),
  [
    body('boxId').notEmpty().withMessage('Box ID is required'),
    body('cabinetId').notEmpty().withMessage('Cabinet ID is required'),
    body('drawerNumber').notEmpty().withMessage('Drawer number is required')
  ],
  registrationController.assignBox
);

module.exports = router;