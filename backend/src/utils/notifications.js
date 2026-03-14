const { query } = require('../config/database');

const checkOverdueRequests = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Find requests that are overdue (Pending or Approved with expected return date <= today)
    const overdueRequests = await query(
      `SELECT fr.*, 
              d.title as document_title,
              d.archive_reference_number,
              u.name as requester_name,
              u.email as requester_email
       FROM file_requests fr
       JOIN documents d ON fr.document_id = d.id
       JOIN users u ON fr.requested_by = u.id
       WHERE (fr.status = 'Approved' OR fr.status = 'Pending')
         AND fr.expected_return_date <= $1
         AND NOT EXISTS (
           SELECT 1 FROM notifications n 
           WHERE n.related_id = fr.id AND n.title LIKE '%Overdue%'
         )`,
      [today]
    );

    for (const request of overdueRequests.rows) {
      // Create notification for admin
      await query(
        `INSERT INTO notifications (
          title, message, type, admin_only, related_id
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          'File Overdue',
          `File "${request.document_title}" (Ref: ${request.archive_reference_number}) is overdue. Expected return date was ${request.expected_return_date}.`,
          'warning',
          true,
          request.id
        ]
      );

      // Create notification for requester
      await query(
        `INSERT INTO notifications (
          title, message, type, user_id, related_id
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          'File Return Overdue',
          `Your requested file "${request.document_title}" is overdue. Please return it as soon as possible.`,
          'warning',
          request.requested_by,
          request.id
        ]
      );

      // Update request status to Overdue
      await query(
        'UPDATE file_requests SET status = $1 WHERE id = $2',
        ['Overdue', request.id]
      );

      console.log(`Overdue notification created for request ${request.id}`);
    }
  } catch (error) {
    console.error('Error checking overdue requests:', error);
  }
};

module.exports = {
  checkOverdueRequests
};