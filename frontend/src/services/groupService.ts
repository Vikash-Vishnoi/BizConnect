import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../config/environment';

const API_BASE_URL = config.apiBaseUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Types
export interface GroupMessage {
  type: string;
  text?: {
    body: string;
    preview_url?: boolean;
  };
  image?: {
    id?: string;
    link?: string;
    caption?: string;
  };
  video?: {
    id?: string;
    link?: string;
    caption?: string;
  };
  audio?: {
    id?: string;
    link?: string;
  };
  document?: {
    id?: string;
    link?: string;
    caption?: string;
    filename?: string;
  };
  context?: {
    message_id: string;
  };
}

export interface GroupInfo {
  groupId: string;
  name: string;
  lastMessageTime?: string;
  messageCount: number;
  unreadCount?: number;
  status: string;
  apiData?: any;
  source: 'api' | 'database';
}

export interface Group {
  groupId: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  messageCount: number;
  unreadCount: number;
  status: string;
}

// Group Service
export const groupService = {
  // Send message to group
  sendMessage: async (groupId: string, message: GroupMessage): Promise<any> => {
    const response = await api.post('/groups/send-message', {
      groupId,
      message,
    });
    return response.data;
  },

  // Send text message to group
  sendTextMessage: async (
    groupId: string,
    text: string,
    context?: { message_id: string }
  ): Promise<any> => {
    const response = await api.post('/groups/send-text', {
      groupId,
      text,
      context,
    });
    return response.data;
  },

  // Send media to group
  sendMediaMessage: async (
    groupId: string,
    mediaType: 'image' | 'video' | 'audio' | 'document',
    mediaId: string,
    caption?: string
  ): Promise<any> => {
    const response = await api.post('/groups/send-media', {
      groupId,
      mediaType,
      mediaId,
      caption,
    });
    return response.data;
  },

  // Get group information
  getGroupInfo: async (groupId: string): Promise<GroupInfo> => {
    const response = await api.get(`/groups/${groupId}/info`);
    return response.data.data;
  },

  // Get group metadata
  getGroupMetadata: async (groupId: string): Promise<any> => {
    const response = await api.get(`/groups/${groupId}/metadata`);
    return response.data;
  },

  // Leave group
  leaveGroup: async (groupId: string): Promise<any> => {
    const response = await api.post(`/groups/${groupId}/leave`);
    return response.data;
  },

  // Get list of groups
  getGroups: async (): Promise<Group[]> => {
    const response = await api.get('/groups');
    return response.data.groups;
  },
};

export default groupService;
