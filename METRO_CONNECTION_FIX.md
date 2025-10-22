# 🔧 React Native Metro Connection Error - Complete Fix

## 🚨 Your Error:

```
Could not connect to development server.
URL: http://10.0.2.2:8081/index.bundle
```

**This means:** Your Android app can't reach the Metro bundler running on your PC.

---

## ✅ Quick Fix (Run This First)

### Option 1: PowerShell Script (Recommended)
```powershell
cd frontend
.\fix-metro-connection.ps1
```

### Option 2: Batch Script
```cmd
cd frontend
fix-metro-connection.bat
```

### Option 3: Manual Fix
```bash
# 1. Kill all Node processes
taskkill /F /IM node.exe

# 2. Setup ADB reverse
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000

# 3. Start Metro
cd frontend
npm start

# 4. In new terminal, run Android
npm run android
```

---

## 🔍 Root Cause Analysis

### Why This Happens:

1. **Port forwarding not configured** - Android emulator can't reach PC ports
2. **Metro not running** - Bundler crashed or wasn't started
3. **ADB connection issue** - Device not properly connected
4. **Firewall blocking** - Windows firewall blocking Metro port
5. **Old cache** - Stale Metro cache causing issues

---

## 📋 Step-by-Step Manual Fix

### Step 1: Check if Backend is Running

```powershell
# Check backend
curl http://localhost:3000/health
```

**Should return:** `{"status":"ok","mongodb":"connected"}`

**If not working:**
```powershell
cd backend
.\start-backend.ps1
```

---

### Step 2: Check Android Device Connection

```bash
adb devices
```

**Expected output:**
```
List of devices attached
emulator-5554    device
```

**If no devices:**
- Start Android emulator from Android Studio
- OR connect physical device with USB debugging enabled

**If "unauthorized":**
- Check device screen for authorization prompt
- Accept USB debugging permission

---

### Step 3: Setup ADB Port Forwarding

This is **critical** for emulator to reach your PC:

```bash
# Forward Metro bundler port
adb reverse tcp:8081 tcp:8081

# Forward Backend API port
adb reverse tcp:3000 tcp:3000
```

**Expected output:**
```
8081
3000
```

**Why this works:**
- `10.0.2.2:8081` → Routes to → `localhost:8081` on your PC
- `10.0.2.2:3000` → Routes to → `localhost:3000` on your PC

---

### Step 4: Kill Existing Metro Processes

```powershell
# Kill all node processes
taskkill /F /IM node.exe

# Or just Metro
Get-Process -Name node | Where-Object {$_.Path -like "*node_modules*"} | Stop-Process
```

---

### Step 5: Clear Metro Cache

```bash
cd frontend
npx react-native start --reset-cache
```

**Or shorter:**
```bash
npm start -- --reset-cache
```

---

### Step 6: Start Metro Bundler

```bash
cd frontend
npm start
```

**Expected output:**
```
Welcome to Metro v0.81.5
info Dev server ready

i - run on iOS
a - run on Android
r - reload app
d - open Dev Menu
```

**Leave this terminal running!**

---

### Step 7: Run Android App

**Option A: Press 'a' in Metro terminal**

**Option B: New terminal**
```bash
cd frontend
npm run android
```

---

## 🛠️ Advanced Troubleshooting

### Issue 1: Port 8081 Already in Use

```bash
# Find process
netstat -ano | findstr :8081

# Kill it (replace PID)
taskkill /PID <PID> /F
```

### Issue 2: ADB Not Recognized

```bash
# Add to PATH (if Android Studio installed)
# Default location: C:\Users\<Username>\AppData\Local\Android\Sdk\platform-tools

# Or use full path
C:\Users\bishn\AppData\Local\Android\Sdk\platform-tools\adb.exe devices
```

### Issue 3: Firewall Blocking Metro

**Windows Firewall:**
1. Open Windows Defender Firewall
2. Allow an app through firewall
3. Add `node.exe` from: `C:\Program Files\nodejs\node.exe`
4. Allow both Private and Public networks

**Or disable temporarily:**
```powershell
# PowerShell (Admin)
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
```

### Issue 4: Physical Device Not Connecting

**Enable USB Debugging:**
1. Settings → About Phone → Tap "Build Number" 7 times
2. Settings → Developer Options → Enable USB Debugging
3. Connect via USB
4. Accept authorization prompt on device

**Check connection:**
```bash
adb devices
```

**If still not working, try:**
```bash
# Kill ADB server
adb kill-server

# Start ADB server
adb start-server

# Check again
adb devices
```

### Issue 5: Metro Runs But App Can't Connect

**Check if Metro is accessible:**
```bash
curl http://localhost:8081/status
```

**Should return:** Metro bundler info

**If using Physical Device:**

