import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import * as businessService from '../../services/business/businessService';
import * as configService from '../../services/business/configService';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Card from '../../components/Card';
import Navbar from '../../components/Navbar';
import { MdCheckCircle, MdContentCopy, MdArrowBack } from 'react-icons/md';
import './BusinessSetupPart3.css';

const BusinessSetupPart3 = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [webhookData, setWebhookData] = useState(null);
  const [copiedField, setCopiedField] = useState('');
  
  // Individual webhook field subscriptions
  const [webhookFields, setWebhookFields] = useState({
    messages: false,
    message_template_status_update: false,
    message_template_quality_update: false,
    account_alerts: false,
    business_capability_update: false,
    phone_number_quality_update: false,
    message_echoes: false,
    flows: false,
    tracking_events: false,
    user_preferences: false
  });

  const handleFieldToggle = (field) => {
    setWebhookFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Required fields (Essential + Business Features)
  const requiredFields = [
    'messages',
    'message_template_status_update',
    'message_template_quality_update',
    'account_alerts',
    'business_capability_update',
    'phone_number_quality_update'
  ];

  // Check if all required fields are subscribed (optional fields can be skipped)
  const allRequiredFieldsSubscribed = requiredFields.every(field => webhookFields[field] === true);

  // Load webhook data
  useEffect(() => {
    console.log('🎬 Part 3 - useEffect triggered with user:', {
      hasUser: !!user,
      businessId: user?.businessId,
      userId: user?.id
    });
    
    const init = async () => {
      if (!user) {
        console.log('⏳ Part 3 - No user in context yet, waiting...');
        return; // Wait for user to load
      }
      
      if (!user.businessId) {
        console.log('❌ Part 3 - No businessId in user state, redirecting to Part 1');
        toast.error('Please complete business setup first.');
        navigate('/business/create');
        return;
      }
      
      try {
          // Fetch business data from backend to get webhook configuration
          console.log('🔍 Part 3 - Fetching business with ID:', user.businessId);
          const response = await businessService.getBusinessById(user.businessId);
          const business = response.data || response; // Handle wrapped response
          
          console.log('📦 Part 3 - Business response:', response);
          console.log('📦 Part 3 - Business extracted:', {
            exists: !!business,
            hasWhatsappConfig: !!business?.whatsappConfig,
            whatsappConfigKeys: business?.whatsappConfig ? Object.keys(business.whatsappConfig) : [],
            phoneNumberId: business?.whatsappConfig?.phoneNumberId,
            businessAccountId: business?.whatsappConfig?.businessAccountId,
            wabaId: business?.whatsappConfig?.wabaId
          });
          
          if (!business || !business.whatsappConfig) {
            console.log('❌ Part 3 - Business or whatsappConfig missing, redirecting to Part 2');
            toast.info('Please complete API credentials setup first.');
            navigate('/business/create/step2');
            return;
          }
          
          // Prepare webhook data from business configuration
          const parsedData = {
            phoneNumberId: business.whatsappConfig.phoneNumberId,
            businessAccountId: business.whatsappConfig.businessAccountId,
            appId: business.whatsappConfig.appId,
            verifyToken: business.whatsappConfig.verifyToken
          };
          
          // Fetch fresh webhook URL from backend config (uses .env WEBHOOK_URL)
          try {
            const webhookConfig = await configService.getWebhookUrl();
            if (webhookConfig.success && webhookConfig.webhookUrl) {
              parsedData.webhookUrl = webhookConfig.webhookUrl;
              console.log('✅ Loaded webhook URL from config:', parsedData.webhookUrl, `(source: ${webhookConfig.source})`);
            }
          } catch (error) {
            console.warn('⚠️ Failed to load webhook URL:', error);
          }
          
          setWebhookData(parsedData);
      } catch (error) {
        console.error('Failed to load business data:', error);
        toast.error('Failed to load webhook configuration');
      }
    };
    
    init();
  }, [user?.businessId, navigate, toast]);  // Re-run if businessId changes

  const copyToClipboard = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copied!`);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleComplete = async () => {
    if (!allRequiredFieldsSubscribed) {
      toast.error('Please confirm all required webhook fields are subscribed before proceeding');
      return;
    }
    
    try {
      // Mark webhook as configured in the database
      await businessService.completeWebhookSetup(user.businessId);
      
      // Clear all setup data now that everything is complete
      localStorage.removeItem('businessWebhookData');
      localStorage.removeItem('businessSetupPart1');
      localStorage.removeItem('registeredBusinessName');
      
      toast.success('🎉 Setup complete! Welcome to your dashboard!');
      
      // Use navigate instead of window.location.href for React Router
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing webhook setup:', error);
      toast.error('Failed to complete webhook setup. Please try again.');
    }
  };

  const handleBack = () => {
    navigate('/business/create/step2');
  };

  if (!webhookData) {
    return null;
  }

  return (
    <div className="setup-part3-page page-container">
      <Navbar />
      <div className="page-content setup-page">
        <Card className="setup-card">
          <div className="setup-header center">
            <h1>Webhook Configuration</h1>
            <p className="setup-description">Configure webhooks in Meta Developer Console to receive messages</p>
            <div className="progress-indicator">
              <div className="progress-step completed">
                <div className="step-circle"><MdCheckCircle size={24} /></div>
                <span>Business Info</span>
              </div>
              <div className="progress-line completed"></div>
              <div className="progress-step completed">
                <div className="step-circle"><MdCheckCircle size={24} /></div>
                <span>API Credentials</span>
              </div>
              <div className="progress-line completed"></div>
              <div className="progress-step active">
                <div className="step-circle">3</div>
                <span>Webhook Setup</span>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h2 className="section-title">Webhook Credentials</h2>
            </div>
            
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Webhook Callback URL *</label>
                <div className="input-with-button">
                  <Input
                    value={webhookData.webhookUrl}
                    readOnly
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="small"
                    onClick={() => copyToClipboard(webhookData.webhookUrl, 'Webhook URL')}
                  >
                    <MdContentCopy /> {copiedField === 'Webhook URL' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Verify Token *</label>
                <div className="input-with-button">
                  <Input
                    value={webhookData.verifyToken}
                    readOnly
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="small"
                    onClick={() => copyToClipboard(webhookData.verifyToken, 'Verify Token')}
                  >
                    <MdContentCopy /> {copiedField === 'Verify Token' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h2 className="section-title">Webhook Field Subscriptions</h2>
            </div>
            
            <div className="confirmation-checklist">
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', color: '#d32f2f', marginBottom: '0.75rem' }}>
                  ⚠️ Required Fields
                </h3>
                <label className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={webhookFields.messages}
                    onChange={() => handleFieldToggle('messages')}
                  />
                  <span>
                    <strong>messages</strong> - Receive and send messages, delivery status updates
                  </span>
                </label>

                <label className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={webhookFields.flows}
                    onChange={() => handleFieldToggle('flows')}
                  />
                  <span>
                    <strong>flows</strong> - Interactive form responses and flow completion
                  </span>
                </label>
                
                <label className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={webhookFields.tracking_events}
                    onChange={() => handleFieldToggle('tracking_events')}
                  />
                  <span>
                    <strong>tracking_events</strong> - Click tracking and interaction analytics
                  </span>
                </label>
                
                <label className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={webhookFields.user_preferences}
                    onChange={() => handleFieldToggle('user_preferences')}
                  />
                  <span>
                    <strong>user_preferences</strong> - User opt-in/out preference management
                  </span>
                </label>
                <label className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={webhookFields.message_template_status_update}
                    onChange={() => handleFieldToggle('message_template_status_update')}
                  />
                  <span>
                    <strong>message_template_status_update</strong> - Template approval notifications
                  </span>
                </label>
                
                <label className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={webhookFields.message_template_quality_update}
                    onChange={() => handleFieldToggle('message_template_quality_update')}
                  />
                  <span>
                    <strong>message_template_quality_update</strong> - Template quality scores
                  </span>
                </label>
                
                <label className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={webhookFields.account_alerts}
                    onChange={() => handleFieldToggle('account_alerts')}
                  />
                  <span>
                    <strong>account_alerts</strong> - Account issue and violation notifications
                  </span>
                </label>
                
                <label className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={webhookFields.phone_number_quality_update}
                    onChange={() => handleFieldToggle('phone_number_quality_update')}
                  />
                  <span>
                    <strong>phone_number_quality_update</strong> - Phone quality rating monitoring
                  </span>
                </label>
                
                <label className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={webhookFields.business_capability_update}
                    onChange={() => handleFieldToggle('business_capability_update')}
                  />
                  <span>
                    <strong>business_capability_update</strong> - Account capability restrictions
                  </span>
                </label>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', color: '#ff9800', marginBottom: '0.75rem' }}>
                  💡 Optional
                </h3>
                <label className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={webhookFields.message_echoes}
                    onChange={() => handleFieldToggle('message_echoes')}
                  />
                  <span>
                    <strong>message_echoes</strong> - Multi-channel message synchronization
                  </span>
                </label>
              </div>

            </div>
          </div>

          <div className="form-actions">
            <Button type="button" variant="outline" size="large" onClick={handleBack}>
              <MdArrowBack /> Back
            </Button>
            <Button 
              type="button" 
              variant="primary" 
              size="large" 
              onClick={handleComplete}
              disabled={!allRequiredFieldsSubscribed}
            >
              Complete Setup <MdCheckCircle />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BusinessSetupPart3;





