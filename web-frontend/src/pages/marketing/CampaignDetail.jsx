/**
 * 📣 Campaign Detail Component
 * 
 * View detailed information and statistics for a marketing campaign.
 * Manage campaign lifecycle (start, pause, resume, cancel, delete).
 * 
 * @component
 * @features
 * - View campaign statistics (sent, delivered, read, failed)
 * - Real-time progress tracking for active campaigns
 * - Campaign lifecycle management (start/pause/resume/cancel)
 * - Status-based action buttons
 * - Auto-refresh every 5 seconds for active campaigns
 * - Delivery and read rate calculations
 * - Progress bar visualization
 * - Campaign information display
 * - Template details
 * - Recipient count
 * - Scheduled/completed dates
 * - Delete confirmation for completed campaigns
 * 
 * @state
 * - campaign: Campaign object with stats
 * - loading: Initial data fetch state
 * - error: Error message
 * - actionLoading: Action button loading state
 * - showDeleteModal: Delete confirmation modal
 * - showCancelModal: Cancel confirmation modal
 * 
 * @api
 * - GET /campaigns/:id: Fetch campaign details
 * - POST /campaigns/:id/start: Start campaign
 * - POST /campaigns/:id/pause: Pause campaign
 * - POST /campaigns/:id/resume: Resume campaign
 * - POST /campaigns/:id/cancel: Cancel campaign
 * - DELETE /campaigns/:id: Delete campaign
 * 
 * @routes
 * - /campaigns/:id: Campaign detail page
 * 
 * @example
 * <Route path="/campaigns/:id" element={<CampaignDetail />} />
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import * as campaignService from '../../services/campaigns/campaignService';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { MdArrowBack, MdEdit, MdDelete, MdFlashOn } from 'react-icons/md';
import './CreateCampaign.css';

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [campaign, setCampaign] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [showRecipients, setShowRecipients] = useState(false);
  const [recipientFilter, setRecipientFilter] = useState('all');

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  useEffect(() => {
    if (campaign && showRecipients && recipients.length === 0) {
      fetchRecipients();
    }
  }, [campaign, showRecipients]);

  const fetchCampaign = async () => {
    try {
      console.log('🔍 Fetching campaign with ID:', id);
      const data = await campaignService.getCampaignById(id);
      console.log('✅ Campaign data received:', data);
      const campaignData = data.campaign || data.data?.campaign || data;
      console.log('📋 Campaign data extracted:', campaignData);
      
      if (!campaignData || !campaignData._id) {
        throw new Error('Campaign data is invalid or missing');
      }
      
      setCampaign(campaignData);
      
      // Fetch template details if templateId exists
      if (campaignData.templateId) {
        // Template should be populated, but handle both cases
        if (typeof campaignData.templateId === 'object') {
          setTemplate(campaignData.templateId);
        } else {
          setTemplate({ name: 'Template', _id: campaignData.templateId });
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching campaign:', err);
      console.error('Error details:', err.response?.data);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load campaign';
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  const fetchRecipients = async (filterStatus = recipientFilter) => {
    setRecipientsLoading(true);
    try {
      const params = { limit: 100 };
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const data = await campaignService.getCampaignRecipients(id, params);
      const recipientsList = data.data?.recipients || data.recipients || [];
      setRecipients(recipientsList);
    } catch (err) {
      console.error('❌ Error fetching recipients:', err);
      toast.error('Failed to load recipients');
    } finally {
      setRecipientsLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await campaignService.deleteCampaign(id);
      toast.success('🗑️ Campaign deleted successfully');
      navigate('/campaigns');
    } catch (err) {
      console.error('Error deleting campaign:', err);
      toast.error('Failed to delete campaign');
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleEdit = () => {
    navigate(`/campaigns/${id}/edit`);
  };

  const handleLaunch = async () => {
    setActionLoading(true);
    try {
      // Update campaign status to active with immediate schedule
      await campaignService.updateCampaign(id, {
        status: 'active',
        schedule: { type: 'immediate' }
      });
      
      // Start the campaign
      await campaignService.startCampaign(id);
      toast.success('🚀 Campaign launched successfully!');
      setShowLaunchModal(false);
      await fetchCampaign();
    } catch (err) {
      console.error('Error launching campaign:', err);
      toast.error(err.response?.data?.error || 'Failed to launch campaign');
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await campaignService.pauseCampaign(id);
      toast.success('⏸️ Campaign paused successfully');
      setShowPauseModal(false);
      await fetchCampaign();
    } catch (err) {
      console.error('Error pausing campaign:', err);
      toast.error(err.response?.data?.error || 'Failed to pause campaign');
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await campaignService.resumeCampaign(id);
      toast.success('▶️ Campaign resumed successfully');
      setShowResumeModal(false);
      await fetchCampaign();
    } catch (err) {
      console.error('Error resuming campaign:', err);
      toast.error(err.response?.data?.error || 'Failed to resume campaign');
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await campaignService.cancelCampaign(id);
      toast.success('🚫 Campaign cancelled successfully');
      setShowCancelModal(false);
      await fetchCampaign();
    } catch (err) {
      console.error('Error cancelling campaign:', err);
      toast.error(err.response?.data?.error || 'Failed to cancel campaign');
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <LoadingSkeleton type="card" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <Card>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Campaign not found</p>
              <Button onClick={() => navigate('/campaigns')} style={{ marginTop: '1rem' }}>
                <MdArrowBack /> Back to Campaigns
              </Button>
            </div>
          </Card>
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
              <h1 className="page-title">Campaign Details</h1>
              <p className="page-subtitle">Review campaign information and manage campaign</p>
            </div>
          </div>

          <Card className="campaign-step-content">
            <div className="step-container">
              <h2 className="step-title">Campaign Summary</h2>
              
              <div className="campaign-summary">
                <div className="summary-section">
                  <h3>Campaign Details</h3>
                  <div className="summary-item">
                    <span className="summary-label">Name:</span>
                    <span className="summary-value">{campaign.name}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Description:</span>
                    <span className="summary-value">{campaign.description || 'None'}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Template:</span>
                    <span className="summary-value">{template?.name || 'Not specified'}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Status:</span>
                    <span className="summary-value">
                      <span className={`campaign-status-badge status-${campaign.status}`}>
                        {campaign.status?.toUpperCase()}
                      </span>
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Created:</span>
                    <span className="summary-value">{formatDate(campaign.createdAt)}</span>
                  </div>
                </div>

                <div className="summary-section">
                  <h3>Recipients</h3>
                  <div className="summary-item">
                    <span className="summary-label">Total Recipients:</span>
                    <span className="summary-value">{campaign.stats?.total || campaign.recipients?.length || 0}</span>
                  </div>
                  {campaign.stats && (
                    <>
                      <div className="summary-item">
                        <span className="summary-label">Pending:</span>
                        <span className="summary-value">{campaign.stats.pending || 0}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Sent:</span>
                        <span className="summary-value">{campaign.stats.sent || 0}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Delivered:</span>
                        <span className="summary-value">{campaign.stats.delivered || 0}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Read:</span>
                        <span className="summary-value">{campaign.stats.read || 0}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Failed:</span>
                        <span className="summary-value">{campaign.stats.failed || 0}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="summary-section">
                  <h3>Schedule</h3>
                  <div className="summary-item">
                    <span className="summary-label">Type:</span>
                    <span className="summary-value">
                      {campaign.schedule?.type === 'immediate' ? 'Send Immediately' : 'Scheduled'}
                    </span>
                  </div>
                  {campaign.schedule?.type === 'scheduled' && campaign.schedule.scheduledFor && (
                    <div className="summary-item">
                      <span className="summary-label">Scheduled For:</span>
                      <span className="summary-value">{formatDate(campaign.schedule.scheduledFor)}</span>
                    </div>
                  )}
                  <div className="summary-item">
                    <span className="summary-label">Send Rate:</span>
                    <span className="summary-value">{campaign.settings?.sendRate || 70} msg/min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recipients Section */}
            {campaign.stats && campaign.stats.total > 0 && (
              <div className="step-container" style={{ marginTop: '24px' }}>
                <div className="summary-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="summary-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Recipients Details</h3>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowRecipients(!showRecipients);
                          if (!showRecipients && recipients.length === 0) {
                            fetchRecipients();
                          }
                        }}
                        size="small"
                      >
                        {showRecipients ? 'Hide Recipients' : 'Show Recipients'}
                      </Button>
                    </div>

                    {showRecipients && (
                      <>
                        <div style={{ marginTop: '16px', marginBottom: '12px' }}>
                          <select
                            value={recipientFilter}
                            onChange={(e) => {
                              const newFilter = e.target.value;
                              setRecipientFilter(newFilter);
                              fetchRecipients(newFilter);
                            }}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid #ddd',
                              fontSize: '14px'
                            }}
                          >
                            <option value="all">All Recipients</option>
                            <option value="pending">Pending</option>
                            <option value="sent">Sent</option>
                            <option value="delivered">Delivered</option>
                            <option value="read">Read</option>
                            <option value="failed">Failed</option>
                          </select>
                        </div>

                        {recipientsLoading ? (
                          <div style={{ padding: '20px', textAlign: 'center' }}>Loading recipients...</div>
                        ) : recipients.length === 0 ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                            {recipientFilter === 'all' 
                              ? 'No recipients added to this campaign.' 
                              : recipientFilter === 'pending'
                              ? 'No pending recipients. All messages have been processed.'
                              : recipientFilter === 'sent'
                              ? 'No messages in sent status. They may be delivered or pending.'
                              : recipientFilter === 'delivered'
                              ? 'No messages delivered yet. Check if messages are being sent.'
                              : recipientFilter === 'read'
                              ? 'No messages read yet.'
                              : recipientFilter === 'failed'
                              ? 'No failed messages. All recipients processed successfully.'
                              : 'No recipients found for this filter.'}
                          </div>
                        ) : (
                          <div className="recipients-table-container">
                            <table className="recipients-table">
                              <thead>
                                <tr>
                                  <th>Phone Number</th>
                                  <th>Name</th>
                                  <th>Status</th>
                                  <th>Sent At</th>
                                  <th>Delivered At</th>
                                  <th>Read At</th>
                                </tr>
                              </thead>
                              <tbody>
                                {recipients.map((recipient, index) => (
                                  <tr key={recipient._id || index}>
                                    <td>{recipient.phoneNumber}</td>
                                    <td>{recipient.name || '-'}</td>
                                    <td>
                                      <span
                                        style={{
                                          display: 'inline-block',
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          fontSize: '12px',
                                          fontWeight: '500',
                                          backgroundColor:
                                            recipient.status === 'read' ? '#e8f5e9' :
                                            recipient.status === 'delivered' ? '#e3f2fd' :
                                            recipient.status === 'sent' ? '#fff3e0' :
                                            recipient.status === 'failed' ? '#ffebee' :
                                            '#f5f5f5',
                                          color:
                                            recipient.status === 'read' ? '#2e7d32' :
                                            recipient.status === 'delivered' ? '#1565c0' :
                                            recipient.status === 'sent' ? '#e65100' :
                                            recipient.status === 'failed' ? '#c62828' :
                                            '#666'
                                        }}
                                      >
                                        {recipient.status?.toUpperCase() || 'PENDING'}
                                      </span>
                                    </td>
                                    <td>
                                      {recipient.sentAt ? formatDate(recipient.sentAt) : '-'}
                                    </td>
                                    <td>
                                      {recipient.deliveredAt ? formatDate(recipient.deliveredAt) : '-'}
                                    </td>
                                    <td>
                                      {recipient.readAt ? formatDate(recipient.readAt) : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="step-navigation">
              <div className="nav-left">
                {campaign.status === 'draft' && (
                  <Button 
                    variant="secondary" 
                    onClick={() => setShowDeleteModal(true)}
                    disabled={actionLoading}
                    style={{ backgroundColor: '#fee', color: '#c33' }}
                  >
                    <MdDelete /> Delete Draft
                  </Button>
                )}
              </div>
              
              <div className="nav-spacer"></div>

              <div className="nav-right">
                {campaign.status === 'draft' && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleEdit}
                      disabled={actionLoading}
                      style={{ marginRight: '12px' }}
                    >
                      <MdEdit /> Edit Campaign
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => setShowLaunchModal(true)}
                      disabled={actionLoading}
                    >
                      <MdFlashOn /> Launch Campaign
                    </Button>
                  </>
                )}
                
                {/* Pause button for scheduled/active campaigns */}
                {['scheduled', 'active'].includes(campaign.status) && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowPauseModal(true)}
                    disabled={actionLoading}
                    style={{ marginRight: '12px', backgroundColor: '#6366f1', color: 'white' }}
                  >
                    Pause Campaign
                  </Button>
                )}
                
                {/* Resume button for paused campaigns */}
                {campaign.status === 'paused' && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowResumeModal(true)}
                    disabled={actionLoading}
                    style={{ marginRight: '12px', backgroundColor: '#10b981', color: 'white' }}
                  >
                    Resume Campaign
                  </Button>
                )}
                
                {/* Cancel button for scheduled/paused campaigns */}
                {['scheduled', 'paused'].includes(campaign.status) && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCancelModal(true)}
                    disabled={actionLoading}
                    style={{ backgroundColor: '#ef4444', color: 'white' }}
                  >
                    Cancel Campaign
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Launch Campaign Confirmation Modal */}
      {showLaunchModal && (
        <div className="delete-modal-overlay" onClick={() => setShowLaunchModal(false)}>
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h3>Launch Campaign?</h3>
            </div>
            <div className="delete-modal-body">
              <p>Are you sure you want to launch this campaign immediately?</p>
              <p className="delete-modal-warning">Messages will start sending to recipients right away.</p>
            </div>
            <div className="delete-modal-footer">
              <Button 
                variant="secondary" 
                onClick={() => setShowLaunchModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleLaunch}
                disabled={actionLoading}
                style={{ backgroundColor: '#4caf50' }}
              >
                {actionLoading ? 'Launching...' : 'Launch Now'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="delete-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h3>Delete Campaign Draft?</h3>
            </div>
            <div className="delete-modal-body">
              <p>Are you sure you want to delete this campaign draft?</p>
              <p className="delete-modal-warning">This action cannot be undone.</p>
            </div>
            <div className="delete-modal-footer">
              <Button 
                variant="secondary" 
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleDelete}
                disabled={actionLoading}
                style={{ backgroundColor: '#dc3545' }}
              >
                {actionLoading ? 'Deleting...' : 'Delete Draft'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Campaign Modal */}
      {showPauseModal && (
        <div className="delete-modal-overlay" onClick={() => setShowPauseModal(false)}>
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h3>Pause Campaign?</h3>
            </div>
            <div className="delete-modal-body">
              <p>Are you sure you want to pause this campaign?</p>
              <p className="delete-modal-warning">The campaign will stop sending messages until resumed.</p>
            </div>
            <div className="delete-modal-footer">
              <Button 
                variant="secondary" 
                onClick={() => setShowPauseModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handlePause}
                disabled={actionLoading}
                style={{ backgroundColor: '#6366f1' }}
              >
                {actionLoading ? 'Pausing...' : 'Pause Campaign'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Campaign Modal */}
      {showResumeModal && (
        <div className="delete-modal-overlay" onClick={() => setShowResumeModal(false)}>
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h3>Resume Campaign?</h3>
            </div>
            <div className="delete-modal-body">
              <p>Are you sure you want to resume this campaign?</p>
              <p className="delete-modal-warning">The campaign will continue sending messages.</p>
            </div>
            <div className="delete-modal-footer">
              <Button 
                variant="secondary" 
                onClick={() => setShowResumeModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleResume}
                disabled={actionLoading}
                style={{ backgroundColor: '#10b981' }}
              >
                {actionLoading ? 'Resuming...' : 'Resume Campaign'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Campaign Modal */}
      {showCancelModal && (
        <div className="delete-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h3>Cancel Campaign?</h3>
            </div>
            <div className="delete-modal-body">
              <p>Are you sure you want to cancel this campaign?</p>
              <p className="delete-modal-warning">This action cannot be undone. All pending messages will not be sent.</p>
            </div>
            <div className="delete-modal-footer">
              <Button 
                variant="secondary" 
                onClick={() => setShowCancelModal(false)}
                disabled={actionLoading}
              >
                No, Keep Campaign
              </Button>
              <Button 
                variant="primary" 
                onClick={handleCancel}
                disabled={actionLoading}
                style={{ backgroundColor: '#ef4444' }}
              >
                {actionLoading ? 'Cancelling...' : 'Yes, Cancel Campaign'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetail;

