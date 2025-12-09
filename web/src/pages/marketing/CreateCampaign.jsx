import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import * as campaignService from '../../services/campaigns/campaignService';
import * as templateService from '../../services/templates/templateService';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import { MdUpload, MdAdd, MdDelete, MdCheckCircle, MdDownload, MdSchedule, MdFlashOn } from 'react-icons/md';
import './CreateCampaign.css';

const STORAGE_KEY = 'campaign-draft';

const CreateCampaign = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  
  // Load saved data from session storage
  const loadSavedData = () => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error('Failed to load saved campaign data:', err);
    }
    return null;
  };

  const savedData = loadSavedData();
  const [currentStep, setCurrentStep] = useState(savedData?.currentStep || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Campaign data
  const [campaignData, setCampaignData] = useState(savedData?.campaignData || {
    name: '',
    description: '',
    templateId: '',
    recipients: [],
    schedule: {
      type: 'immediate', // immediate or scheduled
      date: '',
      time: ''
    },
    settings: {
      sendRate: 70
    }
  });

  // Templates list
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Contacts
  const [contactInput, setContactInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Save to session storage whenever data changes
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentStep,
        campaignData
      }));
    } catch (err) {
      console.error('Failed to save campaign data:', err);
    }
  }, [currentStep, campaignData]);

  // Restore selected template when returning to step 1
  useEffect(() => {
    if (templates.length > 0 && campaignData.templateId && !selectedTemplate) {
      const template = templates.find(t => t._id === campaignData.templateId);
      if (template) {
        setSelectedTemplate(template);
      }
    }
  }, [templates, campaignData.templateId, selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      const data = await templateService.getTemplates({ status: 'approved' });
      setTemplates(data.templates || []);
      setTemplatesLoading(false);
    } catch (err) {
      console.error('Error fetching templates:', err);
      const errorMsg = 'Failed to load templates';
      setError(errorMsg);
      toast.error(errorMsg);
      setTemplatesLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setCampaignData(prev => ({ ...prev, templateId: template._id }));
  };

  const handleContactsFromText = () => {
    const lines = contactInput.split('\n').filter(line => line.trim());
    const newRecipients = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        phoneNumber: parts[0],
        name: parts[1] || '',
        variables: {}
      };
    }).filter(r => r.phoneNumber);

    if (newRecipients.length === 0) {
      toast.error('No valid phone numbers found');
      return;
    }

    setCampaignData(prev => ({
      ...prev,
      recipients: [...prev.recipients, ...newRecipients]
    }));
    setContactInput('');
    toast.success(`✅ Added ${newRecipients.length} recipient(s)`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploadedFile(file);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error('CSV file is empty or has no data rows');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('number'));
        const nameIndex = headers.findIndex(h => h.includes('name'));
        
        // Find variable columns (variable1, variable2, etc.)
        const variableIndices = [];
        headers.forEach((header, index) => {
          if (header.startsWith('variable')) {
            variableIndices.push(index);
          }
        });

        if (phoneIndex === -1) {
          toast.error('CSV must have a "phone" or "number" column');
          return;
        }
        
        const newRecipients = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          
          // Extract variables from CSV
          const variables = {};
          variableIndices.forEach((varIndex, i) => {
            if (values[varIndex]) {
              variables[`${i + 1}`] = values[varIndex];
            }
          });
          
          return {
            phoneNumber: values[phoneIndex] || '',
            name: values[nameIndex] || '',
            variables
          };
        }).filter(r => r.phoneNumber);

        if (newRecipients.length === 0) {
          toast.error('No valid recipients found in CSV');
          return;
        }

        setCampaignData(prev => ({
          ...prev,
          recipients: [...prev.recipients, ...newRecipients]
        }));
        toast.success(`✅ Imported ${newRecipients.length} recipient(s) from CSV`);
      } catch (err) {
        console.error('CSV parsing error:', err);
        toast.error('Failed to parse CSV file');
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
    };

    reader.readAsText(file);
  };

  const removeRecipient = (index) => {
    setCampaignData(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }));
  };

  const downloadCSVTemplate = () => {
    // Detect variables in selected template
    const templateText = selectedTemplate?.components?.find(c => c.type === 'BODY')?.text || '';
    const variableMatches = templateText.match(/\{\{(\d+)\}\}/g) || [];
    const variableCount = variableMatches.length;
    
    // Create CSV header based on template variables
    let csvContent = 'phone,name';
    for (let i = 1; i <= variableCount; i++) {
      csvContent += `,variable${i}`;
    }
    csvContent += '\n';
    
    // Add sample Indian data
    const sampleData = [
      ['919876543210', 'Rajesh Kumar', '₹500', '24 hours'],
      ['918765432109', 'Priya Sharma', '₹750', '48 hours'],
      ['919123456789', 'Amit Patel', '₹1000', '72 hours'],
      ['918987654321', 'Sneha Reddy', '₹250', '12 hours'],
      ['919988776655', 'Vikram Singh', '₹600', '36 hours']
    ];
    
    sampleData.forEach(row => {
      csvContent += row.slice(0, 2 + variableCount).join(',') + '\n';
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'campaign_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('📥 CSV template downloaded!');
  };

  const handleCreateCampaign = async () => {
    setLoading(true);
    setError('');

    try {
      // Prepare schedule data with timezone
      let scheduleData = {
        type: campaignData.schedule.type
      };

      if (campaignData.schedule.type === 'scheduled') {
        // Get user's timezone
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Create local datetime string
        const localDateTime = `${campaignData.schedule.date}T${campaignData.schedule.time}`;
        
        // Convert to Date object (this will be in user's local time)
        const scheduledDate = new Date(localDateTime);
        
        // Validate date is in the future
        if (scheduledDate <= new Date()) {
          toast.error('Scheduled time must be in the future');
          setLoading(false);
          return;
        }
        
        scheduleData = {
          type: 'scheduled',
          scheduledFor: scheduledDate.toISOString(), // UTC time for database
          timezone: userTimezone, // User's timezone
          localDateTime: localDateTime // Original local time for display
        };
      }

      const payload = {
        name: campaignData.name,
        description: campaignData.description,
        templateId: campaignData.templateId,
        targetAudience: {
          type: 'custom',
          contacts: campaignData.recipients
        },
        schedule: scheduleData,
        settings: campaignData.settings
      };

      const data = await campaignService.createCampaign(payload);
      sessionStorage.removeItem(STORAGE_KEY); // Clear saved draft
      toast.success('🎉 Campaign created successfully!');
      navigate(`/campaigns/${data.campaign._id}`);
    } catch (err) {
      console.error('Error creating campaign:', err);
      const errorMsg = err.message || 'Failed to create campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    // Validate minimum requirements for draft
    if (!campaignData.name || !campaignData.templateId) {
      toast.error('Campaign name and template are required to save as draft');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare schedule data with timezone
      let scheduleData = {
        type: campaignData.schedule.type
      };

      if (campaignData.schedule.type === 'scheduled' && campaignData.schedule.date && campaignData.schedule.time) {
        // Get user's timezone
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Create local datetime string
        const localDateTime = `${campaignData.schedule.date}T${campaignData.schedule.time}`;
        
        // Convert to Date object
        const scheduledDate = new Date(localDateTime);
        
        scheduleData = {
          type: 'scheduled',
          scheduledFor: scheduledDate.toISOString(),
          timezone: userTimezone,
          localDateTime: localDateTime
        };
      }

      const payload = {
        name: campaignData.name,
        description: campaignData.description,
        templateId: campaignData.templateId,
        targetAudience: {
          type: 'custom',
          contacts: campaignData.recipients
        },
        schedule: scheduleData,
        settings: campaignData.settings,
        status: 'draft' // Explicitly set as draft
      };

      const data = await campaignService.createCampaign(payload);
      sessionStorage.removeItem(STORAGE_KEY); // Clear saved draft
      toast.success('💾 Campaign saved as draft!');
      navigate('/campaigns'); // Navigate to campaigns list
    } catch (err) {
      console.error('Error saving draft:', err);
      const errorMsg = err.message || 'Failed to save draft';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return campaignData.name && campaignData.templateId;
      case 2:
        return campaignData.recipients.length > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (canProceed() && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    // Reset to initial state
    setCampaignData({
      name: '',
      description: '',
      templateId: '',
      recipients: [],
      schedule: {
        type: 'immediate',
        date: '',
        time: ''
      },
      settings: {
        sendRate: 70
      }
    });
    setCurrentStep(1);
    setError('');
    setSelectedTemplate(null);
    // Clear session storage
    sessionStorage.removeItem(STORAGE_KEY);
    setShowResetConfirm(false);
    toast.success('Form reset successfully');
  };

  // Check if business setup is complete
  if (!user?.businessId) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <BusinessSetupRequired 
            title="Business Setup Required"
            message="Please complete your business setup before creating campaigns"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Navbar />
      
      <div className="page-content">
        <div className="create-campaign-wrapper">
        {/* Header */}
        <div className="page-header">
          <div className="page-header-text">
            <h1 className="page-title">Create New Campaign</h1>
            <p className="page-subtitle">Launch targeted WhatsApp campaigns in 4 simple steps</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="campaign-steps">
          <div className={`campaign-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <div className="step-circle">1</div>
            <div className="step-label">Campaign Details</div>
          </div>
          <div className="step-line"></div>
          <div className={`campaign-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <div className="step-circle">2</div>
            <div className="step-label">Add Recipients</div>
          </div>
          <div className="step-line"></div>
          <div className={`campaign-step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
            <div className="step-circle">3</div>
            <div className="step-label">Schedule</div>
          </div>
          <div className="step-line"></div>
          <div className={`campaign-step ${currentStep >= 4 ? 'active' : ''}`}>
            <div className="step-circle">4</div>
            <div className="step-label">Review & Launch</div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Step Content */}
        <Card className="campaign-step-content">
          {/* Step 1: Campaign Details & Template Selection */}
          {currentStep === 1 && (
            <div className="step-container">
              <h2 className="step-title">Campaign Details & Template</h2>
              
              <div className="create-campaign__form-group">
                <label>Campaign Name *</label>
                <Input
                  value={campaignData.name}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Summer Sale 2024"
                />
              </div>

              <div className="create-campaign__form-group">
                <label>Description (Optional)</label>
                <textarea
                  className="campaign-textarea"
                  value={campaignData.description}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Campaign objective and key message (e.g., 'Holiday sale promotion for returning customers')"
                  rows={3}
                />
              </div>

              <div className="create-campaign__form-group">
                <label>Select Template *</label>
                <p className="form-help">Choose an approved template for your campaign</p>
                
                {templatesLoading ? (
                  <LoadingSkeleton type="card" />
                ) : templates.length === 0 ? (
                  <div className="no-templates">
                    <p>No approved templates found. Please create and approve a template first.</p>
                    <Button variant="primary" onClick={() => navigate('/templates/create')}>
                      Create Template
                    </Button>
                  </div>
                ) : (
                  <div className="templates-grid">
                    {templates.map(template => (
                      <div
                        key={template._id}
                        className={`template-card ${selectedTemplate?._id === template._id ? 'selected' : ''}`}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div className="template-card-header">
                          <h4>{template.name}</h4>
                          <span className="template-category">{template.category}</span>
                        </div>
                        <p className="template-preview">
                          {template.components?.find(c => c.type === 'BODY')?.text?.substring(0, 100) || 'No body text'}
                        </p>
                        {selectedTemplate?._id === template._id && (
                          <div className="selected-indicator">✓ Selected</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Add Recipients */}
          {currentStep === 2 && (
            <div className="step-container">
              <h2 className="step-title">Add Recipients</h2>
              
              {/* Show template variables info if present */}
              {selectedTemplate && (() => {
                const templateText = selectedTemplate.components?.find(c => c.type === 'BODY')?.text || '';
                const variableMatches = templateText.match(/\{\{(\d+)\}\}/g) || [];
                if (variableMatches.length > 0) {
                  return (
                    <div className="template-variables-info">
                      <h4>📋 Template Variables Detected</h4>
                      <p>Your template contains {variableMatches.length} variable(s): {variableMatches.join(', ')}</p>
                      <p>Make sure your CSV includes columns: <strong>phone, name, variable1, variable2, ...</strong></p>
                    </div>
                  );
                }
              })()}
              
              <div className="recipients-input-section">
                <div className="input-method">
                  <h3>Manual Entry</h3>
                  <p className="form-help">Enter phone numbers (one per line). Format: phone,name</p>
                  <textarea
                    className="campaign-textarea"
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    placeholder="919876543210,Rajesh Kumar&#10;918765432109,Priya Sharma"
                    rows={5}
                  />
                  <Button variant="secondary" onClick={handleContactsFromText}>
                    Add Contacts
                  </Button>
                </div>

                <div className="input-divider">OR</div>

                <div className="input-method">
                  <h3>Upload CSV</h3>
                  <p className="form-help">Upload a CSV file with columns: phone, name{selectedTemplate && ', variable1, variable2...'}</p>
                  <Button 
                    variant="outline" 
                    size="small" 
                    onClick={downloadCSVTemplate}
                    style={{ marginBottom: '12px' }}
                  >
                    <MdDownload /> Download CSV Template
                  </Button>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="file-input"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="file-input-label">
                    <span>📄</span>
                    {uploadedFile ? uploadedFile.name : 'Choose CSV File'}
                  </label>
                </div>
              </div>

              <div className="recipients-list">
                <h3>Recipients ({campaignData.recipients.length})</h3>
                {campaignData.recipients.length === 0 ? (
                  <p className="no-recipients">No recipients added yet</p>
                ) : (
                  <div className="recipients-table">
                    <div className="recipients-header">
                      <span>Phone Number</span>
                      <span>Name</span>
                      <span>Action</span>
                    </div>
                    {campaignData.recipients.slice(0, 10).map((recipient, index) => (
                      <div key={index} className="recipient-row">
                        <span>{recipient.phoneNumber}</span>
                        <span>{recipient.name || 'N/A'}</span>
                        <span>
                          <button
                            className="remove-btn"
                            onClick={() => removeRecipient(index)}
                            title="Remove recipient"
                          >
                            <MdDelete /> Remove
                          </button>
                        </span>
                      </div>
                    ))}
                    {campaignData.recipients.length > 10 && (
                      <div className="more-recipients">
                        ... and {campaignData.recipients.length - 10} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Schedule */}
          {currentStep === 3 && (
            <div className="step-container">
              <h2 className="step-title">Schedule Campaign</h2>
              
              <div className="schedule-options">
                <div
                  className={`schedule-option ${campaignData.schedule.type === 'immediate' ? 'selected' : ''}`}
                  onClick={() => setCampaignData(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, type: 'immediate' }
                  }))}
                >
                  <div className="option-icon"><MdFlashOn /></div>
                  <h3>Send Immediately</h3>
                  <p>Start sending messages as soon as campaign is launched</p>
                </div>

                <div
                  className={`schedule-option ${campaignData.schedule.type === 'scheduled' ? 'selected' : ''}`}
                  onClick={() => setCampaignData(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, type: 'scheduled' }
                  }))}
                >
                  <div className="option-icon"><MdSchedule /></div>
                  <h3>Schedule for Later</h3>
                  <p>Choose a specific date and time to start campaign</p>
                </div>
              </div>

              {campaignData.schedule.type === 'scheduled' && (
                <div className="schedule-datetime">
                  <div className="create-campaign__form-group">
                    <label>Select Date *</label>
                    <p className="form-help">Choose when to start the campaign</p>
                    <input
                      type="date"
                      className="schedule-date-input"
                      value={campaignData.schedule.date}
                      onChange={(e) => setCampaignData(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, date: e.target.value }
                      }))}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="create-campaign__form-group">
                    <label>Select Time *</label>
                    <p className="form-help">Choose the start time</p>
                    <input
                      type="time"
                      className="schedule-time-input"
                      value={campaignData.schedule.time}
                      onChange={(e) => setCampaignData(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, time: e.target.value }
                      }))}
                      required
                    />
                  </div>
                </div>
              )}

              {campaignData.schedule.type === 'scheduled' && campaignData.schedule.date && campaignData.schedule.time && (
                <div className="timezone-info">
                  <p>📍 Your timezone: <strong>{Intl.DateTimeFormat().resolvedOptions().timeZone}</strong></p>
                  <p className="form-help">Campaign will start at the selected time in your local timezone</p>
                </div>
              )}

              <div className="create-campaign__form-group">
                <label>Send Rate (messages per minute)</label>
                <p className="form-help">Control how fast messages are sent to avoid rate limiting (1-80)</p>
                <Input
                  type="number"
                  min="1"
                  max="80"
                  value={campaignData.settings.sendRate}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value < 1) {
                      toast.error('Send rate must be at least 1 message per minute');
                      return;
                    }
                    if (value > 80) {
                      toast.error('Send rate cannot exceed 80 messages per minute');
                      return;
                    }
                    setCampaignData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, sendRate: value }
                    }));
                  }}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value);
                    if (isNaN(value) || value < 1) {
                      toast.warning('Invalid send rate. Setting to default (70)');
                      setCampaignData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, sendRate: 70 }
                      }));
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 4: Review & Launch */}
          {currentStep === 4 && (
            <div className="step-container">
              <h2 className="step-title">Review & Launch Campaign</h2>
              
              <div className="campaign-summary">
                <div className="summary-section">
                  <h3>Campaign Details</h3>
                  <div className="summary-item">
                    <span className="summary-label">Name:</span>
                    <span className="summary-value">{campaignData.name}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Description:</span>
                    <span className="summary-value">{campaignData.description || 'None'}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Template:</span>
                    <span className="summary-value">{selectedTemplate?.name}</span>
                  </div>
                </div>

                <div className="summary-section">
                  <h3>Recipients</h3>
                  <div className="summary-item">
                    <span className="summary-label">Total Recipients:</span>
                    <span className="summary-value">{campaignData.recipients.length}</span>
                  </div>
                </div>

                <div className="summary-section">
                  <h3>Schedule</h3>
                  <div className="summary-item">
                    <span className="summary-label">Type:</span>
                    <span className="summary-value">
                      {campaignData.schedule.type === 'immediate' ? 'Send Immediately' : 'Scheduled'}
                    </span>
                  </div>
                  {campaignData.schedule.type === 'scheduled' && (
                    <>
                      <div className="summary-item">
                        <span className="summary-label">Date:</span>
                        <span className="summary-value">{campaignData.schedule.date}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Time:</span>
                        <span className="summary-value">{campaignData.schedule.time}</span>
                      </div>
                    </>
                  )}
                  <div className="summary-item">
                    <span className="summary-label">Send Rate:</span>
                    <span className="summary-value">{campaignData.settings.sendRate} msg/min</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="step-navigation">
            <div className="nav-left">
              {currentStep > 1 && (
                <Button variant="secondary" onClick={prevStep}>
                  Back
                </Button>
              )}
              <Button 
                variant="secondary" 
                onClick={handleReset}
                className="reset-btn"
                disabled={loading}
              >
                Reset
              </Button>
            </div>
            
            <div className="nav-spacer"></div>

            <div className="nav-right">
              {currentStep === 4 && (
                <Button
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={loading || !campaignData.name || !campaignData.templateId}
                  style={{ marginRight: '12px' }}
                >
                  {loading ? 'Saving...' : '💾 Save as Draft'}
                </Button>
              )}
              {currentStep < 4 ? (
                <Button
                  variant="primary"
                  onClick={nextStep}
                  disabled={!canProceed()}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleCreateCampaign}
                  disabled={loading || !canProceed()}
                >
                  {loading ? 'Creating...' : 'Launch Campaign'}
                </Button>
              )}
            </div>
          </div>
        </Card>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="create-campaign__modal-overlay" onClick={() => setShowResetConfirm(false)}>
            <div className="create-campaign__modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="create-campaign__modal-header">
                <h3>Reset Campaign Form?</h3>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to reset the form? All entered data will be lost.</p>
                <p className="modal-warning">This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <Button 
                  variant="secondary" 
                  onClick={() => setShowResetConfirm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={confirmReset}
                  className="btn-danger"
                >
                  Reset Form
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateCampaign;



