// src/controllers/userController.js
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

const DEFAULT_PASSWORD = 'Insurance123';

// ==================== GET ALL USERS ====================
const getUsers = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, role, department_name, is_active, 
              must_change_password, last_login, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );
    
    // Format the response to match frontend expectations
    const users = result.rows.map(user => ({
      ...user,
      // Assuming branch_name comes from a join if it exists, otherwise fallback
      branch_name: 'Awash Head Office', 
      username: user.email.split('@')[0]
    }));

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
};

// ==================== CREATE USER ====================
const createUser = async (req, res) => {
  try {
    const { name, email, role, department, branch } = req.body;

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    // Hash the default password
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const result = await query(
      `INSERT INTO users (
        name, email, password_hash, role, department_name, is_active, must_change_password, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, name, email, role, department_name, is_active`,
      [name, email, passwordHash, role, department || null, true, true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Email address is already in use' });
    }
    res.status(500).json({ error: 'Server error creating user' });
  }
};

// ==================== UPDATE USER ====================
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, department, branch, is_active } = req.body;

    // Check if updating email to one that already exists
    if (email) {
      const existing = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'A user with this email already exists' });
      }
    }

    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           email = COALESCE($2, email), 
           role = COALESCE($3, role), 
           department_name = COALESCE($4, department_name),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, email, role, department_name, is_active`,
      [name, email, role, department, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error updating user' });
  }
};

// ==================== DELETE USER ====================
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself (optional safety check)
    if (req.user.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error deleting user' });
  }
};

// ==================== RESET PASSWORD ====================
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;

    // Hash the default password
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const result = await query(
      `UPDATE users 
       SET password_hash = $1, must_change_password = TRUE, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email`,
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: `Password reset to default (${DEFAULT_PASSWORD}) for ${result.rows[0].name}` 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error resetting password' });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword
};