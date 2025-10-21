# WhatsApp Marketing App - Backend

Node.js/Express backend with MongoDB and WhatsApp Business API integration.

## Features

- **Authentication**: JWT-based authentication with bcrypt password hashing
- **WhatsApp Integration**: Send messages, create templates, manage campaigns
- **Real-time Updates**: Socket.io for live campaign progress and message status
- **Webhooks**: Receive WhatsApp message delivery status and incoming messages
- **Analytics**: Track campaign performance, message delivery, and engagement
- **RESTful API**: Complete CRUD operations for all resources

## Tech Stack

- Node.js & Express.js
- MongoDB with Mongoose ODM
- Socket.io for real-time communication
- WhatsApp Business API (Meta)
- JWT for authentication
- Bcrypt for password hashing

## Prerequisites

1. **MongoDB**: Install MongoDB locally or use MongoDB Atlas
2. **WhatsApp Business Account**: Get credentials from [Meta for Developers](https://developers.facebook.com/)
3. **Node.js**: Version 16 or higher

## Setup Instructions

### 1. Configure Environment Variables

Edit `backend/.env` file with your credentials:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/whatsapp-marketing

# JWT Secret
JWT_SECRET=your-super-secret-key-here

# WhatsApp Business API (from Meta for Developers)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Start MongoDB

Make sure MongoDB is running:

```bash
# If installed locally
mongod

# Or start MongoDB service on Windows
net start MongoDB
```

### 4. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

### Campaigns
- `GET /api/campaigns` - Get all campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign by ID
- `PUT /api/campaigns/:id` - Update campaign
- `POST /api/campaigns/:id/start` - Start campaign
- `POST /api/campaigns/:id/pause` - Pause campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### Templates
- `GET /api/templates` - Get all templates
- `POST /api/templates` - Create template
- `GET /api/templates/:id` - Get template by ID
- `PUT /api/templates/:id` - Update template
- `POST /api/templates/:id/submit` - Submit for WhatsApp approval
- `GET /api/templates/:id/status` - Check approval status
- `DELETE /api/templates/:id` - Delete template

### Conversations
- `GET /api/conversations` - Get all conversations
- `GET /api/conversations/:id` - Get conversation by ID
- `POST /api/conversations/:id/read` - Mark as read
- `PUT /api/conversations/:id` - Update conversation
- `DELETE /api/conversations/:id` - Delete conversation

### Messages
- `GET /api/messages?conversationId=:id` - Get messages for conversation
- `POST /api/messages` - Send message
- `GET /api/messages/:id` - Get message by ID

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard summary
- `GET /api/analytics/daily` - Get daily analytics
- `GET /api/analytics/campaigns` - Get campaign performance
- `GET /api/analytics/templates` - Get template usage
- `GET /api/analytics/conversations` - Get conversation stats

### Webhooks
- `GET /api/webhooks/whatsapp` - Webhook verification
- `POST /api/webhooks/whatsapp` - Receive WhatsApp events

## Socket.io Events

### Client → Server
- `authenticate` - Authenticate socket connection with userId

### Server → Client
- `campaign:progress` - Campaign sending progress update
- `campaign:completed` - Campaign completed
- `message:received` - New incoming message
- `message:sent` - Message sent successfully
- `message:status` - Message status update (delivered/read)
- `template:status` - Template approval status update
- `conversation:new` - New conversation created

## Database Models

- **User**: User accounts with authentication
- **Campaign**: Marketing campaigns with recipients
- **Template**: WhatsApp message templates
- **Conversation**: Chat conversations
- **Message**: Individual messages
- **Analytics**: Daily and campaign analytics

## WhatsApp Business API Setup

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create an App with WhatsApp Product
3. Get your Phone Number ID and Access Token
4. Configure Webhook URL: `https://your-domain.com/api/webhooks/whatsapp`
5. Subscribe to webhook events: `messages`, `message_template_status_update`

## Testing with MongoDB Compass

1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. Database: `whatsapp-marketing`
4. Collections: `users`, `campaigns`, `templates`, `conversations`, `messages`, `analytics`

## Create First User

Use Postman or curl to create your first user:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "password123"
  }'
```

## Development

```bash
# Run with nodemon (auto-reload)
npm run dev

# Run tests
npm test
```

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use a production MongoDB instance (MongoDB Atlas recommended)
3. Set up SSL/TLS for HTTPS
4. Configure proper CORS origins
5. Set up a reverse proxy (Nginx)
6. Use PM2 or similar for process management

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGODB_URI in .env
- Verify firewall settings

### WhatsApp API Errors
- Verify access token is valid
- Check phone number ID
- Ensure webhook is verified
- Check rate limits

### Socket.io Connection Issues
- Check CORS configuration
- Verify frontend SOCKET_URL matches backend PORT
- Check firewall/network settings

## License

MIT
