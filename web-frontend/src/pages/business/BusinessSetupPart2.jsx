/**
 * 🔐 Business Setup Part 2 Component
 * 
 * Second step of 3-part business onboarding wizard.
 * Collects and validates WhatsApp Business API credentials.
 * Creates business record and prepares for webhook configuration.
 * 
 * @component
 * @requires react-router-dom - Navigation
 * @requires AuthContext - User state management
 * @requires Toast - Notifications
 * @requires businessService - Business CRUD APIs
 * @requires configService - Webhook configuration
 * 
 * @features
 * - WhatsApp API credential collection (Phone Number ID, Access Token, WABA ID, App Secret)
 * - Real-time credential validation via Meta Graph API
 * - Verified business name display
 * - Business creation with Part 1 data
 * - Webhook configuration preparation
 * - Progress indicator (Step 2 of 3)
 * - Back navigation to Part 1
 * - Error handling with detailed messages
 * 
 * @state
 * - loading: API call state
 * - error: Validation/API error messages
 * - formData: API credentials (4 fields)
 * 
 * @navigation
 * - Requires: Part 1 data in localStorage
 * - Back: /business/create (Part 1)
 * - Next: /business/create/step3 (Part 3 - Webhook)
 * - Alt: /dashboard (if business already configured)
 * 
 * @localStorage
 * - businessSetupPart1: Part 1 form data (required)
 * - businessWebhookData: Webhook config for Part 3
 * - registeredBusinessName: Cleanup after success
 * 
 * @workflow
 * 1. Load Part 1 data from localStorage
 * 2. User enters WhatsApp API credentials
 * 3. Validate credentials with Meta Graph API
 * 4. Create business with combined data
 * 5. Fetch webhook URL from backend config
 * 6. Save webhook data for Part 3
 * 7. Update user context with businessId
 * 8. Navigate to Part 3 (webhook setup)
 * 
 * @validation
 * - Tests credentials against https://graph.facebook.com/v21.0/{phoneNumberId}
 * - Returns verified business name on success
 * - Provides specific error messages for 401, 403, 404 responses
 * 
 * @todo Extract API version to constant
 * @todo Add credential test button before submission
 * @todo Add help links for obtaining credentials
 * 
 * @example
 * <Route path="/business/create/step2" element={<BusinessSetupPart2 />} />
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import * as businessService from '../../services/business/businessService';
import * as configService from '../../services/business/configService';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import { MdVpnKey, MdCheckCircle, MdArrowBack, MdArrowForward } from 'react-icons/md';
import './BusinessSetupPart2.css';

/**
 * WhatsApp Business API configuration constants
 */
const WHATSAPP_API_CONFIG = {
  GRAPH_API_VERSION: 'v21.0',
  GRAPH_API_BASE_URL: 'https://graph.facebook.com'
};

