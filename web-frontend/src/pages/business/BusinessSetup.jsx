/**
 * 🏢 Business Setup Component (Single-Page Version)
 * 
 * Comprehensive single-page business onboarding form.
 * Collects all business information and WhatsApp API credentials.
 * Alternative to the 3-part wizard flow (BusinessSetupPart1/2/3).
 * 
 * @component
 * @deprecated Consider using BusinessSetupPart1/2/3 for better UX
 * @requires react-router-dom - Navigation
 * @requires AuthContext - User state management
 * @requires Toast - Notifications
 * @requires businessService - Business creation API
 * 
 * @features
 * - Single-page business setup form
 * - Business information collection (14 fields)
 * - WhatsApp API credentials input
 * - Auto-generated webhook verify token
 * - Copy/regenerate verify token
 * - Form data auto-save to localStorage
 * - Pre-fill from registration data
 * - Comprehensive help documentation
 * - Send rate limit configuration
 * - Complete validation
 * 
 * @state
 * - loading: Form submission state
 * - error: Validation/API error messages
 * - formData: All business and API credential fields
 * 
 * @navigation
 * - /login: Redirects if no token
 * - /dashboard: Redirects on success
 * 
 * @localStorage
 * - businessSetupFormData: All form data persistence
 * - registeredBusinessName: Pre-fill from registration
 * - token: Authentication (should use STORAGE_KEYS)
 * 
 * @sections
 * 1. Business Information (11 fields)
 *    - Basic: name, displayName, description, industry
 *    - Contact: email, phoneNumber, website
 *    - Address: address, city, state, country
 * 2. WhatsApp API Credentials (6 fields)
 *    - phoneNumberId, accessToken, businessAccountId, appSecret
 *    - verifyToken (auto-generated), sendRate
 * 
 * @workflow
 * 1. Load saved form data from localStorage
 * 2. User fills all fields in single form
 * 3. Validate required fields
 * 4. Create business with businessService
 * 5. Update user context with businessId
 * 6. Clear localStorage and redirect to dashboard
 * 
 * @help
 * - Inline help for WhatsApp credentials
 * - Step-by-step Meta Developer Console guide
 * - Webhook configuration instructions
 * 
 * @todo Replace localStorage.getItem('token') with STORAGE_KEYS
 * @todo Extract verify token generation to utility
 * @todo Add credential test before submission
 * @todo Consider migration notice to 3-part wizard
 * 
 * @example
 * <Route path="/business/setup" element={<BusinessSetup />} />
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import * as businessService from '../../services/business/businessService';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { STORAGE_KEYS } from '../../config/constants';
import './BusinessSetup.css';

/**
 * Business setup form configuration
 */
const SETUP_CONFIG = {
  FORM_STORAGE_KEY: 'businessSetupFormData',
  BUSINESS_NAME_KEY: 'registeredBusinessName',
  DEFAULT_SEND_RATE: 70,
  MIN_SEND_RATE: 1,
  MAX_SEND_RATE: 80
};

/**
 * Generate secure webhook verify token
 * @returns {string} Secure random token with timestamp
 */
const generateVerifyToken = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `verify_${timestamp}_${random}`;
};

