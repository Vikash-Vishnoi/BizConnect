# WhatsApp Marketing App

A full-stack WhatsApp marketing application with React Native frontend and Node.js backend.

## 📁 Project Structure

```
WhatsApp-Marketing-App/
├── frontend/               # React Native mobile app
│   ├── src/               # React Native source code
│   ├── android/           # Android native code
│   ├── ios/               # iOS native code
│   ├── package.json       # Frontend dependencies
│   └── ...
├── backend/               # Node.js + Express API
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── middleware/       # Express middleware
│   ├── server.js         # Main server file
│   ├── package.json      # Backend dependencies
│   └── ...
├── SETUP_GUIDE.md        # Complete setup instructions
└── PROJECT_COMPLETE.md   # Full project documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MongoDB (local or MongoDB Atlas)
- React Native development environment (Android Studio / Xcode)
- WhatsApp Business API credentials

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
# Edit .env file with your WhatsApp API credentials

# Start the server
npm run dev
```

Backend will run on `http://localhost:3000`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Metro bundler
npm start

# Run on Android (in another terminal)
npm run android

# Run on iOS (in another terminal)
npm run ios
```

## 📖 Documentation

- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick reference card for common tasks
- **[WORKFLOW_GUIDE.md](./WORKFLOW_GUIDE.md)** - Complete workflow from templates to campaigns to inbox
- **[WORKFLOW_DIAGRAM.md](./WORKFLOW_DIAGRAM.md)** - Visual workflow diagrams and data flow
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Detailed setup instructions
- **[PROJECT_COMPLETE.md](./PROJECT_COMPLETE.md)** - Complete project documentation
- **[backend/README.md](./backend/README.md)** - Backend API documentation

## ✨ Features

### Complete Workflow

```
📝 1. CREATE TEMPLATE
   ↓ Create message template in Templates screen
   ↓ Submit for WhatsApp approval
   ↓ Wait for approval status (webhook notification)
   ↓
✅ 2. TEMPLATE APPROVED
   ↓ Template becomes available for campaigns
   ↓ Template can be set as welcome message
   ↓
🎯 3. CREATE & RUN CAMPAIGN
   ↓ Select approved template
   ↓ Add recipients (manually or CSV)
   ↓ Start campaign → Messages sent to masses
   ↓
💬 4. MESSAGES APPEAR IN INBOX
   ↓ Campaign messages create conversations
   ↓ Recipients appear in Inbox
   ↓ Track delivery & read status
   ↓
👋 5. NEW CONTACTS GET WELCOME MESSAGE
   ↓ First-time contacts message you
   ↓ Auto welcome message sent (template or text)
   ↓ Reduces redundancy - welcome template can be edited
   ↓ Appears in Inbox for continued conversation
```

### Backend (Node.js)
- ✅ RESTful API with 50+ endpoints
- ✅ MongoDB database integration
- ✅ JWT authentication
- ✅ WhatsApp Business API integration
- ✅ Real-time updates via Socket.io
- ✅ Webhook handlers for WhatsApp events
- ✅ Campaign automation engine
- ✅ Analytics and reporting
- ✅ Auto welcome messages (configurable per user)
- ✅ Template approval workflow

### Frontend (React Native)
- ✅ Authentication & user management
- ✅ Campaign creation & management
- ✅ Template designer with approval tracking
- ✅ Inbox & conversations
- ✅ Real-time notifications
- ✅ Analytics dashboard with charts
- ✅ Offline support
- ✅ Push notifications
- ✅ Welcome message settings (editable)

## 🔑 Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/whatsapp-marketing
JWT_SECRET=your-secret-key
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
WHATSAPP_VERIFY_TOKEN=your-webhook-verify-token
```

Get WhatsApp credentials from: https://developers.facebook.com/

## 🧪 Testing

### Backend
```bash
cd backend
node test-api.js
```

### Frontend
```bash
cd frontend
npm test
```

## 📱 Building for Production

### Android APK
```bash
cd frontend/android
./gradlew assembleRelease
```

