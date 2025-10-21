// Test Backend API Endpoints
// Run this file with: node test-api.js

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

async function testAPI() {
  console.log('🧪 Testing WhatsApp Marketing App Backend API\n');

  try {
    // 1. Test Health Check
    console.log('1️⃣ Testing health endpoint...');
    const health = await axios.get('http://localhost:3000/health');
    console.log('✅ Health check passed:', health.data);
    console.log('');

    // 2. Test User Registration
    console.log('2️⃣ Testing user registration...');
    const registerData = {
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      phone: '+1234567890'
    };
    
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, registerData);
    authToken = registerResponse.data.token;
    console.log('✅ User registered successfully');
    console.log('   User ID:', registerResponse.data.user.id);
    console.log('   Email:', registerResponse.data.user.email);
    console.log('   Token:', authToken.substring(0, 20) + '...');
    console.log('');

    // Set auth header for subsequent requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

    // 3. Test Get Current User
    console.log('3️⃣ Testing get current user...');
    const meResponse = await axios.get(`${BASE_URL}/auth/me`);
    console.log('✅ Current user retrieved');
    console.log('   Name:', meResponse.data.user.name);
    console.log('   Email:', meResponse.data.user.email);
    console.log('');

    // 4. Test Create Campaign
    console.log('4️⃣ Testing create campaign...');
    const campaignData = {
      name: 'Test Campaign',
      description: 'This is a test campaign',
      message: 'Hello! This is a test message.',
      recipients: [
        { phoneNumber: '+1234567890', name: 'Test Recipient' }
      ]
    };
    
    const campaignResponse = await axios.post(`${BASE_URL}/campaigns`, campaignData);
    console.log('✅ Campaign created successfully');
    console.log('   Campaign ID:', campaignResponse.data.campaign._id);
    console.log('   Name:', campaignResponse.data.campaign.name);
    console.log('   Status:', campaignResponse.data.campaign.status);
    console.log('');

    // 5. Test Get Campaigns
    console.log('5️⃣ Testing get campaigns...');
    const campaignsResponse = await axios.get(`${BASE_URL}/campaigns`);
    console.log('✅ Campaigns retrieved');
    console.log('   Total campaigns:', campaignsResponse.data.total);
    console.log('');

    // 6. Test Create Template
    console.log('6️⃣ Testing create template...');
    const templateData = {
      name: 'Test Template',
      category: 'MARKETING',
      language: 'en',
      components: [
        {
          type: 'BODY',
          text: 'Hello {{1}}, welcome to our service! Your order {{2}} is confirmed.'
        }
      ],
      variables: [
        { name: '1', description: 'Customer Name', example: 'John' },
        { name: '2', description: 'Order Number', example: '#12345' }
      ]
    };
    
    const templateResponse = await axios.post(`${BASE_URL}/templates`, templateData);
    console.log('✅ Template created successfully');
    console.log('   Template ID:', templateResponse.data.template._id);
    console.log('   Name:', templateResponse.data.template.name);
    console.log('   Status:', templateResponse.data.template.status);
    console.log('');

    // 7. Test Get Templates
    console.log('7️⃣ Testing get templates...');
    const templatesResponse = await axios.get(`${BASE_URL}/templates`);
    console.log('✅ Templates retrieved');
    console.log('   Total templates:', templatesResponse.data.total);
    console.log('');

    // 8. Test Get Analytics Dashboard
    console.log('8️⃣ Testing analytics dashboard...');
    const analyticsResponse = await axios.get(`${BASE_URL}/analytics/dashboard`);
    console.log('✅ Analytics retrieved');
    console.log('   Total campaigns:', analyticsResponse.data.overview.totalCampaigns);
    console.log('   Total messages:', analyticsResponse.data.overview.totalMessages);
    console.log('   Total conversations:', analyticsResponse.data.overview.totalConversations);
    console.log('');

    console.log('🎉 All API tests passed successfully!\n');
    console.log('Your backend is working correctly and ready to use.');
    console.log('');
    console.log('📝 Save this token for manual API testing:');
    console.log(authToken);
    console.log('');
    console.log('Next steps:');
    console.log('1. Fill in WhatsApp credentials in backend/.env');
    console.log('2. Start your React Native app');
    console.log('3. Login with the email and password you created');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Make sure backend server is running (npm run dev in backend folder)');
    console.log('2. Check if MongoDB is running');
    console.log('3. Verify .env file is configured correctly');
    process.exit(1);
  }
}

// Run tests
console.log('⏳ Starting API tests...\n');
testAPI();
