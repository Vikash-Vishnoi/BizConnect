# 🧪 WhatsApp Business API Testing Guide

## 📋 Table of Contents
1. [Pre-Testing Checklist](#pre-testing-checklist)
2. [Environment Setup](#environment-setup)
3. [Webhook Configuration](#webhook-configuration)
4. [Testing Scenarios](#testing-scenarios)
5. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Testing Checklist

### 1. Meta Developer Account Setup
- [ ] Created Meta App at [developers.facebook.com](https://developers.facebook.com)
- [ ] Added WhatsApp product to app
- [ ] Verified WhatsApp Business Account (WABA ID: `1170300045059437`)
- [ ] Obtained Phone Number ID: `897748750080236`
- [ ] Generated Access Token (updated in `.env`)

### 2. Local Environment
- [ ] MongoDB running on `localhost:27017`
- [ ] Node.js v16+ installed
- [ ] Backend dependencies installed (`npm install`)
- [ ] `.env` file configured with valid credentials

### 3. Network Requirements
- [ ] Port 3000 available for backend
- [ ] Port 8081 available for frontend (React Native)
- [ ] Internet connection active

---

## 🔧 Environment Setup

### Step 1: Verify Your `.env` Configuration

Your current configuration:
```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/whatsapp-marketing

# Server
PORT=3000
NODE_ENV=development

# WhatsApp Credentials
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=897748750080236
WHATSAPP_ACCESS_TOKEN=EAALhd... (your token)
WHATSAPP_BUSINESS_ACCOUNT_ID=1170300045059437
WHATSAPP_VERIFY_TOKEN=yahooo

# Testing
WHATSAPP_DEBUG_MODE=true
```

### Step 2: Update Access Token (Every 24 Hours)

**Temporary tokens expire! Update regularly:**

1. Go to: [Meta App Dashboard](https://developers.facebook.com/apps/)
2. Select your app
3. Navigate to: **WhatsApp → API Setup**
4. Click **Generate Token**
5. Copy the new token
6. Update `WHATSAPP_ACCESS_TOKEN` in `.env`

**For Permanent Token (Recommended):**
```bash
# Create System User (Meta Business Settings)
1. Go to: business.facebook.com → Business Settings → Users → System Users
2. Create new System User with Admin role
3. Generate Token with whatsapp_business_messaging permission
4. Token never expires! 🎉
```

---

## 🔔 Webhook Configuration

### Why Webhooks?
Webhooks allow WhatsApp to send incoming messages, delivery receipts, and read status to your backend.

### Setup with ngrok (Required for Local Testing)

#### Step 1: Install ngrok
```bash
# Download from: https://ngrok.com/download
# Or install via npm
npm install -g ngrok

# Authenticate (get auth token from ngrok.com)
ngrok authtoken YOUR_NGROK_AUTH_TOKEN
```

#### Step 2: Start ngrok Tunnel
```bash
# Expose port 3000
ngrok http 3000

# You'll see output like:
# Forwarding    https://abc123xyz.ngrok.io -> http://localhost:3000
```

#### Step 3: Update `.env` with ngrok URL
```bash
# Copy the HTTPS URL from ngrok
WEBHOOK_URL=https://abc123xyz.ngrok.io/api/webhooks/whatsapp
```

#### Step 4: Configure Webhook in Meta App
1. Go to: [Meta App Dashboard](https://developers.facebook.com/apps/)
2. Navigate to: **WhatsApp → Configuration**
3. Click **Edit** next to Webhook
4. Enter:
   - **Callback URL**: `https://abc123xyz.ngrok.io/api/webhooks/whatsapp`
   - **Verify Token**: `yahooo` (must match `.env`)
5. Click **Verify and Save**
6. Subscribe to webhook fields:
   - ✅ `messages`
   - ✅ `message_status`
   - ✅ `message_template_status_update`

#### Step 5: Test Webhook
```bash
# Check ngrok dashboard
http://localhost:4040

# You should see verification request from Meta
GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=...
```

---

## 🧪 Testing Scenarios

### Test 1: Backend Health Check

```bash
# Start MongoDB
mongod --dbpath=/path/to/data

# Or use your script
npm run start:mongodb

# Start backend server
cd backend
npm start

# Test health endpoint
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-21T...",
  "mongodb": "connected",
  "whatsapp": "configured"
}
```

### Test 2: Authentication

```bash
# Run login test
node test-login.js

# Or test manually
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "name": "Admin"
  }
}
```

### Test 3: Send WhatsApp Test Message

**Important:** You can only send messages to:
- Test numbers added in Meta App Dashboard
- Numbers that have opted-in to your business
- Your own verified number

```bash
# Run WhatsApp API test
node test-api.js
```

**Or test manually with curl:**
```bash
curl -X POST "https://graph.facebook.com/v18.0/897748750080236/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511999999999",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": {
        "code": "en_US"
      }
    }
  }'
```

**Expected Response:**
```json
{
  "messaging_product": "whatsapp",
  "contacts": [{
    "input": "5511999999999",
    "wa_id": "5511999999999"
  }],
  "messages": [{
    "id": "wamid.HBgNNTUxMT..."
  }]
}
```

### Test 4: Fetch WhatsApp Templates

```bash
# Get approved templates
curl "https://graph.facebook.com/v18.0/1170300045059437/message_templates" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "data": [
    {
      "name": "hello_world",
      "status": "APPROVED",
      "category": "UTILITY",
      "language": "en_US"
    }
  ]
}
```

### Test 5: Create Campaign (Frontend to Backend)

```bash
# Create a test campaign
curl -X POST http://localhost:3000/api/campaigns \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "template": "hello_world",
    "recipients": [
      {"phone": "5511999999999", "name": "Test User"}
    ],
    "scheduleType": "immediate"
  }'
```

### Test 6: Receive Incoming Message (Webhook)

**Send a message to your WhatsApp Business Number:**
1. Add your phone number as test user in Meta App
2. Send: "Hello" to your business number
3. Check ngrok dashboard: `http://localhost:4040`
4. Check backend logs

**Expected Webhook Payload:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "1170300045059437",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "phone_number_id": "897748750080236"
        },
        "messages": [{
          "from": "5511999999999",
          "id": "wamid.HBgN...",
          "timestamp": "1705312500",
          "text": {
            "body": "Hello"
          },
          "type": "text"
        }]
      }
    }]
  }]
}
```

### Test 7: Real-Time Updates (Socket.io)

```bash
# In backend terminal, you should see:
✅ Socket.io: New client connected
📨 Socket.io: Emitting new_message event
✅ Socket.io: Message delivered to frontend
```

---

## 🛠️ Troubleshooting

### Error: "Access Token Invalid"

**Cause:** Token expired (temporary tokens last 24 hours)

**Solution:**
```bash
# Generate new token
1. Go to Meta App Dashboard → WhatsApp → API Setup
2. Click "Generate Token"
3. Update .env file:
   WHATSAPP_ACCESS_TOKEN=NEW_TOKEN_HERE
