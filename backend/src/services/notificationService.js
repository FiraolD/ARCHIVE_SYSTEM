// src/services/notificationService.js
const pool = require('../config/database');

let ioInstance = null;

// We will call this from server.js to pass the Socket.io instance
exports.setIo = (io) => {
  ioInstance = io;
};

/**
 * Send a notification to a specific user.
 */
exports.sendToUser = async (userId, title, message, type = 'info') => {
  try {
    // 1. Save to database
    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
       VALUES ($1, $2, $3, $4, FALSE, NOW())
       RETURNING *`,
      [userId, title, message, type]
    );

    const notification = result.rows[0];

    // 2. Emit via WebSocket to the specific user's room
    if (ioInstance) {
      ioInstance.to(`user_${userId}`).emit('new_notification', notification);
    }

    return notification;
  } catch (err) {
    console.error('sendToUser notification error:', err);
  }
};

/**
 * Broadcast a notification to all Admins.
 */
exports.sendToAdmins = async (title, message, type = 'alert') => {
  try {
    // 1. Find all admin users
    const admins = await pool.query(`SELECT id FROM users WHERE role = 'Admin'`);
    
    // 2. Loop and send to each
    for (const admin of admins.rows) {
      await this.sendToUser(admin.id, title, message, type);
    }
  } catch (err) {
    console.error('sendToAdmins notification error:', err);
  }
};