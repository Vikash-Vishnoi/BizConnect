require('dotenv').config();
const mongoose = require('mongoose');
const { ERROR_CODES } = require('../common/constants');
const logger = require('../common/helpers/logger');

// Import models to ensure schemas are registered
const Campaign = require('../core/database/models/Campaign');
const CampaignRecipient = require('../core/database/models/CampaignRecipient');
const Contact = require('../core/database/models/Contact');
const Conversation = require('../core/database/models/Conversation');
const Template = require('../core/database/models/Template');
const Analytics = require('../core/database/models/Analytics');
const User = require('../core/database/models/User');
const Business = require('../core/database/models/Business');

/**
 * Performance Analysis Script
 * 
 * Analyzes critical queries using MongoDB explain() to identify:
 * - Missing indexes
 * - N+1 query patterns
 * - Slow queries (>100ms)
 * - Suboptimal query plans
 */

// ============================================================================
// CONSTANTS
// ============================================================================

// Environment Variables
const MONGODB_URI = process.env.MONGODB_URI;

// Connection Configuration
const CONNECTION_TIMEOUT_MS = 30000;
const SOCKET_TIMEOUT_MS = 45000;

// Performance Thresholds
const PERFORMANCE_THRESHOLDS = {
  SLOW_QUERY_MS: 100,
  NEEDS_IMPROVEMENT_MS: 50,
  LOW_EFFICIENCY_PERCENT: 50,
  NEEDS_IMPROVEMENT_EFFICIENCY_PERCENT: 80,
  EMPTY_COLLECTION_THRESHOLD: 10,
};

// Query Limits
const QUERY_LIMITS = {
  CAMPAIGN_LIST: 20,
  CAMPAIGN_AGGREGATION: 10,
  CONTACT_LIST: 50,
  CONTACT_FILTER: 20,
  CONVERSATION_LIST: 50,
  RECIPIENT_LIST: 100,
};

// Time Period Constants
const TIME_PERIODS = {
  THIRTY_DAYS_MS: 30 * 24 * 60 * 60 * 1000,
};

// Sample Data
const SAMPLE_DATA = {
  PHONE_NUMBER: '+1234567890',
  TEMPLATE_NAME: 'Welcome Message',
  TAGS: ['vip', 'customer'],
};

// Performance Ratings
const PERFORMANCE_RATINGS = {
  EXCELLENT: 'EXCELLENT',
  NEEDS_IMPROVEMENT: 'NEEDS IMPROVEMENT',
  POOR: 'POOR',
  NOT_APPLICABLE: 'N/A',
  EMPTY_COLLECTION: 'N/A (Empty Collection)',
};

// Query Stage Types
const QUERY_STAGES = {
  COLLECTION_SCAN: 'COLLECTION_SCAN',
  AGGREGATION: 'AGGREGATION',
  UNKNOWN: 'UNKNOWN',
};

// Collection Scan Indicators
const COLLECTION_SCAN_INDICATOR = 'COLLECTION_SCAN';

// Status Values
const STATUS_VALUES = {
  ACTIVE: 'active',
  APPROVED: 'approved',
  PENDING: 'pending',
  SUCCESS: 'success',
};

// Message Types
const MESSAGE_TYPES = {
  TEMPLATE: 'template',
  TEXT: 'text',
};

