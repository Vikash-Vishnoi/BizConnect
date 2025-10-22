# ✅ .env Configuration Updated for WhatsApp Testing

## 🎯 What Was Changed

Your `.env` file has been **optimized and documented** for testing with the Meta WhatsApp Business API. Here's what was updated:

### 1. **Enhanced Documentation** 📝
- Added clear section headers for each configuration group
- Included inline comments explaining each variable
- Added setup instructions and testing notes

### 2. **Improved Configuration** ⚙️
- **JWT Expiry**: Added `JWT_EXPIRE=7d` for longer session duration
- **File Upload Size**: Increased from 5MB to 16MB (WhatsApp media limit)
- **Rate Limiting**: Increased from 100 to 500 requests per window for testing
- **WhatsApp Rate Limits**: Added specific WhatsApp messaging limits
- **Logging**: Added debug mode and request logging options
- **Backend URL**: Added reference for frontend integration

### 3. **Webhook Configuration** 🔔
- Added detailed ngrok setup instructions
- Provided webhook URL format examples
- Included Meta App configuration steps

### 4. **Testing Configuration** 🧪
- **Test Mode**: Added `WHATSAPP_TEST_MODE` flag
- **Test Phone Numbers**: Field for comma-separated test numbers
- **Debug Mode**: Enabled detailed API logging
- **Template Defaults**: Added default category and language

### 5. **Development Notes** 📋
Complete step-by-step guide embedded in `.env` for:
- Starting MongoDB
- Setting up ngrok
- Configuring Meta webhooks
- Testing API endpoints
- Verifying WhatsApp connection
- Monitoring webhooks

---

## 🚀 New Testing Tools Created

### 1. **quick-test.js** - Comprehensive Test Suite
```bash
node quick-test.js
```

**Tests:**
- ✅ Environment variables validation
- ✅ MongoDB connection
- ✅ Backend health check
- ✅ WhatsApp API access
- ✅ Template availability
- ✅ Webhook configuration

**Features:**
- Color-coded output
- Detailed error messages
- Summary report with pass/fail stats

---

### 2. **validate-token.js** - Access Token Validator
```bash
node validate-token.js
```

**Checks:**
- ✅ Token validity
- ✅ Expiration date & time remaining
- ✅ Token permissions/scopes
- ✅ WhatsApp API compatibility
- ✅ Business account details

**Features:**
- Warns when token expires soon (<24 hours)
- Shows permanent token vs temporary token
- Guides you on generating new tokens

---

### 3. **setup-webhook.ps1** - Automated Webhook Setup
```powershell
.\setup-webhook.ps1
```

**Does:**
- ✅ Checks if ngrok is installed
- ✅ Installs ngrok if needed (via npm)
- ✅ Starts backend if not running
- ✅ Launches ngrok tunnel
- ✅ Automatically gets HTTPS URL
- ✅ Updates .env with webhook URL
- ✅ Copies webhook URL to clipboard
- ✅ Opens ngrok dashboard

**Perfect for:** Setting up webhooks in 1 command!

---

### 4. **WHATSAPP_TESTING_GUIDE.md** - Complete Testing Documentation
```
backend/WHATSAPP_TESTING_GUIDE.md
```

**Includes:**
- 📋 Pre-testing checklist
- 🔧 Environment setup
- 🔔 Webhook configuration (detailed ngrok guide)
- 🧪 7 testing scenarios with examples
- 🛠️ Troubleshooting common errors
- ✅ Complete testing checklist

---

## 📊 Key Configuration Values

### Current Settings (from your .env):
```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/whatsapp-marketing

# Server
PORT=3000
NODE_ENV=development

# WhatsApp API
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=897748750080236
WHATSAPP_BUSINESS_ACCOUNT_ID=1170300045059437

# Access Token (Update every 24 hours or use System User Token)
WHATSAPP_ACCESS_TOKEN=EAALhd... (your token)

# Webhook Verify Token
WHATSAPP_VERIFY_TOKEN=yahooo
```

### ⚠️ IMPORTANT: Access Token Expiration

**Your current token is temporary (24 hours)!**

To avoid interruptions:

**Option 1: Update Token Daily**
```bash
# Run this to check expiration
node validate-token.js

# Generate new token at:
https://developers.facebook.com/apps/ → WhatsApp → API Setup → Generate Token
```

**Option 2: Create Permanent Token (Recommended)**
```bash
# Follow guide in WHATSAPP_TESTING_GUIDE.md
# System User Token NEVER expires! 🎉
```

---

## 🧪 Quick Testing Workflow

### Step 1: Verify Configuration
```bash
# Check all environment variables and connections
node quick-test.js
```

