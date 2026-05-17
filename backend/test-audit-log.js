require('dotenv').config();
const mongoose = require('mongoose');
const AuditLog = require('./src/core/database/models/AuditLog');

async function testAuditLog() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    // Create test audit logs
    console.log('Creating test LOGIN log...');
    const loginLog = await AuditLog.logAction({
      userId: new mongoose.Types.ObjectId('69386dd49626290524ff1691'), // Your user ID
      businessId: new mongoose.Types.ObjectId('69386e099626290524ff16ab'), // Your business ID
      action: 'LOGIN',
      resourceType: 'USER',
      status: 'SUCCESS',
      impact: {
        level: 'LOW',
        affectedUsers: 0
      }
    });
    console.log('LOGIN log created:', loginLog._id);

    console.log('Creating test LOGOUT log...');
    const logoutLog = await AuditLog.logAction({
      userId: new mongoose.Types.ObjectId('69386dd49626290524ff1691'),
      businessId: new mongoose.Types.ObjectId('69386e099626290524ff16ab'),
      action: 'LOGOUT',
      resourceType: 'USER',
      status: 'SUCCESS',
      impact: {
        level: 'NONE',
        affectedUsers: 0
      }
    });
    console.log('LOGOUT log created:', logoutLog._id);

    console.log('Creating test CAMPAIGN_CREATE log...');
    const campaignLog = await AuditLog.logAction({
      userId: new mongoose.Types.ObjectId('69386dd49626290524ff1691'),
      businessId: new mongoose.Types.ObjectId('69386e099626290524ff16ab'),
      action: 'CAMPAIGN_CREATE',
      resourceType: 'CAMPAIGN',
      resourceId: new mongoose.Types.ObjectId().toString(),
      status: 'SUCCESS',
      impact: {
        level: 'MEDIUM',
        affectedUsers: 0
      }
    });
    console.log('CAMPAIGN_CREATE log created:', campaignLog._id);

    console.log('\nAll logs in DB:');
    const all = await AuditLog.find().sort({ createdAt: -1 }).lean();
    console.log('Total:', all.length);
    
    all.forEach((log, i) => {
      console.log(`\nLog ${i+1}:`, {
        _id: log._id.toString(),
        userId: log.userId?.toString(),
        businessId: log.businessId?.toString(),
        action: log.action,
        status: log.status,
        createdAt: log.createdAt
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testAuditLog();