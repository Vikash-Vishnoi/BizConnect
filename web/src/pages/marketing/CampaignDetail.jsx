import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ConfirmationModal from '../../components/ConfirmationModal';
import * as campaignService from '../../services/campaigns/campaignService';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { MdPlayArrow, MdPause, MdStop, MdDelete, MdRefresh, MdCheckCircle, MdSchedule } from 'react-icons/md';
import './CampaignDetail.css';

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCampaign();
    
    // Auto-refresh if campaign is active
    const interval = setInterval(() => {
      if (campaign?.status === 'active') {
        fetchCampaign();
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [id, campaign?.status]);

  const fetchCampaign = async () => {
    try {
      const data = await campaignService.getCampaignById(id);
      setCampaign(data.campaign);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching campaign:', err);
      const errorMsg = 'Failed to load campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await campaignService.cancelCampaign(id);
      toast.success('Campaign deleted successfully');
      navigate('/campaigns');
    } catch (err) {
      console.error('Error deleting campaign:', err);
      const errorMsg = 'Failed to delete campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return { bg: 'var(--success-light)', color: 'var(--success)' };
      case 'completed': return { bg: 'var(--divider)', color: 'var(--text-secondary)' };
      case 'scheduled': return { bg: 'var(--info-light)', color: 'var(--info)' };
      case 'paused': return { bg: 'var(--warning-light)', color: 'var(--warning)' };
      case 'draft': return { bg: '#f3f4f6', color: '#6b7280' };
      case 'failed': return { bg: 'var(--error-light)', color: 'var(--error)' };
      default: return { bg: 'var(--divider)', color: 'var(--text-tertiary)' };
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

  const getProgress = () => {
    if (!campaign?.stats) return 0;
    const total = campaign.stats.total || 0;
    const completed = (campaign.stats.sent || 0) + (campaign.stats.failed || 0);
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getDeliveryRate = () => {
    if (!campaign?.stats || campaign.stats.sent === 0) return 0;
    return ((campaign.stats.delivered / campaign.stats.sent) * 100).toFixed(1);
  };

  const getReadRate = () => {
    if (!campaign?.stats || campaign.stats.delivered === 0) return 0;
    return ((campaign.stats.read / campaign.stats.delivered) * 100).toFixed(1);
  };

  const handleStart = async () => {
    setActionLoading(true);
    try {
      await campaignService.startCampaign(id);
      toast.success('🚀 Campaign started successfully!');
      await fetchCampaign();
    } catch (err) {
      console.error('Error starting campaign:', err);
      toast.error(err.message || 'Failed to start campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await campaignService.pauseCampaign(id);
      toast.success('Campaign paused');
      await fetchCampaign();
    } catch (err) {
      console.error('Error pausing campaign:', err);
      toast.error(err.message || 'Failed to pause campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await campaignService.resumeCampaign(id);
      toast.success('Campaign resumed');
      await fetchCampaign();
    } catch (err) {
      console.error('Error resuming campaign:', err);
      toast.error(err.message || 'Failed to resume campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await campaignService.cancelCampaign(id);
      toast.success('Campaign cancelled');
      setShowCancelModal(false);
      await fetchCampaign();
    } catch (err) {
      console.error('Error cancelling campaign:', err);
      toast.error(err.message || 'Failed to cancel campaign');
      setShowCancelModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return <MdPlayArrow style={{ fontSize: '20px' }} />;
      case 'completed': return <MdCheckCircle style={{ fontSize: '20px' }} />;
      case 'scheduled': return <MdSchedule style={{ fontSize: '20px' }} />;
      case 'paused': return <MdPause style={{ fontSize: '20px' }} />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="campaign-detail">
        <Navbar />
        <div className="campaign-detail-content">
          <LoadingSkeleton type="card" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="campaign-detail">
        <Navbar />
        <div className="campaign-detail-content">
          <div className="error-message">{error}</div>
          <Button onClick={() => navigate('/campaigns')}>Back to Campaigns</Button>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="campaign-detail">
        <Navbar />
        <div className="campaign-detail-content">
          <div className="error-message">Campaign not found</div>
          <Button onClick={() => navigate('/campaigns')}>Back to Campaigns</Button>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusColor(campaign.status);
  const progress = getProgress();
  const deliveryRate = getDeliveryRate();
  const readRate = getReadRate();

  return (
    <div className="campaign-detail">
      <Navbar />
      
      <div className="campaign-detail-content">
        {/* Header */}
        <div className="campaign-detail-header">
          <button className="back-button" onClick={() => navigate('/campaigns')}>
            ← Back to Campaigns
          </button>
          
          <div className="campaign-detail-title-row">
            <div>
              <h1 className="campaign-detail-title">{campaign.name}</h1>
              <p className="campaign-detail-subtitle">{campaign.description || 'No description'}</p>
            </div>
            <div className="campaign-detail-actions">
              <span 
                className="campaign-detail-status"
                style={{ 
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {getStatusIcon(campaign.status)}
                {campaign.status}
              </span>
              
              <Button 
                variant="secondary" 
                onClick={fetchCampaign}
                disabled={actionLoading}
              >
                <MdRefresh /> Refresh
              </Button>

              {campaign.status === 'draft' && (
                <Button 
                  variant="primary" 
                  onClick={handleStart}
                  disabled={actionLoading}
                >
                  <MdPlayArrow /> Start Campaign
                </Button>
              )}

              {campaign.status === 'scheduled' && (
                <Button 
                  variant="primary" 
                  onClick={handleStart}
                  disabled={actionLoading}
                >
                  <MdPlayArrow /> Start Now
                </Button>
              )}

              {campaign.status === 'active' && (
                <Button 
                  variant="warning" 
                  onClick={handlePause}
                  disabled={actionLoading}
                >
                  <MdPause /> Pause
                </Button>
              )}

              {campaign.status === 'paused' && (
                <>
                  <Button 
                    variant="primary" 
                    onClick={handleResume}
                    disabled={actionLoading}
                  >
                    <MdPlayArrow /> Resume
                  </Button>
                  <Button 
                    variant="danger" 
                    onClick={() => setShowCancelModal(true)}
                    disabled={actionLoading}
                  >
                    <MdStop /> Cancel
                  </Button>
                </>
              )}

              {(campaign.status === 'completed' || campaign.status === 'failed' || campaign.status === 'cancelled') && (
                <Button 
                  variant="danger" 
                  onClick={() => setShowDeleteModal(true)}
                  disabled={deleting}
                >
                  <MdDelete /> Delete
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="campaign-stats-grid">
          <Card className="campaign-stat-card">
            <div className="campaign-stat-icon">📨</div>
            <div className="campaign-stat-details">
              <p className="campaign-stat-value">{(campaign.stats?.sent || 0).toLocaleString()}</p>
              <p className="campaign-stat-label">Messages Sent</p>
            </div>
          </Card>

          <Card className="campaign-stat-card">
            <div className="campaign-stat-icon">✅</div>
            <div className="campaign-stat-details">
              <p className="campaign-stat-value">{(campaign.stats?.delivered || 0).toLocaleString()}</p>
              <p className="campaign-stat-label">Delivered</p>
            </div>
          </Card>

          <Card className="campaign-stat-card">
            <div className="campaign-stat-icon">👁️</div>
            <div className="campaign-stat-details">
              <p className="campaign-stat-value">{(campaign.stats?.read || 0).toLocaleString()}</p>
              <p className="campaign-stat-label">Read</p>
            </div>
          </Card>

          <Card className="campaign-stat-card">
            <div className="campaign-stat-icon">❌</div>
            <div className="campaign-stat-details">
              <p className="campaign-stat-value">{(campaign.stats?.failed || 0).toLocaleString()}</p>
              <p className="campaign-stat-label">Failed</p>
            </div>
          </Card>
        </div>

        {/* Progress Section */}
        {campaign.status === 'active' && (
          <Card className="campaign-progress-card">
            <h3 className="card-section-title">Campaign Progress</h3>
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="progress-text">{progress}% Complete</p>
            </div>
            <div className="progress-details">
              <span>{campaign.stats?.sent || 0} of {campaign.stats?.total || 0} sent</span>
              <span>{campaign.stats?.pending || 0} remaining</span>
            </div>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="campaign-detail-grid">
          {/* Campaign Info */}
          <Card className="campaign-info-card">
            <h3 className="card-section-title">Campaign Information</h3>
            
            <div className="campaign-info-item">
              <span className="campaign-info-label">Template</span>
              <span className="campaign-info-value">
                {campaign.templateId?.name || 'Template not found'}
              </span>
            </div>

            <div className="campaign-info-item">
              <span className="campaign-info-label">Category</span>
              <span className="campaign-info-value">
                {campaign.templateId?.category || 'N/A'}
              </span>
            </div>

            <div className="campaign-info-item">
              <span className="campaign-info-label">Total Recipients</span>
              <span className="campaign-info-value">
                {campaign.stats?.total || campaign.recipients?.length || 0}
              </span>
            </div>

            <div className="campaign-info-item">
              <span className="campaign-info-label">Created</span>
              <span className="campaign-info-value">
                {formatDate(campaign.createdAt)}
              </span>
            </div>

            {campaign.startedAt && (
              <div className="campaign-info-item">
                <span className="campaign-info-label">Started</span>
                <span className="campaign-info-value">
                  {formatDate(campaign.startedAt)}
                </span>
              </div>
            )}

            {campaign.completedAt && (
              <div className="campaign-info-item">
                <span className="campaign-info-label">Completed</span>
                <span className="campaign-info-value">
                  {formatDate(campaign.completedAt)}
                </span>
              </div>
            )}

            <div className="campaign-info-item">
              <span className="campaign-info-label">Send Rate</span>
              <span className="campaign-info-value">
                {campaign.settings?.sendRate || 10} messages/min
              </span>
            </div>
          </Card>

          {/* Performance Metrics */}
          <Card className="campaign-metrics-card">
            <h3 className="card-section-title">Performance Metrics</h3>
            
            <div className="metric-item">
              <div className="metric-header">
                <span className="metric-label">Delivery Rate</span>
                <span className="metric-value">{deliveryRate}%</span>
              </div>
              <div className="metric-bar">
                <div 
                  className="metric-bar-fill metric-bar-success" 
                  style={{ width: `${deliveryRate}%` }}
                />
              </div>
            </div>

            <div className="metric-item">
              <div className="metric-header">
                <span className="metric-label">Read Rate</span>
                <span className="metric-value">{readRate}%</span>
              </div>
              <div className="metric-bar">
                <div 
                  className="metric-bar-fill metric-bar-info" 
                  style={{ width: `${readRate}%` }}
                />
              </div>
            </div>

            <div className="metric-breakdown">
              <h4 className="metric-breakdown-title">Message Status Breakdown</h4>
              <div className="metric-breakdown-grid">
                <div className="metric-breakdown-item">
                  <span className="metric-breakdown-label">Pending</span>
                  <span className="metric-breakdown-value">{campaign.stats?.pending || 0}</span>
                </div>
                <div className="metric-breakdown-item">
                  <span className="metric-breakdown-label">Sent</span>
                  <span className="metric-breakdown-value">{campaign.stats?.sent || 0}</span>
                </div>
                <div className="metric-breakdown-item">
                  <span className="metric-breakdown-label">Delivered</span>
                  <span className="metric-breakdown-value">{campaign.stats?.delivered || 0}</span>
                </div>
                <div className="metric-breakdown-item">
                  <span className="metric-breakdown-label">Read</span>
                  <span className="metric-breakdown-value">{campaign.stats?.read || 0}</span>
                </div>
                <div className="metric-breakdown-item">
                  <span className="metric-breakdown-label">Failed</span>
                  <span className="metric-breakdown-value">{campaign.stats?.failed || 0}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <Card className="campaign-actions-card">
          <div className="campaign-actions-buttons">
            {campaign.status === 'draft' && (
              <>
                <Button variant="primary" onClick={() => navigate(`/campaigns/${id}/edit`)}>
                  Edit Campaign
                </Button>
                <Button variant="secondary">
                  Start Campaign
                </Button>
              </>
            )}
            
            {campaign.status === 'active' && (
              <Button variant="secondary">
                Pause Campaign
              </Button>
            )}
            
            {campaign.status === 'paused' && (
              <Button variant="primary">
                Resume Campaign
              </Button>
            )}

            <Button 
              variant="danger" 
              onClick={() => setShowDeleteModal(true)}
              disabled={campaign.status === 'active'}
            >
              Delete Campaign
            </Button>
          </div>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Campaign"
        message="Are you sure you want to delete this campaign? This action cannot be undone."
        variant="danger"
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        disabled={deleting}
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Cancel Campaign"
        message="Are you sure you want to cancel this campaign? This will stop all pending messages."
        variant="danger"
        confirmText={actionLoading ? 'Cancelling...' : 'Cancel Campaign'}
        disabled={actionLoading}
      />
    </div>
  );
};

export default CampaignDetail;



