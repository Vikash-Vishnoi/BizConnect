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

  blockConversation: async (conversationId: string): Promise<Conversation> => {
    try {
      const response = await api.post(`/inbox/${conversationId}/block`);
      return response.data.conversation;
    } catch (error: any) {
      console.error('Failed to block conversation:', error);
      throw new Error(error.response?.data?.error || 'Failed to block');
    }
  },

  unblockConversation: async (conversationId: string): Promise<Conversation> => {
    try {
      const response = await api.post(`/inbox/${conversationId}/unblock`);
      return response.data.conversation;
    } catch (error: any) {
      console.error('Failed to unblock conversation:', error);
      throw new Error(error.response?.data?.error || 'Failed to unblock');
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

  sendLiveLocation: async (
    conversationId: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
    duration?: number
  ): Promise<{message: Message; duration: number; expiresAt: string}> => {
    try {
      const response = await api.post(`/inbox/${conversationId}/messages/live-location`, {
        latitude,
        longitude,
        name,
        address,
        duration: duration || 900, // Default: 15 minutes
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to start live location sharing:', error);
      throw new Error(error.response?.data?.error || 'Failed to start live location sharing');
    }
  },

  updateLiveLocation: async (
    conversationId: string,
    messageId: string,
    latitude: number,
    longitude: number,
    speed?: number,
    accuracy?: number,
    bearing?: number
  ): Promise<{message: string; location: any}> => {
    try {
      const response = await api.put(
        `/inbox/${conversationId}/messages/${messageId}/live-location`,
        {
          latitude,
          longitude,
          speed,
          accuracy,
          bearing,
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to update live location:', error);
      throw new Error(error.response?.data?.error || 'Failed to update live location');
    }
  },

  stopLiveLocation: async (
    conversationId: string,
    messageId: string
  ): Promise<{message: string}> => {
    try {
      const response = await api.delete(
        `/inbox/${conversationId}/messages/${messageId}/live-location`
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to stop live location sharing:', error);
      throw new Error(error.response?.data?.error || 'Failed to stop live location sharing');
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

  sendContact: async (
    conversationId: string,
    contacts: Array<{
      name: {
        formatted_name: string;
        first_name?: string;
        last_name?: string;
      };
      phones: Array<{
        phone: string;
        type?: string;
        wa_id?: string;
      }>;
      emails?: Array<{
        email: string;
        type?: string;
      }>;
      org?: {
        company?: string;
        department?: string;
        title?: string;
      };
      addresses?: Array<{
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
        country_code?: string;
        type?: string;
      }>;
      urls?: Array<{
        url: string;
        type?: string;
      }>;
      birthday?: string;
    }>
  ): Promise<Message> => {
    try {
      const response = await api.post(`/inbox/${conversationId}/messages/contact`, {
        contacts,
      });
      return response.data.message;
    } catch (error: any) {
      console.error('Failed to send contact:', error);
      throw new Error(error.response?.data?.error || 'Failed to send contact');
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

  pinMessage: async (conversationId: string, messageId: string): Promise<Message> => {
    try {
      const response = await api.post(`/inbox/${conversationId}/messages/${messageId}/pin`);
      return response.data.pinnedMessage;
    } catch (error: any) {
      console.error('Failed to pin message:', error);
      throw new Error(error.response?.data?.error || 'Failed to pin message');
    }
  },

  unpinMessage: async (conversationId: string, messageId: string): Promise<void> => {
    try {
      await api.post(`/inbox/${conversationId}/messages/${messageId}/unpin`);
    } catch (error: any) {
      console.error('Failed to unpin message:', error);
      throw new Error(error.response?.data?.error || 'Failed to unpin message');
    }
  },

  getPinnedMessages: async (conversationId: string): Promise<Message[]> => {
    try {
      const response = await api.get(`/inbox/${conversationId}/messages/pinned`);
      return response.data.pinnedMessages || [];
    } catch (error: any) {
      console.error('Failed to get pinned messages:', error);
      throw new Error(error.response?.data?.error || 'Failed to get pinned messages');
    }
  },

  sendPollMessage: async (
    conversationId: string,
    question: string,
    options: string[]
  ): Promise<Message> => {
    try {
      const response = await api.post(`/inbox/${conversationId}/messages/poll`, {
        question,
        options,
      });
      return response.data.message;
    } catch (error: any) {
      console.error('Failed to send poll message:', error);
      throw new Error(error.response?.data?.error || 'Failed to send poll message');
    }
  },

  sendCTAMessage: async (
    conversationId: string,
    bodyText: string,
    ctaButtons: Array<{
      type: 'PHONE_NUMBER' | 'URL';
      title: string;
      phone_number?: string;
      url?: string;
    }>
  ): Promise<Message> => {
    try {
      const response = await api.post(`/inbox/${conversationId}/messages/cta`, {
        bodyText,
        ctaButtons,
      });
      return response.data.message;
    } catch (error: any) {
      console.error('Failed to send CTA message:', error);
      throw new Error(error.response?.data?.error || 'Failed to send CTA message');
    }
  },
};


