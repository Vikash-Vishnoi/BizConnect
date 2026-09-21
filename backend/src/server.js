require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const rateLimit = require('express-rate-limit');

// Configuration
const config = require('./config/server.config');
const logger = require('./common/helpers/logger');

// Utilities and validators
const { validateEnv, validateProductionEnv } = require('./common/helpers/envValidator');

// Database
const { connectDB, closeDB } = require('./core/database/connection');

// Jobs
const { initializeJobs, stopJobs } = require('./core/jobs/jobInitializer');

// Middlewares
const { 
  errorHandler, 
  notFoundHandler, 
  handleUnhandledRejection, 
  handleUncaughtException 
} = require('./core/middlewares/errorHandler');
const responseFormatter = require('./core/middlewares/responseFormatter');
const { requestLogger, errorLogger, performanceMonitor, requestCounter } = require('./core/middlewares/requestLogger');
const { auditLogger } = require('./core/middlewares/auditLogger');
const { extractBusinessContext, validateBusinessAccess } = require('./core/middlewares/businessContext');

// ==================================================
// ENVIRONMENT VALIDATION
// ==================================================

try {
  validateEnv();
  validateProductionEnv();
  logger.info('Environment variables validated successfully');
} catch (error) {
  logger.error('Environment validation failed', { error: error.message });
  process.exit(1);
}

// ==================================================
// APPLICATION INITIALIZATION
// ==================================================

const app = express();
const server = http.createServer(app);

// Socket.io configuration
const io = socketIo(server, {
  cors: {
    origin: config.socketCorsOrigin,
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

// ==================================================
// MIDDLEWARE CONFIGURATION
// ==================================================

// Security
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Response formatter - Standardize API responses
app.use(responseFormatter);

// Request logging & monitoring
app.use(requestLogger);
app.use(performanceMonitor);
app.use(requestCounter);

// Development logging
if (config.isDevelopment()) {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Audit logging (after rate limiting)
app.use(auditLogger);

// Business context middleware (for multi-business support)
if (config.multiBusinessEnabled) {
  app.use(extractBusinessContext);
  // Business access validation should be applied after auth middleware
  // It's added in the routes that require it
}

// ==================================================
// DATABASE CONNECTION & INITIALIZATION
// ==================================================

connectDB()
  .then(() => {
    logger.info('Database connected - initializing application components');
    
    // Initialize background jobs after successful DB connection
    initializeJobs();
    
    logger.info('Application initialization complete');
  })
  .catch(error => {
    logger.error('Failed to initialize application', { 
      error: error.message,
      stack: error.stack 
    });
    process.exit(1);
  });

// ==================================================
// API ROUTES
// ==================================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: config.apiVersion,
      multiBusinessEnabled: config.multiBusinessEnabled
    }
  });
});

// API Routes - Domain-based organization
const authRoutes = require('./modules/auth/routes');
const businessRoutes = require('./modules/business/routes');
const campaignRoutes = require('./modules/campaigns/routes');
const contactRoutes = require('./modules/contacts/routes');
const messageRoutes = require('./modules/messages/routes');
const conversationRoutes = require('./modules/messages/routes/conversationRoutes');
const templateRoutes = require('./modules/templates/routes');
const analyticsRoutes = require('./modules/analytics/routes');
const webhookRoutes = require('./modules/webhooks/routes');
const mediaRoutes = require('./modules/media/routes');
const configRoutes = require('./modules/config/routes');
const automationRoutes = require('./modules/automations/routes');
const publicRoutes = require('./modules/public/routes/publicRoutes');

// Mount routes
app.use(`${config.apiPrefix}/auth`, authRoutes);
app.use(`${config.apiPrefix}/business`, businessRoutes);
app.use(`${config.apiPrefix}/campaigns`, campaignRoutes);
app.use(`${config.apiPrefix}/scheduled-messages`, campaignRoutes);
app.use(`${config.apiPrefix}/contacts`, contactRoutes);
app.use(`${config.apiPrefix}/messages`, messageRoutes);
app.use(`${config.apiPrefix}/conversations`, conversationRoutes);
app.use(`${config.apiPrefix}/inbox`, conversationRoutes); // Legacy compatibility
app.use(`${config.apiPrefix}/templates`, templateRoutes);
app.use(`${config.apiPrefix}/analytics`, analyticsRoutes);
app.use(`${config.apiPrefix}/webhooks`, webhookRoutes);
app.use(`${config.apiPrefix}/media`, mediaRoutes);
app.use(`${config.apiPrefix}/config`, configRoutes);
app.use(`${config.apiPrefix}/automations`, automationRoutes);
app.use(`${config.apiPrefix}/public`, publicRoutes);

// ==================================================
// ERROR HANDLING
// ==================================================

// 404 handler
app.use(notFoundHandler);

// Error logging & handling
app.use(errorLogger);
app.use(errorHandler);

// ==================================================
// SERVER STARTUP
// ==================================================

server.listen(config.port, () => {
  logger.info('Server started successfully', {
    port: config.port,
    environment: config.nodeEnv,
    apiPrefix: config.apiPrefix,
    apiVersion: config.apiVersion,
    multiBusinessEnabled: config.multiBusinessEnabled,
    frontendUrl: config.frontendUrl,
    mongodb: config.mongodb.uri ? 'CONFIGURED' : 'MISSING',
    cronJobsEnabled: config.cronJobs.enabled
  });
  logger.info('Socket.io server ready', {
    corsOrigin: config.socketCorsOrigin
  });
});

// ==================================================
// GRACEFUL SHUTDOWN
// ==================================================

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  try {
    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });
    
    // Stop background jobs
    stopJobs();
    
    // Close database connection
    await closeDB();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { 
      error: error.message,
      stack: error.stack 
    });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
handleUnhandledRejection();

// Handle uncaught exceptions
handleUncaughtException();

module.exports = app;
