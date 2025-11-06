import api from './api';
import {
  AutomationRule,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
  AutomationLog,
  AutomationLogsResponse,
  AutomationStatsOverview
} from '../types/automation';

/**
 * Automation Service
 * 
 * API calls for managing automation rules and viewing execution logs
 */

export const automationAPI = {
  /**
   * Get all automation rules
   */
  getAll: async (): Promise<AutomationRule[]> => {
    try {
      const response = await api.get('/automations');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch automation rules:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch automation rules');
    }
  },

  /**
   * Get single automation rule
   */
  getById: async (id: string): Promise<AutomationRule> => {
    try {
      const response = await api.get(`/automations/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch automation rule:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch automation rule');
    }
  },

  /**
   * Create new automation rule
   */
  create: async (data: CreateAutomationRuleInput): Promise<AutomationRule> => {
    try {
      const response = await api.post('/automations', data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create automation rule:', error);
      throw new Error(error.response?.data?.error || 'Failed to create automation rule');
    }
  },

  /**
   * Update automation rule
   */
  update: async (id: string, data: UpdateAutomationRuleInput): Promise<AutomationRule> => {
    try {
      const response = await api.put(`/automations/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to update automation rule:', error);
      throw new Error(error.response?.data?.error || 'Failed to update automation rule');
    }
  },

  /**
   * Delete automation rule
   */
  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/automations/${id}`);
    } catch (error: any) {
      console.error('Failed to delete automation rule:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete automation rule');
    }
  },

  /**
   * Toggle automation rule active/inactive
   */
  toggle: async (id: string): Promise<{ isActive: boolean }> => {
    try {
      const response = await api.patch(`/automations/${id}/toggle`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to toggle automation rule:', error);
      throw new Error(error.response?.data?.error || 'Failed to toggle automation rule');
    }
  },

  /**
   * Get execution logs for automation rule
   */
  getLogs: async (id: string, page: number = 1, limit: number = 50): Promise<AutomationLogsResponse> => {
    try {
      const response = await api.get(`/automations/${id}/logs`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch automation logs:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch automation logs');
    }
  },

  /**
   * Get automation statistics overview
   */
  getStats: async (): Promise<AutomationStatsOverview> => {
    try {
      const response = await api.get('/automations/stats/overview');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch automation stats:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch automation stats');
    }
  },
};

export default automationAPI;
