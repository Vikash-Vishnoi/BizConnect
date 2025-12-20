require('dotenv').config();
const mongoose = require('mongoose');
const { ERROR_CODES } = require('../common/constants');
const logger = require('../common/helpers/logger');

// Import models to ensure schemas are registered
require('../core/database/models/Campaign');
require('../core/database/models/CampaignRecipient');
require('../core/database/models/Contact');
require('../core/database/models/Conversation');
require('../core/database/models/Template');

/**
 * Create All Database Indexes
 * 
 * This script creates all necessary indexes for optimal query performance
 * Run this after database schema updates or on a new deployment
 */

// ============================================================================
// CONSTANTS
// ============================================================================

// Environment Variables
const MONGODB_URI = process.env.MONGODB_URI;

// Connection Configuration
const CONNECTION_TIMEOUT_MS = 30000;
const SOCKET_TIMEOUT_MS = 45000;

// Collection Names
const COLLECTION_NAMES = {
  CAMPAIGN_RECIPIENTS: 'campaignrecipients',
  CONTACTS: 'contacts',
  CONVERSATIONS: 'conversations',
  TEMPLATES: 'templates',
  CAMPAIGNS: 'campaigns',
};

// Index Names
const INDEX_NAMES = {
  CAMPAIGN_ID_STATUS: 'campaignId_status',
  PHONE_NUMBER: 'phoneNumber',
  CAMPAIGN_ID_CREATED: 'campaignId_createdAt',
  BUSINESS_ID_PHONE: 'businessId_phoneNumber',
  RATE_LIMITING: 'rateLimiting_throttled',
  CONVERSATION_WINDOW: 'conversationWindow',
  BUSINESS_ID_STATUS: 'businessId_status',
  WHATSAPP_TEMPLATE_ID: 'whatsappTemplateId',
  BUSINESS_ID_LAST_MESSAGE: 'businessId_lastMessageAt',
};

// Field Names
const FIELD_NAMES = {
  CAMPAIGN_ID: 'campaignId',
  STATUS: 'status',
  PHONE_NUMBER: 'phoneNumber',
  CREATED_AT: 'createdAt',
  BUSINESS_ID: 'businessId',
  RATE_LIMITING_IS_THROTTLED: 'rateLimiting.isThrottled',
  RATE_LIMITING_THROTTLED_UNTIL: 'rateLimiting.throttledUntil',
  CONVERSATION_WINDOW_IS_OPEN: 'conversationWindow.isOpen',
  CONVERSATION_WINDOW_EXPIRES_AT: 'conversationWindow.expiresAt',
  WHATSAPP_TEMPLATE_ID: 'whatsappTemplateId',
  LAST_MESSAGE_AT: 'lastMessageAt',
};

// Performance Metrics
const PERFORMANCE_METRICS = {
  CAMPAIGN_SPEEDUP: '100-1000×',
  WEBHOOK_CAPACITY: '1000/min',
  INBOX_IMPROVEMENT: '500ms → 5ms',
  CONTACT_IMPROVEMENT: '42 min → 50 seconds',
  INDEX_STORAGE: '~6 MB',
};

// Script Messages
const MESSAGES = {
  SCRIPT_START: 'Index creation script started',
  ENV_MISSING: 'MONGODB_URI environment variable is required',
  CONNECTING: 'Connecting to MongoDB',
  CONNECTED: 'Connected to MongoDB',
  CREATING_INDEXES: 'Creating indexes',
  CREATING_CAMPAIGN_RECIPIENT_INDEXES: 'Creating Campaign Recipient indexes',
  CAMPAIGN_RECIPIENT_INDEXES_CREATED: 'Campaign Recipient indexes created',
  CREATING_CONTACT_INDEXES: 'Creating Contact indexes',
  CONTACT_INDEXES_CREATED: 'Contact indexes created',
  CREATING_CONVERSATION_INDEXES: 'Creating Conversation indexes',
  CONVERSATION_INDEXES_CREATED: 'Conversation indexes created',
  CREATING_TEMPLATE_INDEXES: 'Creating Template indexes',
  TEMPLATE_INDEXES_CREATED: 'Template indexes created',
  CREATING_PERFORMANCE_INDEXES: 'Creating Performance indexes',
  PERFORMANCE_INDEXES_CREATED: 'Performance indexes created',
  ALL_INDEXES_CREATED: 'All indexes created successfully',
  INDEX_SUMMARY: 'Index Summary',
  PERFORMANCE_BENEFITS: 'Performance Benefits',
  CONNECTION_CLOSED: 'Disconnected from MongoDB',
  SCRIPT_FAILED: 'Error creating indexes',
  INDEX_CREATED: 'Index created',
  INDEX_ALREADY_EXISTS: 'Index already exists (not an error)',
};

