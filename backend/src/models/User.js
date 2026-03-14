const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class User {
  static async create(userData) {
    const { name, email, password, role = 'Agent', avatar } = userData;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, avatar)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, avatar, created_at`,
      [name, email, hashedPassword, role, avatar]
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