# 🧪 WhatsApp Business API Testing - Quick Start

## 🚀 One-Command Testing

### Run Complete Test Suite
```bash
node quick-test.js
```
This will check:
- ✅ Environment variables
- ✅ MongoDB connection
- ✅ Backend health
- ✅ WhatsApp API access
- ✅ Template availability
- ✅ Webhook configuration

---

## 📋 Pre-Testing Checklist

### Before you start testing:

- [ ] **MongoDB is running**
  ```bash
  # Windows
  net start MongoDB
  # Or manually
  mongod --dbpath="C:\data\db"
  ```

- [ ] **Backend dependencies installed**
  ```bash
  npm install
  ```

- [ ] **Access token is valid** (check expiration)
  ```bash
  node validate-token.js
  ```

- [ ] **Test numbers added** (Meta App Dashboard)
  - Go to: WhatsApp → API Setup → Add Phone Numbers

---

## 🔧 Testing Tools

### 1. Quick Test Suite
**What:** Tests all connections and configurations  
**Run:** `node quick-test.js`  
**Use when:** First time setup or after config changes

### 2. Token Validator
**What:** Checks access token validity and expiration  
**Run:** `node validate-token.js`  
**Use when:** Token errors or before starting new test session

### 3. Webhook Setup
**What:** Automatically configures ngrok for webhooks  
**Run:** `.\setup-webhook.ps1`  
**Use when:** Testing incoming messages or webhooks

### 4. API Test
**What:** Sends actual WhatsApp message  
**Run:** `node test-api.js`  
**Use when:** Testing message sending

### 5. Login Test
**What:** Tests authentication endpoints  
**Run:** `node test-login.js`  
**Use when:** Testing JWT authentication

---

## ⚡ Quick Start Commands

### Option A: Full Testing Setup (Recommended)
```bash
# 1. Test configuration
node quick-test.js

# 2. Validate token
node validate-token.js

# 3. Setup webhooks (in new PowerShell window)
.\setup-webhook.ps1

# 4. Start backend (in new terminal)
npm start

# 5. Test API
node test-api.js
```

### Option B: Quick API Test Only
```bash
# 1. Start backend
npm start

# 2. Send test message
node test-api.js
```

### Option C: Webhook Testing
```bash
# 1. Setup ngrok
.\setup-webhook.ps1

# 2. Start backend
npm start

# 3. Send WhatsApp message to your business number
# 4. Watch webhook at: http://localhost:4040
```

---

## 📊 Expected Test Results

### ✅ Successful Test Output

```
╔════════════════════════════════════════════════╗
║   🧪 WhatsApp Business API Testing Suite      ║
╚════════════════════════════════════════════════╝

==================================================
  🔧 Verifying Environment Variables
==================================================

✅ MONGODB_URI: mongodb://localhost:27017/whatsapp-marketing
✅ JWT_SECRET: yahooo...
✅ WHATSAPP_API_URL: https://graph.facebook.com/v18.0
✅ WHATSAPP_PHONE_NUMBER_ID: 897748750080236
✅ WHATSAPP_ACCESS_TOKEN: EAALhdLoZAWWsBPqsY...YjrDamAccSt
✅ WHATSAPP_BUSINESS_ACCOUNT_ID: 1170300045059437
✅ WHATSAPP_VERIFY_TOKEN: yahooo

==================================================
  🗄️ Testing MongoDB Connection
==================================================

✅ MongoDB Connected: localhost
📊 Database: whatsapp-marketing

==================================================
  🏥 Testing Backend Health
==================================================

✅ Backend is running: ok

==================================================
  📱 Testing WhatsApp API Access
==================================================

✅ WhatsApp API Connected
📞 Phone Number: +1 234 567 8900
🏢 Business Name: Your Business
✓ Quality Rating: GREEN

==================================================
  📝 Testing WhatsApp Templates
==================================================

✅ Templates Found: 3

📋 1. hello_world (en_US) - APPROVED
📋 2. appointment_reminder (en) - APPROVED
📋 3. welcome_message (en) - PENDING

✓ 2 templates are APPROVED and ready to use

==================================================
  📊 Test Summary Report
==================================================

🎉 Tests Passed: 6 / 6 (100%)

🚀 All tests passed! Your WhatsApp API is ready for testing!
```

---

## ❌ Common Issues & Fixes

### Issue: "Access Token Invalid"
**Error:** `WhatsApp API Failed: Invalid OAuth access token`

**Fix:**
```bash
# 1. Check token expiration
node validate-token.js

# 2. Generate new token
# Go to: https://developers.facebook.com/apps/
# WhatsApp → API Setup → Generate Token

# 3. Update .env
WHATSAPP_ACCESS_TOKEN=new_token_here

# 4. Restart backend
npm start
```

### Issue: "Backend is NOT running"
**Error:** `Backend Health Failed: ECONNREFUSED`

**Fix:**
```bash
# Start backend
npm start

# Or check if port 3000 is in use
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <PID> /F
```

### Issue: "MongoDB Connection Failed"
**Error:** `MongoDB Connection Failed: connect ECONNREFUSED`

**Fix:**
```bash
# Windows - Start MongoDB service
net start MongoDB

# Or manually
mongod --dbpath="C:\data\db"

# Verify
mongo
> show dbs
```

### Issue: "No templates found"
**Error:** `Templates Found: 0`

