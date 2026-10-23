// server.js
require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const notificationService = require('./src/services/notificationService');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

// Authenticate Socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// Handle connections
io.on('connection', (socket) => {
  // Join a private room for this user
  socket.join(`user_${socket.user.id}`);
  console.log(`🔌 User connected: ${socket.user.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.user.id}`);
  });
});

// Pass IO to the notification service
notificationService.setIo(io);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});