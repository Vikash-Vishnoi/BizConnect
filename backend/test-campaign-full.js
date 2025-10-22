// 🚀 COMPLETE CAMPAIGN TESTING SCRIPT
// Tests campaign creation, execution, and WhatsApp message delivery

const axios = require('axios');

// ========================================
// 📱 YOUR WHATSAPP CREDENTIALS
// ========================================
// UPDATE THESE WITH YOUR REAL VALUES FROM META DEVELOPERS
const whatsappConfig = {
  phoneNumberId: "897748750080236",  // Your Phone Number ID
  accessToken: "EAAPZC8l3lKYoBP3KGR95wvk2ZAoQSDebwqEZCNKXDLMgZCJNKEUZAZASKPFxZC981VyoIldg2jwXI8NEuVWkZCVBnCDh6bZC9TQtSQ7EsRLMTSbBHCNVkifd6vWYh60lisaJseAIkjrj0lXgVb7ZBGDoK7bCGVSkArA6ZAnKDg06dXpoj0nw6ZBzMolWWDZAzbwZA6yyCZA8RtbiYKLgfiZBPIfm8nqzs33HIlF6nEcMIZBNTp61AuidAwgZDZD",
  templateName: "hello_world"  // Must be an APPROVED template in your Meta account
};

// ========================================
// 📞 YOUR REAL WHATSAPP NUMBER FOR TESTING
// ========================================
// Format: Country code + number (no spaces, no +)
// Example: 919509545832 for India
const testPhone = "919509545832";  // UPDATE THIS WITH YOUR NUMBER

const API_URL = 'http://localhost:3000/api';
let authToken = '';
let campaignId = '';
let templateId = '';

// ========================================
// 🧪 TEST FUNCTIONS
// ========================================

