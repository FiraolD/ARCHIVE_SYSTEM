const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { isAllowedOrigin } = require('./config/cors');


const { query } = require('./config/database');
const { authenticate } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const registrationRoutes = require('./routes/registration');
const requestRoutes = require('./routes/requests');
const auditRoutes = require('./routes/audit');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin'); // Import the admin routes









const app = express();

app.use(compression());
app.use(cors({
  origin: isAllowedOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));



// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Only trust a known number of reverse proxies; direct LAN access trusts none.
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
}
app.set('trust proxy', trustProxyHops);

// Global limiter: general API traffic
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
}));

// Strict limiter for authentication endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many attempts, please try again later' }
});

app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
// Uploaded files are only accessible to authenticated users
app.use('/uploads', authenticate, express.static(path.join(__dirname, '../uploads')));

// Routes - MAKE SURE ALL THESE ARE HERE
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/documents', authenticate, documentRoutes);
app.use('/api/registration', authenticate, registrationRoutes);  // This was missing
app.use('/api/requests', requestRoutes);
app.use('/api/audit', authenticate, auditRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);  // This was missing
app.use('/api/users', authenticate, userRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/reports', authenticate, reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/boxes', require('./routes/boxes'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await query('SELECT 1 as connected');
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: { connected: true }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'ERROR',
      database: { connected: false }
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;