import api from './api';

export interface WelcomeMessageConfig {
  enabled: boolean;
  strategy: 'template' | 'text';
  templateId: string | null;
  textMessage: string;
  delay: number;
  businessHoursEnabled: boolean;
  businessHours: {
    [key: string]: { start: string; end: string } | null;
  };
  outsideHoursMessage: string;
}

export interface Template {
  _id: string;
  name: string;
  category: string;
  status: string;
  language: string;
  components: Array<{
    type: string;
    text?: string;
    format?: string;
  }>;
}

class SettingsService {
  async getWelcomeMessageConfig(): Promise<WelcomeMessageConfig> {
    try {
      const response = await api.get('/settings/welcome-message');
      return response.data.config;
    } catch (error: any) {
      console.error('Get welcome message config error:', error);
      throw new Error(
        error.response?.data?.error || 'Failed to get welcome message configuration'
      );
    }
  }

  async updateWelcomeMessageConfig(
    config: Partial<WelcomeMessageConfig>
  ): Promise<WelcomeMessageConfig> {
    try {
      const response = await api.put('/settings/welcome-message', config);
      return response.data.config;
    } catch (error: any) {
      console.error('Update welcome message config error:', error);
      throw new Error(
        error.response?.data?.error || 'Failed to update welcome message configuration'
      );
    }
  }

  async getWelcomeMessageTemplates(): Promise<Template[]> {
    try {
      const response = await api.get('/settings/welcome-message/templates');
      return response.data.templates;
    } catch (error: any) {
      console.error('Get welcome message templates error:', error);
      throw new Error(
        error.response?.data?.error || 'Failed to get welcome message templates'
      );
    }
  }

  async testWelcomeMessage(phoneNumber: string): Promise<void> {
    try {
      await api.post('/settings/welcome-message/test', {phoneNumber});
    } catch (error: any) {
      console.error('Test welcome message error:', error);
      throw new Error(
        error.response?.data?.error || 'Failed to send test welcome message'
      );
    }
  }

  async getAccountLimits(): Promise<{
    tier: string;
    tierName: string;
    messagingLimit: number;
    qualityRating: string;
    nameStatus?: string;
    codeVerificationStatus?: string;
  }> {
    try {
      const response = await api.get('/settings/account-limits');
      return response.data;
    } catch (error: any) {
      console.error('Get account limits error:', error);
      throw new Error(
        error.response?.data?.error || 'Failed to get account limits'
      );
    }
  }

  async getMessagingLimits(): Promise<{
    limits: {
      tier: string;
      tierName: string;
      messagingLimit: number;
      qualityRating: string;
    };
    usage: {
      today: number;
      week: number;
      todayPercentage: number;
      weekAverage: number;
    };
  }> {
    try {
      const response = await api.get('/settings/messaging-limits');
      return response.data;
    } catch (error: any) {
      console.error('Get messaging limits error:', error);
      throw new Error(
        error.response?.data?.error || 'Failed to get messaging limits'
      );
    }
  }

  async getQualityRatingHistory(
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<{
    success: boolean;
    history: Array<{
      _id: string;
      rating: string;
      tier: string;
      timestamp: string;
      metadata?: {
        hasChanged?: boolean;
        previousRating?: string;
      };
    }>;
    stats: {
      total: number;
      trend: 'improving' | 'declining' | 'stable';
      currentRating: string;
      lastChecked: string | null;
    };
    distribution: {
      [key: string]: number;
    };
  }> {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (limit) params.limit = limit;

      const response = await api.get('/settings/quality-rating/history', { params });
      return response.data;
    } catch (error: any) {
      console.error('Get quality rating history error:', error);
      throw new Error(
        error.response?.data?.error || 'Failed to get quality rating history'
      );
    }
  }

  async checkQualityRatingNow(): Promise<{
    success: boolean;
    rating: string;
    hasChanged: boolean;
    record: any;
  }> {
    try {
      const response = await api.post('/settings/quality-rating/check', {});
      return response.data;
    } catch (error: any) {
      console.error('Check quality rating error:', error);
      throw new Error(
        error.response?.data?.error || 'Failed to check quality rating'
      );
    }
  }
}

export const settingsService = new SettingsService();
