const { query, withTransaction } = require('../config/database');

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

// ==================== PRODUCT CUSTOM FIELD CONTROLLERS ====================

const getProductCustomFields = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, product_id, field_key, label, data_type, placeholder, required, display_order
       FROM product_custom_fields
       WHERE product_id = $1 AND active = TRUE
       ORDER BY display_order, label`,
      [req.params.productId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get product custom fields error:', error);
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
    const nextNumberResult = await query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM '^FILEBOX([0-9]+)$') AS INTEGER)), 0) + 1 AS next_number
      FROM cabinets
    `);
    const number = `FILEBOX${nextNumberResult.rows[0].next_number}`;
    const drawers = Array.from({ length: 12 }, (_, index) => String(index + 1));

    const result = await query(
      'INSERT INTO cabinets (number, drawers, created_by) VALUES ($1, $2, $3) RETURNING *',
      [number, drawers, req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create cabinet error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'File Box number already exists. Please try again.' });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== CABINET ASSIGNMENT CONTROLLERS ====================

const assignCabinet = async (req, res) => {
  try {
    const { cabinetId, branchId } = req.body;

    const result = await query(
      'UPDATE cabinets SET branch_id = $1 WHERE id = $2 RETURNING *',
      [branchId, cabinetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cabinet not found' });
    }

    res.json({
      message: 'Cabinet assigned successfully',
      cabinet: result.rows[0]
    });
  } catch (error) {
    console.error('Assign cabinet error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== DRAWER ASSIGNMENT CONTROLLERS ====================

const assignDrawer = async (req, res) => {
  try {
    const { cabinetId, branchId, drawerNumber } = req.body;

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

    // A drawer can be assigned to several branches at the same time. Repeating
    // the same active assignment is intentionally idempotent.
    const result = await withTransaction(async (client) => {
      const existing = await client.query(
        `SELECT id FROM drawer_assignments
         WHERE cabinet_id = $1 AND drawer_number = $2 AND branch_id = $3
           AND ended_at IS NULL
         LIMIT 1`, 
        [cabinetId, drawerNumber, branchId]
      );

      const assignmentResult = existing.rows.length > 0
        ? await client.query(
          `UPDATE drawer_assignments
           SET assigned_by = $1, assigned_at = CURRENT_TIMESTAMP
           WHERE id = $2
           RETURNING *`, 
          [req.user.id, existing.rows[0].id]
        )
        : await client.query(
          `INSERT INTO drawer_assignments (cabinet_id, drawer_number, branch_id, assigned_by)
           VALUES ($1, $2, $3, $4)
           RETURNING *`, 
          [cabinetId, drawerNumber, branchId, req.user.id]
        );

      return assignmentResult;
    });

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
      WHERE cd.ended_at IS NULL
      ORDER BY c.number, cd.drawer_number
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get drawer assignments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getDrawerHistory = async (req, res) => {
  try {
    const { cabinetId, drawerNumber } = req.query;

    if (!cabinetId || !drawerNumber) {
      return res.status(400).json({ error: 'cabinetId and drawerNumber are required' });
    }

    const result = await query(`
      SELECT da.*, 
             c.number as cabinet_number,
             b.name as branch_name,
             b.code as branch_code,
             u.full_name as assigned_by_name
      FROM drawer_assignments da
      JOIN cabinets c ON da.cabinet_id = c.id
      JOIN branches b ON da.branch_id = b.id
      LEFT JOIN users u ON da.assigned_by = u.id
      WHERE da.cabinet_id = $1 AND da.drawer_number = $2
      ORDER BY da.assigned_at DESC
    `, [cabinetId, drawerNumber]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get drawer history error:', error);
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
  getProductCustomFields,
  
  // Boxes
  getBoxes,
  createBox,
  
  // Cabinets
  getCabinets,
  createCabinet,
  assignCabinet,
  
  // Drawer Assignments
  assignDrawer,
  getDrawerAssignments,
  getDrawerHistory,
  
  // Box Assignments
  assignBox
};