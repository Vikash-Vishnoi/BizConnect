/**
 * 🧪 Quick WhatsApp API Testing Script
 * 
 * This script verifies your WhatsApp Business API configuration
 * and tests connectivity to all required services.
 * 
 * Usage: node quick-test.js
 */

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.cyan}${'='.repeat(50)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(50)}${colors.reset}\n`);
}

async function testBackendHealth() {
  logSection('🏥 Testing Backend Health');
  
  try {
    const response = await axios.get('http://localhost:3000/health', {
      timeout: 5000
    });
    log('✅', `Backend is running: ${response.data.status}`, colors.green);
    log('📊', `MongoDB: ${response.data.mongodb}`, colors.blue);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('❌', 'Backend is NOT running! Start with: npm start', colors.red);
    } else {
      log('❌', `Backend Health Failed: ${error.message}`, colors.red);
      log('💡', 'Check if backend is running on port 3000', colors.yellow);
    }
    return false;
  }
}

async function testMongoDBConnection() {
  logSection('🗄️ Testing MongoDB Connection');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    log('✅', `MongoDB Connected: ${mongoose.connection.host}`, colors.green);
    log('📊', `Database: ${mongoose.connection.name}`, colors.blue);
    await mongoose.disconnect();
    return true;
  } catch (error) {
    log('❌', `MongoDB Connection Failed: ${error.message}`, colors.red);
    log('💡', 'Start MongoDB with: mongod --dbpath=/path/to/data', colors.yellow);
    return false;
  }
}

async function testWhatsAppAPIAccess() {
  logSection('📱 Testing WhatsApp API Access');
  
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
    if (!accessToken || accessToken.length < 50) {
      log('❌', 'Access Token not configured or invalid in .env', colors.red);
      return false;
    }

    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${phoneNumberId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 10000
      }
    );

    log('✅', `WhatsApp API Connected`, colors.green);
    log('📞', `Phone Number: ${response.data.display_phone_number || 'N/A'}`, colors.blue);
    log('🏢', `Business Name: ${response.data.verified_name || 'N/A'}`, colors.blue);
    log('✓', `Quality Rating: ${response.data.quality_rating || 'N/A'}`, colors.blue);
    
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      log('❌', 'Access Token is invalid or expired!', colors.red);
      log('💡', 'Generate new token at: developers.facebook.com/apps/', colors.yellow);
    } else if (error.response?.status === 403) {
      log('❌', 'Access Token lacks required permissions', colors.red);
    } else {
      log('❌', `WhatsApp API Failed: ${error.response?.data?.error?.message || error.message}`, colors.red);
    }
    return false;
  }
}

async function testWhatsAppTemplates() {
  logSection('📝 Testing WhatsApp Templates');
  
  try {
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${wabaId}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          limit: 10
        },
        timeout: 10000
      }
    );

    const templates = response.data.data;
    log('✅', `Templates Found: ${templates.length}`, colors.green);
    
    if (templates.length > 0) {
      console.log('');
      templates.forEach((template, index) => {
        const statusColor = template.status === 'APPROVED' ? colors.green : colors.yellow;
        log('📋', `${index + 1}. ${template.name} (${template.language}) - ${statusColor}${template.status}${colors.reset}`, colors.blue);
      });
      
      const approvedCount = templates.filter(t => t.status === 'APPROVED').length;
      log('✓', `${approvedCount} templates are APPROVED and ready to use`, colors.green);
    } else {
      log('⚠️', 'No templates found. Create templates in Meta Business Manager.', colors.yellow);
    }
    
    return true;
  } catch (error) {
    log('❌', `Templates Fetch Failed: ${error.response?.data?.error?.message || error.message}`, colors.red);
    return false;
  }
}

async function testEnvironmentVariables() {
  logSection('🔧 Verifying Environment Variables');
  
  const requiredVars = [
    { name: 'MONGODB_URI', value: process.env.MONGODB_URI },
    { name: 'JWT_SECRET', value: process.env.JWT_SECRET },
    { name: 'WHATSAPP_API_URL', value: process.env.WHATSAPP_API_URL },
    { name: 'WHATSAPP_PHONE_NUMBER_ID', value: process.env.WHATSAPP_PHONE_NUMBER_ID },
    { name: 'WHATSAPP_ACCESS_TOKEN', value: process.env.WHATSAPP_ACCESS_TOKEN },
    { name: 'WHATSAPP_BUSINESS_ACCOUNT_ID', value: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID },
    { name: 'WHATSAPP_VERIFY_TOKEN', value: process.env.WHATSAPP_VERIFY_TOKEN }
  ];

  let allValid = true;

  for (const variable of requiredVars) {
    if (!variable.value) {
      log('❌', `${variable.name} is not set`, colors.red);
      allValid = false;
    } else {
      // Mask sensitive values
      let displayValue = variable.value;
      if (variable.name.includes('TOKEN') || variable.name.includes('SECRET')) {
        displayValue = variable.value.substring(0, 20) + '...' + variable.value.slice(-10);
      }
      log('✅', `${variable.name}: ${displayValue}`, colors.green);
    }
  }

  return allValid;
}

async function testWebhookConfiguration() {
  logSection('🔔 Webhook Configuration Check');
  
  const webhookUrl = process.env.WEBHOOK_URL;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  
  log('📍', `Webhook URL: ${webhookUrl}`, colors.blue);
  log('🔑', `Verify Token: ${verifyToken}`, colors.blue);
  
  if (webhookUrl.includes('localhost')) {
    log('⚠️', 'Webhook URL is localhost - this will NOT work for production!', colors.yellow);
    log('💡', 'For testing, use ngrok: ngrok http 3000', colors.yellow);
    log('💡', 'Then update WEBHOOK_URL with ngrok HTTPS URL', colors.yellow);
  } else if (webhookUrl.startsWith('https://')) {
    log('✅', 'Webhook URL uses HTTPS (required by WhatsApp)', colors.green);
  } else {
    log('❌', 'Webhook URL must use HTTPS', colors.red);
  }
  
  return true;
}

async function generateSummaryReport(results) {
  logSection('📊 Test Summary Report');
  
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  
  const percentage = ((passed / total) * 100).toFixed(0);
  const emoji = percentage === 100 ? '🎉' : percentage >= 75 ? '👍' : '⚠️';
  
  console.log(`${emoji} Tests Passed: ${colors.green}${passed}${colors.reset} / ${total} (${percentage}%)`);
  
  if (failed > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}`);
    });
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (percentage === 100) {
    log('🚀', 'All tests passed! Your WhatsApp API is ready for testing!', colors.green);
  } else if (percentage >= 75) {
    log('👍', 'Most tests passed. Review failed tests above.', colors.yellow);
  } else {
    log('⚠️', 'Multiple tests failed. Check configuration and try again.', colors.red);
  }
  
  console.log('');
}

