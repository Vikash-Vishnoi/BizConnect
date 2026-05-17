/**
 * 🔑 WhatsApp Credentials Page
 * 
 * Dedicated page for managing WhatsApp Business API credentials
 * and configuration settings.
 * 
 * @component
 * @requires authentication - User must be logged in
 * @requires businessId - User must have completed business setup
 * 
 * @features
 * - WhatsApp API credentials management
 * - Access token and app secret configuration
 * - Webhook verify token setup
 * - Phone number and business account ID
 * - Send rate limit configuration
 * - Password-protected sensitive fields
 * 
 * @example
 * <Route path="/settings/credentials" element={<WhatsAppCredentials />} />
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import * as businessService from '../../services/business/businessService';
import { MdSave } from 'react-icons/md';
import './Settings.css';

const WhatsAppCredentials = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [originalCredentials, setOriginalCredentials] = useState({});
  
  const [credentials, setCredentials] = useState({
    accessToken: '',
    appSecret: '',
    verifyToken: '',
    phoneNumberId: '',
    wabaId: ''
  });

  useEffect(() => {
    if (user?.businessId) {
      fetchCredentials();
    } else {
      setLoading(false);
    }
  }, [user?.businessId]);

  const fetchCredentials = async () => {
    if (!user?.businessId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await businessService.getBusinessById(user.businessId);
      const business = response.data || response;

      if (business?.whatsappConfig) {
        const fetchedCredentials = {
          accessToken: business.whatsappConfig.accessToken || '',
          appSecret: business.whatsappConfig.appSecret || '',
          verifyToken: business.whatsappConfig.verifyToken || '',
          phoneNumberId: business.whatsappConfig.phoneNumberId || '',
          wabaId: business.whatsappConfig.wabaId || ''
        };
        setCredentials(fetchedCredentials);
        setOriginalCredentials(fetchedCredentials);
      }
    } catch (err) {
      console.error('Error fetching credentials:', err);
      toast.error('Failed to load WhatsApp credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    
    if (!user?.businessId) {
      toast.error('Business setup required');
      return;
    }

    try {
      // Only send changed fields
      const changedFields = {};
      Object.keys(credentials).forEach(key => {
        if (credentials[key] !== originalCredentials[key] && credentials[key] !== '') {
          changedFields[key] = credentials[key];
        }
      });

      if (Object.keys(changedFields).length === 0) {
        toast.info('No changes to save');
        return;
      }

      const credentialsData = {
        whatsappConfig: changedFields
      };

      await businessService.updateBusiness(user.businessId, credentialsData);
      toast.success('WhatsApp credentials updated successfully');
      
      // Update original credentials after successful save
      setOriginalCredentials(credentials);
    } catch (err) {
      console.error('Error updating credentials:', err);
      const errorMsg = err.response?.data?.error || 'Failed to update credentials';
      toast.error(errorMsg);
    }
  };

  return (
    <div className="page-container">
      <Navbar />
      
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-text">
            <h1 className="page-title">WhatsApp API Credentials</h1>
            <p className="page-subtitle">Configure your WhatsApp Business API settings</p>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton type="card" />
        ) : (
          <Card>
            <form onSubmit={handleSaveCredentials} className="settings-form">
              <h2>API Configuration</h2>
              
              <div className="form-group">
                <label>Access Token</label>
                <Input
                  type="password"
                  value={credentials.accessToken}
                  onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
                  placeholder="Your WhatsApp Business API access token"
                />
              </div>

              <div className="form-group">
                <label>App Secret</label>
                <Input
                  type="password"
                  value={credentials.appSecret}
                  onChange={(e) => setCredentials({ ...credentials, appSecret: e.target.value })}
                  placeholder="Your app secret key"
                />
              </div>

              <div className="form-group">
                <label>Webhook Verify Token</label>
                <Input
                  type="password"
                  value={credentials.verifyToken}
                  onChange={(e) => setCredentials({ ...credentials, verifyToken: e.target.value })}
                  placeholder="Your webhook verification token"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number ID</label>
                  <Input
                    type="text"
                    value={credentials.phoneNumberId}
                    onChange={(e) => setCredentials({ ...credentials, phoneNumberId: e.target.value })}
                    placeholder="123456789012345"
                  />
                </div>
                <div className="form-group">
                  <label>WhatsApp Business Account ID (WABA ID)</label>
                  <Input
                    type="text"
                    value={credentials.wabaId}
                    onChange={(e) => setCredentials({ ...credentials, wabaId: e.target.value })}
                    placeholder="123456789012345"
                  />
                </div>
              </div>

              <div className="form-actions">
                <Button type="submit"><MdSave /> Save Credentials</Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
};

export default WhatsAppCredentials;
