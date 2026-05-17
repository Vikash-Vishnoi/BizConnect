/**
 * 👤 Profile Page
 * 
 * Business profile management page for updating company information.
 * Includes navigation to WhatsApp credentials page.
 * 
 * @component
 * @requires authentication - User must be logged in
 * @requires businessId - User must have completed business setup
 * 
 * @features
 * - Business profile management (name, contact, address, industry)
 * - Form validation and error handling
 * - Auto-fetch current profile on mount
 * - Navigation to WhatsApp credentials page
 * 
 * @example
 * <Route path="/profile" element={<Profile />} />
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
import { MdSave, MdVpnKey } from 'react-icons/md';
import './Settings.css';

const Profile = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [businessData, setBusinessData] = useState({
    name: '',
    displayName: '',
    description: '',
    email: '',
    phoneNumber: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: '',
    industry: ''
  });

  useEffect(() => {
    if (user?.businessId) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user?.businessId]);

  const fetchProfile = async () => {
    if (!user?.businessId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await businessService.getBusinessById(user.businessId);
      const business = response.data || response;

      if (business) {
        setBusinessData({
          name: business.name || '',
          displayName: business.displayName || '',
          description: business.description || '',
          email: business.profile?.email || '',
          phoneNumber: business.profile?.phoneNumber || '',
          website: business.profile?.website || '',
          address: business.profile?.address || '',
          city: business.profile?.city || '',
          state: business.profile?.state || '',
          country: business.profile?.country || '',
          industry: business.industry || ''
        });
      }
    } catch (err) {
      console.error('Error fetching business profile:', err);
      toast.error('Failed to load business profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    if (!user?.businessId) {
      toast.error('Business setup required');
      return;
    }

    try {
      const profileData = {
        name: businessData.name,
        displayName: businessData.displayName,
        description: businessData.description,
        industry: businessData.industry,
        profile: {
          email: businessData.email,
          phoneNumber: businessData.phoneNumber,
          website: businessData.website,
          address: businessData.address,
          city: businessData.city,
          state: businessData.state,
          country: businessData.country
        }
      };

      await businessService.updateBusiness(user.businessId, profileData);
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMsg = err.response?.data?.error || 'Failed to update profile';
      toast.error(errorMsg);
    }
  };

  return (
    <div className="page-container">
      <Navbar />
      
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-text">
            <h1 className="page-title">Business Profile</h1>
            <p className="page-subtitle">Manage your business information</p>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton type="card" />
        ) : (
          <Card>
            <form onSubmit={handleSaveProfile} className="settings-form">
              <h2>Business Information</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Business Name *</label>
                  <Input
                    type="text"
                    value={businessData.name}
                    onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                    required
                    placeholder="Your registered business name"
                  />
                </div>
                <div className="form-group">
                  <label>Display Name</label>
                  <Input
                    type="text"
                    value={businessData.displayName}
                    onChange={(e) => setBusinessData({ ...businessData, displayName: e.target.value })}
                    placeholder="Your business name as customers will see it"
                  />
                </div>
              </div>

              <div className="form-group settings__form-group">
                <label>Business Description</label>
                <textarea
                  value={businessData.description}
                  onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
                  placeholder="Describe your business and services (shown in WhatsApp Business profile)"
                  rows="5"
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  {businessData.description?.length || 0} characters
                </small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <Input
                    type="email"
                    value={businessData.email}
                    onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <Input
                    type="tel"
                    value={businessData.phoneNumber}
                    onChange={(e) => setBusinessData({ ...businessData, phoneNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Website</label>
                <Input
                  type="url"
                  value={businessData.website}
                  onChange={(e) => setBusinessData({ ...businessData, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <Input
                  type="text"
                  value={businessData.address}
                  onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <Input
                    type="text"
                    value={businessData.city}
                    onChange={(e) => setBusinessData({ ...businessData, city: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <Input
                    type="text"
                    value={businessData.state}
                    onChange={(e) => setBusinessData({ ...businessData, state: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Country</label>
                  <Input
                    type="text"
                    value={businessData.country}
                    onChange={(e) => setBusinessData({ ...businessData, country: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Industry</label>
                  <select
                    value={businessData.industry}
                    onChange={(e) => setBusinessData({ ...businessData, industry: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Select Industry</option>
                    <option value="ecommerce">E-commerce</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                    <option value="banking">Banking & Finance</option>
                    <option value="logistics">Logistics</option>
                    <option value="hospitality">Hospitality</option>
                    <option value="retail">Retail</option>
                    <option value="technology">Technology</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <Button type="submit"><MdSave /> Save Profile</Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Profile;
