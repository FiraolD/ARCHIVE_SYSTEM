const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * INSUREARCH database setup / migration script.
 *
 * Idempotent: safe to run multiple times.
 * - Creates ENUM types (and adds missing values on existing databases).
 * - Creates all tables used by the application.
 * - Adds columns that later versions of the code rely on.
 * - Seeds a default Admin/Agent user and reference data (only when empty).
 */

async function createEnumTypes(client) {
  // Enum creation cannot share a transaction with ALTER TYPE ADD VALUE,
  // so each statement is executed and guarded individually.
  const enums = [
    { name: 'user_role', values: ['Admin', 'Manager', 'Agent', 'Viewer'] },
    { name: 'file_type', values: ['Claim File', 'Circular', 'Policy', 'Billing', 'Correspondence'] },
    { name: 'file_status', values: ['Active', 'Checked-out', 'Settled Claims', 'Returned'] },
    { name: 'request_status', values: ['Pending', 'Approved', 'Returned', 'Rejected', 'Overdue'] },
    { name: 'notification_type', values: ['info', 'warning', 'error', 'success'] },
  ];

  for (const enumType of enums) {
    try {
      await client.query(`CREATE TYPE ${enumType.name} AS ENUM (${enumType.values.map(v => `'${v}'`).join(', ')})`);
      console.log(`Created ENUM type: ${enumType.name}`);
    } catch (err) {
      if (err.code === '42710') {
        // Type already exists - add any missing values
        for (const value of enumType.values) {
          try {
            await client.query(`ALTER TYPE ${enumType.name} ADD VALUE IF NOT EXISTS '${value}'`);
          } catch (addErr) {
            if (addErr.code !== '42710') throw addErr;
          }
        }
      } else {
        throw err;
      }
    }
  }
}

async function createTables(client) {
  // Users
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role user_role NOT NULL DEFAULT 'Agent',
      avatar TEXT,
      department_name VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    )
  `);

  // Branches
  await client.query(`
    CREATE TABLE IF NOT EXISTS branches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      code VARCHAR(10) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by UUID REFERENCES users(id)
    )
  `);

  // Departments
  await client.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      code VARCHAR(20) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by UUID REFERENCES users(id)
    )
  `);

  // Products
  await client.query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by UUID REFERENCES users(id)
    )
  `);

  // Cabinets
  await client.query(`
    CREATE TABLE IF NOT EXISTS cabinets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      number VARCHAR(50) UNIQUE NOT NULL,
      drawers TEXT[] NOT NULL,
      branch_id UUID REFERENCES branches(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by UUID REFERENCES users(id)
    )
  `);

  // Drawer assignments (drawer -> branch, with history)
  await client.query(`
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

  // Boxes
  await client.query(`
    CREATE TABLE IF NOT EXISTS boxes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      identifier VARCHAR(50) UNIQUE NOT NULL,
      file_type file_type NOT NULL,
      branch_code VARCHAR(10) REFERENCES branches(code),
      sequence_number INTEGER NOT NULL,
      year VARCHAR(2) NOT NULL,
      cabinet_id UUID REFERENCES cabinets(id),
      drawer_number VARCHAR(10),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by UUID REFERENCES users(id)
    )
  `);

  // Documents
  await client.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      archive_reference_number VARCHAR(50) UNIQUE NOT NULL,
      physical_placement TEXT NOT NULL,
      title VARCHAR(255) NOT NULL,
      type file_type NOT NULL,
      status file_status NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      owner_id UUID REFERENCES users(id),
      file_size BIGINT,
      file_path TEXT,

      -- Claim File specific fields
      insured_name VARCHAR(255),
      policy_number VARCHAR(50),
      claim_number VARCHAR(50),
      estimated_loss DECIMAL(15,2),
      branch_id UUID REFERENCES branches(id),
      department_id UUID REFERENCES departments(id),
      product_id UUID REFERENCES products(id),

      -- Circular specific fields
      circular_date DATE,

      -- Common fields
      date_added DATE,
      received_by VARCHAR(100),
      delivered_by VARCHAR(100),
      receiver_remark TEXT,

      -- Location fields
      box_id UUID REFERENCES boxes(id),
      cabinet_id UUID REFERENCES cabinets(id),
      drawer_number VARCHAR(10)
    )
  `);

  // Document version history
  await client.query(`
    CREATE TABLE IF NOT EXISTS document_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by UUID REFERENCES users(id),
      changes TEXT NOT NULL,
      file_path TEXT
    )
  `);

  // File requests (includes denormalized document/requester snapshots used by reports)
  await client.query(`
    CREATE TABLE IF NOT EXISTS file_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id UUID REFERENCES documents(id),
      requested_by UUID REFERENCES users(id),
      request_date DATE NOT NULL,
      expected_return_date DATE NOT NULL,
      actual_return_date DATE,
      status request_status NOT NULL DEFAULT 'Pending',
      notes TEXT,
      request_reference VARCHAR(50),
      rejection_reason TEXT,
      approved_by UUID REFERENCES users(id),
      approved_at TIMESTAMP,
      processed_by UUID REFERENCES users(id),
      processed_at TIMESTAMP,
      policy_number VARCHAR(50),
      claim_number VARCHAR(50),
      insured_name VARCHAR(255),
      requester_department VARCHAR(100),
      requester_department_name VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Audit trail
  await client.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      user_id UUID REFERENCES users(id),
      user_name VARCHAR(100),
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(255) NOT NULL,
      details TEXT,
      ip_address INET,
      user_agent TEXT
    )
  `);

  // Notifications
  await client.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type notification_type NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      read BOOLEAN DEFAULT FALSE,
      user_id UUID REFERENCES users(id),
      related_id UUID,
      admin_only BOOLEAN DEFAULT FALSE
    )
  `);

  // Generated reports archive
  await client.query(`
    CREATE TABLE IF NOT EXISTS generated_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_name VARCHAR(255) NOT NULL,
      report_type VARCHAR(100) NOT NULL,
      file_format VARCHAR(10) NOT NULL,
      file_size VARCHAR(20),
      file_path TEXT,
      report_data JSONB,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function upgradeExistingTables(client) {
  // Columns required by current code, added if a database predates them.
  const columnUpgrades = [
    { table: 'users', column: 'department_name', type: 'VARCHAR(100)' },
    { table: 'file_requests', column: 'request_reference', type: 'VARCHAR(50)' },
    { table: 'file_requests', column: 'rejection_reason', type: 'TEXT' },
    { table: 'file_requests', column: 'approved_by', type: 'UUID REFERENCES users(id)' },
    { table: 'file_requests', column: 'approved_at', type: 'TIMESTAMP' },
    { table: 'file_requests', column: 'processed_by', type: 'UUID REFERENCES users(id)' },
    { table: 'file_requests', column: 'processed_at', type: 'TIMESTAMP' },
    { table: 'file_requests', column: 'policy_number', type: 'VARCHAR(50)' },
    { table: 'file_requests', column: 'claim_number', type: 'VARCHAR(50)' },
    { table: 'file_requests', column: 'insured_name', type: 'VARCHAR(255)' },
    { table: 'file_requests', column: 'requester_department', type: 'VARCHAR(100)' },
    { table: 'file_requests', column: 'requester_department_name', type: 'VARCHAR(100)' },
  ];

  for (const { table, column, type } of columnUpgrades) {
    await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);
  }
}

async function createIndexes(client) {
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_documents_archive_ref ON documents(archive_reference_number);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
    CREATE INDEX IF NOT EXISTS idx_documents_branch ON documents(branch_id);
    CREATE INDEX IF NOT EXISTS idx_file_requests_status ON file_requests(status);
    CREATE INDEX IF NOT EXISTS idx_file_requests_requested_by ON file_requests(requested_by);
    CREATE INDEX IF NOT EXISTS idx_file_requests_dates ON file_requests(request_date, expected_return_date);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
    CREATE INDEX IF NOT EXISTS idx_drawer_assignments_active ON drawer_assignments(cabinet_id) WHERE ended_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_generated_reports_created ON generated_reports(created_at DESC);
  `);
}

