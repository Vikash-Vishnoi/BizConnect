// Business Context - Multi-business management and switching

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Business, BusinessContextValue, CreateBusinessData, UpdateBusinessData } from '../types/business';
import { businessAPI } from '../services/businessService';
import { authAPI } from '../services/api';

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

interface BusinessProviderProps {
  children: ReactNode;
}

export const BusinessProvider: React.FC<BusinessProviderProps> = ({ children }) => {
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load businesses and set current business
   */
  const loadBusinesses = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        // User not logged in, skip loading businesses
        setBusinesses([]);
        setCurrentBusiness(null);
        setLoading(false);
        return;
      }

      // Fetch user data to get businessId
      const user = await authAPI.me();
      
      // For super_admin, fetch all businesses; for others, just their business
      let businessList: Business[] = [];
      
      if (user.userType === 'super_admin') {
        businessList = await businessAPI.getBusinesses();
      } else if (user.businessId) {
        // Non-super_admin users only have access to their single business
        const business = await businessAPI.getBusiness(user.businessId);
        businessList = [business];
      } else {
        // No business assigned
        setBusinesses([]);
        setCurrentBusiness(null);
        setLoading(false);
        return;
      }
      
      setBusinesses(businessList);

      // Set current business
      let currentBusinessId = await AsyncStorage.getItem('currentBusinessId');
      
      // If no current business set, use user's businessId or first business
      if (!currentBusinessId && user.businessId) {
        currentBusinessId = user.businessId;
      } else if (!currentBusinessId && businessList.length > 0) {
        currentBusinessId = businessList[0]._id;
      }

      if (currentBusinessId) {
        const current = businessList.find(b => b._id === currentBusinessId);
        if (current) {
          setCurrentBusiness(current);
          await AsyncStorage.setItem('currentBusinessId', current._id);
        } else if (businessList.length > 0) {
          // Current business not found, use first business
          setCurrentBusiness(businessList[0]);
          await AsyncStorage.setItem('currentBusinessId', businessList[0]._id);
        }
      }
    } catch (err: any) {
      console.error('Error loading businesses:', err);
      // Don't set error for authentication issues
      if (err.message !== 'Failed to fetch user data') {
        setError(err.message || 'Failed to load businesses');
      }
      // Clear businesses on error
      setBusinesses([]);
      setCurrentBusiness(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Switch to different business
   */
  const switchBusiness = async (businessId: string) => {
    try {
      setError(null);
      
      // Get current user to check if they're super_admin
      const user = await authAPI.me();
      
      // Only super_admin can switch businesses
      if (user.userType !== 'super_admin') {
        throw new Error('Only super admins can switch between businesses');
      }
      
      // Call API to switch business (updates user's businessId)
      await businessAPI.switchBusiness(businessId);
      
      // Update local storage
      await AsyncStorage.setItem('currentBusinessId', businessId);
      
      // Update current business in state
      const business = businesses.find(b => b._id === businessId);
      if (business) {
        setCurrentBusiness(business);
      }
    } catch (err: any) {
      console.error('Error switching business:', err);
      setError(err.message || 'Failed to switch business');
      throw err;
    }
  };

  /**
   * Refresh businesses list
   */
  const refreshBusinesses = async () => {
    await loadBusinesses();
  };

  /**
   * Create new business
   */
  const createBusiness = async (data: CreateBusinessData): Promise<Business> => {
    try {
      setError(null);
      const newBusiness = await businessAPI.createBusiness(data);
      
      // Refresh businesses list
      await refreshBusinesses();
      
      // Switch to new business
      await switchBusiness(newBusiness._id);
      
      return newBusiness;
    } catch (err: any) {
      console.error('Error creating business:', err);
      setError(err.message || 'Failed to create business');
      throw err;
    }
  };

  /**
   * Update business
   */
  const updateBusiness = async (businessId: string, data: UpdateBusinessData): Promise<Business> => {
    try {
      setError(null);
      const updatedBusiness = await businessAPI.updateBusiness(businessId, data);
      
      // Update in businesses list
      setBusinesses(prev => 
        prev.map(b => b._id === businessId ? updatedBusiness : b)
      );
      
      // Update current business if it's the one being updated
      if (currentBusiness?._id === businessId) {
        setCurrentBusiness(updatedBusiness);
      }
      
      return updatedBusiness;
    } catch (err: any) {
      console.error('Error updating business:', err);
      setError(err.message || 'Failed to update business');
      throw err;
    }
  };

  /**
   * Delete business (soft delete - updates status to 'deleted')
   * Note: Hard delete API is disabled. This uses soft delete via update.
   */
  const deleteBusiness = async (businessId: string) => {
    try {
      setError(null);
      
      // Soft delete by updating status
      await businessAPI.updateBusiness(businessId, { status: 'deleted' } as any);
      
      // Remove from businesses list
      setBusinesses(prev => prev.filter(b => b._id !== businessId));
      
      // If deleting current business, switch to another one
      if (currentBusiness?._id === businessId) {
        const remainingBusinesses = businesses.filter(b => b._id !== businessId);
        if (remainingBusinesses.length > 0) {
          await switchBusiness(remainingBusinesses[0]._id);
        } else {
          setCurrentBusiness(null);
          await AsyncStorage.removeItem('currentBusinessId');
        }
      }
    } catch (err: any) {
      console.error('Error deleting business:', err);
      setError(err.message || 'Failed to delete business');
      throw err;
    }
  };

  // Load businesses on mount
  useEffect(() => {
    loadBusinesses();
  }, []);

  const value: BusinessContextValue = {
    currentBusiness,
    businesses,
    loading,
    error,
    switchBusiness,
    refreshBusinesses,
    createBusiness,
    updateBusiness,
    deleteBusiness,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};

/**
 * Hook to use business context
 */
export const useBusiness = (): BusinessContextValue => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within BusinessProvider');
  }
  return context;
};

export default BusinessContext;
