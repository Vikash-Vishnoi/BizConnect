/**
 * Business API Service
 * 
 * Handles all business-related API calls
 */

import api from './api';
import type {
  Business,
  CreateBusinessData,
  UpdateBusinessData,
  UpdateBusinessCredentialsData,
  AddTeamMemberData,
  UpdateTeamMemberData,
} from '../types/business';

export const businessAPI = {
  /**
   * Get all businesses for current user
   */
  getBusinesses: async (): Promise<Business[]> => {
    try {
      const response = await api.get('/business');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch businesses');
    }
  },

  /**
   * Get single business by ID
   */
  getBusiness: async (businessId: string): Promise<Business> => {
    try {
      const response = await api.get(`/business/${businessId}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch business');
    }
  },

  /**
   * Create new business
   */
  createBusiness: async (data: CreateBusinessData): Promise<Business> => {
    try {
      const response = await api.post('/business', data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create business');
    }
  },

  /**
   * Update business details
   */
  updateBusiness: async (businessId: string, data: UpdateBusinessData): Promise<Business> => {
    try {
      const response = await api.put(`/business/${businessId}`, data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update business');
    }
  },

  /**
   * Update business WhatsApp credentials
   */
  updateCredentials: async (businessId: string, data: UpdateBusinessCredentialsData): Promise<void> => {
    try {
      await api.put(`/business/${businessId}/credentials`, data);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update credentials');
    }
  },

  /**
   * DELETE endpoint disabled - businesses use soft delete (status='deleted')
   */
  // deleteBusiness: async (businessId: string): Promise<void> => {
  //   try {
  //     await api.delete(`/business/${businessId}`);
  //   } catch (error: any) {
  //     throw new Error(error.response?.data?.error || 'Failed to delete business');
  //   }
  // },

  /**
   * Add team member to business
   */
  addTeamMember: async (businessId: string, data: AddTeamMemberData): Promise<Business> => {
    try {
      const response = await api.post(`/business/${businessId}/team`, data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to add team member');
    }
  },

  /**
   * Update team member role/permissions
   */
  updateTeamMember: async (
    businessId: string,
    userId: string,
    data: UpdateTeamMemberData
  ): Promise<Business> => {
    try {
      const response = await api.put(`/business/${businessId}/team/${userId}`, data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update team member');
    }
  },

  /**
   * DELETE endpoint disabled - team members archived, not removed
   */
  // removeTeamMember: async (businessId: string, userId: string): Promise<void> => {
  //   try {
  //     await api.delete(`/business/${businessId}/team/${userId}`);
  //   } catch (error: any) {
  //     throw new Error(error.response?.data?.error || 'Failed to remove team member');
  //   }
  // },

  /**
   * Switch current business context
   */
  switchBusiness: async (businessId: string): Promise<{ businessId: string; name: string }> => {
    try {
      const response = await api.post(`/business/${businessId}/switch`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to switch business');
    }
  },

  /**
   * Check business API health
   */
  checkHealth: async (businessId: string): Promise<any> => {
    try {
      const response = await api.get(`/business/${businessId}/health`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to check business health');
    }
  },

  /**
   * Get business usage statistics
   */
  getUsage: async (businessId: string): Promise<any> => {
    try {
      const response = await api.get(`/business/${businessId}/usage`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch usage statistics');
    }
  },
};

export default businessAPI;
