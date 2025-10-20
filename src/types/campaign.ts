// Campaign types
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed';

export interface Campaign {
  _id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  patientCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  scheduledFor: string;
  createdAt: string;
  updatedAt?: string;
  templateId?: string;
  templateName?: string;
  segmentId?: string;
  segmentName?: string;
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
  description: string;
  templateId: string;
  segmentId: string;
  scheduledFor: string;
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalMessagesSent: number;
  averageDeliveryRate: number;
}
