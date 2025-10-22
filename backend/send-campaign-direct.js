// 🚀 STANDALONE CUSTOM CAMPAIGN SENDER
// Sends WhatsApp campaign messages directly via WhatsApp API (bypasses backend)
// Uses MongoDB to track campaign, but sends messages directly

const axios = require('axios');
const mongoose = require('mongoose');
const Campaign = require('./models/Campaign');
const Template = require('./models/Template');
const User = require('./models/User');

// ==========================================
// WHATSAPP CONFIGURATION
// ==========================================
const WHATSAPP_CONFIG = {
  phoneNumberId: '897748750080236',
  accessToken: 'EAAPZC8l3lKYoBP5Ids7KmZAMiZAOABDvKPusSIXTVYd83t8SQVbEFopxSu1HSz9u55iZCo6dyFEhn6Fs3h5lb36MaLLr4ppZAiEUJWaqqs57xdfcGeG2ZAhgbxO6JbZBK4WxFVFT4i5wcFklDLvro1HUoSbJJbLPQb6Q9Rmi7II52FDcGh43MkP4E9DeJ4eOXwo7CrXN9X1Ehgv1kNwSUFON4WMBOSx3ueuRZBBP0ZAmjw8ZA2mq8ZD',
  apiVersion: 'v22.0'
};

const MONGODB_URI = 'mongodb://localhost:27017/whatsapp-marketing';

// ==========================================
// WHATSAPP API FUNCTIONS
// ==========================================
async function sendWhatsAppTemplateMessage(phoneNumber, templateName, languageCode) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/${WHATSAPP_CONFIG.apiVersion}/${WHATSAPP_CONFIG.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      messageId: response.data.messages[0].id,
      status: response.data.messages[0].message_status
    };
  } catch (error) {
    console.error('❌ WhatsApp API Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || { message: error.message }
    };
  }
}

// ==========================================
// MAIN CAMPAIGN SENDER
// ==========================================
async function runCustomCampaign() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   📢 CUSTOM CAMPAIGN SENDER            ║');
    console.log('║   (Direct WhatsApp API)                ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    // Get admin user
    const adminUser = await User.findOne({ email: 'admin@whatsappmarketing.com' });
    if (!adminUser) {
      console.error('❌ Admin user not found! Run setup-custom-campaign.js first.');
      process.exit(1);
    }

    // Get hello_world template
    const template = await Template.findOne({ name: 'hello_world' });
    if (!template) {
      console.error('❌ hello_world template not found! Run setup-custom-campaign.js first.');
      process.exit(1);
    }

    console.log('📝 Template Information:');
    console.log(`   Name: ${template.name}`);
    console.log(`   Language: ${template.language}`);
    console.log(`   Status: ${template.status}\n`);

    // Get latest draft campaign
    const campaign = await Campaign.findOne({ 
      status: { $in: ['draft', 'active'] },
      userId: adminUser._id
    }).sort({ createdAt: -1 });

    if (!campaign) {
      console.error('❌ No campaign found! Run setup-custom-campaign.js first.');
      process.exit(1);
    }

    console.log('📝 Campaign Information:');
    console.log(`   Name: ${campaign.name}`);
    console.log(`   Recipients: ${campaign.recipients.length}`);
    console.log(`   Status: ${campaign.status}\n`);

    // Update campaign to active
    campaign.status = 'active';
    campaign.startedAt = new Date();
    await campaign.save();

    console.log('📱 Sending WhatsApp Messages...\n');

    // Send to each recipient
    for (let i = 0; i < campaign.recipients.length; i++) {
      const recipient = campaign.recipients[i];
      
      console.log(`   ${i + 1}. Sending to ${recipient.phoneNumber} (${recipient.name})...`);
      
      const result = await sendWhatsAppTemplateMessage(
        recipient.phoneNumber,
        template.name,
        template.language
      );

      if (result.success) {
        console.log(`      ✅ SUCCESS!`);
        console.log(`      Message ID: ${result.messageId}`);
        console.log(`      Status: ${result.status}\n`);
        
        // Update recipient in campaign
        campaign.recipients[i].status = 'sent';
        campaign.recipients[i].sentAt = new Date();
        campaign.recipients[i].whatsappMessageId = result.messageId;
      } else {
        console.log(`      ❌ FAILED!`);
        console.log(`      Error: ${result.error.message || 'Unknown error'}`);
        if (result.error.code) {
          console.log(`      Error Code: ${result.error.code}`);
        }
        console.log('');
        
        // Update recipient in campaign
        campaign.recipients[i].status = 'failed';
        campaign.recipients[i].failedReason = result.error.message || 'Unknown error';
      }

      await campaign.save();
      
      // Wait 1 second between messages
      if (i < campaign.recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update campaign status
    const stats = campaign.getProgress();
    if (stats.pending === 0) {
      campaign.status = 'completed';
      campaign.completedAt = new Date();
      await campaign.save();
    }

    // Show final results
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   ✅ CAMPAIGN COMPLETED!               ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('📊 FINAL STATISTICS:\n');
    console.log(`   Campaign: ${campaign.name}`);
    console.log(`   Status: ${campaign.status}`);
    console.log(`   Total Recipients: ${campaign.recipients.length}`);
    console.log(`   Sent: ${stats.sent}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Pending: ${stats.pending}\n`);

    if (stats.sent > 0) {
      console.log('🎉 SUCCESS! WhatsApp message(s) sent!\n');
      console.log('📱 CHECK YOUR WHATSAPP NOW!\n');
      console.log('   You should have received a "Hello World" message!\n');
    } else {
      console.log('⚠️ All messages failed. Check errors above.\n');
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runCustomCampaign();
