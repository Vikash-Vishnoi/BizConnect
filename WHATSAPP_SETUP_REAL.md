# 🚀 WhatsApp Business API - Real App Setup Guide

## ✅ Your Credentials (Configured)

```
✓ Phone Number ID: 897748750080236
✓ Access Token: EAAPZC8l3lK... (configured)
✓ WhatsApp Business Account ID: 1170300045059437
✓ App Secret: 91be7b6b1f3efc986c42de9af40393d6
✓ Your Test Number: +91 9509545832
✓ API Version: v22.0 (Latest)
```

---

## 🎯 Quick Start (3 Steps)

### Step 1: Start MongoDB
```powershell
# Terminal 1 - Start MongoDB
cd C:\Users\bishn\Desktop\Coding\W
.\start-mongodb.ps1
```

### Step 2: Start Backend Server
```powershell
# Terminal 2 - Start Backend
cd C:\Users\bishn\Desktop\Coding\W\backend
npm start
```

### Step 3: Test WhatsApp Connection
```powershell
# Terminal 3 - Test API
cd C:\Users\bishn\Desktop\Coding\W\backend
node test-whatsapp-real.js
```

**Expected Result:**
- ✅ Message sent successfully
- 📱 You receive "Hello World" message on +91 9509545832
- 📋 Account info displayed
- 📄 Available templates listed

---

## 📱 Test the Full App

### Start Frontend (React Native)
```powershell
# Terminal 4 - Start Metro Bundler
cd C:\Users\bishn\Desktop\Coding\W\frontend
npm start
```

### Run on Android
```powershell
# Terminal 5 - Run Android App
cd C:\Users\bishn\Desktop\Coding\W\frontend
npm run android
```

---

## 🧪 Test Features in App

### 1. **Login**
- Open app on emulator/device
- Username: `admin`
- Password: `admin123`

### 2. **Send Test Message**
1. Go to **Dashboard**
2. Click **New Conversation** 
3. Enter phone number: `919509545832` (your number)
4. Type message and send
5. Check your WhatsApp for the message!

### 3. **Create Campaign**
1. Go to **Campaigns** tab
2. Click **+ Create Campaign**
3. Fill details:
   - Name: "Test Campaign"
   - Select template: "hello_world"
   - Add recipients: Upload CSV or add manually
4. Schedule or send immediately
5. Check recipients receive messages

### 4. **Create Template**
1. Go to **Templates** tab
2. Click **+ Create Template**
3. Fill template details:
   - Name: "welcome_message"
   - Category: MARKETING
   - Language: English (en)
   - Add header, body, footer, buttons
4. Submit for approval
5. Check status in Meta Business Manager

---

## 🔧 Testing Individual API Calls

### Test 1: Send Hello World Template
```powershell
curl -i -X POST https://graph.facebook.com/v22.0/897748750080236/messages `
-H "Authorization: Bearer EAAPZC8l3lKYoBP3KGR95wvk2ZAoQSDebwqEZCNKXDLMgZCJNKEUZAZASKPFxZC981VyoIldg2jwXI8NEuVWkZCVBnCDh6bZC9TQtSQ7EsRLMTSbBHCNVkifd6vWYh60lisaJseAIkjrj0lXgVb7ZBGDoK7bCGVSkArA6ZAnKDg06dXpoj0nw6ZBzMolWWDZAzbwZA6yyCZA8RtbiYKLgfiZBPIfm8nqzs33HIlF6nEcMIZBNTp61AuidAwgZDZD" `
-H "Content-Type: application/json" `
-d '{"messaging_product":"whatsapp","to":"919509545832","type":"template","template":{"name":"hello_world","language":{"code":"en_US"}}}'
```

### Test 2: Send Text Message
```powershell
curl -i -X POST https://graph.facebook.com/v22.0/897748750080236/messages `
-H "Authorization: Bearer EAAPZC8l3lKYoBP3KGR95wvk2ZAoQSDebwqEZCNKXDLMgZCJNKEUZAZASKPFxZC981VyoIldg2jwXI8NEuVWkZCVBnCDh6bZC9TQtSQ7EsRLMTSbBHCNVkifd6vWYh60lisaJseAIkjrj0lXgVb7ZBGDoK7bCGVSkArA6ZAnKDg06dXpoj0nw6ZBzMolWWDZAzbwZA6yyCZA8RtbiYKLgfiZBPIfm8nqzs33HIlF6nEcMIZBNTp61AuidAwgZDZD" `
-H "Content-Type: application/json" `
-d '{"messaging_product":"whatsapp","to":"919509545832","type":"text","text":{"body":"Hello from my WhatsApp Marketing App! 🚀"}}'
```

### Test 3: Check Account Status
```powershell
curl -i -X GET "https://graph.facebook.com/v22.0/897748750080236?fields=verified_name,code_verification_status,display_phone_number,quality_rating" `
-H "Authorization: Bearer EAAPZC8l3lKYoBP3KGR95wvk2ZAoQSDebwqEZCNKXDLMgZCJNKEUZAZASKPFxZC981VyoIldg2jwXI8NEuVWkZCVBnCDh6bZC9TQtSQ7EsRLMTSbBHCNVkifd6vWYh60lisaJseAIkjrj0lXgVb7ZBGDoK7bCGVSkArA6ZAnKDg06dXpoj0nw6ZBzMolWWDZAzbwZA6yyCZA8RtbiYKLgfiZBPIfm8nqzs33HIlF6nEcMIZBNTp61AuidAwgZDZD"
```

