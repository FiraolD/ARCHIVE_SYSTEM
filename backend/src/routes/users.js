const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { DEFAULT_PASSWORD } = require('../utils/passwords');
const VALID_ROLES = ['Admin', 'File Clerk', 'Agent', 'Viewer'];

const resolveDepartmentName = async (department) => {
  if (department === undefined || department === null || department === '') {
    return { departmentName: null };
  }
  if (typeof department !== 'string') {
    return { error: 'Invalid department' };
  }

  const result = await query(
    `SELECT name
     FROM departments
     WHERE id::text = $1 OR name = $1
     ORDER BY CASE WHEN id::text = $1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [department]
  );
  if (result.rows.length === 0) {
    return { error: 'Selected department does not exist' };
  }

  return { departmentName: result.rows[0].name };
};

// ==================== GET ALL USERS ====================
router.get('/', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        id, name, email, role, avatar, 
        department_name, is_active, must_change_password, 
        created_at, last_login 
       FROM users 
       ORDER BY created_at DESC`
    );
    
    // Format response for frontend
    const users = result.rows.map(user => ({
      ...user,
      // Fallback for UI if branch is not a DB column
      branch_name: user.department_name || 'Awash Head Office',
      username: user.email.split('@')[0]
    }));

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== GET SINGLE USER ====================
router.get('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT 
        id, name, email, role, avatar, 
        department_name, is_active, must_change_password, 
        created_at, last_login 
       FROM users WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== CREATE USER ====================
router.post('/', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { name, email, role, avatar, department } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const safeRole = VALID_ROLES.includes(role) ? role : 'Agent';
    const departmentResult = await resolveDepartmentName(department);
    if (departmentResult.error) {
      return res.status(400).json({ error: departmentResult.error });
    }

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash the default password
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const result = await query(
      `INSERT INTO users (
        name, email, password_hash, role, avatar, 
        department_name, is_active, must_change_password, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, CURRENT_TIMESTAMP)
      RETURNING id, name, email, role, department_name, is_active`,
      [name, email, hashedPassword, safeRole, avatar || null, departmentResult.departmentName]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== RESET PASSWORD ====================
router.patch('/:id/reset-password', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    
    const result = await query(
      `UPDATE users
       SET password_hash = $1, must_change_password = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id`,
      [passwordHash, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'Password reset successfully. The user must change it at next login.' });
  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== UPDATE USER ====================
router.patch('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, department, is_active } = req.body;

    const safeRole = role && VALID_ROLES.includes(role) ? role : undefined;
    const departmentResult = department === undefined
      ? null
      : await resolveDepartmentName(department);
    if (departmentResult?.error) {
      return res.status(400).json({ error: departmentResult.error });
    }

    // Build dynamic query to only update provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (safeRole !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(safeRole);
    }
    if (department !== undefined) {
      updates.push(`department_name = $${paramCount++}`);
      values.push(departmentResult.departmentName);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    values.push(id);
    const queryText = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, name, email, role, department_name, is_active, avatar, created_at, last_login
    `;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already in use by another user' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== DELETE USER ====================
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;