const BusinessSetup = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  /**
   * Load form data from localStorage with fallbacks
   * Pre-fills business name from registration if available
   */
  const loadFormData = () => {
    const savedData = localStorage.getItem(SETUP_CONFIG.FORM_STORAGE_KEY);
    const businessName = localStorage.getItem(SETUP_CONFIG.BUSINESS_NAME_KEY);
    
    if (savedData) {
      const parsed = JSON.parse(savedData);
      // If business name from registration is newer, use it
      if (businessName && !parsed.name) {
        parsed.name = businessName;
      }
      return parsed;
    }
    
    // Default form data with auto-generated verify token
    return {
      name: businessName || '',
      displayName: '',
      description: '',
      email: '',
      phoneNumber: '',
      website: '',
      address: '',
      city: '',
      state: '',
      country: '',
      industry: '',
      phoneNumberId: '',
      accessToken: '',
      businessAccountId: '',
      appSecret: '',
      verifyToken: generateVerifyToken(),
      sendRate: SETUP_CONFIG.DEFAULT_SEND_RATE
    };
  };
  
  const [formData, setFormData] = useState(loadFormData);

  // NOTE: Removed the redirect check for existing business
  // Backend now handles all setup flow redirects via login/auth/me endpoints
  
  /**
   * Save form data to localStorage whenever it changes
   * Provides persistence across page reloads
   */
  useEffect(() => {
    localStorage.setItem(SETUP_CONFIG.FORM_STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);
  
  /**
   * Load business name from localStorage on mount
   * Pre-fills from registration data if available
   */
  useEffect(() => {
    const businessName = localStorage.getItem(SETUP_CONFIG.BUSINESS_NAME_KEY);
    if (businessName && !formData.name) {
      setFormData(prev => ({ ...prev, name: businessName }));
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  /**
   * Handle form submission
   * Validates fields, creates business, updates user context
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        setError('Business name is required');
        toast.error('Business name is required');
        setLoading(false);
        return;
      }

      if (!formData.phoneNumberId.trim() || !formData.accessToken.trim() || 
          !formData.businessAccountId.trim() || !formData.appSecret.trim()) {
        setError('All WhatsApp API credentials are required');
        toast.error('Please fill in all WhatsApp API credentials');
        setLoading(false);
        return;
      }

      // Create business with all data
      const response = await businessService.createBusiness({
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description,
        industry: formData.industry,
        website: formData.website,
        whatsappConfig: {
          phoneNumberId: formData.phoneNumberId,
          phoneNumber: formData.phoneNumber || '',
          wabaId: formData.businessAccountId,
          accessToken: formData.accessToken,
          appSecret: formData.appSecret,
          verifyToken: formData.verifyToken
        },
        apiConfig: {
          sendRate: formData.sendRate
        },
        profile: {
          email: formData.email,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country
        }
      });
      
      // Update user context with new business
      await updateUser({ businessId: response.business._id });
      
      // Clear saved form data and business name after successful setup
      localStorage.removeItem(SETUP_CONFIG.FORM_STORAGE_KEY);
      localStorage.removeItem(SETUP_CONFIG.BUSINESS_NAME_KEY);
      
      toast.success('🎉 Business setup complete! Welcome aboard!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error setting up business:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to setup business. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    toast.error('Business setup is required to access the platform');
  };

  return (
    <div className="business-setup-container">
      <div className="business-setup-content">
        <div className="setup-header">
          <h1>🚀 Complete Your Business Setup</h1>
          <p>Set up your WhatsApp Business to unlock all features and start messaging customers</p>
        </div>

        <Card className="setup-card">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="error-message">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Business Information Section */}
            <div className="form-section">
              <h3>📋 Business Information</h3>
              <p className="section-help">Tell us about your business</p>

              <div className="form-row">
                <div className="form-group">
                  <Input
                    label="Business Name *"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your registered business name"
                    required
                  />
                </div>
                <div className="form-group">
                  <Input
                    label="Display Name"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    placeholder="How customers see your business"
                  />
                </div>
              </div>

              <Input
                label="Business Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your business and services"
              />

              <div className="form-row">
                <div className="form-group">
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="business@example.com"
                  />
                </div>
                <div className="form-group">
                  <Input
                    label="Phone Number"
                    name="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <Input
                label="Website"
                name="website"
                type="url"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://yourwebsite.com"
              />

              <Input
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address"
              />

              <div className="form-row">
                <div className="form-group">
                  <Input
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                  />
                </div>
                <div className="form-group">
                  <Input
                    label="State"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="State/Province"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <Input
                    label="Country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="Country"
                  />
                </div>
                <div className="form-group">
                  <label>Industry</label>
                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
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
            </div>

            {/* WhatsApp API Credentials Section */}
            <div className="form-section">
              <h3>💼 WhatsApp Business API Credentials</h3>
              <div className="credentials-help">
                <div className="help-header">
                  <strong>📖 How to Get Your Credentials:</strong>
                </div>
                <ol className="help-steps">
                  <li>
                    <strong>Step 1:</strong> Go to <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer">Meta Developer Console</a>
                  </li>
                  <li>
                    <strong>Step 2:</strong> Create a Business App or use existing one
                  </li>
                  <li>
                    <strong>Step 3:</strong> Add WhatsApp product to your app
                  </li>
                  <li>
                    <strong>Step 4:</strong> Get these credentials:
                    <ul>
                      <li><strong>Phone Number ID:</strong> From API Setup → Phone Numbers</li>
                      <li><strong>Access Token:</strong> From API Setup → Generate permanent token</li>
                      <li><strong>Business Account ID:</strong> From Settings → WhatsApp Business Account ID</li>
                      <li><strong>App Secret:</strong> From App Settings → Basic → App Secret</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Step 5:</strong> Configure Webhook:
                    <ul>
                      <li><strong>Callback URL:</strong> <code>https://your-domain.com/api/webhooks/whatsapp</code></li>
                      <li><strong>Verify Token:</strong> Copy the auto-generated secure token below (read-only for security)</li>
                      <li><strong>Subscribe to:</strong> messages, message_status, message_template_status_update</li>
                    </ul>
                  </li>
                </ol>
                <div className="help-note">
                  <strong>⚠️ Important:</strong> After saving these credentials, you MUST configure the webhook in Meta Developer Console with the same verify token, otherwise you won't receive messages!
                </div>
              </div>

              <Input
                label="Phone Number ID *"
                name="phoneNumberId"
                value={formData.phoneNumberId}
                onChange={handleChange}
                placeholder="e.g., 123456789012345"
                required
              />

              <Input
                label="Access Token *"
                name="accessToken"
                type="password"
                value={formData.accessToken}
                onChange={handleChange}
                placeholder="Permanent Access Token from Meta Business Suite"
                required
              />

              <Input
                label="Business Account ID (WABA) *"
                name="businessAccountId"
                value={formData.businessAccountId}
                onChange={handleChange}
                placeholder="WhatsApp Business Account ID from Meta"
                required
              />

              <Input
                label="App Secret *"
                name="appSecret"
                type="password"
                value={formData.appSecret}
                onChange={handleChange}
                placeholder="App Secret from Meta Developer Console"
                required
              />

              <div className="form-group">
                <label>Webhook Verify Token (Auto-Generated) *</label>
                <div className="verify-token-group">
                  <Input
                    name="verifyToken"
                    type="text"
                    value={formData.verifyToken}
                    readOnly
                    placeholder="Auto-generated secure token"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(formData.verifyToken);
                      toast.success('✅ Verify token copied to clipboard!');
                    }}
                  >
                    📋 Copy
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      const newToken = generateVerifyToken();
                      setFormData({ ...formData, verifyToken: newToken });
                      toast.info('🔄 New verify token generated');
                    }}
                  >
                    🔄 Regenerate
                  </Button>
                </div>
                <small className="form-help">
                  ⚠️ <strong>Important:</strong> Copy this token and paste it in Meta Developer Console → Webhooks → Verify Token. This is auto-generated for security.
                </small>
              </div>

              <Input
                label="Send Rate Limit (messages/minute)"
                name="sendRate"
                type="number"
                min="1"
                max="80"
                value={formData.sendRate}
                onChange={handleChange}
                helperText="Recommended: 70-80 for verified numbers, 20-30 for new numbers"
              />
            </div>

            <div className="form-actions">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading ? 'Setting Up...' : '✨ Complete Setup & Continue'}
              </Button>
            </div>
          </form>
        </Card>

        <div className="setup-help">
          <h4>📖 Need Help?</h4>
          <p>
            Don't have WhatsApp Business API credentials? 
            <a href="https://business.whatsapp.com" target="_blank" rel="noopener noreferrer">
              Learn how to get started
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BusinessSetup;





