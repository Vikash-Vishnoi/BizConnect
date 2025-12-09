const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    
    console.log('🔍 Connecting to MongoDB...\n');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('📊 DATABASE INDEX ANALYSIS REPORT');
    console.log('='.repeat(80));
    console.log(`Database: ${db.databaseName}`);
    console.log(`Collections: ${collections.length}`);
    console.log('='.repeat(80));
    
    const recommendations = [];
    
    for (const collInfo of collections) {
      const collectionName = collInfo.name;
      const collection = db.collection(collectionName);
      
      console.log(`\n📁 Collection: ${collectionName}`);
      console.log('-'.repeat(80));
      
      // Get indexes
      const indexes = await collection.indexes();
      console.log(`   Total Indexes: ${indexes.length}`);
      
      // Get collection stats using MongoDB command
      try {
        const stats = await db.command({ collStats: collectionName });
        console.log(`   Document Count: ${stats.count}`);
        console.log(`   Average Document Size: ${(stats.avgObjSize / 1024).toFixed(2)} KB`);
        console.log(`   Total Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
      } catch (err) {
        console.log(`   Stats: Unable to retrieve (${err.message})`);
      }      
      console.log('\n   Existing Indexes:');
      indexes.forEach((index, i) => {
        const keys = Object.keys(index.key).map(k => `${k}: ${index.key[k]}`).join(', ');
        const unique = index.unique ? ' [UNIQUE]' : '';
        const sparse = index.sparse ? ' [SPARSE]' : '';
        console.log(`      ${i + 1}. ${index.name}${unique}${sparse}`);
        console.log(`         Keys: { ${keys} }`);
      });
      
      // Recommendations based on collection name
      const collRecommendations = getRecommendations(collectionName, indexes);
      if (collRecommendations.length > 0) {
        console.log('\n   ⚠️  Recommendations:');
        collRecommendations.forEach(rec => {
          console.log(`      - ${rec}`);
          recommendations.push({ collection: collectionName, recommendation: rec });
        });
      } else {
        console.log('\n   ✅ No additional indexes recommended');
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 SUMMARY OF RECOMMENDATIONS');
    console.log('='.repeat(80));
    
    if (recommendations.length > 0) {
      console.log(`\nTotal Recommendations: ${recommendations.length}\n`);
      recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. [${rec.collection}] ${rec.recommendation}`);
      });
    } else {
      console.log('\n✅ All collections have optimal indexes!');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📚 BEST PRACTICES');
    console.log('='.repeat(80));
    console.log(`
1. Compound Indexes: Put most selective field first
2. Sort Performance: Add index on sort fields
3. Covered Queries: Include all query fields in index
4. Text Search: Use text index for full-text search
5. TTL Indexes: Auto-expire documents (logs, sessions)
6. Partial Indexes: Index subset with filter expression
7. Monitor: Use explain() to verify index usage
8. Remove Unused: Drop indexes that are never used
    `);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Analysis complete. Database connection closed.');
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
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { analyzeIndexes };
