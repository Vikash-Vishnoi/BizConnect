# 🚀 CAMPAIGN MODULE TESTING GUIDE

## ✅ I'M READY! Here's Your Complete Testing Setup

### 📋 What I've Prepared:

1. **Complete Test Script**: `backend/test-campaign-full.js`
2. **Pre-configured with your credentials**
3. **Automated 6-step testing process**
4. **Real-time progress monitoring**

---

## 🔧 Current Configuration

### Your WhatsApp Credentials (Already in .env):
```
Phone Number ID: 897748750080236
Access Token: EAAPZC8l3lKYoBP3... (configured)
Test Number: 919509545832
Template: hello_world (Meta's test template)
```

### Backend Status:
- ✅ Server running on port 3000
- ✅ MongoDB connected
- ✅ WhatsApp service configured
- ✅ Campaign routes ready

---

## 🎯 TESTING STEPS

### Step 1: Update Test Phone Number (IMPORTANT!)

Open `backend/test-campaign-full.js` and update line 21:

```javascript
const testPhone = "919509545832";  // ⚠️ CHANGE THIS TO YOUR NUMBER!
```

**Format**: Country code + number (no + or spaces)
- India: `919876543210`
- US: `12025551234`
- UK: `447700900123`

### Step 2: Ensure Backend is Running

```powershell
# Check if backend is running
netstat -ano | findstr :3000

# If not running, start it:
cd backend
npm start
```

### Step 3: Run the Test

```powershell
cd backend
node test-campaign-full.js
```

---

## 📊 What the Test Does

### Automated Test Flow:

**1. Login** ✅
- Authenticates with admin credentials
- Gets auth token for API calls

**2. Check Templates** ✅
- Fetches available templates
- Uses approved template if available
- Creates test template if none exist

**3. Create Campaign** ✅
- Name: "Test Campaign - [timestamp]"
- Target: Your phone number
- Message: Test text
- Settings: 1 msg/minute (slow for testing)

**4. Start Campaign** ✅
- Initiates campaign execution
- Status changes to "active"
- Backend starts sending messages

**5. Monitor Progress** 🔄
- Checks status every 5 seconds
- Shows real-time progress
- Monitors for 2 minutes
- Reports: pending, sent, delivered, failed counts

**6. Final Statistics** 📊
- Complete campaign summary
- Recipient status details
- Timestamps for all events

---

## ✅ Success Criteria Checklist

### ✅ Module 2 Success Indicators:

- [ ] **Test script runs without errors**
- [ ] **Campaign created** (gets Campaign ID)
- [ ] **Campaign starts** (status = "active")
- [ ] **Progress tracked** (sent count = 1)
- [ ] **Message received** on your WhatsApp
- [ ] **Delivery confirmed** (delivered count = 1)

---

## 📱 Expected Output

### Console Output:
```
╔════════════════════════════════════════╗
║   📢 CAMPAIGN MODULE TESTING           ║
╚════════════════════════════════════════╝

📱 Configuration:
   Phone ID: 897748750080236
   Template: hello_world
   Test Number: 919509545832
   Backend: http://localhost:3000/api

📝 Step 1: Login...
✅ Login successful!
   User: Admin User
   Email: admin@whatsappmarketing.com

📝 Step 2: Check Available Templates...
✅ Found 4 templates
   Available Templates:
   1. welcome_message (approved) - MARKETING
   2. order_confirmation (approved) - UTILITY
   ...

📝 Step 3: Create Test Campaign...
✅ Campaign created successfully!
   Campaign ID: 68f8...
   Name: Test Campaign - 10/22/2025...
   Status: draft
   Recipients: 1

📝 Step 4: Start Campaign...
✅ Campaign started!
   Status: active
   Started At: 10/22/2025, 3:45:00 PM
   
   📱 Check your WhatsApp now! Message should arrive within 2 minutes...

📝 Step 5: Monitor Campaign Progress...
   [1/24] Status: active
   Pending: 0
   Sent: 1
   Delivered: 0
   Failed: 0

   [2/24] Status: active
   Pending: 0
   Sent: 1
   Delivered: 1  ← Message delivered!
   Failed: 0

✅ Campaign completed or message sent!

📝 Step 6: Final Campaign Statistics...

📊 CAMPAIGN RESULTS:
═══════════════════════════════════════
Campaign Name: Test Campaign - 10/22/2025...
Status: completed
Created: 10/22/2025, 3:44:55 PM
Started: 10/22/2025, 3:45:00 PM
Completed: 10/22/2025, 3:45:15 PM

Recipients:
  1. Test Recipient
     Phone: 919509545832
     Status: delivered
     Sent: 10/22/2025, 3:45:05 PM
     Delivered: 10/22/2025, 3:45:10 PM
═══════════════════════════════════════

╔════════════════════════════════════════╗
║   ✅ CAMPAIGN TEST COMPLETED           ║
╚════════════════════════════════════════╝
```