// Script Messages
const MESSAGES = {
  SCRIPT_START: 'Performance analysis script started',
  ENV_MISSING: 'MONGODB_URI environment variable is required',
  CONNECTING: 'Connecting to database',
  CONNECTED: 'Connected to MongoDB',
  NO_BUSINESS_FOUND: 'No business found in database. Some tests will be skipped.',
  SECTION_CAMPAIGN_QUERIES: '1. CAMPAIGN QUERIES',
  SECTION_CONTACT_QUERIES: '2. CONTACT QUERIES',
  SECTION_CONVERSATION_QUERIES: '3. CONVERSATION QUERIES',
  SECTION_TEMPLATE_QUERIES: '4. TEMPLATE QUERIES',
  SECTION_ANALYTICS_QUERIES: '5. ANALYTICS QUERIES',
  SECTION_USER_BUSINESS_QUERIES: '6. USER & BUSINESS QUERIES',
  SECTION_CAMPAIGN_RECIPIENT_QUERIES: '7. CAMPAIGN RECIPIENT QUERIES',
  SECTION_SUMMARY: 'PERFORMANCE ANALYSIS SUMMARY',
  SECTION_RECOMMENDATIONS: 'RECOMMENDATIONS',
  SECTION_COMPLETE: 'ANALYSIS COMPLETE',
  ANALYZING_QUERY: 'Analyzing query',
  AGGREGATION_WARNING: 'Aggregation query - explain() not fully supported',
  AGGREGATION_INFO: 'Run this in production with .explain() to analyze',
  EMPTY_COLLECTION_INDEX_INFO: 'Empty collection - Index will be used when data exists',
  SMALL_COLLECTION_INFO: 'Small collection - Index not needed (COLLSCAN is faster for <10 docs)',
  COLLECTION_SCAN_WARNING: 'COLLECTION SCAN detected - Missing index!',
  LOW_EFFICIENCY_WARNING: 'Low efficiency - Query examines too many documents',
  SLOW_QUERY_WARNING: 'Slow query - Consider optimization',
  SCRIPT_FAILED: 'Performance analysis failed',
  CONNECTION_CLOSED: 'Database connection closed',
  POOR_PERFORMANCE_HEADER: 'queries have POOR performance',
  NEEDS_IMPROVEMENT_HEADER: 'queries NEED IMPROVEMENT',
  EMPTY_COLLECTIONS_HEADER: 'queries on empty collections',
  EMPTY_COLLECTIONS_NOTE: 'Note: Most collections are empty. Run this analysis again after adding production data.',
};

// Exit Codes
const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
};

// General Recommendations
const GENERAL_RECOMMENDATIONS = [
  'Add indexes for frequently filtered fields',
  'Use aggregation pipeline with $match early',
  'Implement pagination for large result sets',
  'Use projection to limit returned fields',
  'Consider caching for frequently accessed data',
  'Monitor slow query logs in production',
  'Use lean() for read-only queries',
];

