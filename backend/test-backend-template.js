// 🚀 DIRECT TEMPLATE MESSAGE TEST VIA BACKEND API
// Tests backend's template message sending directly

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const PHONE_NUMBER = '919509545832'; // Your WhatsApp number

async function testBackendTemplateSending() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   🧪 BACKEND TEMPLATE MESSAGE TEST     ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Login first
    console.log('📝 Step 1: Login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@whatsappmarketing.com',
      password: 'admin123'
    });
    
    const authToken = loginResponse.data.token;
    console.log('✅ Login successful!\n');

    // Get template
    console.log('📝 Step 2: Get hello_world template...');
    const templatesResponse = await axios.get(`${API_URL}/templates`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const templates = templatesResponse.data.templates || [];
    const helloWorldTemplate = templates.find(t => t.name === 'hello_world');
    
    if (!helloWorldTemplate) {
      console.error('❌ hello_world template not found!');
      console.log('Available templates:', templates.map(t => t.name));
      process.exit(1);
    }
    
    console.log('✅ Template found!');
    console.log(`   Name: ${helloWorldTemplate.name}`);
    console.log(`   Language: ${helloWorldTemplate.language}`);
    console.log(`   Template ID: ${helloWorldTemplate._id}\n`);

    // Create a conversation first (required for message sending)
    console.log('📝 Step 3: Create conversation...');
    let conversationResponse;
    try {
      conversationResponse = await axios.post(
        `${API_URL}/conversations`,
        {
          phoneNumber: PHONE_NUMBER,
          name: 'Test User'
        },
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );
      console.log('✅ Conversation created!\n');
    } catch (error) {
      if (error.response?.data?.conversation) {
        conversationResponse = error.response;
        console.log('✅ Conversation already exists!\n');
      } else {
        throw error;
      }
    }
    
    const conversationId = conversationResponse.data.conversation._id;

    // Send template message via backend
    console.log('📝 Step 4: Sending template message via backend...');
    console.log(`   To: ${PHONE_NUMBER}`);
    console.log(`   Template: hello_world\n`);
    
    const messageResponse = await axios.post(
      `${API_URL}/messages`,
      {
        conversationId: conversationId,
        type: 'template',
        templateId: helloWorldTemplate._id,
        templateName: 'hello_world',
        language: 'en_US'
      },
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );

    console.log('✅ MESSAGE SENT SUCCESSFULLY!\n');
    console.log('Response:', JSON.stringify(messageResponse.data, null, 2));
    console.log('\n📱 CHECK YOUR WHATSAPP NOW!\n');
    console.log('   You should have received a "Hello World" message!\n');

  } catch (error) {
    console.error('\n❌ ERROR!\n');
    console.error('Status:', error.response?.status);
    console.error('Error:', JSON.stringify(error.response?.data, null, 2) || error.message);
    
    if (error.response?.status === 500) {
      console.log('\n💡 TIP: Check backend server logs for detailed error');
    }
    
    process.exit(1);
  }
}

testBackendTemplateSending();