### iOS IPA
```bash
cd frontend/ios
pod install
# Open in Xcode and archive
```

## 🌐 Deployment

### Backend
- Deploy to AWS, Heroku, DigitalOcean, or similar
- Use MongoDB Atlas for production database
- Set up SSL/TLS certificates
- Configure environment variables

### Frontend
- Build release APK/IPA
- Update API URLs for production
- Submit to Google Play Store / Apple App Store

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For issues and questions:
- Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) for setup help
- Review [PROJECT_COMPLETE.md](./PROJECT_COMPLETE.md) for detailed documentation
- Check backend logs for API errors
- Verify MongoDB connection
- Ensure WhatsApp API credentials are correct

## 🎯 Tech Stack

**Frontend:**
- React Native 0.77
- TypeScript
- React Navigation
- React Native Chart Kit
- Socket.io Client
- Notifee (Push Notifications)

**Backend:**
- Node.js & Express.js
- MongoDB & Mongoose
- Socket.io Server
- JWT Authentication
- WhatsApp Business API
- Bcrypt

---

**Made with ❤️ for WhatsApp Marketing**

## 🚀 Quick Start Commands

### 1. Start Backend
```bash
cd backend
npm start
# Backend runs on http://localhost:3000
```

### 2. Start Metro Bundler
```bash
cd frontend
npm start
# Metro bundler runs on http://localhost:8081
```

### 3. Run Android App
```bash
cd frontend
npm run android
# Or press 'a' in Metro terminal
```

### 4. Run iOS App
```bash
cd frontend
npm run ios
# Or press 'i' in Metro terminal
```

## 🔐 User Authentication

Users can register through the app or use the API:

```bash
POST /api/auth/register
{
  "name": "Your Name",
  "email": "your@email.com",
  "password": "your-password"
}
```

Login endpoint:
```bash
POST /api/auth/login
{
  "email": "your@email.com",
  "password": "your-password"
}
```

## ⚠️ Troubleshooting

### Android: "Could not connect to development server"

**Quick Fix:**
```bash
cd frontend
.\fix-metro-connection.ps1
```

**Manual Fix:**
```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
npm start
```

See [METRO_CONNECTION_FIX.md](./METRO_CONNECTION_FIX.md) for detailed troubleshooting.


# Nextissue to fix 
1. admin and user based on domain and admin can only allow to user



After comprehensive project scan and improvements:

- **[PROJECT_ANALYSIS_AND_RECOMMENDATIONS.md](./PROJECT_ANALYSIS_AND_RECOMMENDATIONS.md)** - Complete feature analysis, missing WhatsApp Business API features, and enhancement recommendations
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Step-by-step production deployment guide with security, monitoring, and scaling

### Project Status: 
✅ **90% Production Ready**
- All core features working
- Message reactions fixed  
- Clean codebase with no deprecated routes
- Comprehensive WhatsApp Business API integration
- Real-time updates via Socket.io

### To Go Live:
1. Update environment variables (see DEPLOYMENT_GUIDE.md)
2. Deploy backend to cloud service
3. Build and distribute mobile apps

---

## 🎯 What's New in This Scan

### ✅ Fixed Issues
- **Message Reactions**: Added long-press gesture with emoji picker UI (backend was already ready!)

### 📊 Comprehensive Analysis
- Scanned 50+ backend API endpoints
- Reviewed 15+ frontend screens and components  
- Analyzed WhatsApp webhook integration
- Identified 10+ missing WhatsApp Business API features

### 🚀 Deployment Ready
- Production environment guide
- Security hardening checklist
- MongoDB Atlas setup
- Multi-cloud deployment options
- Mobile app build instructions

### 💡 Feature Recommendations
1. **High Priority**: Message Flows (automation), Business Profile Management
2. **Medium Priority**: Product Catalog, QR Codes
3. **Enhancement**: Message context (replies), Enhanced analytics

See full details in PROJECT_ANALYSIS_AND_RECOMMENDATIONS.md