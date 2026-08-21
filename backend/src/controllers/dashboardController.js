// backend/src/controllers/dashboardController.js
const { query } = require('../config/database');

const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let stats = {};

    if (userRole === 'Admin') {
      // Admin sees everything
      const [
        totalDocs,
        activeDocs,
        checkedOutDocs,
        pendingRequests,
        overdueRequests,
        recentActivity,
        recentDocuments
      ] = await Promise.all([
        query('SELECT COUNT(*) FROM documents'),
        query('SELECT COUNT(*) FROM documents WHERE status = $1', ['Active']),
        query('SELECT COUNT(*) FROM documents WHERE status = $1', ['Checked-out']),
        query('SELECT COUNT(*) FROM file_requests WHERE status = $1', ['Pending']),
        query(`SELECT COUNT(*) FROM file_requests 
               WHERE status IN ('Approved', 'Pending') 
               AND expected_return_date < CURRENT_DATE`),
        query(`
          SELECT 
            fr.id,
            fr.status,
            fr.request_date,
            fr.expected_return_date,
            d.title as document_title,
            d.archive_reference_number,
            u.name as requested_by_name
          FROM file_requests fr
          JOIN documents d ON fr.document_id = d.id
          JOIN users u ON fr.requested_by = u.id
          ORDER BY fr.created_at DESC
          LIMIT 10
        `),
        query(`
          SELECT 
            d.id,
            d.title,
            d.archive_reference_number,
            d.type,
            d.status,
            d.created_at,
            u.name as owner_name
          FROM documents d
          LEFT JOIN users u ON d.owner_id = u.id
          ORDER BY d.created_at DESC
          LIMIT 10
        `)
      ]);

      stats = {
        totalDocuments: parseInt(totalDocs.rows[0].count),
        activeDocuments: parseInt(activeDocs.rows[0].count),
        checkedOutDocuments: parseInt(checkedOutDocs.rows[0].count),
        pendingRequests: parseInt(pendingRequests.rows[0].count),
        overdueRequests: parseInt(overdueRequests.rows[0].count),
        recentActivity: recentActivity.rows,
        recentDocuments: recentDocuments.rows
      };
    } else {
      // Regular user sees only their own data
      const [
        myRequests,
        myActiveRequests,
        myOverdueRequests,
        recentActivity
      ] = await Promise.all([
        query('SELECT COUNT(*) FROM file_requests WHERE requested_by = $1', [userId]),
        query('SELECT COUNT(*) FROM file_requests WHERE requested_by = $1 AND status = $2', 
              [userId, 'Approved']),
        query(`SELECT COUNT(*) FROM file_requests 
               WHERE requested_by = $1 
               AND status IN ('Approved', 'Pending') 
               AND expected_return_date < CURRENT_DATE`, [userId]),
        query(`
          SELECT 
            fr.id,
            fr.status,
            fr.request_date,
            fr.expected_return_date,
            d.title as document_title,
            d.archive_reference_number
          FROM file_requests fr
          JOIN documents d ON fr.document_id = d.id
          WHERE fr.requested_by = $1
          ORDER BY fr.created_at DESC
          LIMIT 10
        `, [userId])
      ]);

      stats = {
        myRequests: parseInt(myRequests.rows[0].count),
        myActiveRequests: parseInt(myActiveRequests.rows[0].count),
        myOverdueRequests: parseInt(myOverdueRequests.rows[0].count),
        recentActivity: recentActivity.rows
      };
    }

    res.json(stats);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getUserDashboard
};