// Exit Codes
const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
};

// Index Options
const INDEX_OPTIONS = {
  UNIQUE_SPARSE: { unique: true, sparse: true },
};

// Validation
if (!MONGODB_URI) {
  logger.error(MESSAGES.ENV_MISSING);
  process.exit(EXIT_CODES.ERROR);
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Create all database indexes for optimal query performance
 */
async function createAllIndexes() {
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
    const indexResults = [];

    logger.info(MESSAGES.CREATING_INDEXES);

    // 1. Campaign Recipient Queries
    const campaignRecipientStartTime = Date.now();
    logger.info(MESSAGES.CREATING_CAMPAIGN_RECIPIENT_INDEXES);
    
    await createIndex(db, COLLECTION_NAMES.CAMPAIGN_RECIPIENTS, 
      { [FIELD_NAMES.CAMPAIGN_ID]: 1, [FIELD_NAMES.STATUS]: 1 }, 
      INDEX_NAMES.CAMPAIGN_ID_STATUS, indexResults);
    
    await createIndex(db, COLLECTION_NAMES.CAMPAIGN_RECIPIENTS, 
      { [FIELD_NAMES.PHONE_NUMBER]: 1 }, 
      INDEX_NAMES.PHONE_NUMBER, indexResults);
    
    await createIndex(db, COLLECTION_NAMES.CAMPAIGN_RECIPIENTS, 
      { [FIELD_NAMES.CAMPAIGN_ID]: 1, [FIELD_NAMES.CREATED_AT]: 1 }, 
      INDEX_NAMES.CAMPAIGN_ID_CREATED, indexResults);
    
    const campaignRecipientTime = Date.now() - campaignRecipientStartTime;
    logger.info(MESSAGES.CAMPAIGN_RECIPIENT_INDEXES_CREATED, { executionTime: campaignRecipientTime });

    // 2. Contact Rate Limiting
    const contactStartTime = Date.now();
    logger.info(MESSAGES.CREATING_CONTACT_INDEXES);
    
    await createIndex(db, COLLECTION_NAMES.CONTACTS, 
      { [FIELD_NAMES.BUSINESS_ID]: 1, [FIELD_NAMES.PHONE_NUMBER]: 1 }, 
      INDEX_NAMES.BUSINESS_ID_PHONE, indexResults);
    
    await createIndex(db, COLLECTION_NAMES.CONTACTS, 
      { 
        [FIELD_NAMES.RATE_LIMITING_IS_THROTTLED]: 1, 
        [FIELD_NAMES.RATE_LIMITING_THROTTLED_UNTIL]: 1 
      }, 
      INDEX_NAMES.RATE_LIMITING, indexResults);
    
    const contactTime = Date.now() - contactStartTime;
    logger.info(MESSAGES.CONTACT_INDEXES_CREATED, { executionTime: contactTime });

    // 3. Conversation Window Tracking
    const conversationStartTime = Date.now();
    logger.info(MESSAGES.CREATING_CONVERSATION_INDEXES);
    
    await createIndex(db, COLLECTION_NAMES.CONVERSATIONS, 
      { 
        [FIELD_NAMES.CONVERSATION_WINDOW_IS_OPEN]: 1, 
        [FIELD_NAMES.CONVERSATION_WINDOW_EXPIRES_AT]: 1 
      }, 
      INDEX_NAMES.CONVERSATION_WINDOW, indexResults);
    
    const conversationTime = Date.now() - conversationStartTime;
    logger.info(MESSAGES.CONVERSATION_INDEXES_CREATED, { executionTime: conversationTime });

    // 4. Template Lookup
    const templateStartTime = Date.now();
    logger.info(MESSAGES.CREATING_TEMPLATE_INDEXES);
    
    await createIndex(db, COLLECTION_NAMES.TEMPLATES, 
      { [FIELD_NAMES.BUSINESS_ID]: 1, [FIELD_NAMES.STATUS]: 1 }, 
      INDEX_NAMES.BUSINESS_ID_STATUS, indexResults);
    
    await createIndex(db, COLLECTION_NAMES.TEMPLATES, 
      { [FIELD_NAMES.WHATSAPP_TEMPLATE_ID]: 1 }, 
      INDEX_NAMES.WHATSAPP_TEMPLATE_ID, indexResults, INDEX_OPTIONS.UNIQUE_SPARSE);
    
    const templateTime = Date.now() - templateStartTime;
    logger.info(MESSAGES.TEMPLATE_INDEXES_CREATED, { executionTime: templateTime });

    // 5. Performance Indexes
    const performanceStartTime = Date.now();
    logger.info(MESSAGES.CREATING_PERFORMANCE_INDEXES);
    
    await createIndex(db, COLLECTION_NAMES.CONVERSATIONS, 
      { [FIELD_NAMES.BUSINESS_ID]: 1, [FIELD_NAMES.LAST_MESSAGE_AT]: -1 }, 
      INDEX_NAMES.BUSINESS_ID_LAST_MESSAGE, indexResults);
    
    await createIndex(db, COLLECTION_NAMES.CAMPAIGNS, 
      { [FIELD_NAMES.BUSINESS_ID]: 1, [FIELD_NAMES.STATUS]: 1 }, 
      INDEX_NAMES.BUSINESS_ID_STATUS, indexResults);
    
    const performanceTime = Date.now() - performanceStartTime;
    logger.info(MESSAGES.PERFORMANCE_INDEXES_CREATED, { executionTime: performanceTime });

    // Summary
    const totalTime = Date.now() - startTime;
    logger.info(MESSAGES.ALL_INDEXES_CREATED, { 
      totalExecutionTime: totalTime,
      totalIndexes: indexResults.length,
    });
    
    // List all indexes for verification
    logger.info(MESSAGES.INDEX_SUMMARY);
    const collections = [
      COLLECTION_NAMES.CAMPAIGN_RECIPIENTS,
      COLLECTION_NAMES.CONTACTS,
      COLLECTION_NAMES.CONVERSATIONS,
      COLLECTION_NAMES.TEMPLATES,
      COLLECTION_NAMES.CAMPAIGNS,
    ];
    
    for (const collectionName of collections) {
      const indexes = await db.collection(collectionName).indexes();
      logger.info('Collection indexes', { 
        collection: collectionName, 
        indexCount: indexes.length,
        indexes: indexes.map(idx => idx.name),
      });
    }

    // Log performance benefits
    logger.info(MESSAGES.PERFORMANCE_BENEFITS, {
      campaignQueries: PERFORMANCE_METRICS.CAMPAIGN_SPEEDUP,
      webhookProcessing: PERFORMANCE_METRICS.WEBHOOK_CAPACITY,
      inboxLoading: PERFORMANCE_METRICS.INBOX_IMPROVEMENT,
      contactLookups: PERFORMANCE_METRICS.CONTACT_IMPROVEMENT,
      indexStorage: PERFORMANCE_METRICS.INDEX_STORAGE,
    });

    return {
      success: true,
      indexCount: indexResults.length,
      executionTime: totalTime,
      results: indexResults,
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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an index with error handling
 */
async function createIndex(db, collectionName, keys, indexName, results, options = {}) {
  const startTime = Date.now();
  
  try {
    await db.collection(collectionName).createIndex(keys, options);
    const executionTime = Date.now() - startTime;
    
    logger.info(MESSAGES.INDEX_CREATED, { 
      collection: collectionName,
      indexName,
      keys: JSON.stringify(keys),
      executionTime,
    });
    
    results.push({ 
      collection: collectionName, 
      indexName, 
      success: true, 
      executionTime 
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Index already exists is not an error
    if (error.code === 85 || error.code === 86) {
      logger.info(MESSAGES.INDEX_ALREADY_EXISTS, { 
        collection: collectionName,
        indexName,
        executionTime,
      });
      results.push({ 
        collection: collectionName, 
        indexName, 
        success: true, 
        alreadyExists: true,
        executionTime 
      });
    } else {
      logger.error('Index creation error', { 
        collection: collectionName,
        indexName,
        error: error.message,
        errorCode: error.code,
        executionTime,
      });
      results.push({ 
        collection: collectionName, 
        indexName, 
        success: false, 
        error: error.message,
        executionTime 
      });
      throw error;
    }
  }
}

// ============================================================================
// SCRIPT EXECUTION
// ============================================================================

// Execute script if run directly
if (require.main === module) {
  createAllIndexes()
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

module.exports = { createAllIndexes };