async function main() {
  console.log(`${colors.cyan}
╔════════════════════════════════════════════════╗
║   🧪 WhatsApp Business API Testing Suite      ║
║   Testing environment configuration...         ║
╚════════════════════════════════════════════════╝
${colors.reset}`);

  const results = [];

  // Test 1: Environment Variables
  const envTest = await testEnvironmentVariables();
  results.push({ name: 'Environment Variables', passed: envTest });

  // Test 2: MongoDB
  const mongoTest = await testMongoDBConnection();
  results.push({ name: 'MongoDB Connection', passed: mongoTest });

  // Test 3: Backend Health (only if backend is expected to be running)
  const backendTest = await testBackendHealth();
  results.push({ name: 'Backend Health', passed: backendTest });

  // Test 4: WhatsApp API
  const whatsappTest = await testWhatsAppAPIAccess();
  results.push({ name: 'WhatsApp API Access', passed: whatsappTest });

  // Test 5: Templates (only if WhatsApp API is accessible)
  if (whatsappTest) {
    const templatesTest = await testWhatsAppTemplates();
    results.push({ name: 'WhatsApp Templates', passed: templatesTest });
  }

  // Test 6: Webhook Configuration
  const webhookTest = await testWebhookConfiguration();
  results.push({ name: 'Webhook Configuration', passed: webhookTest });

  // Generate summary
  await generateSummaryReport(results);
  
  process.exit(results.every(r => r.passed) ? 0 : 1);
}

// Run the test suite
main().catch(error => {
  log('❌', `Unexpected Error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
