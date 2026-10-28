/**
 * Create health-check handlers with an injectable database query function.
 * Liveness answers whether the HTTP process is responsive.
 * Readiness answers whether the service can currently reach its database.
 */
function createHealthChecks({ query, now = () => new Date() }) {
  if (typeof query !== 'function') {
    throw new TypeError('createHealthChecks requires a query function');
  }

  const liveness = (_req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: now().toISOString(),
    });
  };

  const readiness = async (_req, res) => {
    try {
      await query('SELECT 1 as connected');
      return res.status(200).json({
        status: 'OK',
        timestamp: now().toISOString(),
        database: { connected: true },
      });
    } catch (_error) {
      // Do not expose database hostnames, credentials, or driver errors.
      return res.status(503).json({
        status: 'ERROR',
        timestamp: now().toISOString(),
        database: { connected: false },
      });
    }
  };

  return { liveness, readiness };
}

module.exports = { createHealthChecks };
