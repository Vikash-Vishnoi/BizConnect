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
import { MdBusiness, MdRefresh, MdSave, MdVpnKey } from 'react-icons/md';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('business');
  
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

  // WhatsApp credentials state
  const [credentials, setCredentials] = useState({
    accessToken: '',
    appSecret: '',
    verifyToken: '',
    sendRate: 80,
    phoneNumberId: '',
    businessAccountId: ''
  });
  const [regeneratingToken, setRegeneratingToken] = useState(false);

  useEffect(() => {
    if (user?.businessId) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [user?.businessId]);

  const fetchSettings = async () => {
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

        // Set WhatsApp credentials if available
        if (business.whatsappConfig) {
          setCredentials(prev => ({
            ...prev,
            phoneNumberId: business.whatsappConfig.phoneNumberId || '',
            businessAccountId: business.whatsappConfig.wabaId || '',
            sendRate: business.whatsappConfig.sendRate || 80
          }));
        }
      }
    } catch (err) {
      console.error('Settings fetch error:', err);
      // Don't show error if user simply doesn't have a business yet (404 or validation error)
      if (err.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else if (err.response?.status !== 404 && err.response?.status !== 400) {
        toast.error('Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBusinessInfo = async (e) => {
    e.preventDefault();
    
    if (!user?.businessId) {
      toast.error('Please complete business setup first');
      navigate('/business/create');
      return;
    }
    
    try {
      await businessService.updateBusiness(user.businessId, businessData);
      toast.success('✅ Business information updated successfully');
    } catch (err) {
      console.error('Update error:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to save business information';
      toast.error(errorMsg);
    }
  };

  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    
    if (!user?.businessId) {
      toast.error('Please complete business setup first');
      navigate('/business/create');
      return;
    }
    
    if (!credentials.accessToken.trim() && !credentials.appSecret.trim() && !credentials.verifyToken.trim()) {
      toast.error('Please enter at least one credential to update');
      return;
    }

    try {
      await businessService.updateCredentials(user.businessId, {
        accessToken: credentials.accessToken.trim() || undefined,
        appSecret: credentials.appSecret.trim() || undefined,
        verifyToken: credentials.verifyToken.trim() || undefined
      });
      await businessService.updateBusiness(user.businessId, { 
        apiConfig: { sendRate: credentials.sendRate } 
      });
      toast.success('🔐 WhatsApp credentials and settings updated successfully');
      setCredentials({ 
        accessToken: '', 
        appSecret: '', 
        verifyToken: '', 
        sendRate: credentials.sendRate,
        phoneNumberId: credentials.phoneNumberId,
        businessAccountId: credentials.businessAccountId
      });
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to update credentials');
    }
  };

  const handleRegenerateVerifyToken = async () => {
    if (!user?.businessId) {
      toast.error('Please complete business setup first');
      return;
    }

    const confirmed = window.confirm(
      '⚠️ Regenerating the verify token will invalidate the current token.\n\n' +
      'You will need to update the token in Meta Business Suite webhook configuration.\n\n' +
      'Continue with token regeneration?'
    );

    if (!confirmed) return;

    try {
      setRegeneratingToken(true);
      const response = await businessService.regenerateVerifyToken(
        user.businessId,
        'Security token rotation requested by user'
      );
      
      if (response.success) {
        const newToken = response.verifyToken;
        toast.success('✅ Verify token regenerated successfully');
        
        // Show the new token in a modal or alert
        alert(
          '🔑 New Verify Token Generated:\n\n' +
          `${newToken}\n\n` +
          '⚠️ IMPORTANT: Update this token in Meta Business Suite:\n' +
          '1. Go to Meta Business Suite → WhatsApp → Configuration → Webhook\n' +
          '2. Click "Edit" on webhook fields subscription\n' +
          '3. Update "Verify Token" with the token above\n' +
          '4. Click "Verify and Save"\n\n' +
          'Copy the token now - it won\'t be shown again!'
        );
        
        // Refresh settings to show masked token
        await fetchSettings();
      }
    } catch (err) {
      console.error('Token regeneration error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to regenerate verify token';
      toast.error(errorMsg);
    } finally {
      setRegeneratingToken(false);
    }
  };

  return (
    <div className="page-container">
      <Navbar />
      
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-text">
            <h1 className="page-title">Profile</h1>
            <p className="page-subtitle">Manage your account and business preferences</p>
          </div>
        </div>

        {/* Tabs Section */}
        <Card className="filters-section">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`status-badge ${activeTab === 'business' ? 'status-badge-info' : 'status-badge-secondary'}`}
              onClick={() => setActiveTab('business')}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              <MdBusiness /> Business Info
            </button>
            <button
              className={`status-badge ${activeTab === 'credentials' ? 'status-badge-info' : 'status-badge-secondary'}`}
              onClick={() => setActiveTab('credentials')}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              <MdVpnKey /> WhatsApp API Credentials
            </button>
          </div>
        </Card>

        {loading ? (
          <LoadingSkeleton type="card" />
        ) : (
          <div className="settings-content">
            {activeTab === 'business' && (
              <Card>
                <form onSubmit={handleSaveBusinessInfo} className="settings-form">
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

                  <div className="form-group">
                    <label>Business Description</label>
                    <textarea
                      value={businessData.description}
                      onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
                      placeholder="Describe your business and services (shown in WhatsApp Business profile)"
                      rows="3"
                    />
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
                    <Button type="submit"><MdSave /> Save Business Info</Button>
                  </div>
                </form>
              </Card>
            )}

            {activeTab === 'credentials' && (
              <Card>
                <form onSubmit={handleUpdateCredentials} className="settings-form">
                  <h2>WhatsApp API Credentials</h2>
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffc107',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1.5rem',
                    color: '#856404'
                  }}>
                    🔒 Your credentials are encrypted and stored securely. Only enter them if you need to update.
                  </div>

                  <div className="form-group">
                    <label>WhatsApp Access Token</label>
                    <Input
                      type="password"
                      value={credentials.accessToken}
                      onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
                      placeholder="Enter new access token from Meta Business"
                    />
                    <small>Get this from Meta Business Suite → WhatsApp → API Setup</small>
                  </div>

                  <div className="form-group">
                    <label>App Secret</label>
                    <Input
                      type="password"
                      value={credentials.appSecret}
                      onChange={(e) => setCredentials({ ...credentials, appSecret: e.target.value })}
                      placeholder="Enter app secret from Meta Developer Console"
                    />
                    <small>Found in Meta App Dashboard → Settings → Basic</small>
                  </div>

                  <div className="form-group">
                    <label>Webhook Verify Token</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <Input
                          type="password"
                          value={credentials.verifyToken}
                          onChange={(e) => setCredentials({ ...credentials, verifyToken: e.target.value })}
                          placeholder="Enter webhook verification token"
                        />
                        <small>Used for webhook security. Choose a secure random string.</small>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleRegenerateVerifyToken}
                        disabled={regeneratingToken}
                        style={{ marginTop: '0px', whiteSpace: 'nowrap' }}
                      >
                        <MdRefresh /> {regeneratingToken ? 'Regenerating...' : 'Regenerate Token'}
                      </Button>
                    </div>
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: '#e3f2fd',
                      border: '1px solid #2196f3',
                      borderRadius: 'var(--radius-sm)',
                      marginTop: '8px',
                      fontSize: '0.875rem',
                      color: '#1565c0'
                    }}>
                      💡 <strong>Tip:</strong> Regenerate the verify token if you suspect it has been compromised. 
                      You'll need to update it in Meta Business Suite after regeneration.
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Send Rate Limit (messages/minute)</label>
                    <Input
                      type="number"
                      min="1"
                      max="80"
                      value={credentials.sendRate}
                      onChange={(e) => setCredentials({ ...credentials, sendRate: parseInt(e.target.value) })}
                    />
                    <small>Maximum messages per minute to send (1-80)</small>
                  </div>

                  <div className="form-actions">
                    <Button type="submit"><MdVpnKey /> Update Credentials</Button>
                  </div>
                </form>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;





