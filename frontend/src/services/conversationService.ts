import api from './api';
import type {
  Conversation,
  Message,
  SendMessageData,
  AssignConversationData,
  UpdateStatusData,
} from '../types/conversation';

// Conversation API - all real backend calls, no mock data
export const conversationAPI = {
  // Get all conversations
  getConversations: async (): Promise<Conversation[]> => {
    try {
      const response = await api.get('/conversations');
      return response.data.conversations || [];
    } catch (error: any) {
      console.error('Failed to fetch conversations:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch conversations');
    }
  },

  // Create a new conversation
  createConversation: async (phoneNumber: string, name?: string): Promise<Conversation> => {
    try {
      const response = await api.post('/conversations', {
        phoneNumber,
        name,
      });
      return response.data.conversation;
    } catch (error: any) {
      console.error('Failed to create conversation:', error);
      throw new Error(error.response?.data?.error || 'Failed to create conversation');
    }
  },

  // Get single conversation
  getConversation: async (id: string): Promise<Conversation> => {
    try {
      const response = await api.get(`/conversations/${id}`);
      return response.data.conversation;
    } catch (error: any) {
      console.error('Failed to fetch conversation:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch conversation');
    }
  },

  // Get messages for a conversation
  getMessages: async (conversationId: string): Promise<Message[]> => {
    try {
      const response = await api.get('/messages', {
        params: { conversationId },
      });
      return response.data.messages || [];
    } catch (error: any) {
      console.error('Failed to fetch messages:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch messages');
    }
  },

  // Send a message
  sendMessage: async (data: SendMessageData): Promise<Message> => {
    try {
      const response = await api.post('/messages', {
        conversationId: data.conversationId,
        text: data.content,
        type: 'text',
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to send message:', error);
      throw new Error(error.response?.data?.error || 'Failed to send message');
    }
  },

  // Assign conversation to agent
  assignConversation: async (
    data: AssignConversationData,
  ): Promise<Conversation> => {
    try {
      const response = await api.put(`/conversations/${data.conversationId}`, {
        assignedTo: data.agentId,
      });
      return response.data.conversation;
    } catch (error: any) {
      console.error('Failed to assign conversation:', error);
      throw new Error(error.response?.data?.error || 'Failed to assign conversation');
    }
  },

  // Update conversation status
  updateStatus: async (data: UpdateStatusData): Promise<Conversation> => {
    try {
      const response = await api.put(`/conversations/${data.conversationId}`, {
        status: data.status,
      });
      return response.data.conversation;
    } catch (error: any) {
      console.error('Failed to update status:', error);
      throw new Error(error.response?.data?.error || 'Failed to update status');
    }
  },

  // Mark conversation as read
  markAsRead: async (conversationId: string): Promise<void> => {
    try {
      await api.post(`/conversations/${conversationId}/read`);
    } catch (error: any) {
      console.error('Failed to mark as read:', error);
      throw new Error(error.response?.data?.error || 'Failed to mark as read');
    }
  },

  // Get total unread count
  getUnreadCount: async (): Promise<number> => {
    try {
      const conversations = await conversationAPI.getConversations();
      return conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
    } catch (error: any) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  },
};