// Validation
if (!MONGODB_URI) {
  logger.error(MESSAGES.ENV_MISSING);
  process.exit(EXIT_CODES.ERROR);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Analyze query performance
 */
async function analyzeQuery(name, query, description, isAggregation = false) {
  const startTime = Date.now();
  
  try {
    logger.info(MESSAGES.ANALYZING_QUERY, { name, description });
    
    let explainResult;
    
    // Handle aggregation differently - aggregations don't support executionStats with explain
    if (isAggregation) {
      logger.warn(MESSAGES.AGGREGATION_WARNING, { name });
      logger.info(MESSAGES.AGGREGATION_INFO, { name });
      return {
        name,
        metrics: { 
          executionTime: 0, 
          documentsExamined: 0, 
          documentsReturned: 0, 
          indexUsed: PERFORMANCE_RATINGS.NOT_APPLICABLE, 
          stage: QUERY_STAGES.AGGREGATION 
        },
        efficiency: 0,
        rating: PERFORMANCE_RATINGS.NOT_APPLICABLE
      };
    }
    
    explainResult = await query.explain('executionStats');
    const executionTime = Date.now() - startTime;
    
    const stats = explainResult.executionStats;
    const usedIndex = stats.executionStages?.indexName || 
                     stats.inputStage?.indexName ||
                     COLLECTION_SCAN_INDICATOR;
    
    // Performance metrics
    const metrics = {
      executionTime: stats.executionTimeMillis || executionTime,
      documentsExamined: stats.totalDocsExamined || 0,
      documentsReturned: stats.nReturned || 0,
      indexUsed: usedIndex,
      stage: stats.executionStages?.stage || stats.stage || QUERY_STAGES.UNKNOWN
    };
    
    // Calculate efficiency
    const efficiency = metrics.documentsExamined > 0
      ? (metrics.documentsReturned / metrics.documentsExamined * 100).toFixed(2)
      : 100; // Empty collection = 100% efficient (no waste)
    
    // Performance rating
    let rating = PERFORMANCE_RATINGS.EXCELLENT;
    
    // For empty collections, rate based on index usage
    if (metrics.documentsExamined === 0 && usedIndex === COLLECTION_SCAN_INDICATOR) {
      rating = PERFORMANCE_RATINGS.EMPTY_COLLECTION;
    } else if (metrics.executionTime > PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS || 
               efficiency < PERFORMANCE_THRESHOLDS.LOW_EFFICIENCY_PERCENT) {
      rating = PERFORMANCE_RATINGS.POOR;
    } else if (metrics.executionTime > PERFORMANCE_THRESHOLDS.NEEDS_IMPROVEMENT_MS || 
               efficiency < PERFORMANCE_THRESHOLDS.NEEDS_IMPROVEMENT_EFFICIENCY_PERCENT) {
      rating = PERFORMANCE_RATINGS.NEEDS_IMPROVEMENT;
    }
    
    // Output results
    logger.info('Query performance analysis', {
      name,
      rating,
      executionTime: metrics.executionTime,
      documentsExamined: metrics.documentsExamined,
      documentsReturned: metrics.documentsReturned,
      efficiency: parseFloat(efficiency),
      indexUsed: metrics.indexUsed,
      stage: metrics.stage,
    });
    
    // Recommendations
    if (usedIndex === COLLECTION_SCAN_INDICATOR) {
      if (metrics.documentsExamined === 0) {
        logger.info(MESSAGES.EMPTY_COLLECTION_INDEX_INFO, { name });
      } else if (metrics.documentsExamined < PERFORMANCE_THRESHOLDS.EMPTY_COLLECTION_THRESHOLD) {
        logger.info(MESSAGES.SMALL_COLLECTION_INFO, { name });
      } else {
        logger.warn(MESSAGES.COLLECTION_SCAN_WARNING, { name });
      }
    }
    
    if (efficiency < PERFORMANCE_THRESHOLDS.NEEDS_IMPROVEMENT_EFFICIENCY_PERCENT && 
        metrics.documentsExamined > 0) {
      logger.warn(MESSAGES.LOW_EFFICIENCY_WARNING, { name, efficiency: parseFloat(efficiency) });
    }
    
    if (metrics.executionTime > PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS) {
      logger.warn(MESSAGES.SLOW_QUERY_WARNING, { name, executionTime: metrics.executionTime });
    }
    
    return {
      name,
      metrics,
      efficiency: parseFloat(efficiency),
      rating
    };
  } catch (error) {
    logger.error('Failed to analyze query', { 
      name, 
      error: error.message,
      executionTime: Date.now() - startTime,
    });
    return null;
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Main performance analysis
 */
async function runPerformanceAnalysis() {
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
    
    // Get sample businessId for testing
    const sampleBusiness = await Business.findOne();
    if (!sampleBusiness) {
      logger.warn(MESSAGES.NO_BUSINESS_FOUND);
    }
    const businessId = sampleBusiness?._id;
    
    const results = [];
    
    // ========================================
    // 1. CAMPAIGN QUERIES
    // ========================================
    logger.info(MESSAGES.SECTION_CAMPAIGN_QUERIES);
    
    if (businessId) {
      results.push(await analyzeQuery(
        'Campaign List Query',
        Campaign.find({ businessId, status: STATUS_VALUES.ACTIVE })
          .sort({ createdAt: -1 })
          .limit(QUERY_LIMITS.CAMPAIGN_LIST),
        'Fetch active campaigns for a business (paginated)'
      ));
      
      results.push(await analyzeQuery(
        'Campaign with Recipient Count',
        Campaign.aggregate([
          { $match: { businessId: new mongoose.Types.ObjectId(businessId) } },
          { $lookup: {
            from: 'campaignrecipients',
            localField: '_id',
            foreignField: 'campaignId',
            as: 'recipients'
          }},
          { $addFields: { recipientCount: { $size: '$recipients' } } },
          { $limit: QUERY_LIMITS.CAMPAIGN_AGGREGATION }
        ]),
        'Campaign list with recipient counts (potential N+1)',
        true // isAggregation
      ));
    }
    
    // ========================================
    // 2. CONTACT QUERIES
    // ========================================
    logger.info(MESSAGES.SECTION_CONTACT_QUERIES);
    
    if (businessId) {
      results.push(await analyzeQuery(
        'Contact List Query',
        Contact.find({ businessId })
          .sort({ lastMessageAt: -1 })
          .limit(QUERY_LIMITS.CONTACT_LIST),
        'Fetch contacts sorted by last message (inbox view)'
      ));
      
      results.push(await analyzeQuery(
        'Contact Search by Phone',
        Contact.findOne({ businessId, phoneNumber: SAMPLE_DATA.PHONE_NUMBER }),
        'Find contact by phone number (unique constraint)'
      ));
      
      results.push(await analyzeQuery(
        'Contact with Tags Filter',
        Contact.find({ businessId, tags: { $in: SAMPLE_DATA.TAGS } })
          .limit(QUERY_LIMITS.CONTACT_FILTER),
        'Filter contacts by tags'
      ));
    }
    
    // ========================================
    // 3. CONVERSATION QUERIES
    // ========================================
    logger.info(MESSAGES.SECTION_CONVERSATION_QUERIES);
    
    if (businessId) {
      results.push(await analyzeQuery(
        'Active Conversations',
        Conversation.find({ businessId, status: STATUS_VALUES.ACTIVE })
          .sort({ lastMessageAt: -1 })
          .limit(QUERY_LIMITS.CONVERSATION_LIST),
        'Fetch active conversations (inbox list)'
      ));
      
      results.push(await analyzeQuery(
        'Unread Conversations',
        Conversation.find({ businessId, status: STATUS_VALUES.ACTIVE, unreadCount: { $gt: 0 } })
          .sort({ lastMessageAt: -1 }),
        'Fetch conversations with unread messages'
      ));
    }
    
    // ========================================
    // 4. TEMPLATE QUERIES
    // ========================================
    logger.info(MESSAGES.SECTION_TEMPLATE_QUERIES);
    
    if (businessId) {
      results.push(await analyzeQuery(
        'Approved Templates',
        Template.find({ businessId, status: STATUS_VALUES.APPROVED })
          .sort({ createdAt: -1 }),
        'Fetch approved templates for campaign creation'
      ));
      
      results.push(await analyzeQuery(
        'Template by Name',
        Template.findOne({ businessId, name: SAMPLE_DATA.TEMPLATE_NAME }),
        'Find template by name (with new unique constraint)'
      ));
    }
    
    // ========================================
    // 5. ANALYTICS QUERIES
    // ========================================
    logger.info(MESSAGES.SECTION_ANALYTICS_QUERIES);
    
    if (businessId) {
      const thirtyDaysAgo = new Date(Date.now() - TIME_PERIODS.THIRTY_DAYS_MS);
      
      results.push(await analyzeQuery(
        'Analytics Dashboard Query',
        Analytics.aggregate([
          { $match: {
            businessId: new mongoose.Types.ObjectId(businessId),
            date: { $gte: thirtyDaysAgo }
          }},
          { $group: {
            _id: '$messageType',
            count: { $sum: 1 },
            successRate: { 
              $avg: { $cond: [{ $eq: ['$status', STATUS_VALUES.SUCCESS] }, 1, 0] }
            }
          }}
        ]),
        'Dashboard analytics aggregation (last 30 days)',
        true // isAggregation
      ));
      
      results.push(await analyzeQuery(
        'Daily Analytics Query',
        Analytics.find({ 
          businessId,
          date: { $gte: thirtyDaysAgo }
        }).sort({ date: -1 }),
        'Fetch daily analytics data'
      ));
    }
    
    // ========================================
    // 6. USER & BUSINESS QUERIES
    // ========================================
    logger.info(MESSAGES.SECTION_USER_BUSINESS_QUERIES);
    
    const sampleUser = await User.findOne();
    if (sampleUser) {
      results.push(await analyzeQuery(
        'User Login Query',
        User.findOne({ email: sampleUser.email }).select('+password'),
        'User login by email (with password)'
      ));
    }
    
    if (sampleBusiness && sampleBusiness.whatsappConfig?.phoneNumberId) {
      results.push(await analyzeQuery(
        'Business by Phone Number ID',
        Business.findOne({ 'whatsappConfig.phoneNumberId': sampleBusiness.whatsappConfig.phoneNumberId }),
        'Find business by phoneNumberId (webhook routing)'
      ));
    }
    
    // ========================================
    // 7. CAMPAIGN RECIPIENT QUERIES
    // ========================================
    logger.info(MESSAGES.SECTION_CAMPAIGN_RECIPIENT_QUERIES);
    
    const sampleCampaign = await Campaign.findOne({ businessId });
    if (sampleCampaign) {
      results.push(await analyzeQuery(
        'Campaign Recipients by Status',
        CampaignRecipient.find({ 
          campaignId: sampleCampaign._id,
          status: STATUS_VALUES.PENDING
        }).limit(QUERY_LIMITS.RECIPIENT_LIST),
        'Fetch pending recipients for campaign sending'
      ));
      
      results.push(await analyzeQuery(
        'Recipient Status Aggregation',
        CampaignRecipient.aggregate([
          { $match: { campaignId: new mongoose.Types.ObjectId(sampleCampaign._id) } },
          { $group: {
            _id: '$status',
            count: { $sum: 1 }
          }}
        ]),
        'Count recipients by status (campaign stats)',
        true // isAggregation
      ));
    }
    
    // ========================================
    // SUMMARY REPORT
    // ========================================
    logger.info(MESSAGES.SECTION_SUMMARY);
    
    const validResults = results.filter(r => r !== null);
    const excellentQueries = validResults.filter(r => r.rating === PERFORMANCE_RATINGS.EXCELLENT);
    const needsImprovement = validResults.filter(r => r.rating === PERFORMANCE_RATINGS.NEEDS_IMPROVEMENT);
    const poorQueries = validResults.filter(r => r.rating === PERFORMANCE_RATINGS.POOR);
    const emptyQueries = validResults.filter(r => r.rating && r.rating.includes(PERFORMANCE_RATINGS.NOT_APPLICABLE));
    
    const totalQueries = validResults.length;
    const excellentPercentage = totalQueries > 0 ? (excellentQueries.length / totalQueries * 100).toFixed(1) : 0;
    const needsImprovementPercentage = totalQueries > 0 ? (needsImprovement.length / totalQueries * 100).toFixed(1) : 0;
    const poorPercentage = totalQueries > 0 ? (poorQueries.length / totalQueries * 100).toFixed(1) : 0;
    const emptyPercentage = totalQueries > 0 ? (emptyQueries.length / totalQueries * 100).toFixed(1) : 0;
    
    logger.info('Query analysis summary', {
      totalQueries,
      excellent: { count: excellentQueries.length, percentage: excellentPercentage },
      needsImprovement: { count: needsImprovement.length, percentage: needsImprovementPercentage },
      poor: { count: poorQueries.length, percentage: poorPercentage },
      emptyCollections: { count: emptyQueries.length, percentage: emptyPercentage },
    });
    
    // Average execution time (exclude empty and aggregations)
    const measurableResults = validResults.filter(r => 
      !r.rating.includes(PERFORMANCE_RATINGS.NOT_APPLICABLE) && 
      r.metrics.documentsExamined > 0
    );
    
    if (measurableResults.length > 0) {
      const avgExecutionTime = measurableResults.reduce((sum, r) => sum + r.metrics.executionTime, 0) / measurableResults.length;
      const avgEfficiency = measurableResults.reduce((sum, r) => sum + r.efficiency, 0) / measurableResults.length;
      
      logger.info('Average performance metrics', {
        queriesWithData: measurableResults.length,
        avgExecutionTime: avgExecutionTime.toFixed(2),
        avgEfficiency: avgEfficiency.toFixed(2),
      });
    }
    
    logger.info(MESSAGES.SECTION_RECOMMENDATIONS);
    
    if (poorQueries.length > 0) {
      logger.error(MESSAGES.POOR_PERFORMANCE_HEADER, {
        count: poorQueries.length,
        queries: poorQueries.map(q => ({
          name: q.name,
          executionTime: q.metrics.executionTime,
          efficiency: q.efficiency,
        })),
      });
    }
    
    if (needsImprovement.length > 0) {
      logger.warn(MESSAGES.NEEDS_IMPROVEMENT_HEADER, {
        count: needsImprovement.length,
        queries: needsImprovement.map(q => ({
          name: q.name,
          executionTime: q.metrics.executionTime,
          efficiency: q.efficiency,
        })),
      });
    }
    
    if (emptyQueries.length > 0) {
      logger.info(MESSAGES.EMPTY_COLLECTIONS_HEADER, {
        count: emptyQueries.length,
        queries: emptyQueries.map(q => q.name),
      });
    }
    
    // General recommendations
    logger.info('General recommendations', {
      recommendations: GENERAL_RECOMMENDATIONS,
    });
    
    if (emptyQueries.length > 3) {
      logger.warn(MESSAGES.EMPTY_COLLECTIONS_NOTE);
    }
    
    const totalTime = Date.now() - startTime;
    logger.info(MESSAGES.SECTION_COMPLETE, {
      totalExecutionTime: totalTime,
      totalQueries,
    });
    
    return {
      success: true,
      totalQueries,
      excellentCount: excellentQueries.length,
      needsImprovementCount: needsImprovement.length,
      poorCount: poorQueries.length,
      emptyCount: emptyQueries.length,
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
  runPerformanceAnalysis()
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

module.exports = { runPerformanceAnalysis, analyzeQuery };
