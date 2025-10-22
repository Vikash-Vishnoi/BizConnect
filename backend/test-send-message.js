// Test sending a message to a conversation
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testSendMessage() {
  try {
    console.log('🔐 Logging in...\n');
    
    // Login first
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@whatsappmarketing.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful!\n');

    // Get conversations
    console.log('📋 Fetching conversations...\n');
    const convsResponse = await axios.get(`${API_URL}/conversations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const conversations = convsResponse.data.conversations;
    console.log(`✅ Found ${conversations.length} conversations\n`);

    if (conversations.length === 0) {
      console.log('❌ No conversations found. Create one first.');
      return;
    }

    // Pick the first conversation
    const conversation = conversations[0];
    console.log(`📱 Using conversation: ${conversation.name} (${conversation.phoneNumber})\n`);

    // Send a test message
    console.log('📤 Sending message...\n');
    const messageResponse = await axios.post(
      `${API_URL}/messages`,
      {
        conversationId: conversation._id,
        text: 'Hello! This is a test message from the backend.',
        type: 'text'
      },
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    console.log('✅ Message sent successfully!');
    console.log('Message ID:', messageResponse.data.data._id);
    console.log('Status:', messageResponse.data.data.status);
    console.log('Content:', messageResponse.data.data.content.text);

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.stack) {
      console.error('\nStack Trace:', error.stack);
    }
  }
}

testSendMessage();
