const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();


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








const app = express();

// Get local IP for CORS
const getLocalIP = () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
};


const localIP = getLocalIP();
const frontendURL = process.env.FRONTEND_URL || `http://${localIP}:3009`;

// CORS configuration - Allow multiple origins
const allowedOrigins = [
  'http://localhost:3009',
  'http://127.0.0.1:3009',
  frontendURL,
  // Add any other IPs that might need access
  `http://${localIP}:3009`,
  // Add a pattern for all local network IPs (be careful with this in production)
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:3009$/
];



app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => 
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    )) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));



// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://10.1.12.41:3009',
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes - MAKE SURE ALL THESE ARE HERE
app.use('/api/auth', authRoutes);
app.use('/api/documents', authenticate, documentRoutes);
app.use('/api/registration', authenticate, registrationRoutes);  // This was missing
app.use('/api/requests', requestRoutes);
app.use('/api/audit', authenticate, auditRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);  // This was missing
app.use('/api/users', authenticate, userRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/reports', authenticate, reportsRoutes);

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
    res.status(500).json({ 
      status: 'ERROR',
      database: { connected: false, error: error.message }
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