const { pool } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create ENUM types
    await client.query(`
      CREATE TYPE user_role AS ENUM ('Admin', 'Manager', 'Agent', 'Viewer');
      CREATE TYPE file_type AS ENUM ('Claim File', 'Circular', 'Policy', 'Billing', 'Correspondence');
      CREATE TYPE file_status AS ENUM ('Active', 'Checked-out', 'Settled Claims');
      CREATE TYPE request_status AS ENUM ('Pending', 'Approved', 'Returned', 'Overdue');
      CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');
    `).catch(() => console.log('ENUM types already exist'));

    // Create Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role user_role NOT NULL DEFAULT 'Agent',
        avatar TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `);

    // Create Branches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(10) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id)
      );
    `);

    // Create Departments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id)
      );
    `);

    // Create Products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id)
      );
    `);

    // Create Cabinets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cabinets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        number VARCHAR(50) UNIQUE NOT NULL,
        drawers TEXT[] NOT NULL,
        branch_id UUID REFERENCES branches(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id)
      );
    `);

    // Create Boxes table
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
      );
    `);

    // Create Documents table
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
      );
    `);

    // Create Document Versions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by UUID REFERENCES users(id),
        changes TEXT NOT NULL,
        file_path TEXT
      );
    `);

    // Create File Requests table
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Audit Logs table
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
      );
    `);

    // Create Notifications table
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
      );
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_archive_ref ON documents(archive_reference_number);
      CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
      CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
      CREATE INDEX IF NOT EXISTS idx_file_requests_status ON file_requests(status);
      CREATE INDEX IF NOT EXISTS idx_file_requests_dates ON file_requests(request_date, expected_return_date);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
    `);

    // Insert default admin user if not exists
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO users (name, email, password_hash, role, avatar)
      SELECT 'Admin User', 'admin@insurearch.com', $1, 'Admin', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@insurearch.com');
    `, [hashedPassword]);

    // Insert default agent user if not exists
    const agentHashedPassword = await bcrypt.hash('agent123', 10);
    await client.query(`
      INSERT INTO users (name, email, password_hash, role, avatar)
      SELECT 'Agent User', 'agent@insurearch.com', $1, 'Agent', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'agent@insurearch.com');
    `, [agentHashedPassword]);

    // Insert sample branches if none exist
    const branchCount = await client.query('SELECT COUNT(*) FROM branches');
    if (parseInt(branchCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO branches (name, code) VALUES
        ('Lagos Main', 'LGS'),
        ('Abuja Office', 'ABJ'),
        ('Port Harcourt', 'PHC'),
        ('Bole', 'BOL');
      `);
    }

    // Insert sample departments if none exist
    const deptCount = await client.query('SELECT COUNT(*) FROM departments');
    if (parseInt(deptCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO departments (name, code) VALUES
        ('Claims', 'CLM-DEPT'),
        ('Underwriting', 'UND-DEPT'),
        ('Admin', 'ADM-DEPT');
      `);
    }

    // Insert sample products if none exist
    const productCount = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(productCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO products (name) VALUES
        ('Auto Gold Plan'),
        ('Life Cover Plus'),
        ('Health Insurance Plan A');
      `);
    }

    await client.query('COMMIT');
    console.log('Database setup completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up database:', error);
  } finally {
    client.release();
    pool.end();
  }



  -- Check if columns exist and add them if they don't
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'file_requests' AND column_name = 'policy_number') THEN
        ALTER TABLE file_requests ADD COLUMN policy_number VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'file_requests' AND column_name = 'claim_number') THEN
        ALTER TABLE file_requests ADD COLUMN claim_number VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'file_requests' AND column_name = 'insured_name') THEN
        ALTER TABLE file_requests ADD COLUMN insured_name VARCHAR(255);
    END IF;
END $$;
}

setupDatabase();