import type {Campaign, CreateCampaignData, CampaignStats} from '../types/campaign';

// Dummy campaigns data for testing
export const dummyCampaigns: Campaign[] = [
  {
    _id: 'camp_001',
    name: 'Health Check Reminder',
    description: 'Remind patients about their annual health check-up',
    status: 'running',
    patientCount: 50000,
    sentCount: 12500,
    deliveredCount: 11875,
    failedCount: 625,
    scheduledFor: '2024-01-20T09:00:00Z',
    createdAt: '2024-01-15T08:00:00Z',
    templateName: 'Health Check Template',
    segmentName: 'Annual Checkup Due',
  },
  {
    _id: 'camp_002',
    name: 'Appointment Confirmation',
    description: 'Confirm upcoming appointments for this week',
    status: 'scheduled',
    patientCount: 3200,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    scheduledFor: '2024-01-22T08:00:00Z',
    createdAt: '2024-01-18T14:30:00Z',
    templateName: 'Appointment Reminder',
    segmentName: 'This Week Appointments',
  },
  {
    _id: 'camp_003',
    name: 'Vaccination Drive',
    description: 'Flu vaccination campaign for senior citizens',
    status: 'completed',
    patientCount: 15000,
    sentCount: 15000,
    deliveredCount: 14250,
    failedCount: 750,
    scheduledFor: '2024-01-10T10:00:00Z',
    createdAt: '2024-01-05T09:00:00Z',
    templateName: 'Vaccination Alert',
    segmentName: 'Seniors 65+',
  },
  {
    _id: 'camp_004',
    name: 'Lab Results Ready',
    description: 'Notify patients that their lab results are available',
    status: 'paused',
    patientCount: 8500,
    sentCount: 4200,
    deliveredCount: 4000,
    failedCount: 200,
    scheduledFor: '2024-01-18T11:00:00Z',
    createdAt: '2024-01-17T16:00:00Z',
    templateName: 'Lab Results Notification',
    segmentName: 'Recent Lab Tests',
  },
  {
    _id: 'camp_005',
    name: 'Prescription Refill',
    description: 'Remind patients to refill their prescriptions',
    status: 'draft',
    patientCount: 2500,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    scheduledFor: '2024-01-25T09:00:00Z',
    createdAt: '2024-01-19T10:00:00Z',
    templateName: 'Prescription Reminder',
    segmentName: 'Prescription Expiring Soon',
  },
];

// Mock API calls
export const campaignAPI = {
  // Get all campaigns
  getCampaigns: async (): Promise<Campaign[]> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return dummyCampaigns;
  },

  // Get single campaign
  getCampaign: async (id: string): Promise<Campaign> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const campaign = dummyCampaigns.find(c => c._id === id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    return campaign;
  },

  // Create campaign
  createCampaign: async (data: CreateCampaignData): Promise<Campaign> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newCampaign: Campaign = {
      _id: `camp_${Date.now()}`,
      name: data.name,
      description: data.description,
      status: 'draft',
      patientCount: 0,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      scheduledFor: data.scheduledFor,
      createdAt: new Date().toISOString(),
      templateId: data.templateId,
      segmentId: data.segmentId,
    };
    dummyCampaigns.unshift(newCampaign);
    return newCampaign;
  },

  // Start campaign
  startCampaign: async (id: string): Promise<Campaign> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const campaign = dummyCampaigns.find(c => c._id === id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    campaign.status = 'running';
    return campaign;
  },

  // Pause campaign
  pauseCampaign: async (id: string): Promise<Campaign> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const campaign = dummyCampaigns.find(c => c._id === id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    campaign.status = 'paused';
    return campaign;
  },

  // Get campaign stats
  getStats: async (): Promise<CampaignStats> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    const totalCampaigns = dummyCampaigns.length;
    const activeCampaigns = dummyCampaigns.filter(
      c => c.status === 'running',
    ).length;
    const totalMessagesSent = dummyCampaigns.reduce(
      (sum, c) => sum + c.sentCount,
      0,
    );
    const totalDelivered = dummyCampaigns.reduce(
      (sum, c) => sum + c.deliveredCount,
      0,
    );
    const averageDeliveryRate =
      totalMessagesSent > 0
        ? Math.round((totalDelivered / totalMessagesSent) * 100)
        : 0;

    return {
      totalCampaigns,
      activeCampaigns,
      totalMessagesSent,
      averageDeliveryRate,
    };
  },
};