### Step 2: Validate Access Token
```bash
# Check if token is valid and when it expires
node validate-token.js
```

### Step 3: Setup Webhooks (One-time)
```powershell
# Automated webhook setup with ngrok
.\setup-webhook.ps1
```

### Step 4: Start Backend
```bash
# Start MongoDB first
npm run start:mongodb

# Start backend server
npm start
```

### Step 5: Test WhatsApp API
```bash
# Send test message
node test-api.js

# Test authentication
node test-login.js
```

### Step 6: Monitor Webhooks
```
# Open ngrok dashboard
http://localhost:4040

# Send a WhatsApp message to your business number
# Watch incoming webhooks in real-time!
```

---

## 📱 Testing with Meta WhatsApp Business API

### Test Phone Numbers

**To send messages, you need:**
1. Add test numbers in Meta App Dashboard
2. Or use opt-in numbers (real customers)
3. Or use your own verified number

**Add test numbers:**
```
Meta App Dashboard → WhatsApp → API Setup → Add Phone Numbers
```

### Pre-Approved Template

Meta provides a test template: **`hello_world`**

```bash
# Always available for testing
curl -X POST "https://graph.facebook.com/v18.0/897748750080236/messages" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511999999999",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": { "code": "en_US" }
    }
  }'
```

---

## 🔧 Configuration Changes Summary

### Added Variables:
```bash
JWT_EXPIRE=7d
BACKEND_URL=http://localhost:3000
WHATSAPP_RATE_LIMIT_PER_SECOND=40
WHATSAPP_DAILY_MESSAGING_LIMIT=1000
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true
WHATSAPP_TEST_MODE=false
TEST_PHONE_NUMBERS=
WHATSAPP_DEBUG_MODE=true
DEFAULT_TEMPLATE_CATEGORY=UTILITY
DEFAULT_TEMPLATE_LANGUAGE=en
```

### Updated Variables:
```bash
MAX_FILE_SIZE=16777216 (was 5242880)
RATE_LIMIT_MAX_REQUESTS=500 (was 100)
WEBHOOK_URL=http://localhost:3000/api/webhooks/whatsapp (with ngrok instructions)
```

---

## 🎯 Next Steps

### 1. **Validate Your Setup**
```bash
cd backend
node quick-test.js
```

### 2. **Check Token Expiration**
```bash
node validate-token.js
```

### 3. **Setup Webhooks** (if testing incoming messages)
```powershell
.\setup-webhook.ps1
```

### 4. **Start Testing**
```bash
# Start MongoDB
npm run start:mongodb

# Start backend
npm start

# In another terminal, test API
node test-api.js
```

### 5. **Monitor Everything**
- Backend logs: Your terminal
- Webhooks: http://localhost:4040
- Meta events: https://developers.facebook.com/apps/

---

## 📚 Documentation Files

1. **`.env`** - Your configuration (now enhanced)
2. **`WHATSAPP_TESTING_GUIDE.md`** - Complete testing guide
3. **`quick-test.js`** - Automated test suite
4. **`validate-token.js`** - Token validation tool
5. **`setup-webhook.ps1`** - Automated webhook setup

---

## ⚠️ Important Reminders

### 🔐 Security
- ✅ Never commit `.env` to git
- ✅ Keep access tokens private
- ✅ Use System User Token for production
- ✅ Rotate JWT_SECRET for production

### 📱 WhatsApp Limits
- ✅ Rate limit: 40-50 messages/second (use 50-60% of 80 limit)
- ✅ Daily limit: 1000 unique customers (new accounts)
- ✅ Template approval required for production
- ✅ 24-hour conversation window

### 🔔 Webhooks
- ✅ Must use HTTPS (ngrok for local testing)
- ✅ Verify token must match Meta App configuration
- ✅ Subscribe to: `messages`, `message_status`
- ✅ ngrok URL changes on each restart (free tier)

### 💾 Testing Best Practices
- ✅ Always use test numbers first
- ✅ Monitor rate limits closely
- ✅ Check token expiration daily
- ✅ Keep detailed logs during testing
- ✅ Test webhook verification before sending messages

---

## 🎉 You're Ready!

Your `.env` file is now **optimized** for WhatsApp Business API testing with:
- ✅ Complete documentation
- ✅ Proper rate limiting
- ✅ Debug mode enabled
- ✅ Webhook instructions
- ✅ Testing tools ready

**Start testing with:**
```bash
node quick-test.js
```

**Need help?** Check `WHATSAPP_TESTING_GUIDE.md` for detailed troubleshooting!

---

**🔥 Pro Tip:** Bookmark the ngrok dashboard (`http://localhost:4040`) to monitor webhook requests in real-time while testing!
