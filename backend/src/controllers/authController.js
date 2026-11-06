const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const User = require('../models/User');
const { DEFAULT_PASSWORD } = require('../utils/passwords');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let mustChangePassword = Boolean(user.must_change_password);
    if (!mustChangePassword) {
      mustChangePassword = await bcrypt.compare(DEFAULT_PASSWORD, user.password_hash);
    }
    if (mustChangePassword && !user.must_change_password) {
      await query('UPDATE users SET must_change_password = TRUE WHERE id = $1', [user.id]);
    }

    await User.updateLastLogin(user.id);
    
    const token = new User().generateAuthToken(user);

    const { password_hash, ...userWithoutPassword } = user;
    userWithoutPassword.must_change_password = mustChangePassword;

    res.json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    if (newPassword === DEFAULT_PASSWORD) {
      return res.status(400).json({ error: 'Choose a password different from the default password' });
    }

    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!req.user.must_change_password) {
      const currentPasswordMatches = typeof currentPassword === 'string'
        && await bcrypt.compare(currentPassword, result.rows[0].password_hash);
      if (!currentPasswordMatches) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query(
      'UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Unable to change password' });
  }
};

const getProfile = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  login,
  changePassword,
  getProfile
};