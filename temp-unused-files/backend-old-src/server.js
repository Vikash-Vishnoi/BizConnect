require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const rateLimit = require('express-rate-limit');

// Utilities
const { validateEnv, validateProductionEnv } = require('./utils/helpers/envValidator');
const logger = require('./utils/helpers/logger');

// Validate environment
try {
  validateEnv();
  validateProductionEnv();
  console.log('✅ Environment variables validated successfully\n');
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  process.exit(1);
}

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Socket.io configuration
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

// ==================================================
// MIDDLEWARE CONFIGURATION
// ==================================================

// Security & Parsing
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging & monitoring
const { requestLogger, errorLogger, performanceMonitor, requestCounter } = require('./api/middlewares/requestLogger');
app.use(requestLogger);
app.use(performanceMonitor);
app.use(requestCounter);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Audit logging
const { auditLogger } = require('./api/middlewares/auditLogger');
app.use(auditLogger);

// ==================================================
// START BACKGROUND JOBS
// ==================================================

const { startScheduledMessageProcessor } = require('./jobs/scheduledMessageProcessor');
const { startScheduledCampaignProcessor } = require('./jobs/scheduledCampaignProcessor');

startScheduledMessageProcessor();
startScheduledCampaignProcessor();

// ==================================================
// DATABASE CONNECTION
// ==================================================

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
    });
    
    logger.info('MongoDB connected', { host: conn.connection.host });
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
    
  } catch (error) {
    logger.error('Error connecting to MongoDB', { error: error.message });
    process.exit(1);
  }
};

connectDB();

// ==================================================
// API ROUTES
// ==================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes - Domain-based organization
app.use('/api/auth', require('./api/routes/auth'));
app.use('/api/business', require('./api/routes/business'));
app.use('/api/campaigns', require('./api/routes/campaigns'));
app.use('/api/contacts', require('./api/routes/contacts'));
app.use('/api/messages', require('./api/routes/messages'));
app.use('/api/analytics', require('./api/routes/analytics'));
app.use('/api/webhooks', require('./api/routes/webhooks'));
app.use('/api/settings', require('./api/routes/settings'));
app.use('/api/media', require('./api/routes/media'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use(errorLogger);
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================================================
// START SERVER
// ==================================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('\n==================================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('\n📋 Configuration:');
  console.log(`   MongoDB: ${process.env.MONGODB_URI ? '[CONFIGURED]' : '[MISSING]'}`);
  console.log(`   JWT: ${process.env.JWT_SECRET ? '[CONFIGURED]' : '[MISSING]'}`);
  console.log(`   WhatsApp API: ${process.env.WHATSAPP_ACCESS_TOKEN ? '✅ Configured' : '⚠️  Not configured'}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8081'}`);
  console.log('==================================================\n');
});

// Start recurring jobs
const { startQualityRatingTracker } = require('./jobs/qualityRatingTracker');
const { startTemplateSync } = require('./jobs/templateStatusSync');
const { scheduleAnalyticsArchival } = require('./jobs/analyticsArchival');
const { scheduleLogCleanup } = require('./jobs/logCleanup');

startQualityRatingTracker();
startTemplateSync();
scheduleAnalyticsArchival();
scheduleLogCleanup();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = app;
