const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { DEFAULT_PASSWORD } = require('../utils/passwords');

class User {
  static async create(userData) {
    const { name, email, role, avatar } = userData;
    
    // Whitelist role - never trust client-supplied values
    const VALID_ROLES = ['Admin', 'File Clerk', 'Agent', 'Viewer'];
    const safeRole = VALID_ROLES.includes(role) ? role : 'Agent';
    
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, avatar, must_change_password)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, name, email, role, avatar, created_at`,
      [name, email, hashedPassword, safeRole, avatar]
    );
    
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      'SELECT id, name, email, role, avatar, created_at, last_login FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async updateLastLogin(id) {
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }

  generateAuthToken(user) {
    return jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
  }

  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password_hash);
  }
}

module.exports = User;