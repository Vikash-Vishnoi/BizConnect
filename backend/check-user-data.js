require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/core/database/models/User');
const Business = require('./src/core/database/models/Business');

async function checkData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-business');
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    console.log('=== USERS ===');
    const users = await User.find({}).select('name email businessId userType');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email})`);
      console.log(`  userType: ${user.userType}`);
      console.log(`  businessId: ${user.businessId || 'NULL'}\n`);
    });

    // Get all businesses
    console.log('\n=== BUSINESSES ===');
    const businesses = await Business.find({}).select('name owner phoneNumberId status setupStep');
    businesses.forEach(business => {
      console.log(`- ${business.name} (${business._id})`);
      console.log(`  owner: ${business.owner}`);
      console.log(`  status: ${business.status}`);
      console.log(`  setupStep: ${business.setupStep}\n`);
    });

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkData();
