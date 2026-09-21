/**
 * Database Connection Module
 * Handles MongoDB connection with retry logic and health monitoring
 */

const mongoose = require('mongoose');
const logger = require('../../common/helpers/logger');
const config = require('../../config/server.config');

/**
 * Connect to MongoDB with retry logic
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<void>}
 */
const connectDB = async (retryCount = 0) => {
  const { maxRetries, retryDelayMs } = config.dbRetry;
  
  try {
    logger.info('Attempting to connect to MongoDB', { 
      attempt: retryCount + 1, 
      maxRetries 
    });

    const conn = await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: config.mongodb.maxPoolSize,
      minPoolSize: config.mongodb.minPoolSize,
      serverSelectionTimeoutMS: config.mongodb.serverSelectionTimeoutMS,
      socketTimeoutMS: config.mongodb.socketTimeoutMS,
      connectTimeoutMS: config.mongodb.connectTimeoutMS,
      maxIdleTimeMS: config.mongodb.maxIdleTimeMS,
      retryWrites: config.mongodb.retryWrites,
      retryReads: config.mongodb.retryReads,
    });
    
    logger.info('MongoDB connected successfully', { 
      host: conn.connection.host,
      database: conn.connection.name,
      poolSize: conn.connection.config?.maxPoolSize || config.mongodb.maxPoolSize
    });
    
    setupConnectionMonitoring();
    
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { 
      error: error.message,
      stack: error.stack,
      attempt: retryCount + 1,
      maxRetries,
      uri: config.mongodb.uri ? 'configured' : 'missing'
    });
    
    // Retry logic with exponential backoff
    if (retryCount < maxRetries) {
      const delay = retryDelayMs * Math.pow(2, retryCount);
      logger.warn(`Retrying connection in ${delay}ms`, { 
        nextAttempt: retryCount + 2 
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectDB(retryCount + 1);
    }
    
    // Max retries exceeded - critical failure
    logger.error('Could not establish MongoDB connection after maximum retries', {
      totalAttempts: maxRetries + 1,
      error: error.message
    });
    process.exit(1);
  }
};

/**
 * Setup connection health monitoring
 */
const setupConnectionMonitoring = () => {
  // Error monitoring
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { 
      error: err.message,
      stack: err.stack,
      code: err.code 
    });
  });
  
  // Disconnection monitoring
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Mongoose will attempt to reconnect automatically');
  });
  
  // Reconnection monitoring
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully');
  });
  
  // Reconnection failure monitoring
  mongoose.connection.on('reconnectFailed', () => {
    logger.error('MongoDB reconnection failed after multiple attempts');
  });
  
  // Health check interval (every 5 minutes)
  setInterval(() => {
    const poolStats = {
      ready: mongoose.connection.readyState === 1,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
    logger.debug('MongoDB connection health check', poolStats);
  }, 300000);
};

/**
 * Close database connection gracefully
 * @returns {Promise<void>}
 */
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed successfully');
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error: error.message });
    throw error;
  }
};

/**
 * Get connection status
 * @returns {object} Connection status information
 */
const getConnectionStatus = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return {
    status: states[state] || 'unknown',
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    readyState: state
  };
};

module.exports = {
  connectDB,
  closeDB,
  getConnectionStatus
};
