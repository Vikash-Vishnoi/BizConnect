/**
 * 🔑 WhatsApp Access Token Validator
 * 
 * This script checks if your WhatsApp access token is valid,
 * when it expires, and what permissions it has.
 * 
 * Usage: node validate-token.js
 */

require('dotenv').config();
const axios = require('axios');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
}

function formatDate(timestamp) {
  return new Date(timestamp * 1000).toLocaleString();
}

function getTimeRemaining(expiresAt) {
  const now = Math.floor(Date.now() / 1000);
  const remaining = expiresAt - now;
  
  if (remaining < 0) return 'EXPIRED';
  
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day(s) ${hours % 24} hour(s)`;
  } else if (hours > 0) {
    return `${hours} hour(s) ${minutes} minute(s)`;
  } else {
    return `${minutes} minute(s)`;
  }
}

async function validateAccessToken() {
  logSection('🔑 WhatsApp Access Token Validation');
  
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  
  if (!accessToken) {
    log('❌', 'WHATSAPP_ACCESS_TOKEN not found in .env file', colors.red);
    return false;
  }

  // Mask token for display
  const maskedToken = accessToken.substring(0, 20) + '...' + accessToken.slice(-10);
  log('🔐', `Token: ${maskedToken}`, colors.blue);
  log('📏', `Length: ${accessToken.length} characters`, colors.blue);
  
  console.log('');
  
  try {
    // Debug the token using Graph API
    log('🔍', 'Checking token validity...', colors.yellow);
    
    const debugResponse = await axios.get(
      'https://graph.facebook.com/v18.0/debug_token',
      {
        params: {
          input_token: accessToken,
          access_token: accessToken
        },
        timeout: 10000
      }
    );

    const tokenData = debugResponse.data.data;
    
    if (!tokenData.is_valid) {
      log('❌', 'TOKEN IS INVALID!', colors.red);
      log('💡', 'Generate a new token at: https://developers.facebook.com/apps/', colors.yellow);
      return false;
    }

    log('✅', 'TOKEN IS VALID', colors.green);
    console.log('');

    // Token details
    logSection('📊 Token Information');
    
    log('🆔', `App ID: ${tokenData.app_id}`, colors.blue);
    log('👤', `User ID: ${tokenData.user_id || 'N/A'}`, colors.blue);
    log('🏢', `Application: ${tokenData.application || 'WhatsApp Business'}`, colors.blue);
    
    console.log('');
    
    // Expiration info
    if (tokenData.expires_at) {
      const expiresAt = tokenData.expires_at;
      const expiresDate = formatDate(expiresAt);
      const timeRemaining = getTimeRemaining(expiresAt);
      
      if (timeRemaining === 'EXPIRED') {
        log('❌', `Expires: ${expiresDate} (EXPIRED)`, colors.red);
        log('💡', 'Generate a new token immediately!', colors.yellow);
      } else {
        const hoursRemaining = Math.floor((expiresAt - Math.floor(Date.now() / 1000)) / 3600);
        
        if (hoursRemaining < 24) {
          log('⚠️', `Expires: ${expiresDate}`, colors.yellow);
          log('⏰', `Time Remaining: ${timeRemaining}`, colors.yellow);
          log('💡', 'Token expires soon! Generate a new one or use System User Token', colors.yellow);
        } else {
          log('✅', `Expires: ${expiresDate}`, colors.green);
          log('⏰', `Time Remaining: ${timeRemaining}`, colors.green);
        }
      }
    } else {
      log('✅', 'Expires: NEVER (System User Token)', colors.green);
      log('🎉', 'This is a permanent token - no need to refresh!', colors.green);
    }
    
    console.log('');
    
    // Scopes/Permissions
    if (tokenData.scopes && tokenData.scopes.length > 0) {
      logSection('🔓 Token Permissions (Scopes)');
      
      const requiredScopes = [
        'whatsapp_business_messaging',
        'whatsapp_business_management',
        'business_management'
      ];
      
      const hasAllRequired = requiredScopes.every(scope => 
        tokenData.scopes.includes(scope)
      );
      
      tokenData.scopes.forEach(scope => {
        const isRequired = requiredScopes.includes(scope);
        if (isRequired) {
          log('✅', scope, colors.green);
        } else {
          log('📋', scope, colors.blue);
        }
      });
      
      console.log('');
      
      if (hasAllRequired) {
        log('✅', 'All required permissions are granted', colors.green);
      } else {
        log('⚠️', 'Some required permissions may be missing', colors.yellow);
        log('💡', 'Required: whatsapp_business_messaging, whatsapp_business_management', colors.yellow);
      }
    }
    
    return true;
    
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 400) {
      log('❌', 'Token validation failed - token is invalid or expired', colors.red);
      log('💡', 'Generate a new token at: https://developers.facebook.com/apps/', colors.yellow);
    } else {
      log('❌', `Validation Error: ${error.message}`, colors.red);
    }
    return false;
  }
}

async function testTokenWithWhatsAppAPI() {
  logSection('📱 Testing Token with WhatsApp API');
  
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${phoneNumberId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 10000
      }
    );

    log('✅', 'Token works with WhatsApp API', colors.green);
    log('📞', `Phone Number: ${response.data.display_phone_number}`, colors.blue);
    log('🏢', `Business Name: ${response.data.verified_name}`, colors.blue);
    log('📊', `Quality Rating: ${response.data.quality_rating || 'N/A'}`, colors.blue);
    
    return true;
  } catch (error) {
    log('❌', `WhatsApp API Test Failed: ${error.response?.data?.error?.message || error.message}`, colors.red);
    return false;
  }
}

async function checkBusinessAccount() {
  logSection('🏢 WhatsApp Business Account Details');
  
  try {
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${wabaId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          fields: 'id,name,timezone_id,message_template_namespace,account_review_status'
        },
        timeout: 10000
      }
    );

    const account = response.data;
    
    log('🆔', `WABA ID: ${account.id}`, colors.blue);
    log('🏢', `Business Name: ${account.name || 'N/A'}`, colors.blue);
    log('🌍', `Timezone: ${account.timezone_id || 'N/A'}`, colors.blue);
    log('📋', `Namespace: ${account.message_template_namespace || 'N/A'}`, colors.blue);
    
    if (account.account_review_status) {
      const status = account.account_review_status;
      if (status === 'APPROVED') {
        log('✅', `Review Status: ${status}`, colors.green);
      } else {
        log('⚠️', `Review Status: ${status}`, colors.yellow);
      }
    }
    
    return true;
  } catch (error) {
    log('❌', `Business Account Check Failed: ${error.response?.data?.error?.message || error.message}`, colors.red);
    return false;
  }
}

async function showTokenGenerationGuide() {
  logSection('📖 How to Generate a New Access Token');
  
  console.log(`${colors.cyan}🔹 TEMPORARY TOKEN (24 hours):${colors.reset}`);
  console.log('   1. Go to: https://developers.facebook.com/apps/');
  console.log('   2. Select your app');
  console.log('   3. WhatsApp → API Setup');
  console.log('   4. Click "Generate Token" button');
  console.log('   5. Copy token and update .env file');
  console.log('');
  
  console.log(`${colors.green}🔹 PERMANENT TOKEN (Recommended):${colors.reset}`);
  console.log('   1. Go to: https://business.facebook.com/');
  console.log('   2. Business Settings → Users → System Users');
  console.log('   3. Click "Add" to create a new System User');
  console.log('   4. Give it Admin role');
  console.log('   5. Click "Generate New Token"');
  console.log('   6. Select your app');
  console.log('   7. Check these permissions:');
  console.log('      ✓ whatsapp_business_messaging');
  console.log('      ✓ whatsapp_business_management');
  console.log('   8. Click "Generate Token"');
  console.log('   9. Copy token (NEVER expires!)');
  console.log('   10. Update .env file: WHATSAPP_ACCESS_TOKEN=your_token');
  console.log('');
}

async function main() {
  console.log(`${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║     🔑 WhatsApp Access Token Validation Tool              ║
║     Checking your Meta API credentials...                 ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Validate token
  const isValidToken = await validateAccessToken();
  
  if (!isValidToken) {
    await showTokenGenerationGuide();
    process.exit(1);
  }
  
  // Test with WhatsApp API
  await testTokenWithWhatsAppAPI();
  
  // Check business account
  await checkBusinessAccount();
  
  // Final summary
  logSection('✅ Validation Complete');
  
  log('🎉', 'Your WhatsApp access token is valid and working!', colors.green);
  log('✅', 'You can now test sending messages via WhatsApp API', colors.green);
  log('💡', 'Run: node test-api.js to send a test message', colors.yellow);
  
  console.log('');
}

main().catch(error => {
  log('❌', `Unexpected Error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
