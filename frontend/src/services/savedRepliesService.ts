import api from './api';

export interface SavedReply {
  _id: string;
  userId: string;
  shortcut: string;
  message: string;
  category: 'greeting' | 'support' | 'sales' | 'closing' | 'faq' | 'other';
  usageCount: number;
  lastUsedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedReplyData {
  shortcut: string;
  message: string;
  category?: 'greeting' | 'support' | 'sales' | 'closing' | 'faq' | 'other';
}

export interface UpdateSavedReplyData {
  shortcut?: string;
  message?: string;
  category?: 'greeting' | 'support' | 'sales' | 'closing' | 'faq' | 'other';
  isActive?: boolean;
}

export interface GetSavedRepliesParams {
  category?: string;
  search?: string;
  isActive?: 'true' | 'false' | 'all';
}

export const savedRepliesAPI = {
  // Get all saved replies
  getAll: async (params?: GetSavedRepliesParams) => {
    const response = await api.get('/saved-replies', { params });
    return response.data;
  },

  // Get a single saved reply
  getById: async (id: string) => {
    const response = await api.get(`/saved-replies/${id}`);
    return response.data;
  },

  // Create a new saved reply
  create: async (data: CreateSavedReplyData) => {
    const response = await api.post('/saved-replies', data);
    return response.data;
  },

  // Update a saved reply
  update: async (id: string, data: UpdateSavedReplyData) => {
    const response = await api.put(`/saved-replies/${id}`, data);
    return response.data;
  },

  // Delete a saved reply
  delete: async (id: string) => {
    const response = await api.delete(`/saved-replies/${id}`);
    return response.data;
  },

  // Increment usage count
  incrementUsage: async (id: string) => {
    const response = await api.post(`/saved-replies/${id}/use`);
    return response.data;
  },

  // Get popular saved replies
  getPopular: async (limit = 10) => {
    const response = await api.get('/saved-replies/stats/popular', {
      params: { limit },
    });
    return response.data;
  },
};
