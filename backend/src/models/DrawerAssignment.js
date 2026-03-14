// backend/src/models/DrawerAssignment.js
const { query } = require('../config/database');

class DrawerAssignment {
  static async create(data) {
    const { cabinetId, drawerNumber, branchId, assignedBy } = data;
    
    // Check if drawer is already assigned
    const existing = await this.findByCabinetAndDrawer(cabinetId, drawerNumber);
    
    if (existing) {
      // Update existing assignment instead of creating new one
      return this.update(existing.id, { branchId, assignedBy });
    }
    
    const result = await query(
      `INSERT INTO drawer_assignments 
       (cabinet_id, drawer_number, branch_id, assigned_by, assigned_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [cabinetId, drawerNumber, branchId, assignedBy]
    );
    
    return result.rows[0];
  }

  static async findByCabinetAndDrawer(cabinetId, drawerNumber) {
    const result = await query(
      `SELECT da.*, b.name as branch_name, b.code as branch_code,
              c.number as cabinet_number
       FROM drawer_assignments da
       JOIN branches b ON da.branch_id = b.id
       JOIN cabinets c ON da.cabinet_id = c.id
       WHERE da.cabinet_id = $1 AND da.drawer_number = $2
       AND (da.ended_at IS NULL OR da.ended_at > CURRENT_TIMESTAMP)`,
      [cabinetId, drawerNumber]
    );
    
    return result.rows[0];
  }

  static async getCurrentAssignments(branchId = null) {
    let sql = `
      SELECT da.*, b.name as branch_name, b.code as branch_code,
             c.number as cabinet_number
      FROM drawer_assignments da
      JOIN branches b ON da.branch_id = b.id
      JOIN cabinets c ON da.cabinet_id = c.id
      WHERE (da.ended_at IS NULL OR da.ended_at > CURRENT_TIMESTAMP)
    `;
    
    const params = [];
    if (branchId) {
      sql += ` AND da.branch_id = $1`;
      params.push(branchId);
    }
    
    sql += ` ORDER BY c.number, da.drawer_number`;
    
    const result = await query(sql, params);
    return result.rows;
  }

  static async update(id, data) {
    const { branchId, assignedBy } = data;
    
    const result = await query(
      `UPDATE drawer_assignments 
       SET branch_id = $1, assigned_by = $2, assigned_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [branchId, assignedBy, id]
    );
    
    return result.rows[0];
  }

  static async endAssignment(id) {
    const result = await query(
      `UPDATE drawer_assignments 
       SET ended_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    return result.rows[0];
  }

  static async getAssignmentHistory(cabinetId, drawerNumber) {
    const result = await query(
      `SELECT da.*, b.name as branch_name, u.name as assigned_by_name
       FROM drawer_assignments da
       JOIN branches b ON da.branch_id = b.id
       LEFT JOIN users u ON da.assigned_by = u.id
       WHERE da.cabinet_id = $1 AND da.drawer_number = $2
       ORDER BY da.assigned_at DESC`,
      [cabinetId, drawerNumber]
    );
    
    return result.rows;
  }
}

module.exports = DrawerAssignment;