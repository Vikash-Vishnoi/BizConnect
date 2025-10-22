// Quick test for creating a new conversation
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testCreateConversation() {
  try {
    console.log('🔐 Testing: Login...');
    
    // Login first
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@whatsappmarketing.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful!');
    console.log('Token:', token.substring(0, 20) + '...\n');

    // Test creating a new conversation
    console.log('📱 Testing: Create new conversation...');
    const createResponse = await axios.post(
      `${API_URL}/conversations`,
      {
        phoneNumber: '919509545832',
        name: 'Test User'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Conversation created successfully!');
    console.log('Conversation ID:', createResponse.data.conversation._id);
    console.log('Phone Number:', createResponse.data.conversation.phoneNumber);
    console.log('Name:', createResponse.data.conversation.name);

    // Try to list all conversations
    console.log('\n📋 Testing: List all conversations...');
    const listResponse = await axios.get(`${API_URL}/conversations`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Total conversations:', listResponse.data.conversations.length);
    listResponse.data.conversations.forEach((conv, index) => {
      console.log(`  ${index + 1}. ${conv.name} (${conv.phoneNumber}) - ${conv.status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testCreateConversation();
