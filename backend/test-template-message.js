// 📱 TEST TEMPLATE MESSAGE SENDING
// Direct test to see template errors

const axios = require('axios');

const PHONE_NUMBER_ID = "897748750080236";
const ACCESS_TOKEN = "EAAPZC8l3lKYoBP5Ids7KmZAMiZAOABDvKPusSIXTVYd83t8SQVbEFopxSu1HSz9u55iZCo6dyFEhn6Fs3h5lb36MaLLr4ppZAiEUJWaqqs57xdfcGeG2ZAhgbxO6JbZBK4WxFVFT4i5wcFklDLvro1HUoSbJJbLPQb6Q9Rmi7II52FDcGh43MkP4E9DeJ4eOXwo7CrXN9X1Ehgv1kNwSUFON4WMBOSx3ueuRZBBP0ZAmjw8ZA2mq8ZD";
const TEST_NUMBER = "919509545832";
const API_VERSION = "v22.0";

async function testTemplateMessage() {
  console.log('\n🧪 WHATSAPP TEMPLATE MESSAGE TEST\n');
  console.log('Configuration:');
  console.log(`  Phone ID: ${PHONE_NUMBER_ID}`);
  console.log(`  To: ${TEST_NUMBER}`);
  console.log(`  API Version: ${API_VERSION}\n`);

  // Test 1: hello_world template (WhatsApp's default template)
  console.log('📤 Test 1: Sending hello_world template...\n');
  try {
    const response = await axios.post(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: TEST_NUMBER,
        type: 'template',
        template: {
          name: 'hello_world',
          language: {
            code: 'en_US'
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ SUCCESS! hello_world template sent!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\n📱 CHECK YOUR WHATSAPP NOW!\n');
  } catch (error) {
    console.log('❌ FAILED!');
    console.log('Status:', error.response?.status);
    console.log('Error:', JSON.stringify(error.response?.data, null, 2));
    
    if (error.response?.data?.error) {
      const err = error.response.data.error;
      console.log('\n💡 Error Details:');
      console.log(`  Code: ${err.code}`);
      console.log(`  Message: ${err.message}`);
      
      if (err.code === 100) {
        console.log('\n⚠️ TEMPLATE NOT FOUND:');
        console.log('  - Template "hello_world" doesn\'t exist or isn\'t approved');
        console.log('  - Check: https://business.facebook.com/latest/inbox/settings/whatsapp_message_templates');
      }
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: List available templates
  console.log('📋 Test 2: Listing available templates...\n');
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      }
    );

    console.log('✅ Available templates:');
    if (response.data.data && response.data.data.length > 0) {
      response.data.data.forEach((template, index) => {
        console.log(`\n  ${index + 1}. ${template.name}`);
        console.log(`     Status: ${template.status}`);
        console.log(`     Language: ${template.language}`);
        console.log(`     Category: ${template.category}`);
      });
    } else {
      console.log('  ⚠️ No templates found!');
      console.log('  Create templates at: https://business.facebook.com/latest/inbox/settings/whatsapp_message_templates');
    }
  } catch (error) {
    console.log('❌ Failed to list templates');
    console.log('Error:', JSON.stringify(error.response?.data, null, 2));
  }
}

testTemplateMessage();
