/**
 * Database Initialization Script
 * 
 * Run this script to:
 * - Create all optimal database indexes
 * - Verify database connection
 * - Check database health
 * 
 * Usage: node scripts/initializeDatabase.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DatabaseOptimizationService = require('../services/databaseOptimizationService');

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function initializeDatabase() {
  try {
    log('\n╔════════════════════════════════════════════╗', 'cyan');
    log('║   WhatsApp Marketing - Database Setup     ║', 'cyan');
    log('╚════════════════════════════════════════════╝\n', 'cyan');

    // Check environment variables
    if (!process.env.MONGODB_URI) {
      log('❌ Error: MONGODB_URI not found in environment variables', 'red');
      log('Please ensure .env file exists with MONGODB_URI', 'yellow');
      process.exit(1);
    }

    log('📡 Connecting to MongoDB...', 'blue');
    log(`   URI: ${process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`, 'blue');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    log('✅ MongoDB connected successfully!\n', 'green');

    // Check database status
    log('📊 Database Information:', 'blue');
    const dbName = mongoose.connection.db.databaseName;
    log(`   Database: ${dbName}`, 'blue');
    log(`   Host: ${mongoose.connection.host}`, 'blue');
    log(`   Status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`, 'blue');
    console.log('');

    // Create indexes
    log('🔧 Creating optimal database indexes...', 'yellow');
    log('   This may take a few moments...\n', 'yellow');

    const indexResult = await DatabaseOptimizationService.createOptimalIndexes();

    if (indexResult.success) {
      log('✅ All indexes created successfully!\n', 'green');
    }

    // Get database statistics
    log('📈 Gathering database statistics...', 'blue');
    const stats = await DatabaseOptimizationService.getDatabaseStats();

    log('\n📊 Database Statistics:', 'cyan');
    log('─────────────────────────────────────────', 'cyan');
    
    // Collections
    log('\nCollections:', 'bright');
    const collections = Object.entries(stats.collections);
    collections.forEach(([name, info]) => {
      if (info.error) {
        log(`   ${name}: ${info.error}`, 'red');
      } else {
        log(`   ${name}:`, 'green');
        log(`      Documents: ${info.count.toLocaleString()}`, 'white');
        log(`      Size: ${(info.size / 1024 / 1024).toFixed(2)} MB`, 'white');
        log(`      Indexes: ${info.indexes}`, 'white');
      }
    });

    // Database totals
    if (stats.database) {
      log('\nDatabase Totals:', 'bright');
      log(`   Data Size: ${(stats.database.dataSize / 1024 / 1024).toFixed(2)} MB`, 'white');
      log(`   Index Size: ${(stats.database.indexSize / 1024 / 1024).toFixed(2)} MB`, 'white');
      log(`   Total Size: ${(stats.database.totalSize / 1024 / 1024).toFixed(2)} MB`, 'white');
      log(`   Collections: ${stats.database.collections}`, 'white');
      log(`   Total Indexes: ${stats.database.indexes}`, 'white');
    }

    // Performance analysis
    log('\n🔍 Running performance analysis...', 'blue');
    const analysis = await DatabaseOptimizationService.analyzePerformance();

    if (analysis.recommendations.length > 0) {
      log('\n⚠️  Performance Recommendations:', 'yellow');
      analysis.recommendations.forEach((rec, index) => {
        const severityColor = rec.severity === 'high' ? 'red' : 'yellow';
        log(`\n   ${index + 1}. [${rec.severity.toUpperCase()}]`, severityColor);
        log(`      ${rec.message}`, 'white');
        log(`      Action: ${rec.action}`, 'cyan');
      });
    } else {
      log('\n✅ No performance issues detected!', 'green');
    }

    // Success summary
    log('\n╔════════════════════════════════════════════╗', 'green');
    log('║    Database Initialization Complete!       ║', 'green');
    log('╚════════════════════════════════════════════╝\n', 'green');

    log('Next Steps:', 'bright');
    log('1. Start your backend server: npm start', 'white');
    log('2. Access database optimization routes at /api/database', 'white');
    log('3. Run scheduled maintenance regularly', 'white');

    // Close connection
    await mongoose.connection.close();
    log('\n👋 Database connection closed', 'blue');
    process.exit(0);
  } catch (error) {
    log(`\n❌ Error initializing database: ${error.message}`, 'red');
    log(`Stack trace: ${error.stack}`, 'red');
    process.exit(1);
  }
}

// Run the initialization
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
