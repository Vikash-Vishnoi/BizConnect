// 📱 SIMPLE WHATSAPP API TEST
// Direct test of WhatsApp message sending

const axios = require('axios');

const PHONE_NUMBER_ID = "897748750080236";
const ACCESS_TOKEN = "EAAPZC8l3lKYoBP5Ids7KmZAMiZAOABDvKPusSIXTVYd83t8SQVbEFopxSu1HSz9u55iZCo6dyFEhn6Fs3h5lb36MaLLr4ppZAiEUJWaqqs57xdfcGeG2ZAhgbxO6JbZBK4WxFVFT4i5wcFklDLvro1HUoSbJJbLPQb6Q9Rmi7II52FDcGh43MkP4E9DeJ4eOXwo7CrXN9X1Ehgv1kNwSUFON4WMBOSx3ueuRZBBP0ZAmjw8ZA2mq8ZD";
const TEST_NUMBER = "919509545832";  // UPDATE WITH YOUR NUMBER
const API_VERSION = "v22.0";

async function testWhatsAppAPI() {
  console.log('\n🧪 WHATSAPP API DIRECT TEST\n');
  console.log('Configuration:');
  console.log(`  Phone ID: ${PHONE_NUMBER_ID}`);
  console.log(`  To: ${TEST_NUMBER}`);
  console.log(`  API Version: ${API_VERSION}\n`);

  try {
    console.log('📤 Sending text message...\n');
    
    const response = await axios.post(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: TEST_NUMBER,
        type: 'text',
        text: {
          preview_url: false,
          body: 'meow. If you receive this, your API credentials are working! 🎉'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ SUCCESS! Message sent!\n');
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n📱 CHECK YOUR WHATSAPP NOW!\n');

  } catch (error) {
    console.error('❌ FAILED!\n');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
      
      const errorData = error.response.data.error;
      if (errorData) {
        console.error('\n💡 Error Details:');
        console.error(`  Code: ${errorData.code}`);
        console.error(`  Message: ${errorData.message}`);
        console.error(`  Type: ${errorData.type}`);
        console.error(`  Trace ID: ${errorData.fbtrace_id}`);
        
        if (errorData.code === 190) {
          console.error('\n⚠️  ACCESS TOKEN ISSUE:');
          console.error('  - Token might be expired');
          console.error('  - Get new token from: https://developers.facebook.com/apps/');
          console.error('  - Go to: WhatsApp → API Setup → Generate Token');
        }
        
        if (errorData.code === 100) {
          console.error('\n⚠️  PHONE NUMBER ISSUE:');
          console.error('  - Check phone number format');
          console.error('  - Must include country code');
          console.error('  - Example: 919509545832 (no + or spaces)');
        }
      }
    } else {
      console.error('Error:', error.message);
    }
  }
}

testWhatsAppAPI();