async function login() {
  console.log('\n📝 Step 1: Login...');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@whatsappmarketing.com',
      password: 'admin123'
    });
    
    authToken = response.data.token;
    console.log('✅ Login successful!');
    console.log(`   User: ${response.data.user.name}`);
    console.log(`   Email: ${response.data.user.email}`);
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function checkTemplates() {
  console.log('\n📝 Step 2: Check Available Templates...');
  try {
    const response = await axios.get(`${API_URL}/templates`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const templates = response.data.templates || [];
    console.log(`✅ Found ${templates.length} templates`);
    
    if (templates.length > 0) {
      console.log('\n   Available Templates:');
      templates.forEach((tpl, index) => {
        console.log(`   ${index + 1}. ${tpl.name} (${tpl.status}) - ${tpl.category}`);
        if (tpl.status === 'approved' && !templateId) {
          templateId = tpl._id;
        }
      });
      
      if (templateId) {
        console.log(`\n   ✅ Using template ID: ${templateId}`);
      } else {
        console.log('\n   ⚠️  No approved templates found. Creating test template...');
        await createTestTemplate();
      }
    } else {
      console.log('   ⚠️  No templates found. Creating test template...');
      await createTestTemplate();
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to fetch templates:', error.response?.data || error.message);
    return false;
  }
}

async function createTestTemplate() {
  console.log('\n   Creating test template...');
  try {
    const response = await axios.post(
      `${API_URL}/templates`,
      {
        name: 'test_campaign_' + Date.now(),
        category: 'UTILITY',
        language: 'en',
        components: [
          {
            type: 'BODY',
            text: 'Hello! This is a test campaign message from WhatsApp Marketing App.'
          }
        ]
      },
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    
    templateId = response.data.template._id;
    console.log(`   ✅ Template created: ${response.data.template.name}`);
    console.log(`   ⚠️  Note: Template needs WhatsApp approval before use`);
    return true;
  } catch (error) {
    console.error('   ❌ Failed to create template:', error.response?.data || error.message);
    return false;
  }
}

async function createCampaign() {
  console.log('\n📝 Step 3: Create Test Campaign...');
  try {
    const campaignData = {
      name: `Test Campaign - ${new Date().toLocaleString()}`,
      description: 'Testing campaign with my real WhatsApp number',
      templateId: templateId || null,
      message: 'Hello! This is a test campaign message. If you receive this, the campaign module is working! 🎉',
      recipients: [
        {
          phoneNumber: testPhone,
          name: 'Test Recipient',
          variables: {}
        }
      ],
      settings: {
        sendRate: 1,  // 1 message per minute (very slow for testing)
        retryFailed: false,
        maxRetries: 0
      },
      scheduledAt: null  // Send immediately
    };
    
    const response = await axios.post(
      `${API_URL}/campaigns`,
      campaignData,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    
    campaignId = response.data.campaign._id;
    console.log('✅ Campaign created successfully!');
    console.log(`   Campaign ID: ${campaignId}`);
    console.log(`   Name: ${response.data.campaign.name}`);
    console.log(`   Status: ${response.data.campaign.status}`);
    console.log(`   Recipients: ${response.data.campaign.recipients.length}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to create campaign:', error.response?.data || error.message);
    return false;
  }
}

async function startCampaign() {
  console.log('\n📝 Step 4: Start Campaign...');
  try {
    const response = await axios.post(
      `${API_URL}/campaigns/${campaignId}/start`,
      {},
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    
    console.log('✅ Campaign started!');
    console.log(`   Status: ${response.data.campaign.status}`);
    console.log(`   Started At: ${new Date(response.data.campaign.startedAt).toLocaleString()}`);
    console.log('\n   📱 Check your WhatsApp now! Message should arrive within 2 minutes...');
    return true;
  } catch (error) {
    console.error('❌ Failed to start campaign:', error.response?.data || error.message);
    return false;
  }
}

async function monitorCampaign() {
  console.log('\n📝 Step 5: Monitor Campaign Progress...');
  
  const checkInterval = 5000; // Check every 5 seconds
  const maxChecks = 24; // Monitor for 2 minutes (24 * 5s = 120s)
  let checks = 0;
  
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      checks++;
      
      try {
        const response = await axios.get(
          `${API_URL}/campaigns/${campaignId}`,
          {
            headers: { 'Authorization': `Bearer ${authToken}` }
          }
        );
        
        const campaign = response.data.campaign;
        const progress = campaign.recipients.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {});
        
        console.log(`\n   [${checks}/${maxChecks}] Status: ${campaign.status}`);
        console.log(`   Pending: ${progress.pending || 0}`);
        console.log(`   Sent: ${progress.sent || 0}`);
        console.log(`   Delivered: ${progress.delivered || 0}`);
        console.log(`   Failed: ${progress.failed || 0}`);
        console.log(`   Read: ${progress.read || 0}`);
        
        // Check if campaign completed
        if (campaign.status === 'completed' || progress.sent >= 1 || progress.delivered >= 1) {
          console.log('\n✅ Campaign completed or message sent!');
          clearInterval(interval);
          resolve(true);
        }
        
        // Stop after max checks
        if (checks >= maxChecks) {
          console.log('\n⏰ Monitoring timeout reached');
          clearInterval(interval);
          resolve(true);
        }
        
      } catch (error) {
        console.error('   ⚠️  Error fetching campaign:', error.response?.data || error.message);
      }
    }, checkInterval);
  });
}

async function getCampaignStats() {
  console.log('\n📝 Step 6: Final Campaign Statistics...');
  try {
    const response = await axios.get(
      `${API_URL}/campaigns/${campaignId}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    
    const campaign = response.data.campaign;
    
    console.log('\n📊 CAMPAIGN RESULTS:');
    console.log('═══════════════════════════════════════');
    console.log(`Campaign Name: ${campaign.name}`);
    console.log(`Status: ${campaign.status}`);
    console.log(`Created: ${new Date(campaign.createdAt).toLocaleString()}`);
    console.log(`Started: ${campaign.startedAt ? new Date(campaign.startedAt).toLocaleString() : 'Not started'}`);
    console.log(`Completed: ${campaign.completedAt ? new Date(campaign.completedAt).toLocaleString() : 'Not completed'}`);
    console.log('\nRecipients:');
    campaign.recipients.forEach((r, index) => {
      console.log(`  ${index + 1}. ${r.name || r.phoneNumber}`);
      console.log(`     Phone: ${r.phoneNumber}`);
      console.log(`     Status: ${r.status}`);
      if (r.sentAt) console.log(`     Sent: ${new Date(r.sentAt).toLocaleString()}`);
      if (r.deliveredAt) console.log(`     Delivered: ${new Date(r.deliveredAt).toLocaleString()}`);
      if (r.failedReason) console.log(`     Error: ${r.failedReason}`);
    });
    console.log('═══════════════════════════════════════\n');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to get campaign stats:', error.response?.data || error.message);
    return false;
  }
}

// ========================================
// 🎯 MAIN TEST EXECUTION
// ========================================

async function runFullCampaignTest() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   📢 CAMPAIGN MODULE TESTING           ║');
  console.log('╚════════════════════════════════════════╝');
  
  console.log('\n📱 Configuration:');
  console.log(`   Phone ID: ${whatsappConfig.phoneNumberId}`);
  console.log(`   Template: ${whatsappConfig.templateName}`);
  console.log(`   Test Number: ${testPhone}`);
  console.log(`   Backend: ${API_URL}`);
  
  // Step 1: Login
  if (!await login()) {
    console.log('\n❌ Test failed: Cannot login');
    return;
  }
  
  // Step 2: Check Templates
  if (!await checkTemplates()) {
    console.log('\n❌ Test failed: Cannot fetch templates');
    return;
  }
  
  // Step 3: Create Campaign
  if (!await createCampaign()) {
    console.log('\n❌ Test failed: Cannot create campaign');
    return;
  }
  
  // Step 4: Start Campaign
  if (!await startCampaign()) {
    console.log('\n❌ Test failed: Cannot start campaign');
    return;
  }
  
  // Step 5: Monitor Progress
  await monitorCampaign();
  
  // Step 6: Get Final Stats
  await getCampaignStats();
  
  // Success Summary
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   ✅ CAMPAIGN TEST COMPLETED           ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  console.log('📋 WHAT TO CHECK:');
  console.log('   1. ✅ Campaign created successfully');
  console.log('   2. ✅ Campaign started (status = active/completed)');
  console.log('   3. 📱 Check your WhatsApp for the message');
  console.log('   4. ✅ Campaign progress tracked correctly\n');
  
  console.log('📱 NEXT STEPS:');
  console.log('   • Open WhatsApp on your phone');
  console.log(`   • Look for message from ${whatsappConfig.phoneNumberId}`);
  console.log('   • Verify the message content matches the campaign');
  console.log('   • Check the app\'s campaign details screen\n');
}

// Run the test
runFullCampaignTest().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
