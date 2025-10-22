# Troubleshooting Guide

## Issues Fixed

### ✅ Issue 1: MongoDB Connection Error
**Error:** `❌ MongoDB Connection Error: connect ECONNREFUSED ::1:27017`

**Cause:** MongoDB is not installed or not running locally.

**Solutions:**

#### Option A: Use MongoDB Atlas (Cloud - Recommended)
1. Create free account at: https://www.mongodb.com/cloud/atlas/register
2. Create a free M0 cluster
3. Create a database user with password
4. Whitelist your IP (or use 0.0.0.0/0 for all IPs)
5. Get your connection string (looks like):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/whatsapp-marketing
   ```
6. Update `backend/.env`:
   ```env
   MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/whatsapp-marketing?retryWrites=true&w=majority
   ```

#### Option B: Install MongoDB Locally
1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Install with default settings
3. MongoDB will run automatically on `mongodb://localhost:27017`
4. Keep the existing `.env` setting:
   ```env
   MONGODB_URI=mongodb://localhost:27017/whatsapp-marketing
   ```

### ✅ Issue 2: Android Build Failure
**Error:** `No matching variant of project :notifee_react-native was found`

**Cause:** React Native native modules not properly linked after installation.

**Solution:**
```powershell
# Navigate to frontend
cd C:\Users\bishn\Desktop\Coding\W\frontend

# Clean build folders
Remove-Item -Recurse -Force node_modules,android\app\build,android\build -ErrorAction SilentlyContinue

# Reinstall dependencies
npm install

# Clean Android cache
cd android
.\gradlew clean
cd ..

# Rebuild app
npm run android
```

---

## Common Issues & Solutions

### Backend Won't Start
```powershell
# Check if backend is running
cd backend
npm run dev
```

**If you see "PORT 3000 is already in use":**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with the number from above)
taskkill /F /PID <PID>
```

### Android Emulator Issues

**Emulator won't start:**
1. Open Android Studio
2. Go to Tools → AVD Manager
3. Create/Start an emulator

**Or use physical device:**
1. Enable Developer Options on phone
2. Enable USB Debugging
3. Connect via USB
4. Run: `adb devices` to verify connection

### Metro Bundler Issues

**Port 8081 already in use:**
```powershell
# Kill process on port 8081
netstat -ano | findstr :8081
taskkill /F /PID <PID>

# Or start Metro on different port
npm start -- --port 8082
```

### Clean Everything (Nuclear Option)

If all else fails, clean everything:

```powershell
# Frontend
cd frontend
Remove-Item -Recurse -Force node_modules,android\app\build,android\build,android\.gradle,ios\Pods,ios\build
npm install

# Backend
cd ..\backend
Remove-Item -Recurse -Force node_modules
npm install

# Android
cd ..\frontend\android
.\gradlew clean
.\gradlew --stop
cd ..\..

# Rebuild
cd frontend
npm run android
```

---

## Development Workflow

### Starting Development

1. **Start Backend:**
   ```powershell
   cd backend
   npm run dev
   ```
   Should see: `🚀 Server running on port 3000`

2. **Start Frontend (New Terminal):**
   ```powershell
   cd frontend
   npm start
   ```

3. **Run Android (Another Terminal):**
   ```powershell
   cd frontend
   npm run android
   ```

### Testing API

```powershell
cd backend
node test-api.js
```

---

## Checking Logs

### Backend Logs
- Check terminal where backend is running
- Logs show API requests, database queries, errors

### Android Logs
```powershell
# View all logs
adb logcat

# Filter React Native logs
adb logcat *:S ReactNative:V ReactNativeJS:V

# Clear logs
adb logcat -c
```

### Metro Bundler Logs
- Check terminal where `npm start` is running
- Shows JavaScript bundle updates

---

## Environment Variables

### Backend `.env` Template
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/whatsapp-marketing
# OR for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp-marketing

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key-here

# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
WHATSAPP_VERIFY_TOKEN=your-verify-token

# WABA
WABA_ID=your-waba-id

# Frontend
FRONTEND_URL=http://localhost:8081

# Socket.io
SOCKET_CORS_ORIGIN=*
```

---

## Useful Commands

### Node/NPM
```powershell
# Check versions
node --version
npm --version

# Clear npm cache
npm cache clean --force

# Update npm
npm install -g npm@latest
```

### Android
```powershell
# List devices
adb devices

# Restart adb
adb kill-server
adb start-server

# Install APK manually
adb install app-debug.apk

# Uninstall app
adb uninstall com.whatsappmarketing
```

### React Native
```powershell
# Doctor (check environment)
npx react-native doctor

# Start fresh
npx react-native start --reset-cache

# Build release APK
cd android
.\gradlew assembleRelease
```

---

## Getting Help

1. Check this guide first
2. Review `SETUP_GUIDE.md`
3. Check `PROJECT_COMPLETE.md` for API documentation
4. Look at terminal logs for specific errors
5. Google the exact error message
6. Check React Native docs: https://reactnative.dev/
7. Check WhatsApp Business API docs: https://developers.facebook.com/docs/whatsapp

---

## Status Checklist

Before reporting an issue, verify:

- [ ] MongoDB is running (locally or Atlas connected)
- [ ] Backend server is running (`npm run dev` in backend/)
- [ ] No port conflicts (3000, 8081)
- [ ] Android emulator/device is connected
- [ ] node_modules are installed (both frontend & backend)
- [ ] Environment variables are set in backend/.env
- [ ] No firewall blocking connections
- [ ] Proper Node.js version (16+)

---

**Last Updated:** October 21, 2025
