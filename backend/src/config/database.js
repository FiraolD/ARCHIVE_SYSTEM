const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};



// Test connection immediately
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Please check:');
    console.error('   1. PostgreSQL service is running');
    console.error('   2. Database credentials in .env file');
    console.error('   3. Database "' + process.env.DB_NAME + '" exists');
    console.error('   4. Network/firewall settings');
  } else {
    console.log('✅ Database connected successfully');
    console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   User: ${process.env.DB_USER}`);
    release();
  }
});

pool.on('connect', () => {
  console.log('🔄 New database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};