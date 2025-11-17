/**
 * ✅ FEATURE 33: WhatsApp Channels Service
 * Frontend API service for WhatsApp Channels (one-way broadcast)
 */

import api from './api';

export interface Channel {
  _id: string;
  channelId: string;
  name: string;
  description: string;
  category: 'business' | 'lifestyle' | 'entertainment' | 'news' | 'education' | 'other';
  followerCount: number;
  verified: boolean;
  status: 'active' | 'inactive' | 'suspended';
  analytics: {
    totalMessages: number;
    totalViews: number;
    totalReactions: number;
    engagementRate: number;
  };
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface ChannelMessage {
  _id: string;
  channelId: string;
  channelName: string;
  messageId: string;
  message: {
    type: 'text' | 'image' | 'video' | 'document';
    text?: string;
    media_url?: string;
    caption?: string;
    filename?: string;
  };
  status: 'sent' | 'delivered' | 'failed';
  deliveryStats: {
    sent: number;
    delivered: number;
    failed: number;
  };
  views: number;
  reactions: Array<{
    emoji: string;
    count: number;
  }>;
  shares: number;
  engagementRate: number;
  sentAt: string;
}

export interface ChannelStats {
  totalChannels: number;
  activeChannels: number;
  totalFollowers: number;
  totalMessages: number;
  totalViews: number;
  totalReactions: number;
  averageEngagement: number;
}

/**
 * Get all channels
 */
export const getChannels = async (page = 1, status = 'active') => {
  const response = await api.get(`/channels?page=${page}&status=${status}`);
  return response.data;
};

/**
 * Get channel by ID
 */
export const getChannelById = async (channelId: string) => {
  const response = await api.get(`/channels/${channelId}`);
  return response.data;
};

/**
 * Create a new channel
 */
export const createChannel = async (channelData: {
  name: string;
  description?: string;
  category?: string;
  picture_url?: string;
}) => {
  const response = await api.post('/channels', channelData);
  return response.data;
};

/**
 * Update an existing channel
 */
export const updateChannel = async (
  channelId: string,
  updates: {
    name?: string;
    description?: string;
    picture_url?: string;
    status?: string;
  }
) => {
  const response = await api.put(`/channels/${channelId}`, updates);
  return response.data;
};

/**
 * Delete a channel
 */
export const deleteChannel = async (channelId: string) => {
  const response = await api.delete(`/channels/${channelId}`);
  return response.data;
};

/**
 * Send a broadcast message to channel
 */
export const sendChannelMessage = async (
  channelId: string,
  message: {
    type: 'text' | 'image' | 'video' | 'document';
    text?: string;
    media_url?: string;
    caption?: string;
    filename?: string;
  }
) => {
  const response = await api.post(`/channels/${channelId}/message`, message);
  return response.data;
};

/**
 * Get channel messages
 */
export const getChannelMessages = async (channelId: string, page = 1) => {
  const response = await api.get(`/channels/${channelId}/messages?page=${page}`);
  return response.data;
};

/**
 * Get channel analytics
 */
export const getChannelAnalytics = async (
  channelId: string,
  since?: string,
  until?: string
) => {
  let url = `/channels/${channelId}/analytics`;
  const params = [];
  if (since) params.push(`since=${since}`);
  if (until) params.push(`until=${until}`);
  if (params.length > 0) url += '?' + params.join('&');
  
  const response = await api.get(url);
  return response.data;
};

/**
 * Sync follower count from WhatsApp
 */
export const syncFollowerCount = async (channelId: string) => {
  const response = await api.post(`/channels/${channelId}/sync`);
  return response.data;
};

/**
 * Get channel statistics summary
 */
export const getChannelStatsSummary = async () => {
  const response = await api.get('/channels/stats/summary');
  return response.data;
};
