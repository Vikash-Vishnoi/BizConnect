/**
 * Database Performance Optimization Script
 * Creates indexes for frequently queried fields
 * Run this once on production database after deployment
 */

require('dotenv').config();
const mongoose = require('mongoose');

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
const AUDIT_LOG_TTL_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90;

const indexes = [
  // User Model Indexes
  {
    collection: 'users',
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
    collection: 'businesses',
    indexes: [
      { keys: { businessPhoneNumberId: 1 }, options: { unique: true, sparse: true } },
      { keys: { status: 1 }, options: {} },
      { keys: { createdAt: -1 }, options: {} }
    ]
  },
  
  // Conversation Model Indexes
  {
    collection: 'conversations',
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
    collection: 'campaigns',
    indexes: [
      { keys: { businessId: 1, createdAt: -1 }, options: {} },
      { keys: { businessId: 1, status: 1 }, options: {} },
      { keys: { status: 1, scheduledAt: 1 }, options: {} },
      { keys: { createdAt: -1 }, options: {} }
    ]
  },
  
  // Template Model Indexes
  {
    collection: 'templates',
    indexes: [
      { keys: { businessId: 1, status: 1 }, options: {} },
      { keys: { businessId: 1, category: 1 }, options: {} },
      { keys: { name: 1, businessId: 1 }, options: {} },
      { keys: { status: 1 }, options: {} }
    ]
  },
  
  // Flow Model Indexes
  {
    collection: 'flows',
    indexes: [
      { keys: { businessId: 1, isActive: 1 }, options: {} },
      { keys: { businessId: 1, createdAt: -1 }, options: {} }
    ]
  },
  
  // AuditLog Model Indexes
  {
    collection: 'auditlogs',
    indexes: [
      { keys: { businessId: 1, timestamp: -1 }, options: {} },
      { keys: { userId: 1, timestamp: -1 }, options: {} },
      { keys: { action: 1, timestamp: -1 }, options: {} },
      { keys: { timestamp: -1 }, options: { expireAfterSeconds: AUDIT_LOG_TTL_DAYS * 24 * 60 * 60 } }
    ]
  },
  
  // Analytics Model Indexes
  {
    collection: 'analytics',
    indexes: [
      { keys: { businessId: 1, date: -1 }, options: {} },
      { keys: { businessId: 1, metricType: 1, date: -1 }, options: {} }
    ]
  }
];

async function createIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');
    
    const db = mongoose.connection.db;
    let successCount = 0;
    let errorCount = 0;
    
    for (const { collection, indexes: collectionIndexes } of indexes) {
      console.log(`📋 Processing collection: ${collection}`);
      
      const coll = db.collection(collection);
      
      for (const { keys, options } of collectionIndexes) {
        try {
          const indexName = Object.keys(keys).join('_');
          await coll.createIndex(keys, options);
          console.log(`  ✅ Created index: ${indexName}`);
          successCount++;
        } catch (error) {
          if (error.code === 85 || error.codeName === 'IndexOptionsConflict' || 
              error.code === 86 || error.codeName === 'IndexKeySpecsConflict') {
            console.log(`  ℹ️  Index already exists: ${Object.keys(keys).join('_')}`);
            successCount++;
          } else {
            console.log(`  ❌ Error creating index: ${error.message}`);
            errorCount++;
          }
        }
      }
      
      console.log('');
    }
    
    console.log('========================================');
    console.log(`✅ Indexes created successfully: ${successCount}`);
    console.log(`❌ Errors encountered: ${errorCount}`);
    console.log('========================================\n');
    
    // Show existing indexes for verification
    console.log('📊 Verifying indexes...\n');
    for (const { collection } of indexes) {
      const coll = db.collection(collection);
      const existingIndexes = await coll.indexes();
      console.log(`${collection}: ${existingIndexes.length} indexes`);
    }
    
    console.log('\n✅ Database optimization complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

createIndexes();
