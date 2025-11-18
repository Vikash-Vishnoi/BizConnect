/**
 * Business Context
 * 
 * Manages current business and business switching for multi-business support
 */

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

      // Fetch user data to get businesses
      const user = await authAPI.me();
      
      if (!user.businesses || user.businesses.length === 0) {
        setBusinesses([]);
        setCurrentBusiness(null);
        setLoading(false);
        return;
      }

      // Fetch full business details
      const businessList = await businessAPI.getBusinesses();
      setBusinesses(businessList);

      // Set current business
      let currentBusinessId = await AsyncStorage.getItem('currentBusinessId');
      
      // If no current business set, use user's currentBusiness or first business
      if (!currentBusinessId && user.currentBusiness) {
        currentBusinessId = user.currentBusiness;
      } else if (!currentBusinessId && businessList.length > 0) {
        currentBusinessId = businessList[0]._id;
      }

      if (currentBusinessId) {
        const current = businessList.find(b => b._id === currentBusinessId);
        if (current) {
          setCurrentBusiness(current);
          await AsyncStorage.setItem('currentBusinessId', current._id);
        } else {
          // Current business not found, use first business
          setCurrentBusiness(businessList[0]);
          await AsyncStorage.setItem('currentBusinessId', businessList[0]._id);
        }
      }
    } catch (err: any) {
      console.error('Error loading businesses:', err);
      setError(err.message || 'Failed to load businesses');
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
      
      // Call API to switch business (updates user's currentBusiness)
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
   * Delete business
   */
  const deleteBusiness = async (businessId: string) => {
    try {
      setError(null);
      await businessAPI.deleteBusiness(businessId);
      
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
