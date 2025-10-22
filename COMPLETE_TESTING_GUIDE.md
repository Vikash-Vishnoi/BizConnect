# 🚀 Complete App Testing Guide

## 🎯 Your Current Issues & Solutions

### Issue 1: Port 3000 Already in Use ✅ SOLUTION PROVIDED
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Fix:** Run this script to automatically kill the process:
```powershell
cd backend
.\start-backend.ps1
```

This will:
- ✅ Find and kill process using port 3000
- ✅ Check MongoDB connection
- ✅ Validate your access token
- ✅ Start backend server

### Issue 2: Frontend Can't Connect to Backend
```
(NOBRIDGE) ERROR  Socket connection error: [Error: websocket error]
(NOBRIDGE) LOG  Real API login failed, trying mock login
```

**Cause:** Backend is not running (port conflict)

**Fix:** Start backend first (see Issue 1)

---

## 📋 Complete Startup Procedure

### Step 1: Kill Process on Port 3000 (If Needed)

**Option A: Automated (Recommended)**
```powershell
cd backend
.\start-backend.ps1
```

**Option B: Manual**
```powershell
# Find process
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess

# Kill it (replace PID with actual number)
taskkill /PID <PID> /F
```

---

### Step 2: Start MongoDB

**Check if MongoDB is running:**
```powershell
Get-Process -Name mongod -ErrorAction SilentlyContinue
```

**If not running, start it:**
```powershell
# Option 1: Windows Service
net start MongoDB

# Option 2: Manual
mongod --dbpath=C:\data\db
```

---

### Step 3: Validate Access Token

```powershell
cd backend
node validate-token.js
```

**Expected output:**
```
✅ TOKEN IS VALID
⏰ Time Remaining: X hour(s) Y minute(s)
```

**If token expired:**
```powershell
.\get-new-token.ps1
```

---

### Step 4: Start Backend Server

**Terminal 1 (Backend):**
```powershell
cd C:\Users\bishn\Desktop\Coding\W\backend
npm start
```

**Expected output:**
```
✅ MongoDB Connected: localhost
🚀 Server running on port 3000
📱 Socket.io server started
```

**Leave this terminal running!**

---

### Step 5: Start React Native Metro

**Terminal 2 (Metro Bundler):**
```powershell
cd C:\Users\bishn\Desktop\Coding\W\frontend
npm start
```

**Expected output:**
```
info Dev server ready

i - run on iOS
a - run on Android
```

**Leave this terminal running!**

---

### Step 6: Run Android App

**Terminal 3 (Android):**
```powershell
cd C:\Users\bishn\Desktop\Coding\W\frontend
npm run android
```

**Or press 'a' in Metro terminal**

---

## ✅ Verify Everything is Working

### Backend Checks:

1. **Health Check:**
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok","mongodb":"connected"}`

2. **API Test:**
   ```bash
   cd backend
   node test-api.js
   ```
   Should show: All tests passing

3. **Socket.io:**
   Open: http://localhost:3000
   Should see: Server info

### Frontend Checks:

1. **No Network Errors:** App should connect to backend
2. **Login Works:** Use credentials from README
3. **Dashboard Loads:** Real data from backend
4. **Socket Connected:** Real-time updates work

---

## 🔧 Your Current .env Configuration

### Backend ✅ CONFIGURED CORRECTLY

Your backend `.env` is properly configured with:

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/whatsapp-marketing ✅

# Server
PORT=3000 ✅
NODE_ENV=development ✅

# JWT
JWT_SECRET=yahooo ✅
JWT_EXPIRE=7d ✅

# WhatsApp API
WHATSAPP_API_URL=https://graph.facebook.com/v18.0 ✅
WHATSAPP_PHONE_NUMBER_ID=897748750080236 ✅
WHATSAPP_ACCESS_TOKEN=<your-token> ⚠️ Expires soon!
WHATSAPP_BUSINESS_ACCOUNT_ID=1170300045059437 ✅
WHATSAPP_VERIFY_TOKEN=yahooo ✅

# Webhooks
WEBHOOK_URL=http://localhost:3000/api/webhooks/whatsapp ✅

