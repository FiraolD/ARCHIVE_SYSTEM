const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

class ReportsController {
  // ==================== REPORT STATISTICS ====================
  
  static async getReportStats(req, res) {
    try {
      const { period = '6months', startDate: requestedStart, endDate: requestedEnd } = req.query;
      const validPeriods = ['7days', '30days', '90days', '6months', '1year', 'all'];
      if (!validPeriods.includes(period)) {
        return res.status(400).json({ error: 'Invalid report period' });
      }

      let startDate = null;
      let endDate = null;
      if (requestedStart !== undefined || requestedEnd !== undefined) {
        if (!validDate(requestedStart) || !validDate(requestedEnd) || requestedStart > requestedEnd) {
          return res.status(400).json({ error: 'Valid startDate and endDate are required, and startDate must not be after endDate' });
        }
        startDate = requestedStart;
        endDate = requestedEnd;
      } else if (period !== 'all') {
        const now = new Date();
        const start = new Date(now);
        const days = { '7days': 7, '30days': 30, '90days': 90 };
        if (days[period]) start.setDate(start.getDate() - days[period] + 1);
        else if (period === '6months') start.setMonth(start.getMonth() - 6);
        else start.setFullYear(start.getFullYear() - 1);
        startDate = start.toISOString().slice(0, 10);
        endDate = now.toISOString().slice(0, 10);
      }

      const rangeParams = [startDate, endDate];
      const documentStats = await query(`
        SELECT COUNT(*) AS total_documents,
          COUNT(*) FILTER (WHERE type = 'Claim File') AS claim_files,
          COUNT(*) FILTER (WHERE type = 'Policy') AS policy_documents,
          COUNT(*) FILTER (WHERE type = 'Circular') AS circulars,
          COUNT(*) FILTER (WHERE type = 'Correspondence') AS correspondence,
          COUNT(*) FILTER (WHERE type = 'Billing') AS billing,
          COUNT(*) FILTER (WHERE status = 'Active') AS active_documents,
          COUNT(*) FILTER (WHERE status = 'Checked-out') AS checked_out_documents,
          COUNT(*) FILTER (WHERE status = 'Settled Claims') AS settled_claims,
          COUNT(*) FILTER (WHERE status = 'Returned') AS returned_documents
        FROM documents
        WHERE ($1::date IS NULL OR created_at >= $1::date)
          AND ($2::date IS NULL OR created_at < $2::date + INTERVAL '1 day')
      `, rangeParams);

      const storageStats = await query('SELECT COALESCE(SUM(file_size), 0) AS total_storage_bytes FROM documents');
      const requestStats = await query(`
        SELECT COUNT(*) AS total_requests,
          COUNT(*) FILTER (WHERE status = 'Pending') AS pending_requests,
          COUNT(*) FILTER (WHERE status = 'Approved') AS approved_requests,
          COUNT(*) FILTER (WHERE status = 'Return Pending') AS return_pending_requests,
          COUNT(*) FILTER (WHERE status = 'Returned') AS returned_requests,
          COUNT(*) FILTER (WHERE status = 'Rejected') AS rejected_requests,
          COUNT(*) FILTER (WHERE status = 'Overdue') AS overdue_requests,
          ROUND(AVG(actual_return_date - request_date) FILTER (WHERE actual_return_date IS NOT NULL), 1) AS average_return_days
        FROM file_requests
        WHERE ($1::date IS NULL OR created_at >= $1::date)
          AND ($2::date IS NULL OR created_at < $2::date + INTERVAL '1 day')
      `, rangeParams);

      const [userStats, branchStats, departmentStats, trends, topBranches, topDepartments, recentActivity] = await Promise.all([
        query(`SELECT COUNT(*) AS total_users,
          COUNT(*) FILTER (WHERE role = 'Admin') AS admins,
          COUNT(*) FILTER (WHERE role = 'File Clerk') AS file_clerks,
          COUNT(*) FILTER (WHERE role = 'Agent') AS agents,
          COUNT(*) FILTER (WHERE role = 'Viewer') AS viewers
        FROM users`),
        query(`SELECT COUNT(*) AS total_branches FROM branches`),
        query(`SELECT COUNT(*) AS total_departments FROM departments`),
        query(`SELECT month, year, month_start, document_count, claim_count, policy_count
        FROM (
          SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
            EXTRACT(YEAR FROM created_at)::int AS year,
            DATE_TRUNC('month', created_at)::date AS month_start,
            COUNT(*) AS document_count,
            COUNT(*) FILTER (WHERE type = 'Claim File') AS claim_count,
            COUNT(*) FILTER (WHERE type = 'Policy') AS policy_count
          FROM documents
          WHERE ($1::date IS NULL OR created_at >= $1::date)
            AND ($2::date IS NULL OR created_at < $2::date + INTERVAL '1 day')
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY month_start DESC
          LIMIT 24
        ) monthly_window
        ORDER BY month_start ASC`, rangeParams),
        query(`SELECT COALESCE(b.name, 'Unassigned') AS name, COUNT(*) AS count
        FROM documents d LEFT JOIN branches b ON b.id = d.branch_id
        WHERE ($1::date IS NULL OR d.created_at >= $1::date)
          AND ($2::date IS NULL OR d.created_at < $2::date + INTERVAL '1 day')
        GROUP BY b.name ORDER BY count DESC LIMIT 6`, rangeParams),
        query(`SELECT COALESCE(dept.name, 'Unassigned') AS name, COUNT(*) AS count
        FROM documents d LEFT JOIN departments dept ON dept.id = d.department_id
        WHERE ($1::date IS NULL OR d.created_at >= $1::date)
          AND ($2::date IS NULL OR d.created_at < $2::date + INTERVAL '1 day')
        GROUP BY dept.name ORDER BY count DESC LIMIT 6`, rangeParams),
        query(`(SELECT id, title AS description, type AS category, created_at AS occurred_at
          FROM documents
          WHERE ($1::date IS NULL OR created_at >= $1::date)
            AND ($2::date IS NULL OR created_at < $2::date + INTERVAL '1 day'))
        UNION ALL
        (SELECT id, COALESCE(requester_name, 'File request') AS description,
          'Request · ' || status AS category, created_at AS occurred_at
          FROM file_requests
          WHERE ($1::date IS NULL OR created_at >= $1::date)
            AND ($2::date IS NULL OR created_at < $2::date + INTERVAL '1 day'))
        ORDER BY occurred_at DESC LIMIT 8`, rangeParams),
      ]);

      const documents = documentStats.rows[0];
      const requests = requestStats.rows[0];
      const totalBytes = Number(storageStats.rows[0].total_storage_bytes || 0);
      const totalGB = totalBytes / (1024 ** 3);
      const capacityGB = 5;

      res.json({
        range: { startDate, endDate, period },
        summary: {
          totalDocuments: Number(documents.total_documents),
          totalRequests: Number(requests.total_requests),
          totalUsers: Number(userStats.rows[0].total_users),
          activeBranches: Number(branchStats.rows[0].total_branches),
          activeDepartments: Number(departmentStats.rows[0].total_departments),
          requestFulfillmentRate: Number(requests.total_requests)
            ? Math.round(((Number(requests.approved_requests) + Number(requests.returned_requests)) / Number(requests.total_requests)) * 100)
            : 0,
          averageReturnDays: Number(requests.average_return_days || 0),
        },
        documents: {
          byType: {
            claims: Number(documents.claim_files),
            policies: Number(documents.policy_documents),
            circulars: Number(documents.circulars),
            correspondence: Number(documents.correspondence),
            billing: Number(documents.billing),
          },
          byStatus: {
            active: Number(documents.active_documents),
            checkedOut: Number(documents.checked_out_documents),
            settled: Number(documents.settled_claims),
            returned: Number(documents.returned_documents),
          },
        },
        requests: {
          byStatus: {
            pending: Number(requests.pending_requests),
            approved: Number(requests.approved_requests),
            returnPending: Number(requests.return_pending_requests),
            returned: Number(requests.returned_requests),
            rejected: Number(requests.rejected_requests),
            overdue: Number(requests.overdue_requests),
          },
        },
        users: {
          byRole: {
            admins: Number(userStats.rows[0].admins),
            fileClerks: Number(userStats.rows[0].file_clerks),
            agents: Number(userStats.rows[0].agents),
            viewers: Number(userStats.rows[0].viewers),
          },
        },
        trends: {
          monthlyTrends: trends.rows.map(row => ({
            month: row.month,
            year: Number(row.year),
            count: Number(row.document_count),
            claimCount: Number(row.claim_count),
            policyCount: Number(row.policy_count),
          })),
        },
        breakdowns: {
          branches: topBranches.rows.map(row => ({ name: row.name, count: Number(row.count) })),
          departments: topDepartments.rows.map(row => ({ name: row.name, count: Number(row.count) })),
        },
        recentActivity: recentActivity.rows,
        storage: {
          used: `${totalGB.toFixed(2)} GB`,
          total: `${capacityGB} GB`,
          percentage: Math.min(100, (totalGB / capacityGB) * 100),
          details: `${totalGB.toFixed(2)} GB / ${capacityGB} GB`,
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get report stats error:', error);
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  }

  // ==================== GET GENERATED REPORTS ====================
  
  static async getGeneratedReports(req, res) {
    try {
      const result = await query(`
        SELECT 
          id,
          report_name as name,
          report_type as type,
          created_at as generated_at,
          file_format as format,
          file_size as size
        FROM generated_reports
        ORDER BY created_at DESC
        LIMIT 50
      `);

      res.json(result.rows);
    } catch (error) {
      console.error('Get generated reports error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // ==================== GENERATE REPORT ====================
  
  static async generateReport(req, res) {
    try {
      const { type, format = 'PDF' } = req.body;
      const userId = req.user.id;

      const validTypes = ['Monthly Summary', 'Claims Analysis', 'Department Usage'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid report type' });
      }

      let reportData;
      let fileName;

      switch(type) {
        case 'Monthly Summary':
          reportData = await ReportsController.getMonthlySummaryData();
          fileName = `monthly_summary_${formatDate(new Date())}`;
          break;
        case 'Claims Analysis':
          reportData = await ReportsController.getClaimsAnalysisData();
          fileName = `claims_analysis_${formatDate(new Date())}`;
          break;
        case 'Department Usage':
          reportData = await ReportsController.getDepartmentUsageData();
          fileName = `department_usage_${formatDate(new Date())}`;
          break;
      }

      let filePath;
      let fileSize;

      const reportsDir = path.join(__dirname, '../../uploads/reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      switch(format) {
        case 'PDF':
          filePath = await ReportsController.generatePDFReport(reportData, fileName, type, reportsDir);
          break;
        case 'EXCEL':
          filePath = await ReportsController.generateExcelReport(reportData, fileName, type, reportsDir);
          break;
        case 'CSV':
          filePath = await ReportsController.generateCSVReport(reportData, fileName, type, reportsDir);
          break;
        default:
          return res.status(400).json({ error: 'Invalid format' });
      }

      const stats = fs.statSync(filePath);
      fileSize = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

      const result = await query(
        `INSERT INTO generated_reports 
         (report_name, report_type, file_format, file_size, file_path, created_by, report_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, report_name, created_at, file_path`,
        [fileName + '.' + format.toLowerCase(), type, format, fileSize, filePath, userId, JSON.stringify(reportData)]
      );

      await query(
        `INSERT INTO notifications (title, message, type, user_id, related_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          `${type} Report Generated`,
          `Your ${type} report has been generated successfully.`,
          'success',
          userId,
          result.rows[0].id
        ]
      );

      await query(
        `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, req.user.name, 'Report Generated', result.rows[0].report_name,
         `Generated ${type} report in ${format} format`, req.ip]
      );

      res.status(201).json({
        message: `${type} report generated successfully`,
        report: {
          id: result.rows[0].id,
          name: result.rows[0].report_name,
          generatedAt: result.rows[0].created_at,
          format,
          size: fileSize,
          downloadUrl: `/api/reports/download/${result.rows[0].id}`
        }
      });
    } catch (error) {
      console.error('Generate report error:', error);
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  }

  // ==================== DOWNLOAD REPORT ====================
  
  static async downloadReport(req, res) {
    try {
      const { id } = req.params;

      const result = await query('SELECT * FROM generated_reports WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const report = result.rows[0];

      if (!report.file_path || !fs.existsSync(report.file_path)) {
        return res.status(404).json({ error: 'Report file not found on disk' });
      }

      await query(
        `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, req.user.name, 'Report Downloaded', report.report_name,
         `Downloaded ${report.report_type} report in ${report.file_format} format`, req.ip]
      );

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${report.report_name}"`);
      
      const fileStream = fs.createReadStream(report.file_path);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming file' });
        }
      });
    } catch (error) {
      console.error('Download report error:', error);
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  }

  // ==================== DELETE REPORT ====================

  static async deleteReport(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const reportResult = await query('SELECT * FROM generated_reports WHERE id = $1', [id]);

      if (reportResult.rows.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const report = reportResult.rows[0];

      if (report.file_path && fs.existsSync(report.file_path)) {
        try {
          fs.unlinkSync(report.file_path);
          console.log(`Deleted file: ${report.file_path}`);
        } catch (fileError) {
          console.error('Error deleting file:', fileError);
        }
      }

      await query('DELETE FROM generated_reports WHERE id = $1', [id]);

      await query(
        `INSERT INTO audit_logs (user_id, user_name, action, resource, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, req.user.name, 'Report Deleted', report.report_name,
         `Deleted ${report.report_type} report generated on ${new Date(report.created_at).toLocaleDateString()}`, req.ip]
      );

      res.json({ 
        message: 'Report deleted successfully',
        id: report.id,
        name: report.report_name
      });
    } catch (error) {
      console.error('Delete report error:', error);
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  }

  // ==================== REPORT DATA COLLECTION ====================

  static async getMonthlySummaryData() {
    const documents = await query(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN type = 'Claim File' THEN 1 END) as claims,
        COUNT(CASE WHEN type = 'Policy' THEN 1 END) as policies,
        COUNT(CASE WHEN type = 'Circular' THEN 1 END) as circulars,
        COUNT(CASE WHEN type = 'Correspondence' THEN 1 END) as correspondence,
        COUNT(CASE WHEN type = 'Billing' THEN 1 END) as billing,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'Checked-out' THEN 1 END) as checked_out,
        COUNT(CASE WHEN status = 'Settled Claims' THEN 1 END) as settled
      FROM documents
    `);

    const requests = await query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'Returned' THEN 1 END) as returned,
        COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'Overdue' THEN 1 END) as overdue
      FROM file_requests
    `);

    const topDocuments = await query(`
      SELECT 
        d.title,
        d.archive_reference_number,
        d.type,
        COUNT(fr.id) as request_count
      FROM documents d
      LEFT JOIN file_requests fr ON d.id = fr.document_id
      GROUP BY d.id, d.title, d.archive_reference_number, d.type
      ORDER BY request_count DESC
      LIMIT 10
    `);

    const monthlyBreakdown = await query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as documents_added,
        COUNT(CASE WHEN type = 'Claim File' THEN 1 END) as claims_added,
        COUNT(CASE WHEN type = 'Policy' THEN 1 END) as policies_added
      FROM documents
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `);

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalDocuments: parseInt(documents.rows[0].total_documents),
        totalRequests: parseInt(requests.rows[0].total_requests),
        activeRate: documents.rows[0].total_documents > 0 
          ? Math.round((parseInt(documents.rows[0].active) / parseInt(documents.rows[0].total_documents)) * 100)
          : 0,
        requestFulfillmentRate: requests.rows[0].total_requests > 0
          ? Math.round((parseInt(requests.rows[0].approved) / parseInt(requests.rows[0].total_requests)) * 100)
          : 0
      },
      documents: {
        byType: {
          claims: parseInt(documents.rows[0].claims),
          policies: parseInt(documents.rows[0].policies),
          circulars: parseInt(documents.rows[0].circulars),
          correspondence: parseInt(documents.rows[0].correspondence),
          billing: parseInt(documents.rows[0].billing)
        },
        byStatus: {
          active: parseInt(documents.rows[0].active),
          checkedOut: parseInt(documents.rows[0].checked_out),
          settled: parseInt(documents.rows[0].settled)
        }
      },
      requests: {
        byStatus: {
          pending: parseInt(requests.rows[0].pending),
          approved: parseInt(requests.rows[0].approved),
          returned: parseInt(requests.rows[0].returned),
          rejected: parseInt(requests.rows[0].rejected),
          overdue: parseInt(requests.rows[0].overdue)
        }
      },
      topDocuments: topDocuments.rows.map(doc => ({
        ...doc,
        request_count: parseInt(doc.request_count)
      })),
      monthlyBreakdown: monthlyBreakdown.rows.map(row => ({
        month: row.month,
        documents_added: parseInt(row.documents_added),
        claims_added: parseInt(row.claims_added),
        policies_added: parseInt(row.policies_added)
      }))
    };
  }

  static async getClaimsAnalysisData() {
    const claims = await query(`
      SELECT 
        d.id,
        d.archive_reference_number,
        d.title,
        d.insured_name,
        d.policy_number,
        d.claim_number,
        d.estimated_loss,
        d.status,
        d.created_at,
        b.name as branch_name,
        p.name as product_name
      FROM documents d
      LEFT JOIN branches b ON d.branch_id = b.id
      LEFT JOIN products p ON d.product_id = p.id
      WHERE d.type = 'Claim File'
      ORDER BY d.created_at DESC
    `);

    const claimsByStatus = await query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(CASE WHEN estimated_loss IS NOT NULL THEN 1 ELSE 0 END) as with_loss
      FROM documents
      WHERE type = 'Claim File'
      GROUP BY status
    `);

    const claimsByBranch = await query(`
      SELECT 
        COALESCE(b.name, 'Unassigned') as branch,
        COUNT(d.id) as claim_count,
        SUM(CASE WHEN d.estimated_loss IS NOT NULL THEN d.estimated_loss::numeric ELSE 0 END) as total_loss
      FROM documents d
      LEFT JOIN branches b ON d.branch_id = b.id
      WHERE d.type = 'Claim File'
      GROUP BY b.name
      ORDER BY claim_count DESC
    `);

    const totalLoss = await query(`
      SELECT SUM(estimated_loss::numeric) as total
      FROM documents
      WHERE type = 'Claim File' AND estimated_loss IS NOT NULL
    `);

    const claimIds = claims.rows.map(c => c.id);
    let requestCounts = [];
    
    if (claimIds.length > 0) {
      requestCounts = await query(`
        SELECT 
          document_id,
          COUNT(*) as request_count
        FROM file_requests
        WHERE document_id = ANY($1::uuid[])
        GROUP BY document_id
      `, [claimIds]);
    }

    const claimsByMonth = await query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as claim_count,
        COALESCE(SUM(estimated_loss::numeric), 0) as monthly_loss
      FROM documents
      WHERE type = 'Claim File'
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `);

    const requestCountMap = {};
    requestCounts.rows.forEach(r => {
      requestCountMap[r.document_id] = parseInt(r.request_count);
    });

    const claimsWithCounts = claims.rows.map(claim => ({
      ...claim,
      request_count: requestCountMap[claim.id] || 0,
      estimated_loss: claim.estimated_loss ? parseFloat(claim.estimated_loss) : null
    }));

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalClaims: claims.rows.length,
        totalEstimatedLoss: parseFloat(totalLoss.rows[0]?.total || 0),
        averageLossPerClaim: claims.rows.length > 0 
          ? (parseFloat(totalLoss.rows[0]?.total || 0) / claims.rows.length).toFixed(2)
          : 0,
        claimsWithLoss: claims.rows.filter(c => c.estimated_loss).length
      },
      claimsByStatus: claimsByStatus.rows.map(row => ({
        status: row.status,
        count: parseInt(row.count),
        withLoss: parseInt(row.with_loss)
      })),
      claimsByBranch: claimsByBranch.rows.map(row => ({
        branch: row.branch,
        claim_count: parseInt(row.claim_count),
        total_loss: parseFloat(row.total_loss || 0)
      })),
      recentClaims: claimsWithCounts.slice(0, 50),
      claimsByMonth: claimsByMonth.rows.map(row => ({
        month: row.month,
        claim_count: parseInt(row.claim_count),
        monthly_loss: parseFloat(row.monthly_loss || 0)
      })),
      topRequestedClaims: claimsWithCounts
        .filter(c => c.request_count > 0)
        .sort((a, b) => b.request_count - a.request_count)
        .slice(0, 10)
    };
  }

  static async getDepartmentUsageData() {
    try {
      const departments = await query(`
        SELECT id, name, code FROM departments ORDER BY name
      `);

      const departmentStats = await query(`
        SELECT 
          d.name as department_name,
          d.code as department_code,
          COUNT(DISTINCT u.id) as user_count,
          COUNT(DISTINCT fr.id) as request_count,
          COUNT(DISTINCT CASE WHEN fr.status = 'Pending' THEN fr.id END) as pending_requests,
          COUNT(DISTINCT CASE WHEN fr.status = 'Approved' THEN fr.id END) as approved_requests,
          COUNT(DISTINCT CASE WHEN fr.status = 'Returned' THEN fr.id END) as returned_requests,
          COUNT(DISTINCT CASE WHEN fr.status = 'Rejected' THEN fr.id END) as rejected_requests,
          COUNT(DISTINCT CASE WHEN fr.status = 'Overdue' THEN fr.id END) as overdue_requests
        FROM departments d
        LEFT JOIN users u ON u.department_name = d.name
        LEFT JOIN file_requests fr ON fr.requested_by = u.id
        GROUP BY d.id, d.name, d.code
        ORDER BY request_count DESC
      `);

      const documentTypesByDept = await query(`
        SELECT 
          dept.name as department,
          d.type as document_type,
          COUNT(*) as count
        FROM file_requests fr
        JOIN users u ON fr.requested_by = u.id
        JOIN departments dept ON u.department_name = dept.name
        JOIN documents d ON fr.document_id = d.id
        GROUP BY dept.name, d.type
        ORDER BY dept.name, count DESC
      `);

      const monthlyTrends = await query(`
        SELECT 
          dept.name as department,
          TO_CHAR(fr.created_at, 'Mon') as month,
          EXTRACT(MONTH FROM fr.created_at) as month_num,
          COUNT(*) as request_count
        FROM file_requests fr
        JOIN users u ON fr.requested_by = u.id
        JOIN departments dept ON u.department_name = dept.name
        WHERE fr.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
        GROUP BY dept.name, TO_CHAR(fr.created_at, 'Mon'), EXTRACT(MONTH FROM fr.created_at)
        ORDER BY dept.name, month_num ASC
      `);

      const usersByDept = await query(`
        SELECT 
          dept.name as department,
          u.id,
          u.name,
          u.email,
          u.role,
          u.department_name,
          COUNT(fr.id) as request_count,
          MAX(fr.created_at) as last_request
        FROM departments dept
        LEFT JOIN users u ON u.department_name = dept.name
        LEFT JOIN file_requests fr ON fr.requested_by = u.id
        GROUP BY dept.name, u.id, u.name, u.email, u.role, u.department_name
        ORDER BY dept.name, request_count DESC
      `);

      return {
        generatedAt: new Date().toISOString(),
        summary: {
          totalDepartments: departmentStats.rows.length,
          totalRequests: departmentStats.rows.reduce((sum, dept) => sum + parseInt(dept.request_count || 0), 0),
          totalUsers: departmentStats.rows.reduce((sum, dept) => sum + parseInt(dept.user_count || 0), 0),
          activeDepartments: departmentStats.rows.filter(d => d.request_count > 0).length,
          departmentsWithOverdue: departmentStats.rows.filter(d => parseInt(d.overdue_requests || 0) > 0).length
        },
        departments: departmentStats.rows.map(dept => ({
          name: dept.department_name,
          code: dept.department_code,
          user_count: parseInt(dept.user_count || 0),
          request_count: parseInt(dept.request_count || 0),
          pending_requests: parseInt(dept.pending_requests || 0),
          approved_requests: parseInt(dept.approved_requests || 0),
          returned_requests: parseInt(dept.returned_requests || 0),
          rejected_requests: parseInt(dept.rejected_requests || 0),
          overdue_requests: parseInt(dept.overdue_requests || 0)
        })),
        documentTypesByDept: documentTypesByDept.rows.map(row => ({
          department: row.department,
          document_type: row.document_type,
          count: parseInt(row.count)
        })),
        monthlyTrends: monthlyTrends.rows.map(row => ({
          department: row.department,
          month: row.month,
          request_count: parseInt(row.request_count)
        })),
        usersByDept: usersByDept.rows
          .filter(user => user.name)
          .map(user => ({
            department: user.department,
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            request_count: parseInt(user.request_count || 0),
            last_request: user.last_request
          }))
      };
    } catch (error) {
      console.error('Error in getDepartmentUsageData:', error);
      throw error;
    }
  }

  // ==================== FILE GENERATION ====================

  static async generatePDFReport(data, fileName, reportType, reportsDir) {
    return new Promise((resolve, reject) => {
      const filePath = path.join(reportsDir, `${fileName}.pdf`);
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);

      doc.fontSize(20).font('Helvetica-Bold').text('INSUREARCH', { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).font('Helvetica-Bold').text(`${reportType} Report`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date(data.generatedAt).toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      if (reportType === 'Monthly Summary') {
        ReportsController.addMonthlySummaryToPDF(doc, data);
      } else if (reportType === 'Claims Analysis') {
        ReportsController.addClaimsAnalysisToPDF(doc, data);
      } else if (reportType === 'Department Usage') {
        ReportsController.addDepartmentUsageToPDF(doc, data);
      }

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  static addMonthlySummaryToPDF(doc, data) {
    doc.fontSize(14).font('Helvetica-Bold').text('Executive Summary');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Total Documents: ${data.summary.totalDocuments}`);
    doc.text(`Total Requests: ${data.summary.totalRequests}`);
    doc.text(`Active Rate: ${data.summary.activeRate}%`);
    doc.text(`Request Fulfillment Rate: ${data.summary.requestFulfillmentRate}%`);
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').text('Documents by Type');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Claims: ${data.documents.byType.claims}`);
    doc.text(`Policies: ${data.documents.byType.policies}`);
    doc.text(`Circulars: ${data.documents.byType.circulars}`);
    doc.text(`Correspondence: ${data.documents.byType.correspondence}`);
    doc.text(`Billing: ${data.documents.byType.billing}`);
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').text('Documents by Status');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Active: ${data.documents.byStatus.active}`);
    doc.text(`Checked Out: ${data.documents.byStatus.checkedOut}`);
    doc.text(`Settled: ${data.documents.byStatus.settled}`);
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').text('Requests by Status');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Pending: ${data.requests.byStatus.pending}`);
    doc.text(`Approved: ${data.requests.byStatus.approved}`);
    doc.text(`Returned: ${data.requests.byStatus.returned}`);
    doc.text(`Rejected: ${data.requests.byStatus.rejected}`);
    doc.text(`Overdue: ${data.requests.byStatus.overdue}`);
    doc.moveDown();

    if (data.topDocuments.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Most Requested Documents');
      doc.moveDown(0.5);
      
      data.topDocuments.forEach((item, index) => {
        doc.fontSize(10).font('Helvetica-Bold').text(`${index + 1}. ${item.title || 'Untitled'}`);
        doc.fontSize(9).font('Helvetica').text(`   Ref: ${item.archive_reference_number || 'N/A'}`);
        doc.fontSize(9).font('Helvetica').text(`   Type: ${item.type}`);
        doc.fontSize(9).font('Helvetica').text(`   Requests: ${item.request_count}`);
        doc.moveDown(0.3);
      });
    }
  }

  static addClaimsAnalysisToPDF(doc, data) {
    doc.fontSize(14).font('Helvetica-Bold').text('Claims Summary');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Total Claims: ${data.summary.totalClaims}`);
    doc.text(`Total Estimated Loss: $${data.summary.totalEstimatedLoss.toLocaleString()}`);
    doc.text(`Average Loss per Claim: $${data.summary.averageLossPerClaim}`);
    doc.text(`Claims with Loss Estimates: ${data.summary.claimsWithLoss}`);
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').text('Claims by Status');
    doc.moveDown(0.5);
    data.claimsByStatus.forEach(item => {
      doc.fontSize(10).font('Helvetica').text(`${item.status}: ${item.count} claims (${item.withLoss} with loss estimates)`);
    });
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').text('Claims by Branch');
    doc.moveDown(0.5);
    data.claimsByBranch.forEach(item => {
      doc.fontSize(10).font('Helvetica').text(`${item.branch}: ${item.claim_count} claims - Total Loss: $${item.total_loss.toLocaleString()}`);
    });
    doc.moveDown();

    if (data.topRequestedClaims.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Most Requested Claims');
      doc.moveDown(0.5);
      
      data.topRequestedClaims.forEach((item, index) => {
        doc.fontSize(10).font('Helvetica-Bold').text(`${index + 1}. Claim: ${item.claim_number || 'N/A'}`);
        doc.fontSize(9).font('Helvetica').text(`   Insured: ${item.insured_name || 'N/A'}`);
        doc.fontSize(9).font('Helvetica').text(`   Policy: ${item.policy_number || 'N/A'}`);
        doc.fontSize(9).font('Helvetica').text(`   Requests: ${item.request_count}`);
        doc.moveDown(0.3);
      });
    }
  }

  static addDepartmentUsageToPDF(doc, data) {
    doc.fontSize(14).font('Helvetica-Bold').text('Department Usage Summary');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Total Departments: ${data.summary.totalDepartments}`);
    doc.text(`Total Requests: ${data.summary.totalRequests}`);
    doc.text(`Total Users: ${data.summary.totalUsers}`);
    doc.text(`Active Departments: ${data.summary.activeDepartments}`);
    doc.text(`Departments with Overdue: ${data.summary.departmentsWithOverdue}`);
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').text('Department Breakdown');
    doc.moveDown(0.5);
    
    data.departments.slice(0, 10).forEach(department => {
      doc.fontSize(10).font('Helvetica-Bold').text(`${department.name} (${department.code})`);
      doc.fontSize(9).font('Helvetica').text(`   Users: ${department.user_count}`);
      doc.fontSize(9).font('Helvetica').text(`   Total Requests: ${department.request_count}`);
      doc.fontSize(9).font('Helvetica').text(`   Pending: ${department.pending_requests}`);
      doc.fontSize(9).font('Helvetica').text(`   Approved: ${department.approved_requests}`);
      doc.fontSize(9).font('Helvetica').text(`   Returned: ${department.returned_requests}`);
      doc.fontSize(9).font('Helvetica').text(`   Overdue: ${department.overdue_requests}`);
      doc.moveDown(0.5);
    });
  }

  static async generateExcelReport(data, fileName, reportType, reportsDir) {
    const filePath = path.join(reportsDir, `${fileName}.xlsx`);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'INSUREARCH System';
    workbook.created = new Date();

    if (reportType === 'Monthly Summary') {
      await ReportsController.addMonthlySummaryToExcel(workbook, data);
    } else if (reportType === 'Claims Analysis') {
      await ReportsController.addClaimsAnalysisToExcel(workbook, data);
    } else if (reportType === 'Department Usage') {
      await ReportsController.addDepartmentUsageToExcel(workbook, data);
    }

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  static async addMonthlySummaryToExcel(workbook, data) {
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    summarySheet.addRow(['Generated At', new Date(data.generatedAt).toLocaleString()]);
    summarySheet.addRow(['Total Documents', data.summary.totalDocuments]);
    summarySheet.addRow(['Total Requests', data.summary.totalRequests]);
    summarySheet.addRow(['Active Rate', `${data.summary.activeRate}%`]);
    summarySheet.addRow(['Request Fulfillment Rate', `${data.summary.requestFulfillmentRate}%`]);

    const typeSheet = workbook.addWorksheet('Documents by Type');
    typeSheet.columns = [
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Count', key: 'count', width: 15 }
    ];

    Object.entries(data.documents.byType).forEach(([key, value]) => {
      typeSheet.addRow({ type: key, count: value });
    });

    const statusSheet = workbook.addWorksheet('Documents by Status');
    statusSheet.columns = [
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Count', key: 'count', width: 15 }
    ];

    Object.entries(data.documents.byStatus).forEach(([key, value]) => {
      statusSheet.addRow({ status: key, count: value });
    });

    const requestsSheet = workbook.addWorksheet('Requests');
    requestsSheet.columns = [
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Count', key: 'count', width: 15 }
    ];

    Object.entries(data.requests.byStatus).forEach(([key, value]) => {
      requestsSheet.addRow({ status: key, count: value });
    });

    if (data.topDocuments.length > 0) {
      const topDocsSheet = workbook.addWorksheet('Top Documents');
      topDocsSheet.columns = [
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Reference', key: 'ref', width: 20 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Requests', key: 'requests', width: 10 }
      ];

      data.topDocuments.forEach(doc => {
        topDocsSheet.addRow({
          title: doc.title || 'Untitled',
          ref: doc.archive_reference_number || 'N/A',
          type: doc.type,
          requests: doc.request_count
        });
      });
    }
  }

  static async addClaimsAnalysisToExcel(workbook, data) {
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    summarySheet.addRow(['Generated At', new Date(data.generatedAt).toLocaleString()]);
    summarySheet.addRow(['Total Claims', data.summary.totalClaims]);
    summarySheet.addRow(['Total Estimated Loss', `$${data.summary.totalEstimatedLoss.toLocaleString()}`]);
    summarySheet.addRow(['Average Loss per Claim', `$${data.summary.averageLossPerClaim}`]);
    summarySheet.addRow(['Claims with Loss Estimates', data.summary.claimsWithLoss]);

    const statusSheet = workbook.addWorksheet('Claims by Status');
    statusSheet.columns = [
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Count', key: 'count', width: 15 },
      { header: 'With Loss Estimate', key: 'withLoss', width: 20 }
    ];

    data.claimsByStatus.forEach(item => {
      statusSheet.addRow({
        status: item.status,
        count: item.count,
        withLoss: item.withLoss
      });
    });

    const branchSheet = workbook.addWorksheet('Claims by Branch');
    branchSheet.columns = [
      { header: 'Branch', key: 'branch', width: 25 },
      { header: 'Claim Count', key: 'count', width: 15 },
      { header: 'Total Loss', key: 'loss', width: 20 }
    ];

    data.claimsByBranch.forEach(item => {
      branchSheet.addRow({
        branch: item.branch,
        count: item.claim_count,
        loss: `$${item.total_loss.toLocaleString()}`
      });
    });

    const monthSheet = workbook.addWorksheet('Claims by Month');
    monthSheet.columns = [
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Claim Count', key: 'count', width: 15 },
      { header: 'Monthly Loss', key: 'loss', width: 20 }
    ];

    data.claimsByMonth.forEach(item => {
      monthSheet.addRow({
        month: item.month,
        count: item.claim_count,
        loss: `$${item.monthly_loss.toLocaleString()}`
      });
    });

    const claimsSheet = workbook.addWorksheet('Recent Claims');
    claimsSheet.columns = [
      { header: 'Reference', key: 'ref', width: 20 },
      { header: 'Insured', key: 'insured', width: 25 },
      { header: 'Policy', key: 'policy', width: 20 },
      { header: 'Claim', key: 'claim', width: 20 },
      { header: 'Loss', key: 'loss', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'Requests', key: 'requests', width: 10 }
    ];

    data.recentClaims.slice(0, 100).forEach(claim => {
      claimsSheet.addRow({
        ref: claim.archive_reference_number || 'N/A',
        insured: claim.insured_name || 'N/A',
        policy: claim.policy_number || 'N/A',
        claim: claim.claim_number || 'N/A',
        loss: claim.estimated_loss ? `$${claim.estimated_loss.toLocaleString()}` : 'N/A',
        status: claim.status,
        branch: claim.branch_name || 'N/A',
        requests: claim.request_count || 0
      });
    });
  }

  static async addDepartmentUsageToExcel(workbook, data) {
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    summarySheet.addRow(['Generated At', new Date(data.generatedAt).toLocaleString()]);
    summarySheet.addRow(['Total Departments', data.summary.totalDepartments]);
    summarySheet.addRow(['Total Requests', data.summary.totalRequests]);
    summarySheet.addRow(['Total Users', data.summary.totalUsers]);
    summarySheet.addRow(['Active Departments', data.summary.activeDepartments]);
    summarySheet.addRow(['Departments with Overdue', data.summary.departmentsWithOverdue]);

    const departmentSheet = workbook.addWorksheet('Departments');
    departmentSheet.columns = [
      { header: 'Department', key: 'name', width: 25 },
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Users', key: 'users', width: 10 },
      { header: 'Total Requests', key: 'total', width: 15 },
      { header: 'Pending', key: 'pending', width: 10 },
      { header: 'Approved', key: 'approved', width: 10 },
      { header: 'Returned', key: 'returned', width: 10 },
      { header: 'Overdue', key: 'overdue', width: 10 }
    ];

    data.departments.forEach(department => {
      departmentSheet.addRow({
        name: department.name,
        code: department.code,
        users: department.user_count,
        total: department.request_count,
        pending: department.pending_requests,
        approved: department.approved_requests,
        returned: department.returned_requests,
        overdue: department.overdue_requests
      });
    });

    const docTypeSheet = workbook.addWorksheet('Document Types by Department');
    docTypeSheet.columns = [
      { header: 'Department', key: 'department', width: 25 },
      { header: 'Document Type', key: 'type', width: 20 },
      { header: 'Count', key: 'count', width: 10 }
    ];

    data.documentTypesByDept.forEach(item => {
      docTypeSheet.addRow({
        department: item.department,
        type: item.document_type,
        count: item.count
      });
    });

    const usersSheet = workbook.addWorksheet('Users by Department');
    usersSheet.columns = [
      { header: 'Department', key: 'department', width: 25 },
      { header: 'User', key: 'user', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Requests', key: 'requests', width: 10 },
      { header: 'Last Request', key: 'last', width: 20 }
    ];

    data.usersByDept.forEach(user => {
      usersSheet.addRow({
        department: user.department,
        user: user.name,
        email: user.email,
        role: user.role,
        requests: user.request_count,
        last: user.last_request ? new Date(user.last_request).toLocaleDateString() : 'Never'
      });
    });
  }

  static async generateCSVReport(data, fileName, reportType, reportsDir) {
    const filePath = path.join(reportsDir, `${fileName}.csv`);
    let csvContent = '';

    if (reportType === 'Monthly Summary') {
      csvContent = ReportsController.generateMonthlySummaryCSV(data);
    } else if (reportType === 'Claims Analysis') {
      csvContent = ReportsController.generateClaimsAnalysisCSV(data);
    } else if (reportType === 'Department Usage') {
      csvContent = ReportsController.generateDepartmentUsageCSV(data);
    }

    fs.writeFileSync(filePath, csvContent);
    return filePath;
  }

  static generateMonthlySummaryCSV(data) {
    let csv = 'Monthly Summary Report\n';
    csv += `Generated At,${new Date(data.generatedAt).toLocaleString()}\n\n`;

    csv += 'Summary\n';
    csv += `Total Documents,${data.summary.totalDocuments}\n`;
    csv += `Total Requests,${data.summary.totalRequests}\n`;
    csv += `Active Rate,${data.summary.activeRate}%\n`;
    csv += `Request Fulfillment Rate,${data.summary.requestFulfillmentRate}%\n\n`;

    csv += 'Documents by Type\n';
    csv += 'Type,Count\n';
    Object.entries(data.documents.byType).forEach(([key, value]) => {
      csv += `${key},${value}\n`;
    });
    csv += '\n';

    csv += 'Documents by Status\n';
    csv += 'Status,Count\n';
    Object.entries(data.documents.byStatus).forEach(([key, value]) => {
      csv += `${key},${value}\n`;
    });
    csv += '\n';

    csv += 'Requests by Status\n';
    csv += 'Status,Count\n';
    Object.entries(data.requests.byStatus).forEach(([key, value]) => {
      csv += `${key},${value}\n`;
    });

    return csv;
  }

  static generateClaimsAnalysisCSV(data) {
    let csv = 'Claims Analysis Report\n';
    csv += `Generated At,${new Date(data.generatedAt).toLocaleString()}\n\n`;

    csv += 'Summary\n';
    csv += `Total Claims,${data.summary.totalClaims}\n`;
    csv += `Total Estimated Loss,${data.summary.totalEstimatedLoss}\n`;
    csv += `Average Loss per Claim,${data.summary.averageLossPerClaim}\n`;
    csv += `Claims with Loss Estimates,${data.summary.claimsWithLoss}\n\n`;

    csv += 'Claims by Branch\n';
    csv += 'Branch,Claim Count,Total Loss\n';
    data.claimsByBranch.forEach(item => {
      csv += `${item.branch},${item.claim_count},${item.total_loss}\n`;
    });

    return csv;
  }

  static generateDepartmentUsageCSV(data) {
    let csv = 'Department Usage Report\n';
    csv += `Generated At,${new Date(data.generatedAt).toLocaleString()}\n\n`;

    csv += 'Summary\n';
    csv += `Total Departments,${data.summary.totalDepartments}\n`;
    csv += `Total Requests,${data.summary.totalRequests}\n`;
    csv += `Total Users,${data.summary.totalUsers}\n`;
    csv += `Active Departments,${data.summary.activeDepartments}\n`;
    csv += `Departments with Overdue,${data.summary.departmentsWithOverdue}\n\n`;

    csv += 'Departments\n';
    csv += 'Department,Code,Users,Total Requests,Pending,Approved,Returned,Overdue\n';
    data.departments.forEach(department => {
      csv += `${department.name},${department.code},${department.user_count},${department.request_count},${department.pending_requests},${department.approved_requests},${department.returned_requests},${department.overdue_requests}\n`;
    });

    return csv;
  }
}

function formatDate(date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

module.exports = ReportsController;