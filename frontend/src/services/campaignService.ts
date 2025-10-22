import api from './api';
import type {Campaign, CreateCampaignData, CampaignStats} from '../types/campaign';

// Campaign API - all real backend calls, no mock data
export const campaignAPI = {
  // Get all campaigns
  getCampaigns: async (): Promise<Campaign[]> => {
    try {
      const response = await api.get('/campaigns');
      return response.data.campaigns || [];
    } catch (error: any) {
      console.error('Failed to fetch campaigns:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch campaigns');
    }
  },

  // Get single campaign
  getCampaign: async (id: string): Promise<Campaign> => {
    try {
      const response = await api.get(`/campaigns/${id}`);
      return response.data.campaign;
    } catch (error: any) {
      console.error('Failed to fetch campaign:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch campaign');
    }
  },

  // Create campaign
  createCampaign: async (data: CreateCampaignData): Promise<Campaign> => {
    try {
      const response = await api.post('/campaigns', data);
      return response.data.campaign;
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      throw new Error(error.response?.data?.error || 'Failed to create campaign');
    }
  },

  // Start campaign
  startCampaign: async (id: string): Promise<Campaign> => {
    try {
      const response = await api.post(`/campaigns/${id}/start`);
      return response.data.campaign;
    } catch (error: any) {
      console.error('Failed to start campaign:', error);
      throw new Error(error.response?.data?.error || 'Failed to start campaign');
    }
  },

  // Pause campaign
  pauseCampaign: async (id: string): Promise<Campaign> => {
    try {
      const response = await api.post(`/campaigns/${id}/pause`);
      return response.data.campaign;
    } catch (error: any) {
      console.error('Failed to pause campaign:', error);
      throw new Error(error.response?.data?.error || 'Failed to pause campaign');
    }
  },

  // Delete campaign
  deleteCampaign: async (id: string): Promise<void> => {
    try {
      await api.delete(`/campaigns/${id}`);
    } catch (error: any) {
      console.error('Failed to delete campaign:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete campaign');
    }
  },

  // Get campaign stats
  getStats: async (): Promise<CampaignStats> => {
    try {
      const response = await api.get('/analytics/dashboard');
      const data = response.data.overview;
      
      return {
        totalCampaigns: data.totalCampaigns || 0,
        activeCampaigns: data.activeCampaigns || 0,
        totalMessagesSent: data.totalMessages || 0,
        averageDeliveryRate: response.data.metrics?.avgDeliveryRate || 0,
      };
    } catch (error: any) {
      console.error('Failed to fetch campaign stats:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch campaign stats');
    }
  },
};

