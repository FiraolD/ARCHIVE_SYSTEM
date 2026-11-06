// src/services/notificationService.js
const { query } = require('../config/database');

let ioInstance = null;

exports.setIo = (io) => {
  ioInstance = io;
};

exports.sendToUser = async (userId, title, message, type = 'info') => {
  try {
    // Uses 'read' and 'timestamp' based on your schema
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, read, timestamp)
       VALUES ($1, $2, $3, $4, FALSE, NOW())
       RETURNING *`,
      [userId, title, message, type]
    );

    const notification = result.rows[0];

    if (ioInstance) {
      ioInstance.to(`user_${userId}`).emit('new_notification', notification);
    }

    return notification;
  } catch (err) {
    console.error('sendToUser notification error:', err);
  }
};

exports.sendToAdmins = async (title, message, type = 'alert') => {
  try {
    const admins = await query(`SELECT id FROM users WHERE role = 'Admin'`);
    for (const admin of admins.rows) {
      await this.sendToUser(admin.id, title, message, type);
    }
  } catch (err) {
    console.error('sendToAdmins notification error:', err);
  }
};