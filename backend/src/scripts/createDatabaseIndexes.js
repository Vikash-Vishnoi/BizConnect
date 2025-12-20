/**
 * Database Performance Optimization Script
 * Creates indexes for frequently queried fields
 * Run this once on production database after deployment
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { ERROR_CODES } = require('../common/constants');
const logger = require('../common/helpers/logger');

// ============================================================================
// CONSTANTS
// ============================================================================

// Environment Variables
const MONGODB_URI = process.env.MONGODB_URI;
const AUDIT_LOG_TTL_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90;

// Connection Configuration
const CONNECTION_TIMEOUT_MS = 30000;
const SOCKET_TIMEOUT_MS = 45000;

// Index Error Codes
const INDEX_ERROR_CODES = {
  INDEX_OPTIONS_CONFLICT: 85,
  INDEX_KEY_SPECS_CONFLICT: 86,
};

// Index Error Code Names
const INDEX_ERROR_CODE_NAMES = {
  INDEX_OPTIONS_CONFLICT: 'IndexOptionsConflict',
  INDEX_KEY_SPECS_CONFLICT: 'IndexKeySpecsConflict',
};

// Collection Names
const COLLECTION_NAMES = {
  USERS: 'users',
  BUSINESSES: 'businesses',
  CONVERSATIONS: 'conversations',
  CAMPAIGNS: 'campaigns',
  TEMPLATES: 'templates',
  FLOWS: 'flows',
  AUDIT_LOGS: 'auditlogs',
  ANALYTICS: 'analytics',
};

// Time Conversion Constants
const TIME_CONVERSION = {
  HOURS_PER_DAY: 24,
  MINUTES_PER_HOUR: 60,
  SECONDS_PER_MINUTE: 60,
};

// Script Messages
const MESSAGES = {
  SCRIPT_START: 'Database index creation script started',
  CONNECTING: 'Connecting to MongoDB',
  CONNECTED: 'Connected to database',
  PROCESSING_COLLECTION: 'Processing collection',
  INDEX_CREATED: 'Created index',
  INDEX_EXISTS: 'Index already exists',
  INDEX_ERROR: 'Error creating index',
  VERIFYING_INDEXES: 'Verifying indexes',
  SCRIPT_COMPLETE: 'Database optimization complete',
  CONNECTION_CLOSED: 'Database connection closed',
  SCRIPT_FAILED: 'Script execution failed',
  ENV_MISSING: 'MONGODB_URI environment variable is required',
};

// Exit Codes
const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
};

// Validation
if (!MONGODB_URI) {
  logger.error(MESSAGES.ENV_MISSING);
  process.exit(EXIT_CODES.ERROR);
}

// Calculate TTL in seconds for audit logs
const AUDIT_LOG_TTL_SECONDS = AUDIT_LOG_TTL_DAYS * TIME_CONVERSION.HOURS_PER_DAY * TIME_CONVERSION.MINUTES_PER_HOUR * TIME_CONVERSION.SECONDS_PER_MINUTE;

// ============================================================================
// INDEX DEFINITIONS
// ============================================================================

const indexes = [
  // User Model Indexes
  {
    collection: COLLECTION_NAMES.USERS,
    indexes: [
      { keys: { email: 1 }, options: { unique: true } },
      { keys: { userType: 1 }, options: {} },
      { keys: { businessId: 1 }, options: {} },
      { keys: { userType: 1, businessId: 1 }, options: {} },
      { keys: { createdAt: -1 }, options: {} }
    ]
  },
  
  // Business Model Indexes
  {
    collection: COLLECTION_NAMES.BUSINESSES,
    indexes: [
      { keys: { businessPhoneNumberId: 1 }, options: { unique: true, sparse: true } },
      { keys: { status: 1 }, options: {} },
      { keys: { createdAt: -1 }, options: {} }
    ]
  },
  
  // Conversation Model Indexes
  {
    collection: COLLECTION_NAMES.CONVERSATIONS,
    indexes: [
      { keys: { businessId: 1, lastMessageAt: -1 }, options: {} },
      { keys: { businessId: 1, status: 1, lastMessageAt: -1 }, options: {} },
      { keys: { 'contact.phoneNumber': 1, businessId: 1 }, options: {} },
      { keys: { userId: 1, lastMessageAt: -1 }, options: {} },
      { keys: { unreadCount: 1, businessId: 1 }, options: {} }
    ]
  },
  
  // Campaign Model Indexes
  {
    collection: COLLECTION_NAMES.CAMPAIGNS,
    indexes: [
      { keys: { businessId: 1, createdAt: -1 }, options: {} },
      { keys: { businessId: 1, status: 1 }, options: {} },
      { keys: { status: 1, scheduledAt: 1 }, options: {} },
      { keys: { createdAt: -1 }, options: {} }
    ]
  },
  
  // Template Model Indexes
  {
    collection: COLLECTION_NAMES.TEMPLATES,
    indexes: [
      { keys: { businessId: 1, status: 1 }, options: {} },
      { keys: { businessId: 1, category: 1 }, options: {} },
      { keys: { name: 1, businessId: 1 }, options: {} },
      { keys: { status: 1 }, options: {} }
    ]
  },
  
  // Flow Model Indexes
  {
    collection: COLLECTION_NAMES.FLOWS,
    indexes: [
      { keys: { businessId: 1, isActive: 1 }, options: {} },
      { keys: { businessId: 1, createdAt: -1 }, options: {} }
    ]
  },
  
  // AuditLog Model Indexes
  {
    collection: COLLECTION_NAMES.AUDIT_LOGS,
    indexes: [
      { keys: { businessId: 1, timestamp: -1 }, options: {} },
      { keys: { userId: 1, timestamp: -1 }, options: {} },
      { keys: { action: 1, timestamp: -1 }, options: {} },
      { keys: { timestamp: -1 }, options: { expireAfterSeconds: AUDIT_LOG_TTL_SECONDS } }
    ]
  },
  
  // Analytics Model Indexes
  {
    collection: COLLECTION_NAMES.ANALYTICS,
    indexes: [
      { keys: { businessId: 1, date: -1 }, options: {} },
      { keys: { businessId: 1, metricType: 1, date: -1 }, options: {} }
    ]
  }
];

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Create database indexes for optimal query performance
 */
