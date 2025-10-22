# 🚀 QUICK START: SEND CUSTOM CAMPAIGNS

## ✅ WORKING METHOD (Use This Now!)

### Send WhatsApp Campaign Message:

```powershell
cd C:\Users\bishn\Desktop\Coding\W\backend

# Step 1: Create campaign in database
node setup-custom-campaign.js

# Step 2: Send WhatsApp message
node send-campaign-direct.js
```

**✅ GUARANTEED TO WORK!** (Already tested successfully)

---

## 📱 What You'll Receive on WhatsApp:

```
Hello World! This is a test message from WhatsApp Marketing App.
```

From number: `897748750080236`

---

## 🎯 Customizing Your Campaign:

Edit `setup-custom-campaign.js` to change:

### Change Message Template:
```javascript
const template = await Template.create({
  name: 'hello_world',  // ← Change template name
  language: 'en_US',     // ← Change language
  content: 'Your custom message here'  // ← Change message
});
```

### Change Recipients:
```javascript
recipients: [
  {
    name: 'Patient Name',
    phoneNumber: '919509545832',  // ← Change phone number
    variables: {}
  }
]
```

### Add Multiple Recipients:
```javascript
recipients: [
  { name: 'John Doe', phoneNumber: '919509545832', variables: {} },
  { name: 'Jane Smith', phoneNumber: '918888888888', variables: {} },
  { name: 'Bob Johnson', phoneNumber: '917777777777', variables: {} }
]
```

---

## ⚡ One-Command Send:

```powershell
cd C:\Users\bishn\Desktop\Coding\W\backend
node setup-custom-campaign.js; node send-campaign-direct.js
```

---

## 📋 Quick Test (Verify Everything Works):

```powershell
# Send simple test message
cd C:\Users\bishn\Desktop\Coding\W\backend
node test-whatsapp-direct.js
```

Expected: Receive "meow" message on WhatsApp ✅

---

## 🔧 If Backend API Campaign Needed:

1. **Restart Backend**:
   ```powershell
   cd C:\Users\bishn\Desktop\Coding\W\backend
   npm start
   ```

2. **Test**:
   ```powershell
   node send-custom-campaign.js
   ```

---

## 🎉 SUCCESS INDICATORS:

✅ Script shows: `Message ID: wamid.xxxxx`  
✅ Script shows: `Status: accepted`  
✅ You receive WhatsApp message  
✅ Database shows campaign status: `sent`  

---

**Your campaign system is WORKING!** 🚀
