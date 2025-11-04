export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'failed';

export interface Campaign {
  _id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  stats?: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    pending: number;
  };
  patientCount?: number;
  sentCount?: number;
  deliveredCount?: number;
  failedCount?: number;
  scheduledAt?: string;
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
  templateId?: string;
  templateName?: string;
  segmentId?: string;
  segmentName?: string;
  recipients?: Array<{
    phoneNumber: string;
    name?: string;
    status?: string;
    variables?: Record<string, string>;
  }>;
  message?: string;
  settings?: {
    sendRate?: number;
    retryFailed?: boolean;
    maxRetries?: number;
  };
}

export interface CampaignsState {
  list: Campaign[];
  selected: Campaign | null;
  loading: boolean;
  refreshing: boolean;
  searchQuery: string;
  statusFilter: CampaignStatus | 'all';
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  templateId?: string;
  message?: string;
  recipients: Array<{
    phoneNumber: string;
    name?: string;
    variables?: Record<string, string>;
  }>;
  scheduledAt?: string;
  scheduledFor?: string;
  segmentId?: string;
  startNow?: boolean;
  settings?: {
    sendRate?: number;
    retryFailed?: boolean;
    maxRetries?: number;
  };
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalMessagesSent: number;
  averageDeliveryRate: number;
}
