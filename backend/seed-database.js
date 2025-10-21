// Seed Database with Dummy Data
// Run this with: node seed-database.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const {
  User,
  Campaign,
  Template,
  Conversation,
  Message,
  Analytics
} = require('./models');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Sample data
const sampleData = {
  users: [
    {
      name: 'Admin User',
      email: 'admin@whatsappmarketing.com',
      password: 'admin123',
      role: 'admin',
      phone: '+1234567890',
      isActive: true
    },
    {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'user',
      phone: '+1234567891',
      isActive: true
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: 'password123',
      role: 'user',
      phone: '+1234567892',
      isActive: true
    }
  ],
  
  templates: [
    {
      name: 'welcome_message',
      category: 'MARKETING',
      language: 'en',
      status: 'approved',
      components: [
        {
          type: 'HEADER',
          format: 'TEXT',
          text: 'Welcome to Our Service! 🎉'
        },
        {
          type: 'BODY',
          text: 'Hello {{1}}, thank you for joining us! We\'re excited to have you on board. Your account {{2}} has been successfully created.'
        },
        {
          type: 'FOOTER',
          text: 'Reply STOP to unsubscribe'
        }
      ],
      variables: [
        { name: '1', description: 'Customer Name', example: 'John' },
        { name: '2', description: 'Account Number', example: '#12345' }
      ],
      usage: {
        campaigns: 5,
        messagesSent: 250,
        lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    },
    {
      name: 'order_confirmation',
      category: 'UTILITY',
      language: 'en',
      status: 'approved',
      components: [
        {
          type: 'BODY',
          text: 'Hi {{1}}, your order {{2}} has been confirmed! Expected delivery: {{3}}. Track your order here: {{4}}'
        }
      ],
      variables: [
        { name: '1', description: 'Customer Name', example: 'Jane' },
        { name: '2', description: 'Order Number', example: '#ORD-789' },
        { name: '3', description: 'Delivery Date', example: '2025-10-25' },
        { name: '4', description: 'Tracking Link', example: 'https://track.example.com' }
      ],
      usage: {
        campaigns: 3,
        messagesSent: 150,
        lastUsed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    },
    {
      name: 'promotional_offer',
      category: 'MARKETING',
      language: 'en',
      status: 'pending',
      components: [
        {
          type: 'BODY',
          text: '🎁 Special Offer! Get {{1}}% OFF on your next purchase. Use code: {{2}}. Valid until {{3}}.'
        }
      ],
      variables: [
        { name: '1', description: 'Discount Percentage', example: '20' },
        { name: '2', description: 'Promo Code', example: 'SAVE20' },
        { name: '3', description: 'Expiry Date', example: '2025-10-31' }
      ]
    },
    {
      name: 'appointment_reminder',
      category: 'UTILITY',
      language: 'en',
      status: 'draft',
      components: [
        {
          type: 'BODY',
          text: 'Reminder: You have an appointment on {{1}} at {{2}}. Location: {{3}}. Please confirm by replying YES.'
        }
      ],
      variables: [
        { name: '1', description: 'Date', example: '2025-10-22' },
        { name: '2', description: 'Time', example: '10:00 AM' },
        { name: '3', description: 'Location', example: 'Main Office' }
      ]
    }
  ],

  conversations: [
    {
      phoneNumber: '+1234567890',
      name: 'Alice Johnson',
      lastMessage: 'Thank you for the update!',
      lastMessageAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      unreadCount: 2,
      status: 'active',
      tags: ['customer', 'vip'],
      notes: 'High-value customer, respond quickly',
      metadata: {
        source: 'campaign',
        customFields: {
          customerType: 'Premium',
          lastPurchase: '2025-10-15'
        }
      }
    },
    {
      phoneNumber: '+1234567891',
      name: 'Bob Williams',
      lastMessage: 'What are your business hours?',
      lastMessageAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      unreadCount: 1,
      status: 'active',
      tags: ['prospect'],
      metadata: {
        source: 'webhook',
        customFields: {
          interest: 'Product A'
        }
      }
    },
    {
      phoneNumber: '+1234567892',
      name: 'Carol Davis',
      lastMessage: 'Perfect, thanks!',
      lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      unreadCount: 0,
      status: 'active',
      tags: ['customer'],
      metadata: {
        source: 'manual'
      }
    },
    {
      phoneNumber: '+1234567893',
      name: 'David Miller',
      lastMessage: 'See you tomorrow',
      lastMessageAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      unreadCount: 0,
      status: 'archived',
      tags: ['completed'],
      metadata: {
        source: 'campaign'
      }
    }
  ],

  campaigns: [
    {
      name: 'Welcome Campaign Q4 2025',
      description: 'Welcome new customers who signed up in October',
      status: 'completed',
      message: 'Welcome to our service! We are glad to have you.',
      scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      recipients: [
        {
          phoneNumber: '+1234567800',
          name: 'Customer 1',
          status: 'delivered',
          sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          phoneNumber: '+1234567801',
          name: 'Customer 2',
          status: 'read',
          sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          readAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
        },
        {
          phoneNumber: '+1234567802',
          name: 'Customer 3',
          status: 'delivered',
          sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          phoneNumber: '+1234567803',
          name: 'Customer 4',
          status: 'read',
          sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          readAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
        },
        {
          phoneNumber: '+1234567804',
          name: 'Customer 5',
          status: 'failed',
          sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          failedReason: 'Invalid phone number'
        }
      ],
      settings: {
        sendRate: 10,
        retryFailed: true,
        maxRetries: 3
      }
    },
    {
      name: 'Flash Sale Announcement',
      description: '24-hour flash sale notification',
      status: 'active',
      message: '🔥 Flash Sale! 50% off for the next 24 hours. Shop now!',
      scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      recipients: [
        {
          phoneNumber: '+1234567810',
          name: 'Customer 10',
          status: 'sent',
          sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          phoneNumber: '+1234567811',
          name: 'Customer 11',
          status: 'delivered',
          sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          deliveredAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
        },
        {
          phoneNumber: '+1234567812',
          name: 'Customer 12',
          status: 'pending'
        }
      ],
      settings: {
        sendRate: 20,
        retryFailed: false,
        maxRetries: 0
      }
    },
    {
      name: 'Holiday Greetings',
      description: 'Send holiday wishes to all customers',
      status: 'scheduled',
      message: '🎄 Happy Holidays from our team! Enjoy special discounts.',
      scheduledAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      recipients: [
        {
          phoneNumber: '+1234567820',
          name: 'Customer 20',
          status: 'pending'
        },
        {
          phoneNumber: '+1234567821',
          name: 'Customer 21',
          status: 'pending'
        }
      ]
    }
  ]
};

// Seed function
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Connect to database
    await connectDB();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Template.deleteMany({});
    await Campaign.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await Analytics.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Create Users
    console.log('👤 Creating users...');
    const createdUsers = [];
    for (const userData of sampleData.users) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`   ✅ Created: ${user.email}`);
    }
    console.log(`✅ ${createdUsers.length} users created\n`);

    const adminUser = createdUsers[0];

    // Create Templates
    console.log('📝 Creating templates...');
    const createdTemplates = [];
    for (const templateData of sampleData.templates) {
      const template = new Template({
        ...templateData,
        userId: adminUser._id
      });
      await template.save();
      createdTemplates.push(template);
      console.log(`   ✅ Created: ${template.name} (${template.status})`);
    }
    console.log(`✅ ${createdTemplates.length} templates created\n`);

    // Create Campaigns
    console.log('📢 Creating campaigns...');
    const createdCampaigns = [];
    for (const campaignData of sampleData.campaigns) {
      const campaign = new Campaign({
        ...campaignData,
        userId: adminUser._id,
        templateId: createdTemplates[0]._id
      });
      await campaign.save();
      createdCampaigns.push(campaign);
      console.log(`   ✅ Created: ${campaign.name} (${campaign.status})`);
    }
    console.log(`✅ ${createdCampaigns.length} campaigns created\n`);

    // Create Conversations
    console.log('💬 Creating conversations...');
    const createdConversations = [];
    for (const conversationData of sampleData.conversations) {
      const conversation = new Conversation({
        ...conversationData,
        userId: adminUser._id,
        metadata: {
          ...conversationData.metadata,
          campaignId: createdCampaigns[0]._id
        }
      });
      await conversation.save();
      createdConversations.push(conversation);
      console.log(`   ✅ Created: ${conversation.name} (${conversation.phoneNumber})`);
    }
    console.log(`✅ ${createdConversations.length} conversations created\n`);

    // Create Messages
    console.log('💬 Creating messages...');
    const messageTypes = ['text', 'text', 'image', 'text', 'document'];
    let messageCount = 0;

    for (let i = 0; i < createdConversations.length; i++) {
      const conversation = createdConversations[i];
      const numMessages = Math.floor(Math.random() * 5) + 3; // 3-7 messages per conversation

      for (let j = 0; j < numMessages; j++) {
        const isIncoming = j % 2 === 0;
        const type = messageTypes[j % messageTypes.length];
        
        const message = new Message({
          conversationId: conversation._id,
          from: isIncoming ? conversation.phoneNumber : process.env.WHATSAPP_PHONE_NUMBER_ID || '+1234567899',
          to: isIncoming ? process.env.WHATSAPP_PHONE_NUMBER_ID || '+1234567899' : conversation.phoneNumber,
          direction: isIncoming ? 'incoming' : 'outgoing',
          type: type,
          content: {
            text: isIncoming 
              ? `This is message ${j + 1} from ${conversation.name}`
              : `This is reply ${j + 1} to ${conversation.name}`,
            mediaUrl: type === 'image' ? 'https://example.com/image.jpg' : null,
            filename: type === 'document' ? 'document.pdf' : null
          },
          status: isIncoming ? 'delivered' : ['sent', 'delivered', 'read'][Math.floor(Math.random() * 3)],
          timestamp: new Date(Date.now() - (numMessages - j) * 60 * 60 * 1000),
          userId: adminUser._id,
          campaignId: i === 0 ? createdCampaigns[0]._id : null
        });

        await message.save();
        messageCount++;
      }
      
      console.log(`   ✅ Created ${numMessages} messages for ${conversation.name}`);
    }
    console.log(`✅ ${messageCount} messages created\n`);

    // Create Analytics
    console.log('📊 Creating analytics...');
    const analyticsCount = 30; // Last 30 days
    
    for (let i = 0; i < analyticsCount; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      date.setHours(0, 0, 0, 0);

      const analytics = new Analytics({
        date: date,
        userId: adminUser._id,
        metrics: {
          messagesSent: Math.floor(Math.random() * 100) + 50,
          messagesDelivered: Math.floor(Math.random() * 90) + 40,
          messagesRead: Math.floor(Math.random() * 70) + 30,
          messagesFailed: Math.floor(Math.random() * 10),
          activeCampaigns: Math.floor(Math.random() * 5) + 1,
          completedCampaigns: Math.floor(Math.random() * 3),
          activeConversations: Math.floor(Math.random() * 20) + 10,
          newConversations: Math.floor(Math.random() * 5),
          templatesCreated: i % 7 === 0 ? 1 : 0,
          templatesApproved: i % 10 === 0 ? 1 : 0,
          responseRate: Math.floor(Math.random() * 30) + 60,
          averageResponseTime: Math.floor(Math.random() * 60) + 5
        }
      });

      await analytics.save();
    }
    console.log(`✅ ${analyticsCount} days of analytics created\n`);

    // Summary
    console.log('📋 SEEDING SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Users:         ${createdUsers.length}`);
    console.log(`✅ Templates:     ${createdTemplates.length}`);
    console.log(`✅ Campaigns:     ${createdCampaigns.length}`);
    console.log(`✅ Conversations: ${createdConversations.length}`);
    console.log(`✅ Messages:      ${messageCount}`);
    console.log(`✅ Analytics:     ${analyticsCount} days`);
    console.log('═══════════════════════════════════════\n');

    // Login credentials
    console.log('🔐 LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════');
    console.log('Admin User:');
    console.log(`   Email:    ${sampleData.users[0].email}`);
    console.log(`   Password: ${sampleData.users[0].password}`);
    console.log('');
    console.log('Regular User:');
    console.log(`   Email:    ${sampleData.users[1].email}`);
    console.log(`   Password: ${sampleData.users[1].password}`);
    console.log('═══════════════════════════════════════\n');

    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start backend: npm run dev');
    console.log('2. Login to the app with the credentials above');
    console.log('3. Explore the dummy data in MongoDB Compass');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seeder
seedDatabase();