4. Restart server: npm start
```

### Error: "Phone number not registered"

**Cause:** Recipient hasn't opted-in or isn't a test user

**Solution:**
```bash
# Add test phone numbers in Meta App
1. Meta App Dashboard → WhatsApp → API Setup
2. Scroll to "Test Numbers"
3. Add phone numbers (with country code)
4. Verify with OTP on that phone
```

### Error: "Webhook verification failed"

**Cause:** Verify token mismatch or incorrect URL

**Solution:**
```bash
# Check verify token matches
.env: WHATSAPP_VERIFY_TOKEN=yahooo
Meta App: Verify Token field = yahooo

# Ensure ngrok URL is HTTPS
WEBHOOK_URL=https://abc123.ngrok.io/api/webhooks/whatsapp (✅ correct)
WEBHOOK_URL=http://abc123.ngrok.io/api/webhooks/whatsapp (❌ wrong)
```

### Error: "Template not approved"

**Cause:** Using unapproved template

**Solution:**
```bash
# Use pre-approved template first
Template: "hello_world" (Always approved by Meta for testing)

# Check template status
curl "https://graph.facebook.com/v18.0/1170300045059437/message_templates" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Look for status: "APPROVED"
```

### Error: "Rate limit exceeded"

**Cause:** Sending too many messages too fast

**Solution:**
```bash
# WhatsApp limits:
- 80 messages/second (use 40-50 to be safe)
- 1000 unique customers/day (for new accounts)

