import api from './api';
import type {
  Conversation,
  Message,
  SendMessageData,
  AssignConversationData,
  UpdateStatusData,
} from '../types/conversation';

export const conversationAPI = {
  getConversations: async (status?: 'all' | 'active' | 'archived' | 'blocked' | 'closed'): Promise<Conversation[]> => {
    try {
      const params: any = { limit: 50 };
      if (status && status !== 'all') {
        params.status = status;
      } else if (!status) {
        params.status = 'active';
      }
      // If status === 'all', don't include status param
      
      const response = await api.get('/inbox', { params });
      return response.data.conversations || [];
    } catch (error: any) {
      console.error('Failed to fetch conversations:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch conversations');
    }
  },

  getInboxStats: async (): Promise<any> => {
    try {
      const response = await api.get('/inbox/stats');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch inbox stats:', error);
      return {
        total: 0,
        active: 0,
        archived: 0,
        unread: 0,
        unreadCount: 0,
      };
    }
  },

  searchConversations: async (query: string): Promise<Conversation[]> => {
    try {
      const response = await api.get('/inbox', {
        params: { search: query },
      });
      return response.data.conversations || [];
    } catch (error: any) {
      console.error('Failed to search conversations:', error);
      throw new Error(error.response?.data?.error || 'Failed to search conversations');
    }
  },

  getConversation: async (id: string): Promise<Conversation> => {
    try {
      const response = await api.get(`/inbox/${id}`);
      return response.data.conversation;
    } catch (error: any) {
      console.error('Failed to fetch conversation:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch conversation');
    }
  },

  getMessagesPaginated: async (
    conversationId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: Message[]; total: number; hasMore: boolean }> => {
    try {
      const response = await api.get(`/inbox/${conversationId}/messages`, {
        params: { page, limit },
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch messages:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch messages');
    }
  },

  sendMessage: async (data: SendMessageData): Promise<Message> => {
    try {
      const response = await api.post(`/inbox/${data.conversationId}/messages`, {
        text: data.content,
        type: 'text',
      });
      return response.data.message;
    } catch (error: any) {
      console.error('Failed to send message:', error);
      throw new Error(error.response?.data?.error || 'Failed to send message');
    }
  },

  updateStatus: async (conversationId: string, status: 'active' | 'archived' | 'blocked' | 'closed'): Promise<Conversation> => {
    try {
      const response = await api.post(`/inbox/${conversationId}/status`, {
        status,
      });
      return response.data.conversation;
    } catch (error: any) {
      console.error('Failed to update status:', error);
      throw new Error(error.response?.data?.error || 'Failed to update status');
    }
  },

  markAsRead: async (conversationId: string): Promise<void> => {
    try {
      await api.post(`/inbox/${conversationId}/read`);
    } catch (error: any) {
      console.error('Failed to mark as read:', error);
      throw new Error(error.response?.data?.error || 'Failed to mark as read');
    }
  },

  archiveConversation: async (conversationId: string): Promise<void> => {
    try {
      await conversationAPI.updateStatus(conversationId, 'archived');
    } catch (error: any) {
      console.error('Failed to archive conversation:', error);
      throw new Error(error.response?.data?.error || 'Failed to archive');
    }
  },

  unarchiveConversation: async (conversationId: string): Promise<void> => {
    try {
      await conversationAPI.updateStatus(conversationId, 'active');
    } catch (error: any) {
      console.error('Failed to unarchive conversation:', error);
      throw new Error(error.response?.data?.error || 'Failed to unarchive');
    }
  },

  blockConversation: async (conversationId: string): Promise<void> => {
    try {
      await conversationAPI.updateStatus(conversationId, 'blocked');
    } catch (error: any) {
      console.error('Failed to block conversation:', error);
      throw new Error(error.response?.data?.error || 'Failed to block');
    }
  },

  sendReaction: async (conversationId: string, messageId: string, emoji: string): Promise<void> => {
    try {
      await api.post(`/inbox/${conversationId}/messages/reaction`, {
        messageId,
        emoji,
      });
    } catch (error: any) {
      console.error('Failed to send reaction:', error);
      throw new Error(error.response?.data?.error || 'Failed to send reaction');
    }
  },

  sendButtonMessage: async (
    conversationId: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<Message> => {
    try {
      const response = await api.post(`/inbox/${conversationId}/messages/button`, {
        bodyText,
        buttons,
      });
      return response.data.message;
    } catch (error: any) {
      console.error('Failed to send button message:', error);
      throw new Error(error.response?.data?.error || 'Failed to send button message');
    }
  },

  sendListMessage: async (
    conversationId: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>
  ): Promise<Message> => {
    try {
      const response = await api.post(`/inbox/${conversationId}/messages/list`, {
        bodyText,
        buttonText,
        sections,
      });
      return response.data.message;
    } catch (error: any) {
      console.error('Failed to send list message:', error);
      throw new Error(error.response?.data?.error || 'Failed to send list message');
    }
  },

  sendLocation: async (
    conversationId: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<Message> => {
    try {
      const response = await api.post(`/inbox/${conversationId}/messages/location`, {
        latitude,
        longitude,
        name,
        address,
      });
      return response.data.message;
    } catch (error: any) {
      console.error('Failed to send location:', error);
      throw new Error(error.response?.data?.error || 'Failed to send location');
    }
  },

  sendImage: async (
    conversationId: string,
    imageUri: string,
    caption?: string
  ): Promise<Message> => {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);
      if (caption) {
        formData.append('caption', caption);
      }

      const response = await api.post(`/inbox/${conversationId}/messages/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.message;
    } catch (error: any) {
      console.error('Failed to send image:', error);
      throw new Error(error.response?.data?.error || 'Failed to send image');
    }
  },

  sendDocument: async (
    conversationId: string,
    documentUri: string,
    filename: string
  ): Promise<Message> => {
    try {
      const formData = new FormData();
      formData.append('document', {
        uri: documentUri,
        type: 'application/pdf',
        name: filename,
      } as any);

      const response = await api.post(`/inbox/${conversationId}/messages/document`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.message;
    } catch (error: any) {
      console.error('Failed to send document:', error);
      throw new Error(error.response?.data?.error || 'Failed to send document');
    }
  },

  deleteConversation: async (conversationId: string): Promise<void> => {
    try {
      await api.delete(`/inbox/${conversationId}`);
    } catch (error: any) {
      console.error('Failed to delete conversation:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete conversation');
    }
  },

  getUnreadCount: async (): Promise<number> => {
    try {
      const stats = await conversationAPI.getInboxStats();
      return stats.messages?.unread || 0;
    } catch (error: any) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  },
};

