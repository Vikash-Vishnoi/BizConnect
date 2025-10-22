// 🚀 SETUP CUSTOM CAMPAIGN WITH TEMPLATE
// Creates template and campaign in MongoDB, then sends customized WhatsApp message

const mongoose = require('mongoose');
const Template = require('./models/Template');
const Campaign = require('./models/Campaign');
const User = require('./models/User');

const MONGODB_URI = 'mongodb://localhost:27017/whatsapp-marketing';

async function setupCustomCampaign() {
  try {
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    // ==========================================
    // STEP 1: Create Admin User (if not exists)
    // ==========================================
    console.log('📝 Step 1: Creating Admin User...');
    let adminUser = await User.findOne({ email: 'admin@whatsappmarketing.com' });
    
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@whatsappmarketing.com',
        password: 'admin123', // Will be hashed by model
        role: 'admin'
      });
      console.log('✅ Admin user created!');
    } else {
      console.log('✅ Admin user already exists!');
    }
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: admin123\n`);

    // ==========================================
    // STEP 2: Create Hello World Template
    // ==========================================
    console.log('📝 Step 2: Creating "hello_world" Template...');
    
    // Delete old template if exists
    await Template.deleteOne({ name: 'hello_world' });
    
    const template = await Template.create({
      name: 'hello_world',
      whatsappTemplateId: 'hello_world',
      language: 'en_US',
      category: 'UTILITY',
      status: 'approved',
      content: 'Hello World! This is a test message from WhatsApp Marketing App.',
      components: [
        {
          type: 'BODY',
          text: 'Hello World! This is a test message from WhatsApp Marketing App.'
        }
      ],
      userId: adminUser._id
    });
    
    console.log('✅ Template created!');
    console.log(`   Name: ${template.name}`);
    console.log(`   Language: ${template.language}`);
    console.log(`   Status: ${template.status}`);
    console.log(`   ID: ${template._id}\n`);

    // ==========================================
    // STEP 3: Create Custom Campaign
    // ==========================================
    console.log('📝 Step 3: Creating Custom Campaign...');
    
    const campaignName = `Custom Test Campaign - ${new Date().toLocaleString()}`;
    
    const campaign = await Campaign.create({
      name: campaignName,
      templateId: template._id,
      recipients: [
        {
          name: 'Test User',
          phoneNumber: '919509545832', // Your real WhatsApp number
          variables: {}, // hello_world doesn't need variables
          status: 'pending'
        }
      ],
      scheduledAt: new Date(),
      status: 'draft',
      userId: adminUser._id
    });
    
    console.log('✅ Campaign created!');
    console.log(`   Name: ${campaign.name}`);
    console.log(`   Template: hello_world`);
    console.log(`   Recipients: 1`);
    console.log(`   Status: ${campaign.status}`);
    console.log(`   Campaign ID: ${campaign._id}\n`);

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('╔════════════════════════════════════════╗');
    console.log('║   ✅ SETUP COMPLETE!                   ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    console.log('📋 WHAT WAS CREATED:\n');
    console.log('   1. ✅ Admin User');
    console.log('      Email: admin@whatsappmarketing.com');
    console.log('      Password: admin123\n');
    
    console.log('   2. ✅ Template: hello_world');
    console.log(`      Template ID: ${template._id}`);
    console.log('      Language: en_US');
    console.log('      Status: approved\n');
    
    console.log('   3. ✅ Campaign: Custom Test Campaign');
    console.log(`      Campaign ID: ${campaign._id}`);
    console.log('      Recipients: 919509545832');
    console.log('      Status: draft (ready to start)\n');

    console.log('🚀 NEXT STEPS:\n');
    console.log('   Run: node send-custom-campaign.js');
    console.log('   This will start the campaign and send WhatsApp message!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupCustomCampaign();
