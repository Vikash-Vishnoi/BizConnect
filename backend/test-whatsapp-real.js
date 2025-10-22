/**
 * Test WhatsApp Business API with Real Credentials
 * This script sends a test message using the hello_world template
 */

require('dotenv').config();
const axios = require('axios');

// Configuration from .env
const config = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '897748750080236',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || 'EAAPZC8l3lKYoBP3KGR95wvk2ZAoQSDebwqEZCNKXDLMgZCJNKEUZAZASKPFxZC981VyoIldg2jwXI8NEuVWkZCVBnCDh6bZC9TQtSQ7EsRLMTSbBHCNVkifd6vWYh60lisaJseAIkjrj0lXgVb7ZBGDoK7bCGVSkArA6ZAnKDg06dXpoj0nw6ZBzMolWWDZAzbwZA6yyCZA8RtbiYKLgfiZBPIfm8nqzs33HIlF6nEcMIZBNTp61AuidAwgZDZD',
  apiUrl: 'https://graph.facebook.com/v22.0',
  testNumber: process.env.YOUR_WHATSAPP_NUMBER || '919509545832',
};

console.log('🚀 WhatsApp Business API - Real Connection Test\n');
console.log('📋 Configuration:');
console.log(`   Phone Number ID: ${config.phoneNumberId}`);
console.log(`   API Version: v22.0`);
console.log(`   Test Number: +${config.testNumber}`);
console.log(`   Access Token: ${config.accessToken.substring(0, 20)}...`);
console.log('\n' + '='.repeat(60) + '\n');

/**
 * Test 1: Send "hello_world" template message
 */
async function sendHelloWorldTemplate() {
  try {
    console.log('📤 Test 1: Sending hello_world template message...\n');

    const url = `${config.apiUrl}/${config.phoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      to: config.testNumber,
      type: 'template',
      template: {
        name: 'hello_world',
        language: {
          code: 'en_US'
        }
      }
    };

    console.log('📍 API Endpoint:', url);
    console.log('📦 Request Payload:', JSON.stringify(payload, null, 2));
    console.log('\n⏳ Sending request...\n');

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('✅ SUCCESS! Message sent successfully!\n');
    console.log('📬 Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n📱 Check your WhatsApp: +' + config.testNumber);
    console.log('   You should receive a "Hello World" message!\n');
    
    return response.data;
  } catch (error) {
    console.error('❌ ERROR sending message:\n');
    
    if (error.response) {
      // API responded with error
      console.error('Status:', error.response.status);
      console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
      
      // Common error explanations
      if (error.response.status === 401) {
        console.error('\n💡 This is an authentication error. Possible causes:');
        console.error('   - Access token has expired (tokens expire after 24 hours)');
        console.error('   - Invalid access token');
        console.error('   - Token doesn\'t have required permissions');
        console.error('\n   👉 Solution: Generate a new access token from Meta App Dashboard');
      } else if (error.response.status === 400) {
        console.error('\n💡 Bad request. Possible causes:');
        console.error('   - Invalid phone number format');
        console.error('   - Template not approved or doesn\'t exist');
        console.error('   - Invalid phone number ID');
      } else if (error.response.status === 404) {
        console.error('\n💡 Not found. Possible causes:');
        console.error('   - Phone Number ID is incorrect');
        console.error('   - API endpoint URL is wrong');
      }
    } else if (error.request) {
      // Request made but no response
      console.error('No response received from API');
      console.error('Check your internet connection');
    } else {
      // Error setting up request
      console.error('Error:', error.message);
    }
    
    throw error;
  }
}

/**
 * Test 2: Check account info
 */
async function checkAccountInfo() {
  try {
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('📋 Test 2: Checking WhatsApp Business Account Info...\n');

    const url = `${config.apiUrl}/${config.phoneNumberId}`;
    
    const response = await axios.get(url, {
      params: {
        fields: 'verified_name,code_verification_status,display_phone_number,quality_rating,id'
      },
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      }
    });

    console.log('✅ Account Info Retrieved:\n');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    
    return response.data;
  } catch (error) {
    console.error('❌ ERROR checking account info:\n');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

/**
 * Test 3: List message templates
 */
async function listTemplates() {
  try {
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('📄 Test 3: Listing Available Message Templates...\n');

    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '1170300045059437';
    const url = `${config.apiUrl}/${wabaId}/message_templates`;
    
    const response = await axios.get(url, {
      params: {
        limit: 10,
        fields: 'name,status,category,language,components'
      },
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      }
    });

    console.log('✅ Available Templates:\n');
    
    if (response.data.data && response.data.data.length > 0) {
      response.data.data.forEach((template, index) => {
        console.log(`${index + 1}. ${template.name}`);
        console.log(`   Status: ${template.status}`);
        console.log(`   Category: ${template.category}`);
        console.log(`   Language: ${template.language}`);
        console.log('');
      });
    } else {
      console.log('No templates found. Create templates in Meta Business Manager.');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ ERROR listing templates:\n');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run all tests
async function runAllTests() {
  try {
    // Test 1: Send message
    await sendHelloWorldTemplate();
    
    // Wait 2 seconds between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Check account info
    await checkAccountInfo();
    
    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: List templates
    await listTemplates();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ Tests failed. Check errors above.');
    console.log('='.repeat(60) + '\n');
    process.exit(1);
  }
}

// Start tests
runAllTests();
