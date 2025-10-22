// Test sending to both numbers directly
const axios = require('axios');

const PHONE_NUMBER_ID = "897748750080236";
const ACCESS_TOKEN = "EAAPZC8l3lKYoBP5Ids7KmZAMiZAOABDvKPusSIXTVYd83t8SQVbEFopxSu1HSz9u55iZCo6dyFEhn6Fs3h5lb36MaLLr4ppZAiEUJWaqqs57xdfcGeG2ZAhgbxO6JbZBK4WxFVFT4i5wcFklDLvro1HUoSbJJbLPQb6Q9Rmi7II52FDcGh43MkP4E9DeJ4eOXwo7CrXN9X1Ehgv1kNwSUFON4WMBOSx3ueuRZBBP0ZAmjw8ZA2mq8ZD";
const API_VERSION = "v22.0";

const recipients = [
  { phone: "919509545832", name: "First Number" },
  { phone: "918824918102", name: "Second Number" }
];

async function sendToNumber(phone, name) {
  console.log(`\n📤 Sending to ${name} (${phone})...`);
  
  try {
    const response = await axios.post(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
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

    console.log(`✅ SUCCESS for ${name}!`);
    console.log(`   Message ID: ${response.data.messages[0].id}`);
    console.log(`   Status: ${response.data.messages[0].message_status || 'sent'}`);
    return true;
  } catch (error) {
    console.log(`❌ FAILED for ${name}!`);
    if (error.response) {
      const err = error.response.data.error;
      console.log(`   Error Code: ${err.code}`);
      console.log(`   Message: ${err.message}`);
      
      if (err.code === 131030) {
        console.log(`\n   ⚠️  NUMBER NOT WHITELISTED!`);
        console.log(`   Add ${phone} to Meta test numbers:`);
        console.log(`   https://developers.facebook.com/apps/`);
      }
    }
    return false;
  }
}

async function testBothNumbers() {
  console.log('\n🧪 TESTING BOTH NUMBERS\n');
  console.log('════════════════════════════════════\n');
  
  let successCount = 0;
  
  for (const recipient of recipients) {
    const success = await sendToNumber(recipient.phone, recipient.name);
    if (success) successCount++;
    
    // Wait 2 seconds between messages
    if (recipients.indexOf(recipient) < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n════════════════════════════════════');
  console.log(`\n📊 RESULTS: ${successCount}/${recipients.length} messages sent successfully\n`);
  
  if (successCount === recipients.length) {
    console.log('🎉 ALL MESSAGES SENT!');
    console.log('📱 Check BOTH phones for WhatsApp messages!\n');
  } else {
    console.log('⚠️  SOME MESSAGES FAILED!');
    console.log('💡 Add failed numbers to Meta whitelist\n');
  }
}

testBothNumbers();
