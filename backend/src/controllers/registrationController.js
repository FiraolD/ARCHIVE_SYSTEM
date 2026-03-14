const { query } = require('../config/database');

// ==================== BRANCH CONTROLLERS ====================

const getBranches = async (req, res) => {
  try {
    const result = await query('SELECT * FROM branches ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createBranch = async (req, res) => {
  try {
    const { name, code } = req.body;
    
    const result = await query(
      'INSERT INTO branches (name, code, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name, code, req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create branch error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Branch code already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== DEPARTMENT CONTROLLERS ====================

const getDepartments = async (req, res) => {
  try {
    const result = await query('SELECT * FROM departments ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, code } = req.body;
    
    // First check if department with this code already exists
    const existingDept = await query(
      'SELECT id, code FROM departments WHERE code = $1',
      [code]
    );
    
    if (existingDept.rows.length > 0) {
      return res.status(400).json({ 
        error: `Department code "${code}" already exists. Please use a different code.`,
        existingCode: code
      });
    }
    
    const result = await query(
      'INSERT INTO departments (name, code, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name, code, req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create department error:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({ 
        error: `Department code "${code}" already exists. Please use a different code.`
      });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== PRODUCT CONTROLLERS ====================

const getProducts = async (req, res) => {
  try {
    const result = await query('SELECT * FROM products ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name } = req.body;
    
    const result = await query(
      'INSERT INTO products (name, created_by) VALUES ($1, $2) RETURNING *',
      [name, req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== BOX CONTROLLERS ====================

const getBoxes = async (req, res) => {
  try {
    const result = await query(`
      SELECT b.*, br.name as branch_name 
      FROM boxes b
      LEFT JOIN branches br ON b.branch_code = br.code
      ORDER BY b.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get boxes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createBox = async (req, res) => {
  try {
    const { branchCode, fileType } = req.body;
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Get sequence number
    const seqResult = await query(
      'SELECT COUNT(*) FROM boxes WHERE branch_code = $1 AND year = $2',
      [branchCode, year]
    );
    const sequenceNumber = parseInt(seqResult.rows[0].count) + 1;
    const formattedSequence = sequenceNumber.toString().padStart(4, '0');
    
    const identifier = `AIC/${branchCode}/${formattedSequence}/${year}`;
    
    const result = await query(
      `INSERT INTO boxes (identifier, file_type, branch_code, sequence_number, year, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [identifier, fileType, branchCode, sequenceNumber, year, req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create box error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== CABINET CONTROLLERS ====================

const getCabinets = async (req, res) => {
  try {
    const { branchId } = req.query;
    
    // First, check if the drawer_assignments table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'drawer_assignments'
      ) as exists
    `);
    
    const hasDrawerAssignments = tableCheck.rows[0].exists;
    
    let queryText;
    let queryParams = [];
    
    if (hasDrawerAssignments) {
      // Use JOIN with drawer_assignments if table exists
      queryText = `
        SELECT c.*, 
               b.name as branch_name,
               json_agg(
                 DISTINCT jsonb_build_object(
                   'drawer', cd.drawer_number,
                   'branchId', cd.branch_id,
                   'branchName', br.name,
                   'branchCode', br.code
                 )
               ) FILTER (WHERE cd.drawer_number IS NOT NULL) as drawer_assignments
        FROM cabinets c
        LEFT JOIN branches b ON c.branch_id = b.id
        LEFT JOIN drawer_assignments cd ON c.id = cd.cabinet_id AND cd.ended_at IS NULL
        LEFT JOIN branches br ON cd.branch_id = br.id
      `;
      
      if (branchId) {
        queryText += ` WHERE c.branch_id = $1 OR cd.branch_id = $1`;
        queryParams.push(branchId);
      }
      
      queryText += ` GROUP BY c.id, b.name ORDER BY c.number`;
    } else {
      // Fallback to basic query without assignments
      queryText = `
        SELECT c.*, b.name as branch_name
        FROM cabinets c
        LEFT JOIN branches b ON c.branch_id = b.id
      `;
      
      if (branchId) {
        queryText += ` WHERE c.branch_id = $1`;
        queryParams.push(branchId);
      }
      
      queryText += ` ORDER BY c.number`;
    }
    
    const result = await query(queryText, queryParams);
    
    // Format the response
    const cabinets = result.rows.map(cabinet => ({
      ...cabinet,
      drawer_assignments: cabinet.drawer_assignments || []
    }));
    
    res.json(cabinets);
  } catch (error) {
    console.error('Get cabinets error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
const createCabinet = async (req, res) => {
  try {
    const { number, drawers } = req.body;
    
    const result = await query(
      'INSERT INTO cabinets (number, drawers, created_by) VALUES ($1, $2, $3) RETURNING *',
      [number, drawers, req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create cabinet error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Cabinet number already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== DRAWER ASSIGNMENT CONTROLLERS ====================

const assignDrawer = async (req, res) => {
  try {
    const { cabinetId, branchId, drawerNumber } = req.body;
    
    // First, ensure the drawer_assignments table exists
    await query(`
      CREATE TABLE IF NOT EXISTS drawer_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cabinet_id UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
        drawer_number VARCHAR(10) NOT NULL,
        branch_id UUID NOT NULL REFERENCES branches(id),
        assigned_by UUID REFERENCES users(id),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check if drawer exists in cabinet
    const cabinetCheck = await query(
      'SELECT drawers FROM cabinets WHERE id = $1',
      [cabinetId]
    );
    
    if (cabinetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cabinet not found' });
    }
    
    const drawers = cabinetCheck.rows[0].drawers;
    if (!drawers.includes(drawerNumber)) {
      return res.status(400).json({ error: 'Drawer number does not exist in this cabinet' });
    }
    
    // End any existing active assignment for this drawer
    await query(
      `UPDATE drawer_assignments 
       SET ended_at = CURRENT_TIMESTAMP 
       WHERE cabinet_id = $1 
       AND drawer_number = $2 
       AND ended_at IS NULL`,
      [cabinetId, drawerNumber]
    );
    
    // Create new assignment
    const result = await query(
      `INSERT INTO drawer_assignments (cabinet_id, drawer_number, branch_id, assigned_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [cabinetId, drawerNumber, branchId, req.user.id]
    );
    
    // Update cabinet's branch_id if not set
    await query(
      'UPDATE cabinets SET branch_id = COALESCE(branch_id, $1) WHERE id = $2 AND branch_id IS NULL',
      [branchId, cabinetId]
    );
    
    res.json({ 
      message: 'Drawer assigned successfully',
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('Assign drawer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getDrawerAssignments = async (req, res) => {
  try {
    const result = await query(`
      SELECT cd.*, 
             c.number as cabinet_number,
             b.name as branch_name,
             b.code as branch_code
      FROM drawer_assignments cd
      JOIN cabinets c ON cd.cabinet_id = c.id
      JOIN branches b ON cd.branch_id = b.id
      ORDER BY c.number, cd.drawer_number
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get drawer assignments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== BOX ASSIGNMENT CONTROLLERS ====================

const assignBox = async (req, res) => {
  try {
    const { boxId, cabinetId, drawerNumber } = req.body;
    
    const result = await query(
      'UPDATE boxes SET cabinet_id = $1, drawer_number = $2 WHERE id = $3 RETURNING *',
      [cabinetId, drawerNumber, boxId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Box not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Assign box error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  // Branches
  getBranches,
  createBranch,
  
  // Departments
  getDepartments,
  createDepartment,
  
  // Products
  getProducts,
  createProduct,
  
  // Boxes
  getBoxes,
  createBox,
  
  // Cabinets
  getCabinets,
  createCabinet,
  
  // Drawer Assignments
  assignDrawer,
  getDrawerAssignments,
  
  // Box Assignments
  assignBox
};