1. **Find your PC's IP:**
   ```powershell
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

2. **Update Metro URL in app:**
   - Shake device
   - Open Dev Menu
   - Settings → Debug server host & port
   - Enter: `192.168.1.100:8081`

3. **Update API URL in code:**
   ```typescript
   // frontend/src/services/api.ts
   const API_BASE_URL = 'http://192.168.1.100:3000/api';
   ```

4. **Rebuild app:**
   ```bash
   cd frontend
   npm run android
   ```

---

## 🎯 Complete Fresh Start Procedure

If nothing else works, start completely fresh:

```powershell
# 1. Kill everything
taskkill /F /IM node.exe
taskkill /F /IM java.exe

# 2. Clean everything
cd frontend
Remove-Item -Recurse -Force android\app\build
Remove-Item -Recurse -Force node_modules\.cache

# 3. Setup ADB
adb kill-server
adb start-server
adb devices
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000

# 4. Start backend (Terminal 1)
cd ..\backend
npm start

# 5. Start Metro (Terminal 2)
cd ..\frontend
npm start -- --reset-cache

# 6. Run Android (Terminal 3 or press 'a')
npm run android
```

---

## ✅ Success Checklist

Your app should work when you see:

- [ ] Backend running: `curl http://localhost:3000/health` works
- [ ] Device connected: `adb devices` shows device
- [ ] Port forwarding: `adb reverse` commands successful
- [ ] Metro running: `http://localhost:8081/status` accessible
- [ ] App launches without errors
- [ ] **No "Could not connect to development server" error**
- [ ] App logs show: `LOG Socket connection initiated`
- [ ] Can login and use app

---

## 📊 Expected Terminal Outputs

### Terminal 1 - Backend
```
✅ MongoDB Connected: localhost
🚀 Server running on port 3000
📱 Socket.io server started
```

### Terminal 2 - Metro
```
Welcome to Metro v0.81.5
info Dev server ready

BUNDLE  ./index.js ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   100.0%
```

### Terminal 3 / Metro Logs - Android
```
LOG  Socket connection initiated
LOG  Logged in successfully
LOG  Dashboard data loaded
```

**NO:**
- ❌ Could not connect to development server
- ❌ Network Error
- ❌ websocket error

---

## 🔍 Debugging Commands

```bash
# Check backend
curl http://localhost:3000/health

# Check Metro
curl http://localhost:8081/status

# Check device connection
adb devices

# Check port forwarding
adb reverse --list

# See app logs
adb logcat | findstr "ReactNative"

# Check network connectivity from device
adb shell ping 10.0.2.2
```

---

## 🆘 Still Not Working?

### Try These:

1. **Restart everything:**
   ```bash
   # Restart ADB
   adb kill-server && adb start-server
   
   # Restart emulator
   # Close and reopen from Android Studio
   
   # Clear Metro cache
   npm start -- --reset-cache
   ```

2. **Check Antivirus/Firewall:**
   - Temporarily disable antivirus
   - Allow Node.exe through firewall

3. **Use Different Port:**
   ```bash
   # Start Metro on different port
   npm start -- --port 8088
   
   # Forward different port
   adb reverse tcp:8088 tcp:8088
   
   # Update URL in app
   # Shake device → Settings → localhost:8088
   ```

4. **Clean Install:**
   ```bash
   cd frontend
   
   # Clean node modules
   Remove-Item -Recurse -Force node_modules
   npm install
   
   # Clean Android
   cd android
   ./gradlew clean
   cd ..
   
   # Rebuild
   npm run android
   ```

---

## 📚 Quick Reference

### ADB Commands
```bash
adb devices                    # List devices
adb reverse tcp:8081 tcp:8081 # Forward Metro port
adb reverse tcp:3000 tcp:3000 # Forward API port
adb reverse --list             # List all forwards
adb shell                      # Enter device shell
adb logcat                     # View device logs
adb kill-server                # Kill ADB server
adb start-server               # Start ADB server
```

### Metro Commands
```bash
npm start                      # Start Metro
npm start -- --reset-cache     # Start with cache clear
npm start -- --port 8088       # Start on different port
```

### React Native Commands
```bash
npm run android                # Build and run Android
npm run android -- --deviceId emulator-5554  # Specific device
npx react-native log-android   # View Android logs
npx react-native log-ios       # View iOS logs
```

---

## 🎯 Recommended Fix Script

```powershell
# Run this one command to fix everything:
cd frontend
.\fix-metro-connection.ps1
```

This automated script will:
- ✅ Kill existing processes
- ✅ Check device connection
- ✅ Setup port forwarding
- ✅ Clear Metro cache
- ✅ Verify backend connection
- ✅ Start Metro bundler

---

**🚀 Most Common Solution:**

```bash
# Just run these 3 commands:
adb reverse tcp:8081 tcp:8081
cd frontend
npm start
# Then press 'a' to launch Android
```

**Works 90% of the time!** 🎉
