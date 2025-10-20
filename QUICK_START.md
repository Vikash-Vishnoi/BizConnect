# WhatsApp Marketing App - Quick Start Guide

## 🚀 Current Status
- ✅ Fresh React Native 0.76.0 project created
- ✅ Minimal Hello World app ready
- ✅ Package ID: com.whatsappmarketing (clean & consistent)
- ⏳ Ready to build and test

## 📱 To Run the App

### Option 1: Easy Way (Recommended)
1. Double-click `start-dev.bat` in this folder
2. Wait for Metro to start (5 seconds)
3. App will build and install automatically
4. Check your device/emulator for "WhatsApp Marketing" app

### Option 2: Manual Way
**Terminal 1 - Start Metro:**
```bash
cd C:\Users\bishn\Desktop\Coding\WhatsAppMarketing
npx react-native start
```

**Terminal 2 - Build & Install:**
```bash
cd C:\Users\bishn\Desktop\Coding\WhatsAppMarketing
npx react-native run-android
```

## 🎯 What You Should See
- App opens showing: "WhatsApp Marketing"
- Text: "App is working! 🎉"
- Text: "Version: 1.0.0"
- Green (#25D366) colored title
- Gray background

## ✅ Testing Plan
Once the basic app works, we'll add features step by step:

### Phase 1: Navigation (Next Step)
- Add React Navigation
- Create Login screen
- Create Dashboard screen
- Test navigation between screens

### Phase 2: API Integration
- Add axios
- Test one simple API call
- Add error handling

### Phase 3: Your Features (One at a time)
- Authentication
- Campaigns
- Templates
- Analytics
- Conversations

## 🔧 Troubleshooting

### If Metro won't start:
```bash
# Kill any existing Metro processes
taskkill /F /IM node.exe
cd C:\Users\bishn\Desktop\Coding\WhatsAppMarketing
npx react-native start --reset-cache
```

### If build fails:
```bash
cd C:\Users\bishn\Desktop\Coding\WhatsAppMarketing\android
gradlew clean
cd ..
npx react-native run-android
```

### If app shows blank screen:
1. Open dev menu (Shake device or Ctrl+M)
2. Tap "Reload"
3. Check Metro terminal for errors

### If you see "Unable to load script":
1. Make sure Metro is running in C:\Users\bishn\Desktop\Coding\WhatsAppMarketing
2. Run: `adb reverse tcp:8081 tcp:8081`
3. Reload the app

## 📂 Project Structure
```
WhatsAppMarketing/
├── App.tsx                 ← Main app component (currently simple Hello World)
├── android/               ← Android native code
├── ios/                   ← iOS native code (for future)
├── package.json           ← Dependencies
├── start-dev.bat         ← Easy launcher script
└── QUICK_START.md        ← This file
```

## 🎨 Current App.tsx
Super simple - just shows a welcome message. Once this works, we'll gradually add:
1. Navigation
2. Login screen
3. API calls
4. Your business logic

## ⚡ Next Steps After It Works
1. ✅ Confirm app launches and shows "WhatsApp Marketing"
2. Install React Navigation packages
3. Create basic navigation structure
4. Add Login screen
5. Test login flow
6. Continue adding features one by one

## 📝 Important Notes
- **Package ID**: `com.whatsappmarketing` (DO NOT CHANGE)
- **React Native Version**: 0.76.0 (Latest stable)
- **Node Version**: 22.13.1
- **Metro Port**: 8081 (default)

## 🆘 If Nothing Works
Let me know:
1. What error message you see
2. What screen shows on your device
3. What Metro terminal shows

We can then debug step by step!