async function createIndexes() {
  const startTime = Date.now();
  
  try {
    logger.info(MESSAGES.SCRIPT_START);
    
    // Connect to MongoDB
    logger.info(MESSAGES.CONNECTING);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: CONNECTION_TIMEOUT_MS,
      socketTimeoutMS: SOCKET_TIMEOUT_MS,
    });
    
    const connectionTime = Date.now() - startTime;
    logger.info(MESSAGES.CONNECTED, { connectionTime });
    
    const db = mongoose.connection.db;
    let successCount = 0;
    let errorCount = 0;
    const collectionResults = [];
    
    // Process each collection
    for (const { collection, indexes: collectionIndexes } of indexes) {
      const collectionStartTime = Date.now();
      logger.info(MESSAGES.PROCESSING_COLLECTION, { collection });
      
      const coll = db.collection(collection);
      let collectionSuccessCount = 0;
      let collectionErrorCount = 0;
      
      // Create indexes for this collection
      for (const { keys, options } of collectionIndexes) {
        const indexStartTime = Date.now();
        const indexName = Object.keys(keys).join('_');
        
        try {
          await coll.createIndex(keys, options);
          const indexTime = Date.now() - indexStartTime;
          
          logger.info(MESSAGES.INDEX_CREATED, { 
            collection, 
            indexName, 
            keys: JSON.stringify(keys),
            executionTime: indexTime 
          });
          successCount++;
          collectionSuccessCount++;
        } catch (error) {
          const indexTime = Date.now() - indexStartTime;
          
          // Check if index already exists (not an error)
          if (error.code === INDEX_ERROR_CODES.INDEX_OPTIONS_CONFLICT || 
              error.codeName === INDEX_ERROR_CODE_NAMES.INDEX_OPTIONS_CONFLICT || 
              error.code === INDEX_ERROR_CODES.INDEX_KEY_SPECS_CONFLICT || 
              error.codeName === INDEX_ERROR_CODE_NAMES.INDEX_KEY_SPECS_CONFLICT) {
            logger.info(MESSAGES.INDEX_EXISTS, { 
              collection, 
              indexName,
              executionTime: indexTime 
            });
            successCount++;
            collectionSuccessCount++;
          } else {
            logger.error(MESSAGES.INDEX_ERROR, { 
              collection, 
              indexName, 
              error: error.message,
              errorCode: error.code,
              executionTime: indexTime
            });
            errorCount++;
            collectionErrorCount++;
          }
        }
      }
      
      const collectionTime = Date.now() - collectionStartTime;
      collectionResults.push({
        collection,
        successCount: collectionSuccessCount,
        errorCount: collectionErrorCount,
        executionTime: collectionTime,
      });
    }
    
    // Verify indexes
    logger.info(MESSAGES.VERIFYING_INDEXES);
    const verificationResults = [];
    
    for (const { collection } of indexes) {
      const coll = db.collection(collection);
      const existingIndexes = await coll.indexes();
      verificationResults.push({
        collection,
        indexCount: existingIndexes.length,
      });
      logger.info('Index verification', { 
        collection, 
        indexCount: existingIndexes.length 
      });
    }
    
    // Log summary
    const totalTime = Date.now() - startTime;
    logger.info(MESSAGES.SCRIPT_COMPLETE, {
      successCount,
      errorCount,
      totalCollections: indexes.length,
      totalExecutionTime: totalTime,
      collectionResults,
      verificationResults,
    });
    
    return {
      success: errorCount === 0,
      successCount,
      errorCount,
      executionTime: totalTime,
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error(MESSAGES.SCRIPT_FAILED, { 
      error: error.message, 
      stack: error.stack,
      executionTime,
    });
    throw error;
  } finally {
    // Ensure connection is closed
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info(MESSAGES.CONNECTION_CLOSED);
    }
  }
}

// ============================================================================
// SCRIPT EXECUTION
// ============================================================================

// Execute script if run directly
if (require.main === module) {
  createIndexes()
    .then((result) => {
      process.exit(result.success ? EXIT_CODES.SUCCESS : EXIT_CODES.ERROR);
    })
    .catch((error) => {
      logger.error('Unhandled error in script execution', { 
        error: error.message,
        stack: error.stack,
      });
      process.exit(EXIT_CODES.ERROR);
    });
}

module.exports = { createIndexes };
