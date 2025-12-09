const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

const Campaign = require('../database/models/Campaign');;
const CampaignRecipient = require('../database/models/CampaignRecipient');
const Contact = require('../database/models/Contact');
const Conversation = require('../database/models/Conversation');
const Template = require('../database/models/Template');
const Analytics = require('../database/models/Analytics');
const User = require('../database/models/User');
const Business = require('../database/models/Business');

/**
 * Performance Analysis Script
 * 
 * Analyzes critical queries using MongoDB explain() to identify:
 * - Missing indexes
 * - N+1 query patterns
 * - Slow queries (>100ms)
 * - Suboptimal query plans
 */

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n${colors.magenta}${msg}${colors.reset}\n${colors.cyan}${'='.repeat(60)}${colors.reset}`)
};

/**
 * Analyze query performance
 */
async function analyzeQuery(name, query, description, isAggregation = false) {
  try {
    console.log(`\n${colors.blue}📊 Analyzing: ${name}${colors.reset}`);
    console.log(`   Description: ${description}`);
    
    const startTime = Date.now();
    let explainResult;
    
    // Handle aggregation differently - aggregations don't support executionStats with explain
    if (isAggregation) {
      // For aggregations, just skip explain and note it
      console.log(`   ${colors.yellow}⚠️  Aggregation query - explain() not fully supported${colors.reset}`);
      console.log(`   ${colors.blue}ℹ️  Run this in production with .explain() to analyze${colors.reset}`);
      return {
        name,
        metrics: { executionTime: 0, documentsExamined: 0, documentsReturned: 0, indexUsed: 'N/A', stage: 'AGGREGATION' },
        efficiency: 0,
        rating: 'N/A'
      };
    }
    
    explainResult = await query.explain('executionStats');
    const executionTime = Date.now() - startTime;
    
    const stats = explainResult.executionStats;
    const usedIndex = stats.executionStages?.indexName || 
                     stats.inputStage?.indexName ||
                     'COLLECTION_SCAN';
    
    // Performance metrics
    const metrics = {
      executionTime: stats.executionTimeMillis || executionTime,
      documentsExamined: stats.totalDocsExamined || 0,
      documentsReturned: stats.nReturned || 0,
      indexUsed: usedIndex,
      stage: stats.executionStages?.stage || stats.stage || 'UNKNOWN'
    };
    
    // Calculate efficiency
    const efficiency = metrics.documentsExamined > 0
      ? (metrics.documentsReturned / metrics.documentsExamined * 100).toFixed(2)
      : 100; // Empty collection = 100% efficient (no waste)
    
    // Performance rating
    let rating = 'EXCELLENT';
    let color = colors.green;
    
    // For empty collections, rate based on index usage
    if (metrics.documentsExamined === 0 && usedIndex === 'COLLECTION_SCAN') {
      rating = 'N/A (Empty Collection)';
      color = colors.blue;
    } else if (metrics.executionTime > 100 || efficiency < 50) {
      rating = 'POOR';
      color = colors.red;
    } else if (metrics.executionTime > 50 || efficiency < 80) {
      rating = 'NEEDS IMPROVEMENT';
      color = colors.yellow;
    }
    
    // Output results
    console.log(`   ${color}Performance: ${rating}${colors.reset}`);
    console.log(`   Execution Time: ${metrics.executionTime}ms`);
    console.log(`   Documents Examined: ${metrics.documentsExamined}`);
    console.log(`   Documents Returned: ${metrics.documentsReturned}`);
    console.log(`   Efficiency: ${efficiency}%`);
    console.log(`   Index Used: ${metrics.indexUsed}`);
    console.log(`   Stage: ${metrics.stage}`);
    
    // Recommendations
    if (usedIndex === 'COLLECTION_SCAN') {
      if (metrics.documentsExamined === 0) {
        log.info('Empty collection - Index will be used when data exists');
      } else if (metrics.documentsExamined < 10) {
        log.info('Small collection - Index not needed (COLLSCAN is faster for <10 docs)');
      } else {
        log.warning('COLLECTION SCAN detected - Missing index!');
      }
    }
    
    if (efficiency < 80 && metrics.documentsExamined > 0) {
      log.warning(`Low efficiency (${efficiency}%) - Query examines too many documents`);
    }
    
    if (metrics.executionTime > 100) {
      log.warning(`Slow query (${metrics.executionTime}ms) - Consider optimization`);
    }
    
    return {
      name,
      metrics,
      efficiency: parseFloat(efficiency),
      rating
    };
  } catch (error) {
    log.error(`Failed to analyze ${name}: ${error.message}`);
    return null;
  }
}

/**
 * Main performance analysis
 */
async function runPerformanceAnalysis() {
  try {
    // Connect to MongoDB
    log.section('CONNECTING TO DATABASE');
    await mongoose.connect(process.env.MONGODB_URI);
    log.success('Connected to MongoDB');
    
    // Get sample businessId for testing
    const sampleBusiness = await Business.findOne();
    if (!sampleBusiness) {
      log.warning('No business found in database. Some tests will be skipped.');
    }
    const businessId = sampleBusiness?._id;
    
    const results = [];
    
    // ========================================
    // 1. CAMPAIGN QUERIES
    // ========================================
    log.section('1. CAMPAIGN QUERIES');
    
    if (businessId) {
      results.push(await analyzeQuery(
        'Campaign List Query',
        Campaign.find({ businessId, status: 'active' }).sort({ createdAt: -1 }).limit(20),
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
          { $limit: 10 }
        ]),
        'Campaign list with recipient counts (potential N+1)',
        true // isAggregation
      ));
    }
    
    // ========================================
    // 2. CONTACT QUERIES
    // ========================================
    log.section('2. CONTACT QUERIES');
    
    if (businessId) {
      results.push(await analyzeQuery(
        'Contact List Query',
        Contact.find({ businessId }).sort({ lastMessageAt: -1 }).limit(50),
        'Fetch contacts sorted by last message (inbox view)'
      ));
      
      results.push(await analyzeQuery(
        'Contact Search by Phone',
        Contact.findOne({ businessId, phoneNumber: '+1234567890' }),
        'Find contact by phone number (unique constraint)'
      ));
      
      results.push(await analyzeQuery(
        'Contact with Tags Filter',
        Contact.find({ businessId, tags: { $in: ['vip', 'customer'] } }).limit(20),
        'Filter contacts by tags'
      ));
    }
    
    // ========================================
    // 3. CONVERSATION QUERIES
    // ========================================
    log.section('3. CONVERSATION QUERIES');
    
    if (businessId) {
      results.push(await analyzeQuery(
        'Active Conversations',
        Conversation.find({ businessId, status: 'active' })
          .sort({ lastMessageAt: -1 })
          .limit(50),
        'Fetch active conversations (inbox list)'
      ));
      
      results.push(await analyzeQuery(
        'Unread Conversations',
        Conversation.find({ businessId, status: 'active', unreadCount: { $gt: 0 } })
          .sort({ lastMessageAt: -1 }),
        'Fetch conversations with unread messages'
      ));
    }
    
    // ========================================
    // 4. TEMPLATE QUERIES
    // ========================================
    log.section('4. TEMPLATE QUERIES');
    
    if (businessId) {
      results.push(await analyzeQuery(
        'Approved Templates',
        Template.find({ businessId, status: 'approved' }).sort({ createdAt: -1 }),
        'Fetch approved templates for campaign creation'
      ));
      
      results.push(await analyzeQuery(
        'Template by Name',
        Template.findOne({ businessId, name: 'Welcome Message' }),
        'Find template by name (with new unique constraint)'
      ));
    }
    
    // ========================================
    // 5. ANALYTICS QUERIES
    // ========================================
    log.section('5. ANALYTICS QUERIES');
    
    if (businessId) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
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
              $avg: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
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
    log.section('6. USER & BUSINESS QUERIES');
    
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
    log.section('7. CAMPAIGN RECIPIENT QUERIES');
    
    const sampleCampaign = await Campaign.findOne({ businessId });
    if (sampleCampaign) {
      results.push(await analyzeQuery(
        'Campaign Recipients by Status',
        CampaignRecipient.find({ 
          campaignId: sampleCampaign._id,
          status: 'pending'
        }).limit(100),
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
    log.section('PERFORMANCE ANALYSIS SUMMARY');
    
    const validResults = results.filter(r => r !== null);
    const excellentQueries = validResults.filter(r => r.rating === 'EXCELLENT');
    const needsImprovement = validResults.filter(r => r.rating === 'NEEDS IMPROVEMENT');
    const poorQueries = validResults.filter(r => r.rating === 'POOR');
    const emptyQueries = validResults.filter(r => r.rating && r.rating.includes('N/A'));
    const aggregationQueries = validResults.filter(r => r.rating === 'N/A');
    
    console.log(`\nTotal Queries Analyzed: ${validResults.length}`);
    log.success(`Excellent: ${excellentQueries.length} (${(excellentQueries.length / validResults.length * 100).toFixed(1)}%)`);
    log.warning(`Needs Improvement: ${needsImprovement.length} (${(needsImprovement.length / validResults.length * 100).toFixed(1)}%)`);
    log.error(`Poor Performance: ${poorQueries.length} (${(poorQueries.length / validResults.length * 100).toFixed(1)}%)`);
    log.info(`Empty Collections: ${emptyQueries.length} (${(emptyQueries.length / validResults.length * 100).toFixed(1)}%)`);
    
    // Average execution time (exclude empty and aggregations)
    const measurableResults = validResults.filter(r => !r.rating.includes('N/A') && r.metrics.documentsExamined > 0);
    if (measurableResults.length > 0) {
      const avgExecutionTime = measurableResults.reduce((sum, r) => sum + r.metrics.executionTime, 0) / measurableResults.length;
      console.log(`\nAverage Execution Time: ${avgExecutionTime.toFixed(2)}ms (${measurableResults.length} queries with data)`);
      
      const avgEfficiency = measurableResults.reduce((sum, r) => sum + r.efficiency, 0) / measurableResults.length;
      console.log(`Average Efficiency: ${avgEfficiency.toFixed(2)}%`);
    }
    
    log.section('RECOMMENDATIONS');
    
    if (poorQueries.length > 0) {
      log.error(`\n${poorQueries.length} queries have POOR performance:`);
      poorQueries.forEach(q => {
        console.log(`   - ${q.name} (${q.metrics.executionTime}ms, ${q.efficiency}% efficient)`);
      });
    }
    
    if (needsImprovement.length > 0) {
      log.warning(`\n${needsImprovement.length} queries NEED IMPROVEMENT:`);
      needsImprovement.forEach(q => {
        console.log(`   - ${q.name} (${q.metrics.executionTime}ms, ${q.efficiency}% efficient)`);
      });
    }
    
    if (emptyQueries.length > 0) {
      console.log(`\n${colors.blue}ℹ️  ${emptyQueries.length} queries on empty collections:${colors.reset}`);
      emptyQueries.forEach(q => {
        console.log(`   - ${q.name} (Will use indexes when data exists)`);
      });
    }
    
    // General recommendations
    console.log('\n📋 General Recommendations:');
    console.log('   1. Add indexes for frequently filtered fields');
    console.log('   2. Use aggregation pipeline with $match early');
    console.log('   3. Implement pagination for large result sets');
    console.log('   4. Use projection to limit returned fields');
    console.log('   5. Consider caching for frequently accessed data');
    console.log('   6. Monitor slow query logs in production');
    console.log('   7. Use lean() for read-only queries');
    
    if (emptyQueries.length > 3) {
      console.log(`\n${colors.yellow}⚠️  Note: Most collections are empty. Run this analysis again after adding production data.${colors.reset}`);
    }
    
    log.section('ANALYSIS COMPLETE');
    
  } catch (error) {
    log.error(`Performance analysis failed: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    log.info('Database connection closed');
  }
}

// Run the analysis
if (require.main === module) {
  runPerformanceAnalysis()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runPerformanceAnalysis, analyzeQuery };