# Add delays between messages
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
await delay(100); // 100ms between messages
```

### MongoDB Connection Failed

**Cause:** MongoDB not running

**Solution:**
```bash
# Windows:
net start MongoDB

# Or manually:
mongod --dbpath="C:\data\db"

# Verify connection:
mongo
> show dbs
```

### Port 3000 Already in Use

**Cause:** Another process using port 3000

**Solution:**
```bash
# Find process
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID_NUMBER> /F

# Or change port in .env
PORT=3001
```

---

## 📊 Testing Checklist

### Basic Tests
- [ ] Backend starts without errors
- [ ] MongoDB connection successful
- [ ] Health check endpoint responds
- [ ] JWT authentication works

### WhatsApp API Tests
- [ ] Access token is valid
- [ ] Can send test message via Graph API
- [ ] Can fetch templates
- [ ] Template status shows "APPROVED"

### Webhook Tests
- [ ] ngrok tunnel is running
- [ ] Webhook verification successful in Meta App
- [ ] Can receive incoming messages
- [ ] Webhook payload logged correctly

### Frontend Integration Tests
- [ ] Frontend connects to backend (localhost:3000)
- [ ] Login screen authenticates successfully
- [ ] Can create campaign with real data
- [ ] Real-time updates via Socket.io work
- [ ] Message list shows webhook messages

### End-to-End Test
- [ ] Create campaign from frontend
- [ ] Campaign saved to MongoDB
- [ ] WhatsApp messages sent via API
- [ ] Delivery status received via webhook
- [ ] Frontend shows real-time progress
- [ ] Can reply to incoming messages

---

## 🎯 Quick Test Script

Save as `quick-test.js`:

```javascript
require('dotenv').config();
const axios = require('axios');

async function quickTest() {
  console.log('🧪 Starting Quick Test...\n');

  // Test 1: Backend Health
  try {
    const health = await axios.get('http://localhost:3000/api/health');
    console.log('✅ Backend Health:', health.data.status);
  } catch (error) {
    console.log('❌ Backend Health Failed:', error.message);
  }

  // Test 2: MongoDB Connection
  const mongoose = require('mongoose');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
    mongoose.disconnect();
  } catch (error) {
    console.log('❌ MongoDB Failed:', error.message);
  }

  // Test 3: WhatsApp API
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
        }
      }
    );
    console.log('✅ WhatsApp API Connected:', response.data.verified_name);
  } catch (error) {
    console.log('❌ WhatsApp API Failed:', error.response?.data?.error?.message || error.message);
  }

  // Test 4: Templates
  try {
    const templates = await axios.get(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
        }
      }
    );
    console.log(`✅ Templates Found: ${templates.data.data.length}`);
  } catch (error) {
    console.log('❌ Templates Failed:', error.response?.data?.error?.message || error.message);
  }

  console.log('\n✅ Quick Test Complete!');
}

quickTest();
```

Run it:
```bash
node quick-test.js
```

---

## 📚 Additional Resources

- [Meta WhatsApp API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Business API Rate Limits](https://developers.facebook.com/docs/whatsapp/cloud-api/overview#throughput)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Webhook Events Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components)
- [ngrok Documentation](https://ngrok.com/docs)

---

**🎉 You're all set! Start testing your WhatsApp Business API integration.**

**Need help? Check the troubleshooting section or review backend logs for detailed error messages.**
