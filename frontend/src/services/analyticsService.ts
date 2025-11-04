import api from './api';
import {
  DailyMetrics,
  CampaignAnalytics,
  ConversationAnalytics,
  QualityScore,
  MessageTrend,
  CampaignPerformance,
  StatusDistribution,
  RecentActivity,
  DateRange,
} from '../types/analytics';

export const analyticsService = {
  getDailyMetrics: async (): Promise<DailyMetrics> => {
    try {
      const response = await api.get('/analytics/dashboard');
      const data = response.data;

      return {
        totalCampaigns: data.overview?.totalCampaigns || 0,
        activeCampaigns: data.overview?.activeCampaigns || 0,
        messagesSent: data.overview?.totalMessages || 0,
        messagesDelivered: data.metrics?.messagesDelivered || 0,
        unreadConversations: data.overview?.activeConversations || 0,
        deliveryRate: data.metrics?.avgDeliveryRate || 0,
        readRate: data.metrics?.avgReadRate || 0,
      };
    } catch (error) {
      console.error('Failed to fetch daily metrics:', error);
      throw new Error('Failed to load analytics. Please check your connection.');
    }
  },

  getCampaignAnalytics: async (
    dateRange?: DateRange
  ): Promise<CampaignAnalytics[]> => {
    try {
      const response = await api.get('/analytics/campaigns', {
        params: dateRange,
      });
      return response.data.campaigns || [];
    } catch (error) {
      console.error('Failed to fetch campaign analytics:', error);
      throw new Error('Failed to load campaign analytics');
    }
  },

  getConversationAnalytics: async (
    dateRange?: DateRange
  ): Promise<ConversationAnalytics> => {
    try {
      const response = await api.get('/analytics/conversations', {
        params: dateRange,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch conversation analytics:', error);
      throw new Error('Failed to load conversation analytics');
    }
  },

  getQualityScore: async (): Promise<QualityScore> => {
    try {
      const response = await api.get('/analytics/quality');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch quality score:', error);
      return {
        score: 0,
        status: 'low' as const,
        phoneNumberId: '',
        lastUpdated: new Date().toISOString(),
      };
    }
  },

  getMessageTrends: async (dateRange?: DateRange): Promise<MessageTrend[]> => {
    try {
      const response = await api.get('/analytics/trends', {
        params: dateRange,
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch message trends:', error);
      return [];
    }
  },

  getCampaignPerformance: async (
    dateRange?: DateRange
  ): Promise<CampaignPerformance[]> => {
    try {
      const response = await api.get('/analytics/campaign-performance', {
        params: dateRange,
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch campaign performance:', error);
      return [];
    }
  },

  getStatusDistribution: async (): Promise<StatusDistribution[]> => {
    try {
      const response = await api.get('/analytics/status-distribution');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch status distribution:', error);
      return [];
    }
  },

  getRecentActivity: async (limit: number = 10): Promise<RecentActivity[]> => {
    try {
      const response = await api.get('/analytics/recent-activity', {
        params: { limit },
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      return [];
    }
  },

  getDailyAnalytics: async (dateRange?: DateRange): Promise<any[]> => {
    try {
      const response = await api.get('/analytics/daily', {
        params: dateRange,
      });
      return response.data.analytics || [];
    } catch (error) {
      console.error('Failed to fetch daily analytics:', error);
      return [];
    }
  },

  getTemplateAnalytics: async (): Promise<any[]> => {
    try {
      const response = await api.get('/analytics/templates');
      return response.data.templates || [];
    } catch (error) {
      console.error('Failed to fetch template analytics:', error);
      return [];
    }
  },

  getAllAnalytics: async (dateRange?: DateRange) => {
    try {
      const [
        dailyMetrics,
        campaignAnalytics,
        conversationAnalytics,
        qualityScore,
        messageTrends,
        campaignPerformance,
        statusDistribution,
        recentActivity,
        dailyAnalytics,
        templateAnalytics,
      ] = await Promise.all([
        analyticsService.getDailyMetrics(),
        analyticsService.getCampaignAnalytics(dateRange),
        analyticsService.getConversationAnalytics(dateRange),
        analyticsService.getQualityScore(),
        analyticsService.getMessageTrends(dateRange),
        analyticsService.getCampaignPerformance(dateRange),
        analyticsService.getStatusDistribution(),
        analyticsService.getRecentActivity(),
        analyticsService.getDailyAnalytics(dateRange),
        analyticsService.getTemplateAnalytics(),
      ]);

      return {
        dailyMetrics,
        campaignAnalytics,
        conversationAnalytics,
        qualityScore,
        messageTrends,
        campaignPerformance,
        statusDistribution,
        recentActivity,
        dailyAnalytics,
        templateAnalytics,
      };
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      throw new Error('Failed to load analytics data');
    }
  },
};

export default analyticsService;

