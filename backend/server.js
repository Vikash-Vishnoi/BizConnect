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

// ✅ FEATURE 36: Audit logging middleware
const { auditLogger } = require('./middleware/auditLogger');
app.use(auditLogger);

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

// Ensure required directories exist
const fs = require('fs');
const path = require('path');

const ensureDirectories = () => {
  const directories = ['exports', 'uploads', 'logs'];
  directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Created ${dir}/ directory`);
    }
  });
};

ensureDirectories();

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
app.use('/api/business', require('./routes/business')); // ✅ MULTI-BUSINESS: Business management
app.use('/api/profile', require('./routes/profile')); // ✅ NEW: Comprehensive profile management
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/automations', require('./routes/automations'));
app.use('/api/alerts', require('./routes/alerts')); // ✅ NEW: Account alerts management
app.use('/api/media', require('./routes/media')); // ✅ NEW: Media management
app.use('/api/export', require('./routes/export')); // ✅ NEW: Chat export
app.use('/api/database', require('./routes/database')); // ✅ NEW: Database optimization
app.use('/api/reactions', require('./routes/reactions')); // ✅ NEW: Message reactions
app.use('/api/forward', require('./routes/forward')); // ✅ NEW: Message forwarding
app.use('/api/bulk', require('./routes/bulk')); // ✅ NEW: Bulk operations
app.use('/api/tags', require('./routes/tags')); // ✅ NEW: Contact tags
app.use('/api/search', require('./routes/search')); // ✅ NEW: Message search
app.use('/api/saved-replies', require('./routes/savedReplies')); // ✅ NEW: Saved replies/canned responses
app.use('/api/rate-limits', require('./routes/rateLimits'));
app.use('/api/contacts', require('./routes/contacts')); // ✅ NEW: Contact history and changes
app.use('/api/message-errors', require('./routes/messageErrors')); // ✅ NEW: Message error tracking
app.use('/api/template-analytics', require('./routes/templateAnalytics')); // ✅ NEW: Template performance analytics
app.use('/api/opt-in', require('./routes/optIn')); // ✅ NEW: Opt-in consent management
app.use('/api/business-location', require('./routes/businessLocation')); // ✅ NEW: Business location management
app.use('/api/view-once', require('./routes/viewOnce')); // ✅ FEATURE 26: View-once media
app.use('/api/status', require('./routes/status')); // ✅ FEATURE 27: Status/story updates
app.use('/api/phone-health', require('./routes/phoneHealth')); // ✅ FEATURE 28: Phone number health monitoring
app.use('/api/rbac', require('./routes/rbac')); // ✅ FEATURE 30: Advanced RBAC (roles & permissions)
app.use('/api/flows', require('./routes/flows')); // ✅ FEATURE 32: WhatsApp Flows (interactive forms)
app.use('/api/audit-logs', require('./routes/auditLogs')); // ✅ FEATURE 36: Audit logs for compliance
app.use('/api/gdpr', require('./routes/gdpr')); // ✅ FEATURE 37: GDPR Tools (data export & deletion)

// ✅ UNIFIED INBOX ROUTE (Replaces /conversations, /messages, and old /inbox)
// This route handles all conversation and message operations with embedded messages
app.use('/api/inbox', require('./routes/inbox'));

// Debug endpoint - Check Socket.io connections
app.get('/api/debug/sockets', (req, res) => {
  const rooms = [];
  const sockets = io.sockets.sockets;
  
  // Get all rooms and their socket IDs
  io.of('/').adapter.rooms.forEach((socketIds, roomName) => {
    // Skip socket IDs (they create rooms with their own ID)
    if (!socketIds.has(roomName)) {
      rooms.push({
        room: roomName,
        socketIds: Array.from(socketIds)
      });
    }
  });

  res.json({
    totalConnections: sockets.size,
    rooms: rooms,
    socketIds: Array.from(sockets.keys())
  });
});

// ❌ OLD ROUTES REMOVED (Replaced by unified inbox):
// app.use('/api/conversations', require('./routes/conversations'));
// app.use('/api/messages', require('./routes/messages'));
// app.use('/api/inbox', require('./routes/inbox'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'WhatsApp Marketing API',
    version: '2.1.0',
    note: 'Using unified conversation model with embedded messages',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      profile: '/api/profile (NEW - User & WhatsApp Business Profile)',
      campaigns: '/api/campaigns',
      templates: '/api/templates',
      inbox: '/api/inbox (unified - includes conversations & messages)',
      analytics: '/api/analytics',
      webhooks: '/api/webhooks',
      settings: '/api/settings',
      automations: '/api/automations'
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

// Start cron jobs
const { startQualityRatingTracker } = require('./jobs/qualityRatingTracker');
const phoneHealthCheckService = require('./services/phoneHealthCheckService');

// Make io globally accessible for jobs
global.io = io;

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start cron jobs after server is ready
  startQualityRatingTracker();
  phoneHealthCheckService.start(); // ✅ FEATURE 28: Phone health monitoring
});

// Graceful shutdown
const { stopQualityRatingTracker } = require('./jobs/qualityRatingTracker');

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  stopQualityRatingTracker(); // Stop cron jobs
  phoneHealthCheckService.stop(); // Stop health check service
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, io };
