/**
 * Business Types
 * 
 * Type definitions for multi-business support
 */

export type BusinessStatus = 'active' | 'suspended' | 'deleted';

export type BusinessRole = 'owner' | 'admin' | 'manager' | 'agent';

export type BusinessIndustry = 
  | 'healthcare'
  | 'retail'
  | 'ecommerce'
  | 'education'
  | 'finance'
  | 'realestate'
  | 'hospitality'
  | 'automotive'
  | 'other';

export interface WhatsAppConfig {
  phoneNumberId: string;
  phoneNumber?: string;
  wabaId: string;
  accessToken: string;
  systemUserToken?: string;
  appSecret: string;
  verifyToken?: string;
  apiVersion: string;
  tokenLastRefreshedAt?: string;
}

export interface BusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  vertical?: string;
  websites?: string[];
}

export interface BusinessSettings {
  timezone?: string;
  language?: string;
  currency?: string;
  dateFormat?: string;
  businessHours?: {
    enabled: boolean;
    schedule: Array<{
      day: string;
      isOpen: boolean;
      hours?: Array<{
        open: string;
        close: string;
      }>;
    }>;
  };
  notifications?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  rateLimits?: {
    messagesPerMinute?: number;
    messagesPerHour?: number;
    messagesPerDay?: number;
  };
}

export interface TeamMember {
  user: string | {
    _id: string;
    name: string;
    email: string;
  };
  role: BusinessRole;
  permissions: string[];
  joinedAt: string;
  addedBy?: string;
}

export interface BusinessHealth {
  apiStatus: 'healthy' | 'degraded' | 'down';
  phoneNumberStatus: 'connected' | 'disconnected' | 'restricted';
  qualityRating?: string;
  messagingLimitTier?: string;
  lastCheckedAt?: string;
  errorCount24h?: number;
  healthScore?: number;
  isCritical?: boolean;
  needsAttention?: boolean;
}

export interface BusinessUsage {
  messagesSent: number;
  messagesReceived: number;
  templatesUsed: number;
  activeCampaigns: number;
  activeConversations: number;
  period: string;
}

export interface Business {
  _id: string;
  name: string;
  displayName?: string;
  description?: string;
  industry?: BusinessIndustry;
  logo?: string;
  website?: string;
  owner: string;
  team: TeamMember[];
  whatsappConfig: WhatsAppConfig;
  profile?: BusinessProfile;
  settings?: BusinessSettings;
  status: BusinessStatus;
  health?: BusinessHealth;
  usage?: BusinessUsage;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UserBusiness {
  businessId: string | Business;
  role: BusinessRole;
  permissions?: string[];
  joinedAt: string;
}

export interface CreateBusinessData {
  name: string;
  displayName?: string;
  description?: string;
  industry?: BusinessIndustry;
  website?: string;
  whatsappConfig: {
    phoneNumberId: string;
    phoneNumber?: string;
    wabaId: string;
    accessToken: string;
    systemUserToken?: string;
    appSecret: string;
    verifyToken?: string;
    apiVersion?: string;
  };
  profile?: BusinessProfile;
}

export interface UpdateBusinessData {
  name?: string;
  displayName?: string;
  description?: string;
  industry?: BusinessIndustry;
  logo?: string;
  website?: string;
  profile?: BusinessProfile;
  settings?: BusinessSettings;
}

export interface UpdateBusinessCredentialsData {
  accessToken?: string;
  systemUserToken?: string;
  appSecret?: string;
  verifyToken?: string;
  apiVersion?: string;
}

export interface AddTeamMemberData {
  userId?: string;
  email?: string;
  role: BusinessRole;
  permissions?: string[];
}

export interface UpdateTeamMemberData {
  role?: BusinessRole;
  permissions?: string[];
}

export interface BusinessStats {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
}

export interface BusinessContextValue {
  currentBusiness: Business | null;
  businesses: Business[];
  loading: boolean;
  error: string | null;
  switchBusiness: (businessId: string) => Promise<void>;
  refreshBusinesses: () => Promise<void>;
  createBusiness: (data: CreateBusinessData) => Promise<Business>;
  updateBusiness: (businessId: string, data: UpdateBusinessData) => Promise<Business>;
  deleteBusiness: (businessId: string) => Promise<void>;
}