async function seedData(client) {
  // Default admin user (CHANGE THIS PASSWORD in production immediately)
  const hashedPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'admin123', 10);
  await client.query(
    `INSERT INTO users (name, email, password_hash, role, avatar)
     SELECT 'Admin User', 'admin@insurearch.com', $1, 'Admin', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'
     WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@insurearch.com')`,
    [hashedPassword]
  );

  // Default agent user
  const agentHashedPassword = await bcrypt.hash(process.env.SEED_AGENT_PASSWORD || 'agent123', 10);
  await client.query(
    `INSERT INTO users (name, email, password_hash, role, avatar)
     SELECT 'Agent User', 'agent@insurearch.com', $1, 'Agent', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'
     WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'agent@insurearch.com')`,
    [agentHashedPassword]
  );

  // Sample branches if none exist
  const branchCount = await client.query('SELECT COUNT(*) FROM branches');
  if (parseInt(branchCount.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO branches (name, code) VALUES
      ('Lagos Main', 'LGS'),
      ('Abuja Office', 'ABJ'),
      ('Port Harcourt', 'PHC'),
      ('Bole', 'BOL')
    `);
  }

  // Sample departments if none exist
  const deptCount = await client.query('SELECT COUNT(*) FROM departments');
  if (parseInt(deptCount.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO departments (name, code) VALUES
      ('Claims', 'CLM-DEPT'),
      ('Underwriting', 'UND-DEPT'),
      ('Admin', 'ADM-DEPT')
    `);
  }

  // Sample products if none exist
  const productCount = await client.query('SELECT COUNT(*) FROM products');
  if (parseInt(productCount.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO products (name) VALUES
      ('Auto Gold Plan'),
      ('Life Cover Plus'),
      ('Health Insurance Plan A')
    `);
  }
}

async function setupDatabase() {
  const client = await pool.connect();

  try {
    // ENUM types first (tables reference them)
    await createEnumTypes(client);

    await client.query('BEGIN');
    await createTables(client);
    await upgradeExistingTables(client);
    await createIndexes(client);
    await seedData(client);
    await client.query('COMMIT');

    console.log('✅ Database setup completed successfully');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // A ROLLBACK failure means we are outside the failed transaction; ignore.
    }
    console.error('❌ Error setting up database:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
