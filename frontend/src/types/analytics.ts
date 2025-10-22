export interface DailyMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  messagesSent: number;
  messagesDelivered: number;
  unreadConversations: number;
  deliveryRate?: number;
  readRate?: number;
}

export interface CampaignAnalytics {
  campaignId: string;
  name: string;
  deliveryRate: number;
  readRate: number;
  replyRate: number;
  messagesSent?: number;
  messagesDelivered?: number;
  messagesRead?: number;
  messagesReplied?: number;
}

export interface ConversationAnalytics {
  totalConversations: number;
  activeConversations: number;
  averageResponseTime: number; // in minutes
  conversationsByStatus: {
    unread: number;
    read: number;
    replied: number;
  };
}

export interface QualityScore {
  score: number;
  status: 'high' | 'medium' | 'low';
  phoneNumberId: string;
  lastUpdated: string;
}

export interface MessageTrend {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface CampaignPerformance {
  campaignId: string;
  name: string;
  status: string;
  messagesCount: number;
  deliveryRate: number;
  startDate: string;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RecentActivity {
  id: string;
  type: 'campaign' | 'message' | 'conversation' | 'template';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  iconColor: string;
}

export interface AnalyticsState {
  dailyMetrics: DailyMetrics;
  campaignAnalytics: CampaignAnalytics[];
  conversationAnalytics: ConversationAnalytics;
  qualityScore: QualityScore;
  messageTrends: MessageTrend[];
  campaignPerformance: CampaignPerformance[];
  statusDistribution: StatusDistribution[];
  recentActivity: RecentActivity[];
  loading: boolean;
  error: string | null;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface AnalyticsFilters {
  dateRange: DateRange;
  campaignIds?: string[];
  status?: string[];
}
