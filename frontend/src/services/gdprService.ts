import api from './api';

/**
 * GDPR Service
 * Handles data export and deletion requests for GDPR compliance
 */

// Types
export interface GDPRRequest {
  _id: string;
  userId: string;
  requestType: 'EXPORT' | 'DELETE';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  dataTypes?: string[];
  format?: 'JSON' | 'CSV' | 'PDF';
  exportUrl?: string;
  fileSize?: number;
  expiresAt?: string;
  deleteDataTypes?: string[];
  deletionReason?: string;
  deletedRecords?: {
    conversations?: number;
    messages?: number;
    contacts?: number;
    templates?: number;
    campaigns?: number;
    analytics?: number;
    automations?: number;
    media?: number;
    auditLogs?: number;
  };
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  retryCount?: number;
  maxRetries?: number;
  requestedBy?: {
    userId: string;
    userEmail: string;
    ipAddress: string;
    userAgent: string;
  };
  verifiedAt?: string;
  legalBasis?: string;
  consentGiven?: boolean;
  privacyPolicyVersion?: string;
  processedBy?: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportRequestData {
  dataTypes: string[];
  format?: 'JSON' | 'CSV' | 'PDF';
}

export interface DeleteRequestData {
  deleteDataTypes: string[];
  deletionReason?: string;
  confirmPassword: string;
}

export interface GDPRStats {
  total: number;
  byType: {
    EXPORT: number;
    DELETE: number;
  };
  byStatus: {
    PENDING: number;
    PROCESSING: number;
    COMPLETED: number;
    FAILED: number;
    CANCELLED: number;
  };
  avgProcessingTime: number;
}

// Data type options
export const DATA_TYPE_OPTIONS = [
  { value: 'all', label: 'All Data', icon: '📦', description: 'Export all your data' },
  { value: 'profile', label: 'Profile', icon: '👤', description: 'Your account information' },
  { value: 'conversations', label: 'Conversations', icon: '💬', description: 'All conversation threads' },
  { value: 'messages', label: 'Messages', icon: '📨', description: 'All sent and received messages' },
  { value: 'contacts', label: 'Contacts', icon: '📇', description: 'Your contact list' },
  { value: 'templates', label: 'Templates', icon: '📄', description: 'Message templates' },
  { value: 'campaigns', label: 'Campaigns', icon: '📢', description: 'Campaign data' },
  { value: 'analytics', label: 'Analytics', icon: '📊', description: 'Analytics and reports' },
  { value: 'automations', label: 'Automations', icon: '🤖', description: 'Automation rules' },
  { value: 'media', label: 'Media', icon: '🖼️', description: 'Uploaded media files' },
  { value: 'settings', label: 'Settings', icon: '⚙️', description: 'App preferences' },
  { value: 'audit_logs', label: 'Audit Logs', icon: '🔍', description: 'Activity history' },
];

export const DELETE_TYPE_OPTIONS = [
  { value: 'conversations', label: 'Conversations', icon: '💬', description: 'All conversation threads' },
  { value: 'messages', label: 'Messages', icon: '📨', description: 'All messages (keeps conversations)' },
  { value: 'contacts', label: 'Contacts', icon: '📇', description: 'Your contact list' },
  { value: 'templates', label: 'Templates', icon: '📄', description: 'Message templates' },
  { value: 'campaigns', label: 'Campaigns', icon: '📢', description: 'Campaign data' },
  { value: 'analytics', label: 'Analytics', icon: '📊', description: 'Analytics and reports' },
  { value: 'automations', label: 'Automations', icon: '🤖', description: 'Automation rules' },
  { value: 'media', label: 'Media', icon: '🖼️', description: 'Uploaded media files' },
  { value: 'audit_logs', label: 'Audit Logs', icon: '🔍', description: 'Activity history' },
  { value: 'all', label: 'All Data', icon: '🗑️', description: 'Delete everything except account' },
];

/**
 * Request data export
 */
export const requestDataExport = async (data: ExportRequestData): Promise<{ success: boolean; request: GDPRRequest; message: string }> => {
  const response = await api.post('/gdpr/export', data);
  return response.data;
};

/**
 * Request data deletion
 */
export const requestDataDeletion = async (data: DeleteRequestData): Promise<{ success: boolean; request: GDPRRequest; message: string }> => {
  const response = await api.post('/gdpr/delete', data);
  return response.data;
};

/**
 * Get all GDPR requests for current user
 */
export const getGDPRRequests = async (params?: {
  requestType?: 'EXPORT' | 'DELETE';
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  requests: GDPRRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> => {
  const response = await api.get('/gdpr/requests', { params });
  return response.data;
};

/**
 * Get specific GDPR request
 */
export const getGDPRRequest = async (requestId: string): Promise<{ success: boolean; request: GDPRRequest }> => {
  const response = await api.get(`/gdpr/requests/${requestId}`);
  return response.data;
};

/**
 * Verify GDPR request with token
 */
export const verifyGDPRRequest = async (requestId: string, token: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(`/gdpr/requests/${requestId}/verify`, { token });
  return response.data;
};

/**
 * Cancel pending GDPR request
 */
export const cancelGDPRRequest = async (requestId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(`/gdpr/requests/${requestId}/cancel`);
  return response.data;
};

/**
 * Download export file
 */
export const downloadExport = async (requestId: string): Promise<Blob> => {
  const response = await api.get(`/gdpr/download/${requestId}`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Get GDPR statistics (admin only)
 */
export const getGDPRStats = async (userId?: string): Promise<{ success: boolean; stats: GDPRStats }> => {
  const response = await api.get('/gdpr/stats', {
    params: userId ? { userId } : {},
  });
  return response.data;
};

// Helper functions

/**
 * Format file size
 */
export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

/**
 * Format processing duration
 */
export const formatDuration = (startDate?: string, endDate?: string): string => {
  if (!startDate || !endDate) return 'N/A';
  
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const duration = end - start;
  
  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${Math.round(duration / 1000)}s`;
  if (duration < 3600000) return `${Math.round(duration / 60000)}m`;
  return `${Math.round(duration / 3600000)}h`;
};

/**
 * Get status color
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'COMPLETED':
      return '#10B981'; // Green
    case 'PROCESSING':
      return '#3B82F6'; // Blue
    case 'PENDING':
      return '#F59E0B'; // Yellow
    case 'FAILED':
      return '#EF4444'; // Red
    case 'CANCELLED':
      return '#6B7280'; // Gray
    default:
      return '#9CA3AF';
  }
};

/**
 * Get status icon
 */
export const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'COMPLETED':
      return '✅';
    case 'PROCESSING':
      return '⏳';
    case 'PENDING':
      return '🕐';
    case 'FAILED':
      return '❌';
    case 'CANCELLED':
      return '🚫';
    default:
      return '❓';
  }
};

/**
 * Get request type icon
 */
export const getRequestTypeIcon = (requestType: string): string => {
  switch (requestType) {
    case 'EXPORT':
      return '📥';
    case 'DELETE':
      return '🗑️';
    default:
      return '📋';
  }
};

/**
 * Get request type label
 */
export const getRequestTypeLabel = (requestType: string): string => {
  switch (requestType) {
    case 'EXPORT':
      return 'Data Export';
    case 'DELETE':
      return 'Data Deletion';
    default:
      return 'Unknown';
  }
};

/**
 * Check if export is expired
 */
export const isExportExpired = (expiresAt?: string): boolean => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};

/**
 * Get expiration warning
 */
export const getExpirationWarning = (expiresAt?: string): string | null => {
  if (!expiresAt) return null;
  
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysLeft < 0) return 'Expired';
  if (daysLeft === 0) return 'Expires today';
  if (daysLeft === 1) return 'Expires tomorrow';
  if (daysLeft <= 7) return `Expires in ${daysLeft} days`;
  
  return null;
};

export default {
  requestDataExport,
  requestDataDeletion,
  getGDPRRequests,
  getGDPRRequest,
  verifyGDPRRequest,
  cancelGDPRRequest,
  downloadExport,
  getGDPRStats,
  formatFileSize,
  formatDuration,
  getStatusColor,
  getStatusIcon,
  getRequestTypeIcon,
  getRequestTypeLabel,
  isExportExpired,
  getExpirationWarning,
  DATA_TYPE_OPTIONS,
  DELETE_TYPE_OPTIONS,
};