const BusinessSetupPart2 = () => {
  const navigate = useNavigate();
  const { user, updateUser, refreshUserProfile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    phoneNumberId: '',
    accessToken: '',
    businessAccountId: '',
    appSecret: ''
  });

  // No redirect check - handled by login/dashboard

  // Check if Part 1 data exists
  useEffect(() => {
    // Skip this check if user already has a business
    if (user?.businessId) {
      return;
    }
    
    const part1Data = localStorage.getItem('businessSetupPart1');
    if (!part1Data) {
      toast.error('Please complete business information first');
      navigate('/business/create');
    }
  }, [user, navigate, toast]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleBack = () => {
    navigate('/business/create');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) {
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.phoneNumberId.trim() || !formData.accessToken.trim() || 
          !formData.businessAccountId.trim() || !formData.appSecret.trim()) {
        setError('All WhatsApp API credentials are required');
        toast.error('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Validate credentials with WhatsApp API
      toast.info('Validating credentials...');
      const testUrl = `${WHATSAPP_API_CONFIG.GRAPH_API_BASE_URL}/${WHATSAPP_API_CONFIG.GRAPH_API_VERSION}/${formData.phoneNumberId}`;
      const validationResponse = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${formData.accessToken}`
        }
      });

      if (!validationResponse.ok) {
        const errorData = await validationResponse.json();
        let errorMessage = 'Validation failed';
        
        if (validationResponse.status === 401 || validationResponse.status === 403) {
          errorMessage = 'Access Token is invalid or expired.';
        } else if (validationResponse.status === 404) {
          errorMessage = 'Phone Number ID not found. Please check if it\'s correct.';
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else {
          errorMessage = 'Invalid credentials. Please verify all credentials are correct.';
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      const validationData = await validationResponse.json();
      let verifiedName = '';
      if (validationData.verified_name) {
        verifiedName = validationData.verified_name;
        toast.success(`✓ Connected to: ${verifiedName}`);
      }

      // Get Part 1 data
      const part1Data = JSON.parse(localStorage.getItem('businessSetupPart1'));

      // Create business with all data - only include non-empty values
      const businessData = {
        name: part1Data.name,
        ...(part1Data.displayName && { displayName: part1Data.displayName }),
        ...(part1Data.description && { description: part1Data.description }),
        ...(part1Data.industry && { industry: part1Data.industry }),
        ...(part1Data.website && { website: part1Data.website }),
        whatsappConfig: {
          phoneNumberId: formData.phoneNumberId,
          phoneNumber: part1Data.phoneNumber || '',
          wabaId: formData.businessAccountId,
          accessToken: formData.accessToken,
          appSecret: formData.appSecret
        },
        profile: {
          ...(part1Data.email && { email: part1Data.email }),
          ...(part1Data.address && { address: part1Data.address }),
          ...(part1Data.city && { city: part1Data.city }),
          ...(part1Data.state && { state: part1Data.state }),
          ...(part1Data.country && { country: part1Data.country })
        }
      };
      
      console.log('Sending business data:', businessData);
      toast.info('Creating your business...');
      
      const response = await businessService.createBusiness(businessData);
      
      console.log('✅ Business response received:', response);
      console.log('✅ Response keys:', Object.keys(response));
      
      // Check if this is an existing business
      const isExisting = response.isExisting || false;
      const setupStatus = response.setupStatus || {};
      
      // Get webhook data from response
      const business = response.data?.business || response.business;
      
      console.log('✅ Is existing business:', isExisting);
      console.log('✅ Setup status:', setupStatus);
      console.log('✅ Business data:', business);
      console.log('✅ Webhook configured:', business?.whatsappConfig?.webhookConfigured);
      
      // If business is fully configured (setupStep === 4), redirect to dashboard
      if (isExisting && setupStatus.isFullyConfigured) {
        console.log('✅ Business fully configured (setupStep=4). Redirecting to dashboard...');
        updateUser({ businessId: business._id });
        await refreshUserProfile();
        localStorage.removeItem('businessSetupPart1');
        localStorage.removeItem('businessWebhookData');
        localStorage.removeItem('registeredBusinessName');
        toast.success('✅ Business already configured! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
        return;
      }
      
      // If setupStep >= 3, continue to webhook setup (Part 3)
      if (isExisting && setupStatus.setupStep >= 3) {
        console.log(`✅ Setup step ${setupStatus.setupStep}, proceeding to Part 3 (webhook setup)...`);
        // Continue to webhook setup below
      }
      
      // Fetch webhook URL from backend configuration (uses WEBHOOK_URL from .env)
      let webhookUrl;
      try {
        const webhookConfig = await configService.getWebhookUrl();
        if (webhookConfig.success && webhookConfig.webhookUrl) {
          webhookUrl = webhookConfig.webhookUrl;
          console.log('✅ Fetched webhook URL from config:', webhookUrl, `(source: ${webhookConfig.source})`);
        } else {
          throw new Error('Invalid webhook config response');
        }
      } catch (webhookError) {
        console.error('❌ Failed to fetch webhook URL from config:', webhookError);
        toast.error('Failed to retrieve webhook configuration. Please check backend settings.');
        throw new Error('Webhook configuration unavailable');
      }
      
      const verifyToken = business.whatsappConfig?.verifyToken;
      
      if (!verifyToken) {
        throw new Error('Verify token not returned from server');
      }
      
      // Save webhook data for Part 3
      const webhookData = {
        webhookUrl,
        verifyToken,
        appSecret: formData.appSecret,
        businessId: business._id
      };
      localStorage.setItem('businessWebhookData', JSON.stringify(webhookData));
      
      // Update user in localStorage
      updateUser({ businessId: business._id });
      
      // Refresh user profile from backend
      await refreshUserProfile();
      
      // DON'T clear Part 1 data yet - keep it for back button navigation
      // localStorage.removeItem('businessSetupPart1');
      localStorage.removeItem('registeredBusinessName');
      
      if (isExisting) {
        toast.success('✅ Business found! Continuing with webhook setup...');
      } else {
        toast.success('✅ Business created successfully!');
      }
      
      // Navigate to Part 3
      console.log('🚀 Part 2 - Navigating to Part 3 with user state:', {
        userId: user?.id,
        businessId: user?.businessId,
        updatedBusinessId: business._id
      });
      
      setTimeout(() => {
        console.log('⏰ Part 2 - 500ms timeout complete, executing navigate to step3');
        navigate('/business/create/step3');
      }, 500);
      
    } catch (err) {
      console.error('Error setting up business:', err);
      
      let errorMsg = 'Failed to setup business. Please try again.';
      
      // Check for validation errors with details
      if (err.response?.data?.details) {
        const details = err.response.data.details;
        // details might be a string or an array
        if (Array.isArray(details)) {
          errorMsg = `Validation failed: ${details.map(d => `${d.field}: ${d.message}`).join(', ')}`;
        } else if (typeof details === 'string') {
          errorMsg = details;
        }
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-part2-page page-container">
      <Navbar />
      <div className="page-content setup-page">
        <Card className="setup-card">
          <div className="setup-header center">
            <h1>WhatsApp API Credentials</h1>
            <p className="setup-description">Connect your WhatsApp Business Account to start messaging your customers</p>
            <div className="progress-indicator">
              <div className="progress-step completed">
                <div className="step-circle"><MdCheckCircle size={24} /></div>
                <span>Business Info</span>
              </div>
              <div className="progress-line completed"></div>
              <div className="progress-step active">
                <div className="step-circle">2</div>
                <span>API Credentials</span>
              </div>
              <div className="progress-line"></div>
              <div className="progress-step">
                <div className="step-circle">3</div>
                <span>Webhook Setup</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="section-header">
              <h2 className="section-title">WhatsApp Business API Credentials</h2>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Phone Number ID *</label>
                <Input
                  name="phoneNumberId"
                  value={formData.phoneNumberId}
                  onChange={handleChange}
                  placeholder="123456789012345"
                  required
                />
              </div>

              <div className="form-group">
                <label>Business Account ID (WABA) *</label>
                <Input
                  name="businessAccountId"
                  value={formData.businessAccountId}
                  onChange={handleChange}
                  placeholder="987654321098765"
                  required
                />
              </div>

              <div className="form-group">
                <label>Access Token *</label>
                <Input
                  name="accessToken"
                  type="password"
                  value={formData.accessToken}
                  onChange={handleChange}
                  placeholder="Enter your permanent system user token"
                  required
                />
              </div>

              <div className="form-group">
                <label>App Secret *</label>
                <Input
                  name="appSecret"
                  type="password"
                  value={formData.appSecret}
                  onChange={handleChange}
                  placeholder="Enter your app secret"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <Button type="button" variant="outline" size="large" onClick={handleBack}>
              <MdArrowBack /> Back
            </Button>
            <Button type="submit" variant="primary" size="large" disabled={loading}>
              {loading ? 'Validating & Creating...' : 'Next'} <MdArrowForward />
            </Button>
          </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default BusinessSetupPart2;





