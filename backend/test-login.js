// Quick test to verify login works
const axios = require('axios');

const testLogin = async () => {
  try {
    console.log('🧪 Testing login with admin credentials...\n');
    
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@whatsappmarketing.com',
      password: 'admin123'
    });
    
    console.log('✅ Login successful!');
    console.log('📋 User:', response.data.user);
    console.log('🔑 Token:', response.data.token.substring(0, 50) + '...');
    console.log('\n✅ Backend login is working correctly!');
    
  } catch (error) {
    console.error('❌ Login failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
};

testLogin();