# Frontend
FRONTEND_URL=http://localhost:8081 ✅
```

### Frontend ✅ NO .ENV NEEDED

Frontend uses hardcoded URLs in `src/services/api.ts`:
```typescript
// For Android Emulator
API_BASE_URL = 'http://10.0.2.2:3000/api' ✅

// For Physical Device (if needed, update to your PC's IP)
// API_BASE_URL = 'http://192.168.1.100:3000/api'
```

**No changes needed!** Configuration is correct.

---

## 🎯 What You Need to Change (Optional)

### 1. Access Token (Expires Soon!)

**Your token expires tonight at 10:30 PM**

**Get permanent token:**
```powershell
cd backend
.\get-new-token.ps1
# Choose Option 2: PERMANENT TOKEN
```

### 2. JWT Secret (For Production)

**Current:** `JWT_SECRET=yahooo` (weak)

**Generate strong secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Update in `.env`:**
```bash
JWT_SECRET=<generated-secret>
```

### 3. Physical Device Testing (Optional)

If testing on physical Android device instead of emulator:

**Find your PC's IP:**
```powershell
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)
```

**Update frontend API URL:**
```typescript
// File: frontend/src/services/api.ts
const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:3000/api' // Your PC's IP
  : 'https://your-production-api.com/api';
```

---

## 📱 Login Credentials (From README)

### Admin Account:
```
Email: admin@whatsappmarketing.com
Password: admin123
```

### Regular User:
```
Email: john@example.com
Password: password123
```

**Note:** These will only work if you've seeded the database:
```bash
cd backend
node seed-database.js
```

---

## 🧪 Complete Testing Workflow

### 1. Fresh Start (Kill All Processes)

```powershell
# Kill backend (if running)
taskkill /IM node.exe /F

# Or more selective
cd backend
.\start-backend.ps1
```

### 2. Start Services in Order

```powershell
# Terminal 1: MongoDB (if not running as service)
mongod --dbpath=C:\data\db

# Terminal 2: Backend
cd C:\Users\bishn\Desktop\Coding\W\backend
npm start

# Terminal 3: Metro Bundler
cd C:\Users\bishn\Desktop\Coding\W\frontend
npm start

# Terminal 4: Android App
cd C:\Users\bishn\Desktop\Coding\W\frontend
npm run android
```

### 3. Verify Each Layer

**MongoDB:**
```bash
mongo
> show dbs
> use whatsapp-marketing
> db.users.find()
```

**Backend:**
```bash
curl http://localhost:3000/health
node test-api.js
```

**Frontend:**
- App launches without errors
- Login screen appears
- Can login with credentials
- Dashboard loads with data

---

## 🔍 Troubleshooting Checklist

### Backend Won't Start

- [ ] Port 3000 is free (run `.\start-backend.ps1`)
- [ ] MongoDB is running (`net start MongoDB`)
- [ ] `.env` file exists in backend folder
- [ ] All dependencies installed (`npm install`)

### Frontend Shows Network Errors

- [ ] Backend is running on port 3000
- [ ] No firewall blocking port 3000
- [ ] Correct API URL in `frontend/src/services/api.ts`
- [ ] For emulator: Using `http://10.0.2.2:3000/api`
- [ ] For physical device: Using your PC's IP

### Socket Connection Errors

- [ ] Backend started successfully
- [ ] Socket.io initialized (check backend logs)
- [ ] CORS configured correctly (`.env`: `SOCKET_CORS_ORIGIN=*`)
- [ ] No proxy/firewall blocking WebSocket

### Login Fails

- [ ] Database seeded (`node seed-database.js`)
- [ ] Using correct credentials (see above)
- [ ] Backend `/api/auth/login` endpoint works
- [ ] JWT_SECRET configured in `.env`

### MongoDB Connection Failed

- [ ] MongoDB service running (`net start MongoDB`)
- [ ] Port 27017 available
- [ ] Correct URI in `.env`
- [ ] MongoDB installed and configured

---

## 📊 Expected Terminal Outputs

