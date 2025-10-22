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
  // Get daily metrics
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

  // Get campaign analytics
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

  // Get conversation analytics
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

  // Get quality score
  getQualityScore: async (): Promise<QualityScore> => {
    try {
      const response = await api.get('/analytics/quality');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch quality score:', error);
      // Return default score if API fails
      return {
        score: 0,
        status: 'low' as const,
        phoneNumberId: '',
        lastUpdated: new Date().toISOString(),
      };
    }
  },

  // Get message trends
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

  // Get campaign performance
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

  // Get status distribution
  getStatusDistribution: async (): Promise<StatusDistribution[]> => {
    try {
      const response = await api.get('/analytics/status-distribution');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch status distribution:', error);
      return [];
    }
  },

  // Get recent activity
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

  // Get all analytics data
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
      ] = await Promise.all([
        analyticsService.getDailyMetrics(),
        analyticsService.getCampaignAnalytics(dateRange),
        analyticsService.getConversationAnalytics(dateRange),
        analyticsService.getQualityScore(),
        analyticsService.getMessageTrends(dateRange),
        analyticsService.getCampaignPerformance(dateRange),
        analyticsService.getStatusDistribution(),
        analyticsService.getRecentActivity(),
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
      };
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      throw new Error('Failed to load analytics data');
    }
  },
};

export default analyticsService;

