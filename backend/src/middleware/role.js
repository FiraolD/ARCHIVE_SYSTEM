// src/middleware/role.js
/**
 * Role-based access control middleware.
 *
 * Usage:
 *   router.get('/', role('Admin'), ctrl.list);            // Admin only
 *   router.post('/', role('Admin', 'Manager'), ctrl.create); // Admin OR Manager
 *
 * Relies on `req.user` being populated by the `auth` middleware that runs
 * earlier in the chain. `req.user.role` must be one of:
 *   'Admin' | 'Manager' | 'Agent' | 'Viewer'
 */

module.exports = (...allowedRoles) => {
  if (allowedRoles.length === 0) {
    throw new Error('role() requires at least one role');
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        actual: req.user.role,
      });
    }

    next();
  };
};