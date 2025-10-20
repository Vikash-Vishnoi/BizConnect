import type {
  Conversation,
  Message,
  SendMessageData,
  AssignConversationData,
  UpdateStatusData,
} from '../types/conversation';

// Dummy conversations data
export const dummyConversations: Conversation[] = [
  {
    _id: 'conv_001',
    patientName: 'Maria Silva',
    patientPhone: '+5511999999999',
    status: 'open',
    lastMessage: 'When is my next appointment?',
    unreadCount: 2,
    lastActivity: '2024-01-15T10:25:00Z',
  },
  {
    _id: 'conv_002',
    patientName: 'John Smith',
    patientPhone: '+1234567890',
    status: 'assigned',
    lastMessage: 'Thank you for the information!',
    unreadCount: 0,
    lastActivity: '2024-01-15T09:15:00Z',
    assignedTo: 'agent_001',
    assignedToName: 'Dr. Johnson',
  },
  {
    _id: 'conv_003',
    patientName: 'Ana Rodriguez',
    patientPhone: '+5511988888888',
    status: 'open',
    lastMessage: 'I need to reschedule my appointment',
    unreadCount: 1,
    lastActivity: '2024-01-15T08:45:00Z',
  },
  {
    _id: 'conv_004',
    patientName: 'Robert Johnson',
    patientPhone: '+1987654321',
    status: 'closed',
    lastMessage: 'Perfect, see you tomorrow!',
    unreadCount: 0,
    lastActivity: '2024-01-14T16:30:00Z',
  },
  {
    _id: 'conv_005',
    patientName: 'Carlos Santos',
    patientPhone: '+5511977777777',
    status: 'assigned',
    lastMessage: 'Can you send me the lab results?',
    unreadCount: 3,
    lastActivity: '2024-01-15T11:00:00Z',
    assignedTo: 'agent_001',
    assignedToName: 'Dr. Johnson',
  },
];

// Dummy messages for conversations
const messagesByConversation: Record<string, Message[]> = {
  conv_001: [
    {
      _id: 'msg_001',
      conversationId: 'conv_001',
      content: 'Hello, I need help with my appointment',
      direction: 'incoming',
      timestamp: '2024-01-15T10:20:00Z',
      status: 'read',
      senderName: 'Maria Silva',
    },
    {
      _id: 'msg_002',
      conversationId: 'conv_001',
      content: 'Hi Maria! I can help you with that. What do you need?',
      direction: 'outgoing',
      timestamp: '2024-01-15T10:21:00Z',
      status: 'read',
    },
    {
      _id: 'msg_003',
      conversationId: 'conv_001',
      content: 'When is my next appointment?',
      direction: 'incoming',
      timestamp: '2024-01-15T10:25:00Z',
      status: 'delivered',
      senderName: 'Maria Silva',
    },
  ],
  conv_002: [
    {
      _id: 'msg_004',
      conversationId: 'conv_002',
      content: 'Your appointment is scheduled for tomorrow at 2 PM',
      direction: 'outgoing',
      timestamp: '2024-01-15T09:10:00Z',
      status: 'read',
    },
    {
      _id: 'msg_005',
      conversationId: 'conv_002',
      content: 'Thank you for the information!',
      direction: 'incoming',
      timestamp: '2024-01-15T09:15:00Z',
      status: 'read',
      senderName: 'John Smith',
    },
  ],
  conv_003: [
    {
      _id: 'msg_006',
      conversationId: 'conv_003',
      content: 'I need to reschedule my appointment',
      direction: 'incoming',
      timestamp: '2024-01-15T08:45:00Z',
      status: 'delivered',
      senderName: 'Ana Rodriguez',
    },
  ],
  conv_004: [
    {
      _id: 'msg_007',
      conversationId: 'conv_004',
      content: 'Your appointment is confirmed for tomorrow at 10 AM',
      direction: 'outgoing',
      timestamp: '2024-01-14T16:25:00Z',
      status: 'read',
    },
    {
      _id: 'msg_008',
      conversationId: 'conv_004',
      content: 'Perfect, see you tomorrow!',
      direction: 'incoming',
      timestamp: '2024-01-14T16:30:00Z',
      status: 'read',
      senderName: 'Robert Johnson',
    },
  ],
  conv_005: [
    {
      _id: 'msg_009',
      conversationId: 'conv_005',
      content: 'Can you send me the lab results?',
      direction: 'incoming',
      timestamp: '2024-01-15T11:00:00Z',
      status: 'delivered',
      senderName: 'Carlos Santos',
    },
  ],
};

// Mock API calls
export const conversationAPI = {
  // Get all conversations
  getConversations: async (): Promise<Conversation[]> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return dummyConversations;
  },

  // Get single conversation
  getConversation: async (id: string): Promise<Conversation> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const conversation = dummyConversations.find(c => c._id === id);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    return conversation;
  },

  // Get messages for a conversation
  getMessages: async (conversationId: string): Promise<Message[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return messagesByConversation[conversationId] || [];
  },

  // Send a message
  sendMessage: async (data: SendMessageData): Promise<Message> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const newMessage: Message = {
      _id: `msg_${Date.now()}`,
      conversationId: data.conversationId,
      content: data.content,
      direction: 'outgoing',
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    // Add to messages list
    if (!messagesByConversation[data.conversationId]) {
      messagesByConversation[data.conversationId] = [];
    }
    messagesByConversation[data.conversationId].push(newMessage);

    // Update conversation last message
    const conversation = dummyConversations.find(
      c => c._id === data.conversationId,
    );
    if (conversation) {
      conversation.lastMessage = data.content;
      conversation.lastActivity = newMessage.timestamp;
    }

    return newMessage;
  },

  // Assign conversation to agent
  assignConversation: async (
    data: AssignConversationData,
  ): Promise<Conversation> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const conversation = dummyConversations.find(
      c => c._id === data.conversationId,
    );
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    conversation.assignedTo = data.agentId;
    conversation.assignedToName = data.agentName;
    conversation.status = 'assigned';
    return conversation;
  },

  // Update conversation status
  updateStatus: async (data: UpdateStatusData): Promise<Conversation> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const conversation = dummyConversations.find(
      c => c._id === data.conversationId,
    );
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    conversation.status = data.status;
    return conversation;
  },

  // Mark conversation as read
  markAsRead: async (conversationId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const conversation = dummyConversations.find(c => c._id === conversationId);
    if (conversation) {
      conversation.unreadCount = 0;
    }
  },

  // Get total unread count
  getUnreadCount: async (): Promise<number> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return dummyConversations.reduce(
      (sum, conv) => sum + conv.unreadCount,
      0,
    );
  },
};
