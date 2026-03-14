const { query } = require('../config/database');

const getUserNotifications = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 OR (admin_only = TRUE AND $2 IN ('Admin', 'Manager'))
       ORDER BY timestamp DESC 
       LIMIT 50`,
      [req.user.id, req.user.role]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE (user_id = $1 OR (admin_only = TRUE AND $2 IN ('Admin', 'Manager')))
       AND read = FALSE`,
      [req.user.id, req.user.role]
    );
    
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    await query(
      'UPDATE notifications SET read = TRUE WHERE id = $1 AND (user_id = $2 OR admin_only = TRUE)',
      [id, req.user.id]
    );
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET read = TRUE 
       WHERE (user_id = $1 OR (admin_only = TRUE AND $2 IN ('Admin', 'Manager'))) 
       AND read = FALSE`,
      [req.user.id, req.user.role]
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('DELETE FROM notifications WHERE id = $1', [id]);
    
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};