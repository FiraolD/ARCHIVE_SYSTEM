// backend/src/controllers/dashboardController.js
const { query } = require('../config/database');

const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let stats = {};

    // ==========================================
    // 1. ADMIN DASHBOARD (System & DB Metrics)
    // ==========================================
    if (userRole === 'Admin') {
      const [totalDocs, totalUsers, totalAuditLogs, dbSize, activeConnections, tableCount, recentActivity] = await Promise.all([
        query('SELECT COUNT(*) FROM documents'),
        query('SELECT COUNT(*) FROM users'),
        query('SELECT COUNT(*) FROM audit_logs'),
        query("SELECT pg_size_pretty(pg_database_size(current_database())) AS size"),
        query("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"),
        query("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"),
        query(`
          SELECT a.id, a.action, a.details, a.timestamp, u.name as user_name
          FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id
          ORDER BY a.timestamp DESC LIMIT 10
        `)
      ]);

      stats = {
        adminStats: {
          totalDocuments: parseInt(totalDocs.rows[0].count),
          totalUsers: parseInt(totalUsers.rows[0].count),
          totalAuditLogs: parseInt(totalAuditLogs.rows[0].count),
          dbSize: dbSize.rows[0].size,
          activeConnections: parseInt(activeConnections.rows[0].count),
          tableCount: parseInt(tableCount.rows[0].count),
        },
        recentActivity: recentActivity.rows
      };
    } 
    
    // ==========================================
    // 2. FILE CLERK DASHBOARD (Global Operations)
    // ==========================================
    else if (userRole === 'File Clerk') {
      const [totalDocs, activeDocs, checkedOutDocs, pendingRequests, overdueRequests, recentActivity, recentDocuments] = await Promise.all([
        query('SELECT COUNT(*) FROM documents'),
        query('SELECT COUNT(*) FROM documents WHERE status = $1', ['Active']),
        query('SELECT COUNT(*) FROM documents WHERE status = $1', ['Checked-out']),
        query('SELECT COUNT(*) FROM file_requests WHERE status = $1', ['Pending']),
        query(`SELECT COUNT(*) FROM file_requests WHERE status IN ('Approved', 'Pending') AND expected_return_date < CURRENT_DATE`),
        query(`
          SELECT fr.id, fr.status, fr.request_date, fr.expected_return_date,
                 d.title as document_title, d.archive_reference_number, u.name as requested_by_name
          FROM file_requests fr
          JOIN documents d ON fr.document_id = d.id
          JOIN users u ON fr.requested_by = u.id
          ORDER BY fr.created_at DESC LIMIT 10
        `),
        query(`
          SELECT d.id, d.title, d.archive_reference_number, d.type, d.status, d.created_at
          FROM documents d ORDER BY d.created_at DESC LIMIT 10
        `)
      ]);

      stats = {
        operationalStats: {
          totalDocuments: parseInt(totalDocs.rows[0].count),
          activeDocuments: parseInt(activeDocs.rows[0].count),
          checkedOutDocuments: parseInt(checkedOutDocs.rows[0].count),
          pendingRequests: parseInt(pendingRequests.rows[0].count),
          overdueRequests: parseInt(overdueRequests.rows[0].count),
        },
        recentActivity: recentActivity.rows,
        recentDocuments: recentDocuments.rows
      };
    } 
    
    // ==========================================
    // 3. AGENT DASHBOARD (Personal Data Only)
    // ==========================================
    else {
      const [myRequests, myActiveRequests, myOverdueRequests, recentActivity] = await Promise.all([
        // Total requests made by this user
        query('SELECT COUNT(*) FROM file_requests WHERE requested_by = $1', [userId]),
        // Currently approved/checked out by this user
        query('SELECT COUNT(*) FROM file_requests WHERE requested_by = $1 AND status = $2', [userId, 'Approved']),
        // Overdue requests by this user
        query(`SELECT COUNT(*) FROM file_requests WHERE requested_by = $1 AND status IN ('Approved', 'Pending') AND expected_return_date < CURRENT_DATE`, [userId]),
        // Recent activity specific to this user
        query(`
          SELECT fr.id, fr.status, fr.request_date, fr.expected_return_date,
                 d.title as document_title, d.archive_reference_number
          FROM file_requests fr
          JOIN documents d ON fr.document_id = d.id
          WHERE fr.requested_by = $1
          ORDER BY fr.created_at DESC LIMIT 10
        `, [userId])
      ]);

      stats = {
        agentStats: {
          myRequests: parseInt(myRequests.rows[0].count),
          myActiveRequests: parseInt(myActiveRequests.rows[0].count),
          myOverdueRequests: parseInt(myOverdueRequests.rows[0].count),
        },
        recentActivity: recentActivity.rows
      };
    }

    res.json(stats);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getUserDashboard };