### Terminal 1 - Backend (npm start)
```
✅ MongoDB Connected: localhost
🚀 Server running on port 3000
📱 Socket.io server started
Server is ready to handle requests
```

### Terminal 2 - Metro Bundler (npm start)
```
Welcome to Metro v0.81.5
info Dev server ready

i - run on iOS
a - run on Android
```

### Terminal 3 - Android App (npm run android)
```
info Launching emulator...
info Installing the app...
info Starting the app...
SUCCESS - App launched
```

### Android App Logs (in Metro)
```
LOG  Socket connection initiated
LOG  Logged in successfully
LOG  Dashboard data loaded
```

**No errors about:**
- ❌ Network Error
- ❌ Socket connection error
- ❌ Login failed

---

## 🎉 Success Criteria

Your app is working correctly when:

- [ ] Backend starts without port conflicts
- [ ] MongoDB connected successfully
- [ ] `node test-api.js` passes all tests
- [ ] Metro bundler running
- [ ] Android app launches
- [ ] **NO network errors in logs**
- [ ] **NO socket connection errors**
- [ ] Login works with provided credentials
- [ ] Dashboard loads real data from backend
- [ ] Can create/view campaigns
- [ ] Can send messages (with valid token)
- [ ] Real-time updates work (Socket.io)

---

## 🚀 Quick Start Command

**All-in-one start (after fixing port):**

```powershell
# Kill any node processes
taskkill /IM node.exe /F

# Start everything (run each in separate terminal)
# Terminal 1
cd C:\Users\bishn\Desktop\Coding\W\backend; npm start

# Terminal 2
cd C:\Users\bishn\Desktop\Coding\W\frontend; npm start

# Terminal 3 (or press 'a' in Terminal 2)
cd C:\Users\bishn\Desktop\Coding\W\frontend; npm run android
```

---

## 📚 Additional Scripts

### Backend Scripts
```bash
npm start              # Start server
npm run dev            # Start with nodemon (auto-restart)
node test-api.js       # Test all endpoints
node validate-token.js # Check WhatsApp token
node seed-database.js  # Seed test data
node quick-test.js     # Full environment test
```

### PowerShell Helper Scripts
```powershell
.\start-backend.ps1    # Fix port & start backend
.\get-new-token.ps1    # Get new WhatsApp token
.\setup-webhook.ps1    # Configure webhooks
.\validate-token.js    # Check token status
.\celebrate.ps1        # Success celebration
```

---

## ✅ Final Checklist

Before considering your app "fully tested":

### Configuration
- [ ] Backend `.env` configured correctly
- [ ] Frontend API URL correct for your setup
- [ ] MongoDB running and accessible
- [ ] WhatsApp access token valid

### Backend
- [ ] Server starts on port 3000
- [ ] MongoDB connection successful
- [ ] All API tests pass
- [ ] Health endpoint responds
- [ ] Socket.io initialized

### Frontend
- [ ] App builds successfully
- [ ] No network errors
- [ ] Login works
- [ ] Dashboard loads
- [ ] Can navigate all screens
- [ ] Real-time updates work

### Integration
- [ ] Frontend connects to backend
- [ ] Auth flow works end-to-end
- [ ] Can create campaigns
- [ ] Can view conversations
- [ ] Socket.io real-time updates work

---

## 🆘 Still Having Issues?

### 1. Run Diagnostics
```bash
cd backend
node quick-test.js
```

### 2. Check Logs
- Backend terminal (npm start)
- Metro bundler (npm start)
- Android logs (in Metro terminal)

### 3. Enable Debug Mode
```bash
# In backend/.env
LOG_LEVEL=debug
WHATSAPP_DEBUG_MODE=true
```

### 4. Review Documentation
- `SUCCESS_STATUS.md` - Current status
- `TESTING_README.md` - Testing guide
- `WHATSAPP_TESTING_GUIDE.md` - Complete manual
- `TOKEN_MANAGEMENT_GUIDE.md` - Token help

---

**🎯 START HERE:**
```powershell
cd backend
.\start-backend.ps1
```

This will fix your port issue and start the backend! 🚀
