// 🚀 SEND CUSTOM CAMPAIGN
// Starts the campaign and sends customized WhatsApp message

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
let authToken = '';
let campaignId = '';

async function sendCustomCampaign() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   📢 CUSTOM CAMPAIGN SENDER            ║');
    console.log('╚════════════════════════════════════════╝\n');

    // ==========================================
    // STEP 1: Login
    // ==========================================
    console.log('📝 Step 1: Login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@whatsappmarketing.com',
      password: 'admin123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful!');
    console.log(`   User: ${loginResponse.data.user.name}`);
    console.log(`   Email: ${loginResponse.data.user.email}\n`);

    // ==========================================
    // STEP 2: Get Latest Campaign
    // ==========================================
    console.log('📝 Step 2: Finding Latest Campaign...');
    const campaignsResponse = await axios.get(`${API_URL}/campaigns`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const campaigns = campaignsResponse.data.campaigns || [];
    if (campaigns.length === 0) {
      console.error('❌ No campaigns found! Run setup-custom-campaign.js first.');
      process.exit(1);
    }
    
    // Get the most recent draft campaign
    const draftCampaign = campaigns.find(c => c.status === 'draft') || campaigns[0];
    campaignId = draftCampaign._id;
    
    console.log('✅ Campaign found!');
    console.log(`   Campaign ID: ${campaignId}`);
    console.log(`   Name: ${draftCampaign.name}`);
    console.log(`   Status: ${draftCampaign.status}`);
    console.log(`   Recipients: ${draftCampaign.recipients?.length || 0}\n`);

    // ==========================================
    // STEP 3: Start Campaign
    // ==========================================
    console.log('📝 Step 3: Starting Campaign...');
    console.log('   📱 Sending WhatsApp message...\n');
    
    const startResponse = await axios.post(
      `${API_URL}/campaigns/${campaignId}/start`,
      {},
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );
    
    console.log('✅ Campaign started!');
    console.log(`   Status: ${startResponse.data.campaign.status}`);
    console.log(`   Started At: ${new Date(startResponse.data.campaign.startedAt).toLocaleString()}\n`);

    // ==========================================
    // STEP 4: Monitor Progress
    // ==========================================
    console.log('📝 Step 4: Monitoring Campaign Progress...\n');
    
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes (5 second intervals)
    let campaignComplete = false;
    
    while (attempts < maxAttempts && !campaignComplete) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;
      
      const statusResponse = await axios.get(
        `${API_URL}/campaigns/${campaignId}`,
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );
      
      const campaign = statusResponse.data.campaign;
      const stats = campaign.stats || { pending: 0, sent: 0, delivered: 0, failed: 0, read: 0 };
      
      console.log(`   [${attempts}/${maxAttempts}] Status: ${campaign.status}`);
      console.log(`   Pending: ${stats.pending} | Sent: ${stats.sent} | Delivered: ${stats.delivered} | Failed: ${stats.failed} | Read: ${stats.read}`);
      
      // Check if complete
      if (campaign.status === 'completed' || stats.sent > 0 || stats.delivered > 0 || stats.failed > 0) {
        campaignComplete = true;
        console.log('\n✅ Campaign completed or message sent!\n');
        
        // Show recipient details
        if (campaign.recipients && campaign.recipients.length > 0) {
          console.log('📊 RECIPIENT DETAILS:\n');
          campaign.recipients.forEach((recipient, index) => {
            console.log(`   ${index + 1}. ${recipient.name || 'Unknown'}`);
            console.log(`      Phone: ${recipient.phoneNumber}`);
            console.log(`      Status: ${recipient.status}`);
            if (recipient.status === 'sent') {
              console.log(`      ✅ Message sent successfully!`);
              console.log(`      Sent At: ${new Date(recipient.sentAt).toLocaleString()}`);
              if (recipient.whatsappMessageId) {
                console.log(`      WhatsApp Message ID: ${recipient.whatsappMessageId}`);
              }
            } else if (recipient.status === 'failed') {
              console.log(`      ❌ Failed: ${recipient.failedReason || 'Unknown error'}`);
            }
            console.log('');
          });
        }
        break;
      }
    }

    // ==========================================
    // FINAL RESULTS
    // ==========================================
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   ✅ CAMPAIGN TEST COMPLETED           ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    const finalResponse = await axios.get(
      `${API_URL}/campaigns/${campaignId}`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );
    
    const finalCampaign = finalResponse.data.campaign;
    const finalStats = finalCampaign.stats || {};
    
    console.log('📊 FINAL CAMPAIGN STATISTICS:\n');
    console.log(`   Campaign: ${finalCampaign.name}`);
    console.log(`   Status: ${finalCampaign.status}`);
    console.log(`   Total Recipients: ${finalCampaign.recipients?.length || 0}`);
    console.log(`   Sent: ${finalStats.sent || 0}`);
    console.log(`   Delivered: ${finalStats.delivered || 0}`);
    console.log(`   Failed: ${finalStats.failed || 0}`);
    console.log(`   Read: ${finalStats.read || 0}\n`);

    if (finalStats.sent > 0) {
      console.log('🎉 SUCCESS! WhatsApp message sent!\n');
      console.log('📱 CHECK YOUR WHATSAPP NOW!\n');
      console.log('   You should have received a "Hello World" message\n');
    } else if (finalStats.failed > 0) {
      console.log('⚠️  Message failed to send. Check the error details above.\n');
    } else {
      console.log('⏳ Campaign is still processing. Check backend logs for details.\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('\nFull error details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

sendCustomCampaign();
