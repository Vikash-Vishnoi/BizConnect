/**
 * ✅ FEATURE 36: Audit Logs Service
 * Frontend API client for audit log operations
 */

import api from './api';

// TypeScript Interfaces
export interface AuditLog {
  _id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  description: string;
  status: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'PENDING';
  errorMessage?: string;
  errorCode?: string;
  requestData?: {
    method: string;
    endpoint: string;
    params?: any;
    body?: any;
    query?: any;
  };
  responseData?: {
    statusCode: number;
    data?: any;
    duration: number;
  };
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: any;
  location?: {
    country?: string;
    city?: string;
    coordinates?: [number, number];
  };
  changes?: {
    before?: any;
    after?: any;
    fields?: string[];
  };
  impact?: {
    level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affectedUsers?: number;
    affectedResources?: string[];
  };
  complianceTags?: string[];
  retentionPeriod?: number;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditLogStats {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  pendingActions: number;
  uniqueUsers: number;
  uniqueIPs: number;
  topActions: Array<{
    action: string;
    count: number;
  }>;
  resourceBreakdown: Array<{
    resourceType: string;
    count: number;
  }>;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Get filtered audit logs with pagination
 */
export const getAuditLogs = async (filters?: AuditLogFilters): Promise<{
  logs: AuditLog[];
  pagination: PaginationInfo;
}> => {
  const params = new URLSearchParams();
  
  if (filters) {
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.action) params.append('action', filters.action);
    if (filters.resourceType) params.append('resourceType', filters.resourceType);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.ipAddress) params.append('ipAddress', filters.ipAddress);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
  }

  const response = await api.get(`/audit-logs?${params.toString()}`);
  return {
    logs: response.data.data,
    pagination: response.data.pagination
  };
};

/**
 * Get audit log statistics
 */
export const getAuditLogStats = async (
  userId?: string,
  startDate?: string,
  endDate?: string
): Promise<AuditLogStats> => {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await api.get(`/audit-logs/stats?${params.toString()}`);
  return response.data.data;
};

/**
 * Get user activity timeline
 */
export const getUserTimeline = async (
  userId: string,
  days: number = 30
): Promise<AuditLog[]> => {
  const response = await api.get(`/audit-logs/user/${userId}?days=${days}`);
  return response.data.data;
};

/**
 * Get sensitive operations
 */
export const getSensitiveOperations = async (
  startDate?: string,
  endDate?: string
): Promise<AuditLog[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await api.get(`/audit-logs/sensitive?${params.toString()}`);
  return response.data.data;
};

/**
 * Get list of all available action types
 */
export const getActionTypes = async (): Promise<string[]> => {
  const response = await api.get('/audit-logs/actions');
  return response.data.data;
};

/**
 * Get list of all resource types
 */
export const getResourceTypes = async (): Promise<string[]> => {
  const response = await api.get('/audit-logs/resource-types');
  return response.data.data;
};

/**
 * Export audit logs to CSV
 */
export const exportAuditLogs = async (filters?: AuditLogFilters): Promise<Blob> => {
  const response = await api.post('/audit-logs/export', filters, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Helper: Format action name for display
 */
export const formatActionName = (action: string): string => {
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Helper: Get status color
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'SUCCESS': return '#10B981'; // Green
    case 'FAILURE': return '#EF4444'; // Red
    case 'PARTIAL': return '#F59E0B'; // Yellow
    case 'PENDING': return '#6B7280'; // Gray
    default: return '#6B7280';
  }
};

/**
 * Helper: Get impact level color
 */
export const getImpactColor = (level: string): string => {
  switch (level) {
    case 'CRITICAL': return '#DC2626'; // Dark Red
    case 'HIGH': return '#F59E0B'; // Orange
    case 'MEDIUM': return '#3B82F6'; // Blue
    case 'LOW': return '#10B981'; // Green
    case 'NONE': return '#9CA3AF'; // Gray
    default: return '#9CA3AF';
  }
};

/**
 * Helper: Format duration (milliseconds to readable)
 */
export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
};

/**
 * Helper: Get action icon
 */
export const getActionIcon = (action: string): string => {
  if (action.includes('LOGIN')) return '🔐';
  if (action.includes('CREATE')) return '➕';
  if (action.includes('UPDATE')) return '✏️';
  if (action.includes('DELETE')) return '🗑️';
  if (action.includes('SEND') || action.includes('BROADCAST')) return '📤';
  if (action.includes('EXPORT')) return '📥';
  if (action.includes('PERMISSION') || action.includes('ROLE')) return '🔑';
  if (action.includes('START') || action.includes('ENABLE')) return '▶️';
  if (action.includes('STOP') || action.includes('PAUSE') || action.includes('DISABLE')) return '⏸️';
  if (action.includes('ERROR')) return '❌';
  if (action.includes('WARNING')) return '⚠️';
  return '📝';
};

export default {
  getAuditLogs,
  getAuditLogStats,
  getUserTimeline,
  getSensitiveOperations,
  getActionTypes,
  getResourceTypes,
  exportAuditLogs,
  formatActionName,
  getStatusColor,
  getImpactColor,
  formatDuration,
  getActionIcon
};