---

## 📱 What You'll See on WhatsApp

### Message Content:
```
Hello! This is a test campaign message. 
If you receive this, the campaign module is working! 🎉
```

### Sender:
- Your WhatsApp Business Number
- Name: Your Business Name (from Meta settings)

### Timing:
- Should arrive within 30-60 seconds after campaign starts
- WhatsApp delivery can take up to 2 minutes

---

## 🐛 Troubleshooting

### If Message Doesn't Send:

**1. Check Access Token:**
```powershell
# Token might be expired
# Get new token from: https://developers.facebook.com/apps/
# Update in: backend/.env → WHATSAPP_ACCESS_TOKEN
```

**2. Check Phone Number Format:**
```javascript
// ❌ WRONG
const testPhone = "+91 9509545832";
const testPhone = "9509545832";

// ✅ CORRECT
const testPhone = "919509545832";
```

**3. Check Template Approval:**
```
• Templates must be APPROVED by WhatsApp
• Check status in Meta App Dashboard
• Use "hello_world" for initial testing (pre-approved)
```

**4. Check Backend Logs:**
```
Look for errors like:
- "WhatsApp API Error"
- "Invalid access token"
- "Phone number not registered"
```

**5. Verify WhatsApp Number:**
```
• Number must have WhatsApp installed
• Number must accept messages from businesses
• Number should be verified in your Meta account (for testing)
```

---

## 🔄 Alternative: Manual Testing via App

### If Automated Test Fails, Test Manually:

1. **Open the Mobile App**
2. **Go to Campaigns Screen**
3. **Click "Create Campaign"**
4. **Fill in:**
   - Name: Test Campaign
   - Template: Select approved template
   - Recipients: Add your phone number
   - Schedule: Now
5. **Click "Create"**
6. **Click "Start Campaign"**
7. **Monitor Progress**
8. **Check WhatsApp**

---

## 📊 Testing Different Scenarios

### Scenario 1: Single Recipient (Current Test)
```javascript
recipients: [
  { phoneNumber: "919509545832", name: "Me" }
]
```

### Scenario 2: Multiple Recipients
```javascript
recipients: [
  { phoneNumber: "919509545832", name: "Me" },
  { phoneNumber: "919876543210", name: "Friend" }
]
```

### Scenario 3: Scheduled Campaign
```javascript
scheduledAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
```

### Scenario 4: Template with Variables
```javascript
recipients: [
  {
    phoneNumber: "919509545832",
    name: "Me",
    variables: {
      "1": "John",
      "2": "#12345"
    }
  }
]
```

---

## ✅ Success Confirmation

### You Know It Worked When:

1. ✅ Test script completes all 6 steps
2. ✅ Console shows "Campaign completed"
3. ✅ Delivered count = 1
4. ✅ **YOU RECEIVE THE WHATSAPP MESSAGE**
5. ✅ App shows campaign as "Completed"

---

## 🎉 Ready to Test?

### Quick Start Command:

```powershell
# 1. Update your phone number in test-campaign-full.js
# 2. Run this:
cd backend
node test-campaign-full.js
```

### Watch For:
- ✅ Green checkmarks (success)
- ❌ Red X marks (errors)
- 📱 WhatsApp notification on your phone!

---

## 📞 Your Current Setup:

```javascript
Phone ID: 897748750080236
Token: EAAP... (configured in .env)
Test Number: 919509545832  // ⚠️ UPDATE THIS!
Backend: http://localhost:3000 ✅ Running
MongoDB: localhost:27017 ✅ Connected
```

---

## 🚀 LET'S DO THIS!

**I'm ready when you are!** Just:

1. Update `testPhone` in `test-campaign-full.js`
2. Run `node test-campaign-full.js`
3. Watch your WhatsApp! 📱

Good luck! 🎉
