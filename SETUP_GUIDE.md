# 🚀 Complete Setup Guide - WhatsApp Marketing App

## 📋 Overview

Your WhatsApp Marketing App is now ready with a complete backend! This guide will help you set up and run the application.

## 🎯 What's Been Completed

### Backend (Node.js/Express)
✅ Complete REST API with all endpoints
✅ MongoDB models and schemas
✅ JWT authentication system
✅ WhatsApp Business API integration
✅ Socket.io real-time server
✅ Webhook endpoints for WhatsApp events
✅ Analytics and reporting system

### Frontend (React Native)
✅ All 6 modules fully implemented
✅ Real-time updates via Socket.io
✅ Push notifications
✅ Offline queue support
✅ API integration ready

## 📦 Prerequisites

1. **MongoDB Compass** - ✅ You have this installed
2. **Node.js** - Version 16 or higher
3. **WhatsApp Business Account** - You'll provide credentials
4. **Android/iOS development environment** - Already set up

## 🛠️ Setup Instructions

### Step 1: Configure MongoDB

1. Open **MongoDB Compass**
2. Connect to `mongodb://localhost:27017`
3. Create a new database called `whatsapp-marketing`

### Step 2: Configure WhatsApp API Credentials

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create an App with WhatsApp Product (if you haven't already)
3. Get your credentials:
   - Phone Number ID
   - Access Token
   - Business Account ID
   - Verify Token (for webhooks)

4. Open `backend\.env` and fill in your credentials:

```env
# WhatsApp Business API Credentials
WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID
WHATSAPP_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
WHATSAPP_BUSINESS_ACCOUNT_ID=YOUR_BUSINESS_ACCOUNT_ID
WHATSAPP_VERIFY_TOKEN=YOUR_CUSTOM_VERIFY_TOKEN
WABA_ID=YOUR_WABA_ID
```

### Step 3: Start the Backend Server

```powershell
# Navigate to backend folder
cd backend

# Start the server (nodemon will auto-reload on changes)
npm run dev
```

You should see:
```
🚀 Server running on port 3000
✅ MongoDB Connected: localhost
📡 Socket.io server ready
```

### Step 4: Create Your First User

Open a new PowerShell window and run:

```powershell
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{\"name\":\"Admin User\",\"email\":\"admin@example.com\",\"password\":\"password123\"}'
```

Or use Postman:
- URL: `http://localhost:3000/api/auth/register`
- Method: POST
- Body (JSON):
```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "password123"
}
```

Save the token you receive - you'll need it for API calls!

### Step 5: Test Backend Connection

Open your browser and go to:
- http://localhost:3000 - Should show API info
- http://localhost:3000/health - Should show health status

### Step 6: Start the React Native App

In a new PowerShell window:

```powershell
# Navigate to frontend folder
cd frontend

# Install dependencies (if not already done)
npm install

# Start Metro bundler
npm start

# In another window, start Android
cd frontend
npm run android
```

### Step 7: Login to the App

Use the credentials you created:
- Email: admin@example.com
- Password: password123

## 🎉 You're All Set!

The app will now:
- ✅ Connect to your backend API
- ✅ Store data in MongoDB
- ✅ Send real WhatsApp messages
- ✅ Track campaigns in real-time
- ✅ Receive webhook updates from WhatsApp

## 📱 Testing the Full Flow

### 1. Create a Template
1. Go to "Templates" tab
2. Tap "+" button
3. Fill in template details:
   - Name: welcome_message
   - Category: MARKETING
   - Language: en
   - Body text: "Hello {{1}}, welcome to our service!"
4. Submit for approval
5. Check status (will show PENDING until WhatsApp approves)

### 2. Create a Campaign
1. Go to "Campaigns" tab
2. Tap "+" button
3. Fill in:
   - Campaign name: "Test Campaign"
   - Select approved template
   - Add recipients (phone numbers in international format: +1234567890)
4. Start campaign
5. Watch real-time progress!

### 3. Monitor Analytics
1. Go to "Dashboard" tab
2. See real-time metrics:
   - Messages sent/delivered/read
   - Campaign performance
   - Quality scores
   - Response rates

### 4. Manage Conversations
1. Go to "Inbox" tab
2. See all conversations
3. Reply to incoming messages
4. WhatsApp will deliver your messages in real-time

## 🔧 Troubleshooting

### Backend won't start
- Check if MongoDB is running
- Verify `.env` file exists and has correct values
- Check if port 3000 is available

### App can't connect to backend
- Make sure backend is running on port 3000
- For Android emulator, use `http://10.0.2.2:3000`
- For physical device, use your computer's IP (e.g., `http://192.168.1.100:3000`)
- Update `src/services/api.ts` if needed

### WhatsApp messages not sending
- Verify your WhatsApp credentials are correct
- Check WhatsApp Business Account status
- Ensure phone numbers are in international format (+country code + number)
- Check API rate limits

### Socket.io not connecting
- Ensure backend server is running
- Check firewall settings
- Verify CORS configuration in backend

## 📚 API Documentation

All endpoints are documented in `backend/README.md`

Quick reference:

### Authentication
- POST `/api/auth/register` - Register
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Get current user

### Campaigns
- GET `/api/campaigns` - List all
- POST `/api/campaigns` - Create
- POST `/api/campaigns/:id/start` - Start campaign

### Templates
- GET `/api/templates` - List all
- POST `/api/templates` - Create
- POST `/api/templates/:id/submit` - Submit for approval

### Messages
- GET `/api/messages?conversationId=xxx` - Get messages
- POST `/api/messages` - Send message

### Analytics
- GET `/api/analytics/dashboard` - Dashboard summary
- GET `/api/analytics/daily` - Daily stats

## 🔐 Security Notes

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Change JWT_SECRET** in production - Use a strong random string
3. **Use HTTPS** in production - Set up SSL/TLS
4. **Rotate WhatsApp tokens** regularly
5. **Implement rate limiting** - Already configured in backend

## 🌐 MongoDB Compass Usage

1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. Select `whatsapp-marketing` database
4. Explore collections:
   - `users` - User accounts
   - `campaigns` - Marketing campaigns
   - `templates` - Message templates
   - `conversations` - Chat conversations
   - `messages` - All messages
   - `analytics` - Performance data

## 🚢 Production Deployment

When ready for production:

1. **Backend**:
   - Deploy to a cloud service (AWS, Heroku, DigitalOcean)
   - Use MongoDB Atlas for database
   - Set up proper SSL/TLS
   - Configure environment variables
   - Set up monitoring

2. **Frontend**:
   - Build release APK/IPA
   - Update API URLs in `api.ts` and `socketService.ts`
   - Test on physical devices
   - Submit to Play Store/App Store

## 📞 WhatsApp Webhook Setup

1. In Meta Developer Console:
   - Go to WhatsApp > Configuration
   - Set Webhook URL: `https://your-domain.com/api/webhooks/whatsapp`
   - Verify token: Use the value from `WHATSAPP_VERIFY_TOKEN` in `.env`
   - Subscribe to events: `messages`, `message_template_status_update`

2. Test webhook:
   - Send a message to your WhatsApp Business number
   - Check backend logs for incoming webhook events
   - Message should appear in app's Inbox

## 🎓 Next Steps

1. **Test everything locally** - Make sure all features work
2. **Add your WhatsApp credentials** - Fill in `.env` file
3. **Create test campaigns** - Send to your own number first
4. **Monitor in MongoDB Compass** - See data being stored
5. **Check analytics** - Verify metrics are tracking correctly

## 📧 Support

If you encounter any issues:
1. Check backend logs (terminal where `npm run dev` is running)
2. Check app logs (React Native debugger)
3. Verify MongoDB connection in Compass
4. Check WhatsApp Business API status in Meta Developer Console

---

## ✅ Quick Start Checklist

- [ ] MongoDB running and accessible
- [ ] Created `whatsapp-marketing` database
- [ ] Filled in WhatsApp credentials in `backend\.env`
- [ ] Backend server running (`npm run dev` in backend folder)
- [ ] Created first user via API
- [ ] React Native app running
- [ ] Logged into app with created user
- [ ] Created and submitted first template
- [ ] Created test campaign
- [ ] Verified data in MongoDB Compass

---

**You're ready to send your first WhatsApp marketing campaign! 🎉**
