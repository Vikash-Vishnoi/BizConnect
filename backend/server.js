require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);

// Socket.io configuration
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
app.use(morgan('dev')); // HTTP request logger

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('📱 New client connected:', socket.id);
  console.log('   Time:', new Date().toLocaleTimeString());
  console.log('   Transport:', socket.conn.transport.name);

  socket.on('authenticate', (data) => {
    // Store user info with socket
    socket.userId = data.userId;
    socket.join(`user:${data.userId}`);
    console.log(`✅ User authenticated: ${data.userId}`);
    console.log(`   Socket ID: ${socket.id}`);
    console.log(`   Joined room: user:${data.userId}`);
    console.log(`   Time: ${new Date().toLocaleTimeString()}`);
    
    // Get all sockets in the room to verify
    const socketsInRoom = io.sockets.adapter.rooms.get(`user:${data.userId}`);
    console.log(`   Sockets in room user:${data.userId}:`, socketsInRoom ? socketsInRoom.size : 0);
  });

  // Join conversation room
  socket.on('joinConversation', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`💬 Joined conversation: ${conversationId}`);
  });

  // Leave conversation room
  socket.on('leaveConversation', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`👋 Left conversation: ${conversationId}`);
  });

  // Typing indicator
  socket.on('typing', (data) => {
    socket.to(`conversation:${data.conversationId}`).emit('userTyping', {
      userId: socket.userId,
      conversationId: data.conversationId,
      isTyping: data.isTyping
    });
  });

  socket.on('disconnect', () => {
    console.log('📴 Client disconnected:', socket.id);
    if (socket.userId) {
      console.log(`   User: ${socket.userId}`);
    }
    console.log('   Time:', new Date().toLocaleTimeString());
  });
});

// Health check endpoint - Enhanced
app.get('/health', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const mongoStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const health = {
    status: mongoStatus === 1 ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      mongodb: {
        status: mongoStates[mongoStatus],
        connected: mongoStatus === 1
      },
      whatsapp: {
        configured: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
        hasAccessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
        hasPhoneNumber: !!process.env.WHATSAPP_PHONE_NUMBER_ID
      }
    },
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Debug endpoint for socket connections
app.get('/debug/sockets', (req, res) => {
  const sockets = [];
  const rooms = [];
  
  io.sockets.sockets.forEach((socket) => {
    sockets.push({
      id: socket.id,
      userId: socket.userId,
      connected: socket.connected,
      rooms: Array.from(socket.rooms),
    });
  });
  
  io.sockets.adapter.rooms.forEach((value, key) => {
    if (!key.startsWith('/')) { // Skip socket.io internal rooms
      rooms.push({
        name: key,
        size: value.size,
        sockets: Array.from(value),
      });
    }
  });
  
  res.json({
    totalSockets: io.sockets.sockets.size,
    sockets,
    rooms,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/settings', require('./routes/settings'));

// ✅ UNIFIED INBOX ROUTE (Replaces /conversations, /messages, and old /inbox)
// This route handles all conversation and message operations with embedded messages
app.use('/api/inbox', require('./routes/inbox'));

// ❌ OLD ROUTES REMOVED (Replaced by unified inbox):
// app.use('/api/conversations', require('./routes/conversations'));
// app.use('/api/messages', require('./routes/messages'));
// app.use('/api/inbox', require('./routes/inbox'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'WhatsApp Marketing API',
    version: '2.0.0',
    note: 'Using unified conversation model with embedded messages',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      campaigns: '/api/campaigns',
      templates: '/api/templates',
      inbox: '/api/inbox (unified - includes conversations & messages)',
      analytics: '/api/analytics',
      webhooks: '/api/webhooks'
    },
    deprecated: {
      note: 'These routes have been removed and replaced by /api/inbox',
      removed: ['/api/conversations', '/api/messages', '/api/inbox (old)']
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: 'Validation Error', details: errors });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({ error: `Duplicate ${field}` });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, io };