---

## 📊 Monitor & Debug

### Backend Logs
```powershell
# In backend terminal, you'll see:
✓ MongoDB connected successfully
✓ Socket.IO initialized
✓ Server running on port 3000
✓ WhatsApp service initialized
```

### API Test Results
```powershell
# After running test-whatsapp-real.js:
✅ Message sent successfully!
📬 Response: { messages: [{ id: 'wamid.xxx' }] }
📱 Check your WhatsApp: +919509545832
```

### Common Issues & Solutions

#### ❌ 401 Unauthorized
**Problem:** Access token expired or invalid  
**Solution:** 
1. Go to [Meta App Dashboard](https://developers.facebook.com/apps/)
2. Select your app → WhatsApp → API Setup
3. Click "Generate Token" 
4. Copy new token
5. Update `.env` file: `WHATSAPP_ACCESS_TOKEN=new_token_here`
6. Restart backend: `npm start`

#### ❌ 400 Bad Request - Invalid Phone Number
**Problem:** Phone number format incorrect  
**Solution:** Use format: `919509545832` (country code + number, no + or spaces)

#### ❌ Template Not Found
**Problem:** hello_world template not approved  
**Solution:** 
1. Create template in [Meta Business Manager](https://business.facebook.com/)
2. Wait for approval (usually 15-30 minutes)
3. Or use a different approved template

#### ❌ MongoDB Connection Failed
**Problem:** MongoDB not running  
**Solution:** 
```powershell
cd C:\Users\bishn\Desktop\Coding\W
.\start-mongodb.ps1
```

---

## 🎨 Make it Production-Ready

### 1. Get Permanent Access Token

**Current:** Temporary token (expires in 24 hours)  
**Production:** System User Token (never expires)

**Steps:**
1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Settings → Users → System Users
3. Click **Add** → Create System User
4. Name: "WhatsApp Marketing Bot"
5. Role: Admin
6. Click **Add Assets** → Apps → Select your app → Full Control
7. Click **Generate New Token**
8. Select permissions:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
9. Copy token (save it securely!)
10. Update `.env`: `WHATSAPP_ACCESS_TOKEN=permanent_token_here`

### 2. Setup Webhooks (Receive Messages)

**Install ngrok:**
```powershell
npm install -g ngrok
```

**Start ngrok:**
```powershell
ngrok http 3000
```

**Configure webhook in Meta:**
1. Copy ngrok URL: `https://xxxx.ngrok.io`
2. Go to Meta App Dashboard → WhatsApp → Configuration
3. Click **Edit** next to Webhook
4. Callback URL: `https://xxxx.ngrok.io/api/webhooks/whatsapp`
5. Verify Token: `yahooo` (matches `.env` WHATSAPP_VERIFY_TOKEN)
6. Click **Verify and Save**
7. Subscribe to fields:
   - ✓ messages
   - ✓ message_status

**Test webhook:**
1. Send a message to your WhatsApp Business number
2. Check backend logs for incoming webhook
3. Check ngrok dashboard: `http://localhost:4040`

### 3. Verify Phone Number Display Name

1. Go to Meta App Dashboard → WhatsApp → Getting Started
2. Complete business verification
3. Add display name for your phone number
4. Wait for approval (1-2 days)

### 4. Increase Messaging Limits

**Current Tier:** Tier 1 (1,000 unique recipients/day)

**To increase:**
1. Send quality messages (low spam reports)
2. Maintain good quality rating
3. Auto-upgrade happens after 7 days of good performance
4. Tiers: 1K → 10K → 100K → Unlimited

---

## 📚 Additional Resources

### Documentation
- [WhatsApp Business Platform Docs](https://developers.facebook.com/docs/whatsapp)
- [Cloud API Getting Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/message-templates)

### Tools
- [Meta App Dashboard](https://developers.facebook.com/apps/)
- [Meta Business Manager](https://business.facebook.com/)
- [WhatsApp Business API Explorer](https://developers.facebook.com/tools/explorer/)
- [Postman Collection](https://www.postman.com/meta/workspace/whatsapp-business-platform/)

### Support
- [Meta Developer Community](https://developers.facebook.com/community/)
- [WhatsApp Business API Status](https://status.fb.com/)

---

## ✅ Checklist

- [x] Credentials configured in `.env`
- [x] MongoDB running
- [x] Backend server running
- [ ] Test message sent successfully
- [ ] Frontend app running
- [ ] Login working
- [ ] Message sending working
- [ ] Campaign creation working
- [ ] Template creation working
- [ ] Webhooks configured (optional)
- [ ] Permanent token generated (for production)
- [ ] Business verification completed (for production)

---

## 🎉 You're Ready!

Your WhatsApp Marketing App is now configured with **real credentials** and ready to use!

**Next Steps:**
1. Run `node test-whatsapp-real.js` to verify connection
2. Start the app and login
3. Send your first message
4. Create your first campaign
5. Monitor analytics dashboard

**Need Help?**
- Check backend logs for errors
- Verify credentials in Meta App Dashboard
- Ensure MongoDB is running
- Check token hasn't expired

---

**Last Updated:** October 22, 2025  
**Status:** ✅ Ready for Real-World Use