**Fix:**
1. Go to: https://business.facebook.com/
2. Business Settings → Accounts → WhatsApp Accounts
3. Select your account → Message Templates
4. Create templates or use pre-approved `hello_world`

### Issue: "Webhook verification failed"
**Error:** `Webhook URL validation failed`

**Fix:**
```bash
# 1. Ensure ngrok is running with HTTPS
.\setup-webhook.ps1

# 2. Copy the HTTPS URL (not HTTP)
https://abc123.ngrok.io/api/webhooks/whatsapp

# 3. Verify token matches
.env: WHATSAPP_VERIFY_TOKEN=yahooo
Meta App: Verify Token = yahooo

# 4. Backend must be running
npm start
```

---

## 🎯 Testing Scenarios

### 1. Send Test Message
```bash
# Prerequisites:
# - Backend running
# - Valid access token
# - Test phone number added in Meta App

node test-api.js
```

### 2. Receive Incoming Message
```bash
# Prerequisites:
# - ngrok running (.\setup-webhook.ps1)
# - Webhook configured in Meta App
# - Backend running

# Steps:
# 1. Send WhatsApp message to your business number
# 2. Check ngrok dashboard: http://localhost:4040
# 3. Check backend logs
```

### 3. Create Campaign
```bash
# Prerequisites:
# - Frontend connected to backend
# - Logged in user
# - Approved templates

# Steps:
# 1. Open frontend app
# 2. Navigate to Campaigns
# 3. Create New Campaign
# 4. Select approved template
# 5. Add recipients
# 6. Send campaign
```

### 4. Real-time Updates
```bash
# Prerequisites:
# - Backend running with Socket.io
# - Frontend connected
# - Campaign in progress

# Watch:
# - Campaign progress updates
# - Incoming messages
# - Delivery receipts
```

---

## 📱 WhatsApp API Limits

### Rate Limits (Testing Phase)
```
Messages per second: 40-50 (use 50-60% of 80 limit)
Daily messages: 1000 unique customers (new accounts)
Conversation window: 24 hours from last user message
```

### Best Practices
- ✅ Add 100ms delay between messages
- ✅ Monitor API response for rate limit errors
- ✅ Use approved templates only
- ✅ Test with small batches first (<10 messages)

---

## 🔔 Webhook Testing

### Setup Webhooks
```powershell
# Automated setup
.\setup-webhook.ps1
```

### Manual Setup
```bash
# 1. Start ngrok
ngrok http 3000

# 2. Copy HTTPS URL
https://abc123.ngrok.io

# 3. Update .env
WEBHOOK_URL=https://abc123.ngrok.io/api/webhooks/whatsapp

# 4. Configure in Meta App
# Meta App → WhatsApp → Configuration → Edit Webhook
# Callback URL: https://abc123.ngrok.io/api/webhooks/whatsapp
# Verify Token: yahooo
# Subscribe: messages, message_status
```

### Monitor Webhooks
```bash
# ngrok Dashboard
http://localhost:4040

# Shows:
# - All incoming webhook requests
# - Request/response data
# - Timing information
```

---

## 🎓 Testing Tips

### 1. Always Start Fresh
```bash
# Clear MongoDB data before major tests
mongo
> use whatsapp-marketing
> db.dropDatabase()

# Re-seed database
node seed-database.js
```

### 2. Monitor Everything
- Backend logs: Terminal output
- Webhooks: http://localhost:4040
- API requests: WHATSAPP_DEBUG_MODE=true
- Meta logs: https://developers.facebook.com/apps/

### 3. Test Incrementally
```
1. Test authentication first
2. Test single message send
3. Test template usage
4. Test webhook receiving
5. Test campaign (small batch)
6. Test full campaign
```

### 4. Use Test Numbers
- Never test on production phone numbers
- Add test numbers in Meta App Dashboard
- Verify numbers before sending

### 5. Check Token Daily
```bash
# Run before each test session
node validate-token.js
```

---

## 📚 Documentation

### Full Guides
- `WHATSAPP_TESTING_GUIDE.md` - Complete testing documentation
- `ENV_CHANGES_SUMMARY.md` - Configuration changes
- `TROUBLESHOOTING.md` - Common issues and solutions

### Meta Documentation
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Rate Limits](https://developers.facebook.com/docs/whatsapp/cloud-api/overview#throughput)

---

## 🆘 Getting Help

### Check Logs First
```bash
# Backend logs
npm start

# Test output
node quick-test.js

# Token validation
node validate-token.js
```

### Debug Mode
```bash
# Enable in .env
WHATSAPP_DEBUG_MODE=true
LOG_LEVEL=debug

# Restart backend
npm start
```

### Meta Support
- Developer Support: https://developers.facebook.com/support/
- Community: https://stackoverflow.com/questions/tagged/whatsapp

---

## ✅ Testing Checklist

Before production deployment:

- [ ] All `quick-test.js` tests pass
- [ ] Access token is permanent (System User Token)
- [ ] Webhooks configured with production URL
- [ ] Templates approved by Meta
- [ ] Rate limiting configured
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Security: JWT_SECRET rotated
- [ ] Security: .env not in git
- [ ] MongoDB secured with authentication
- [ ] API endpoints secured with auth middleware
- [ ] CORS configured for production
- [ ] SSL/TLS enabled
- [ ] Monitoring and alerts configured
- [ ] Backup strategy implemented

---

**🎉 Happy Testing!**

Run `node quick-test.js` to get started!
