const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const notificationsController = require('../controllers/notificationsController');

// All notification routes require authentication
router.use(authenticate);

router.get('/', notificationsController.getUserNotifications);
router.get('/unread/count', notificationsController.getUnreadCount);
router.patch('/:id/read', notificationsController.markAsRead);
router.patch('/read-all', notificationsController.markAllAsRead);
router.delete('/:id', 
  require('../middleware/auth').authorize('Admin', 'Manager'),
  notificationsController.deleteNotification
);

module.exports = router;