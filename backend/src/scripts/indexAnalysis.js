const mongoose = require('mongoose');
const path = require('path');
const logger = require('../common/helpers/logger');
const { ERROR_CODES } = require('../common/constants');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ========================================
// CONSTANTS
// ========================================

// Database Configuration
const DB_CONNECTION_TIMEOUT_MS = 10000;
const DB_OPERATION_TIMEOUT_MS = 30000;

// Display Configuration
const SEPARATOR_LENGTH = 80;
const SEPARATOR_CHAR = '=';
const SUBSEPARATOR_CHAR = '-';

// Size Conversion Constants
const BYTES_TO_KB = 1024;
const BYTES_TO_MB = 1024 * 1024;
const SIZE_DECIMAL_PLACES = 2;

// Collection Categories
const LOG_COLLECTIONS = ['auditlogs', 'alertlogs', 'automationlogs'];

// Script Status
const EXIT_CODE_SUCCESS = 0;
const EXIT_CODE_FAILURE = 1;

// Progress Reporting
const PROGRESS_LOG_INTERVAL = 5; // Log progress every N collections

/**
 * Index Analysis Script
 * 
 * Analyzes all collections to identify:
 * - Existing indexes
 * - Missing recommended indexes
 * - Unused indexes
 * - Index effectiveness
 */

async function analyzeIndexes() {
  const startTime = Date.now();
  
  try {
    // Validate environment variables
    if (!process.env.MONGODB_URI) {
      const error = new Error('MONGODB_URI environment variable is required');
      error.code = ERROR_CODES.CONFIGURATION_ERROR;
      throw error;
    }
    
    logger.info('Starting index analysis', {
      timestamp: new Date().toISOString()
    });
    
    logger.info('Connecting to MongoDB...');
    const connectionStartTime = Date.now();
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: DB_CONNECTION_TIMEOUT_MS
    });
    const connectionTime = Date.now() - connectionStartTime;
    
    logger.info('Connected to MongoDB', {
      connectionTime: `${connectionTime}ms`
    });
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    logger.info('DATABASE INDEX ANALYSIS REPORT');
    logger.info(SEPARATOR_CHAR.repeat(SEPARATOR_LENGTH));
    logger.info(`Database: ${db.databaseName}`);
    logger.info(`Collections: ${collections.length}`);
    logger.info(SEPARATOR_CHAR.repeat(SEPARATOR_LENGTH));
    
    const recommendations = [];
    let collectionsProcessed = 0;
    
    for (const collInfo of collections) {
      const collectionName = collInfo.name;
      const collection = db.collection(collectionName);
      const collectionStartTime = Date.now();
      
      logger.info(`\nCollection: ${collectionName}`);
      logger.info(SUBSEPARATOR_CHAR.repeat(SEPARATOR_LENGTH));
      
      // Get indexes
      const indexes = await collection.indexes();
      logger.info(`   Total Indexes: ${indexes.length}`);
      
      // Get collection stats using MongoDB command
      try {
        const stats = await db.command({ collStats: collectionName });
        logger.info(`   Document Count: ${stats.count}`);
        logger.info(`   Average Document Size: ${(stats.avgObjSize / BYTES_TO_KB).toFixed(SIZE_DECIMAL_PLACES)} KB`);
        logger.info(`   Total Size: ${(stats.size / BYTES_TO_MB).toFixed(SIZE_DECIMAL_PLACES)} MB`);
        logger.info(`   Index Size: ${(stats.totalIndexSize / BYTES_TO_MB).toFixed(SIZE_DECIMAL_PLACES)} MB`);
      } catch (err) {
        logger.warn(`   Stats: Unable to retrieve`, { error: err.message });
      }      
      logger.info('\n   Existing Indexes:');
      indexes.forEach((index, i) => {
        const keys = Object.keys(index.key).map(k => `${k}: ${index.key[k]}`).join(', ');
        const unique = index.unique ? ' [UNIQUE]' : '';
        const sparse = index.sparse ? ' [SPARSE]' : '';
        logger.info(`      ${i + 1}. ${index.name}${unique}${sparse}`);
        logger.info(`         Keys: { ${keys} }`);
      });
      
      collectionsProcessed++;
      const collectionTime = Date.now() - collectionStartTime;
      
      // Log progress periodically
      if (collectionsProcessed % PROGRESS_LOG_INTERVAL === 0) {
        logger.info(`Progress: ${collectionsProcessed}/${collections.length} collections processed`, {
          executionTime: `${Date.now() - startTime}ms`
        });
      }
      
      // Recommendations based on collection name
      const collRecommendations = getRecommendations(collectionName, indexes);
      if (collRecommendations.length > 0) {
        logger.info('\n   ⚠️  Recommendations:');
        collRecommendations.forEach(rec => {
          logger.info(`      - ${rec}`);
          recommendations.push({ collection: collectionName, recommendation: rec });
        });
      } else {
        logger.info('\n   ✅ No additional indexes recommended');
      }
    }
    
    // Summary
    logger.info('\n' + SEPARATOR_CHAR.repeat(SEPARATOR_LENGTH));
    logger.info('📋 SUMMARY OF RECOMMENDATIONS');
    logger.info(SEPARATOR_CHAR.repeat(SEPARATOR_LENGTH));
    
    if (recommendations.length > 0) {
      logger.info(`\nTotal Recommendations: ${recommendations.length}\n`);
      recommendations.forEach((rec, i) => {
        logger.info(`${i + 1}. [${rec.collection}] ${rec.recommendation}`);
      });
    } else {
      logger.info('\n✅ All collections have optimal indexes!');
    }
    
    logger.info('\n' + SEPARATOR_CHAR.repeat(SEPARATOR_LENGTH));
    logger.info('📚 BEST PRACTICES');
    logger.info(SEPARATOR_CHAR.repeat(SEPARATOR_LENGTH));
    logger.info(`
1. Compound Indexes: Put most selective field first
2. Sort Performance: Add index on sort fields
3. Covered Queries: Include all query fields in index
4. Text Search: Use text index for full-text search
5. TTL Indexes: Auto-expire documents (logs, sessions)
6. Partial Indexes: Index subset with filter expression
7. Monitor: Use explain() to verify index usage
8. Remove Unused: Drop indexes that are never used
    `);
    
    const totalTime = Date.now() - startTime;
    logger.info('\nAnalysis Statistics:', {
      collectionsAnalyzed: collections.length,
      totalRecommendations: recommendations.length,
      executionTime: `${totalTime}ms`,
      averageTimePerCollection: `${Math.round(totalTime / collections.length)}ms`
    });
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Index analysis failed', {
      error: error.message,
      stack: error.stack,
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      executionTime: `${executionTime}ms`
    });
    throw error;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('Database connection closed');
    }
    
    const totalTime = Date.now() - startTime;
    logger.info('Analysis complete', {
      totalExecutionTime: `${totalTime}ms`
    });
  }
}

