// Check campaign recipients status
const mongoose = require('mongoose');
const Campaign = require('./models/Campaign');

async function checkCampaign() {
  try {
    await mongoose.connect('mongodb://localhost:27017/whatsapp-marketing');
    
    const campaignId = '68f8f29eb606e60de03496ff';
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      console.log('Campaign not found!');
      process.exit(1);
    }
    
    console.log('\n📊 CAMPAIGN DETAILS:\n');
    console.log(`Campaign: ${campaign.name}`);
    console.log(`Status: ${campaign.status}`);
    console.log(`Total Recipients: ${campaign.recipients.length}\n`);
    
    console.log('📱 RECIPIENTS:\n');
    campaign.recipients.forEach((recipient, index) => {
      console.log(`${index + 1}. Phone: ${recipient.phoneNumber}`);
      console.log(`   Name: ${recipient.name || 'Unknown'}`);
      console.log(`   Status: ${recipient.status}`);
      console.log(`   Sent At: ${recipient.sentAt || 'Not sent'}`);
      console.log(`   WhatsApp Message ID: ${recipient.whatsappMessageId || 'None'}`);
      console.log(`   Error: ${recipient.failedReason || 'None'}`);
      console.log('');
    });
    
    console.log('📈 STATS:');
    const stats = campaign.getProgress();
    console.log(`   Sent: ${stats.sent}`);
    console.log(`   Delivered: ${stats.delivered}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Pending: ${stats.pending}`);
    console.log(`   Total: ${stats.total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCampaign();
