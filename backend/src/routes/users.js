const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// Get all users (Admin only)
router.get('/', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, role, avatar, created_at, last_login 
       FROM users ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single user
router.get('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, name, email, role, avatar, created_at, last_login 
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

// Create user (Admin only)
router.post('/', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { name, email, password, role, avatar } = req.body;

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, avatar, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, name, email, role, avatar, created_at`,
      [name, email, hashedPassword, role, avatar]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user (Admin only)
router.patch('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;

    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           role = COALESCE($3, role)
       WHERE id = $4
       RETURNING id, name, email, role, avatar, created_at, last_login`,
      [name, email, role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Don't allow deleting yourself
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