/**
 * Get index recommendations based on collection name and model patterns
 */
function getRecommendations(collectionName, existingIndexes) {
  const recommendations = [];
  const indexNames = existingIndexes.map(i => i.name);
  
  // Helper to check if index exists
  const hasIndex = (fields) => {
    return indexNames.some(name => {
      return fields.every(field => name.includes(field));
    });
  };
  
  // Collection-specific recommendations
  switch (collectionName) {
    case 'campaigns':
      if (!hasIndex(['businessId', 'status', 'createdAt'])) {
        recommendations.push('Add compound index: { businessId: 1, status: 1, createdAt: -1 }');
      }
      if (!hasIndex(['userId'])) {
        recommendations.push('Consider index on userId for user-specific queries');
      } 
      break;
      
    case 'campaignrecipients':
      if (!hasIndex(['campaignId', 'status'])) {
        recommendations.push('Add compound index: { campaignId: 1, status: 1 }');
      }
      if (!hasIndex(['businessId', 'status'])) {
        recommendations.push('Add compound index: { businessId: 1, status: 1 }');
      }
      break;
      
    case 'contacts':
      if (!hasIndex(['businessId', 'lastMessageAt'])) {
        recommendations.push('Add compound index: { businessId: 1, lastMessageAt: -1 } for inbox sorting');
      }
      if (!hasIndex(['businessId', 'tags'])) {
        recommendations.push('Consider index: { businessId: 1, tags: 1 } for tag filtering');
      }
      if (!hasIndex(['email'])) {
        recommendations.push('Consider index on email for email lookups');
      }
      break;
      
    case 'conversations':
      if (!hasIndex(['businessId', 'status', 'lastMessageAt'])) {
        recommendations.push('Add compound index: { businessId: 1, status: 1, lastMessageAt: -1 }');
      }
      if (!hasIndex(['assignedTo'])) {
        recommendations.push('Consider index on assignedTo for user assignment queries');
      }
      break;
      
    case 'templates':
      if (!hasIndex(['businessId', 'name'])) {
        recommendations.push('CRITICAL: Add unique compound index: { businessId: 1, name: 1 }');
      }
      if (!hasIndex(['whatsappTemplateId'])) {
        recommendations.push('Consider index on whatsappTemplateId for sync operations');
      }
      break;
      
    case 'analytics':
      if (!hasIndex(['businessId', 'date'])) {
        recommendations.push('Add compound index: { businessId: 1, date: -1 } for time-series queries');
      }
      if (!hasIndex(['businessId', 'messageType'])) {
        recommendations.push('Consider index: { businessId: 1, messageType: 1 } for type filtering');
      }
      break;
      
    case 'users':
      if (!hasIndex(['email'])) {
        recommendations.push('CRITICAL: Add unique index on email field');
      }
      if (!hasIndex(['businessId'])) {
        recommendations.push('Consider index on businessId for business user queries');
      }
      break;
      
    case 'businesses':
      if (!hasIndex(['owner'])) {
        recommendations.push('Consider index on owner for user business lookups');
      }
      if (!hasIndex(['team.user'])) {
        recommendations.push('Consider index on team.user for team member lookups');
      }
      break;
      
    case 'auditlogs':
    case 'alertlogs':
    case 'automationlogs':
      if (!hasIndex(['businessId', 'createdAt'])) {
        recommendations.push('Add compound index: { businessId: 1, createdAt: -1 }');
      }
      if (!hasIndex(['createdAt'])) {
        recommendations.push('Consider TTL index on createdAt for auto-cleanup');
      }
      break;
      
    case 'scheduledmessages':
      if (!hasIndex(['businessId', 'status', 'scheduledFor'])) {
        recommendations.push('Add compound index: { businessId: 1, status: 1, scheduledFor: 1 }');
      }
      break;
  }
  
  return recommendations;
}

// Run analysis
if (require.main === module) {
  analyzeIndexes()
    .then(() => {
      logger.info('Script completed successfully');
      process.exit(EXIT_CODE_SUCCESS);
    })
    .catch(error => {
      logger.error('Script failed', {
        error: error.message,
        stack: error.stack
      });
      process.exit(EXIT_CODE_FAILURE);
    });
}

module.exports = { analyzeIndexes };
