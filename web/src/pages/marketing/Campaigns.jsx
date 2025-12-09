import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import * as campaignService from '../../services/campaigns/campaignService';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import { MdAdd, MdRefresh, MdPlayArrow, MdPause, MdCheckCircle, MdSchedule, MdCampaign } from 'react-icons/md';
import './Campaigns.css';

const Campaigns = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('grid');
  const [filterStatus, setFilterStatus] = useState('all');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    scheduled: 0,
    completed: 0,
    paused: 0,
    draft: 0
  });

  useEffect(() => {
    fetchCampaigns();
  }, [filterStatus, page]);

  const fetchCampaigns = async () => {
    try {
      const params = { page, limit: 20 };
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      const data = await campaignService.getCampaigns(params);
      
      if (page === 1) {
        setCampaigns(data.campaigns || []);
      } else {
        setCampaigns(prev => [...prev, ...(data.campaigns || [])]);
      }
      
      setHasMore(data.page < data.pages);
      calculateStats(data.campaigns || []);
      setLoading(false);
      setError('');
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      const errorMsg = err.response?.data?.message || 'Failed to load campaigns';
      setError(errorMsg);
      
      // Don't show toast for business setup errors
      if (!errorMsg.includes('business') && !errorMsg.includes('X-Business-ID')) {
        toast.error(errorMsg);
      }
      setLoading(false);
    }
  };

  const calculateStats = (campaignList) => {
    const newStats = {
      total: campaignList.length,
      active: campaignList.filter(c => c.status === 'active').length,
      scheduled: campaignList.filter(c => c.status === 'scheduled').length,
      completed: campaignList.filter(c => c.status === 'completed').length,
      paused: campaignList.filter(c => c.status === 'paused').length,
      draft: campaignList.filter(c => c.status === 'draft').length
    };
    setStats(newStats);
  };

  const getDeliveryRate = (campaign) => {
    if (!campaign.stats || campaign.stats.sent === 0) return 0;
    return ((campaign.stats.delivered / campaign.stats.sent) * 100).toFixed(1);
  };

  const getReadRate = (campaign) => {
    if (!campaign.stats || campaign.stats.delivered === 0) return 0;
    return ((campaign.stats.read / campaign.stats.delivered) * 100).toFixed(1);
  };

  const handleCreateCampaign = () => {
    navigate('/campaigns/create');
  };

  const handleViewCampaign = (campaignId) => {
    navigate(`/campaigns/${campaignId}`);
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  if (loading && page === 1) {
    return (
      <div className="campaigns">
        <Navbar />
        <div className="campaigns-content">
          <LoadingSkeleton type="card" />
        </div>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return <MdPlayArrow style={{ fontSize: '16px' }} />;
      case 'completed': return <MdCheckCircle style={{ fontSize: '16px' }} />;
      case 'scheduled': return <MdSchedule style={{ fontSize: '16px' }} />;
      case 'paused': return <MdPause style={{ fontSize: '16px' }} />;
      default: return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return { bg: '#e8f5e9', color: '#4caf50' };
      case 'completed': return { bg: '#f5f5f5', color: '#757575' };
      case 'scheduled': return { bg: '#e3f2fd', color: '#2196f3' };
      case 'paused': return { bg: '#fff3e0', color: '#ff9800' };
      case 'draft': return { bg: '#f3f4f6', color: '#6b7280' };
      default: return { bg: '#fafafa', color: '#9e9e9e' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
        {/* Header */}
        <div className="page-header">
          <div className="page-header-text">
            <h1 className="page-title">Campaigns</h1>
            <p className="page-subtitle">Manage and track your WhatsApp marketing campaigns - {campaigns.length} campaigns</p>
          </div>
          <div className="page-actions">
            <Button size="small" onClick={handleCreateCampaign}>
              <MdAdd /> Create Campaign
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-primary"><MdAdd /></div>
            <div className="stat-content">
              <p className="stat-label">Total Campaigns</p>
              <h2 className="stat-value">{stats.total}</h2>
            </div>
          </Card>
          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-success"><MdCheckCircle /></div>
            <div className="stat-content">
              <p className="stat-label">Completed</p>
              <h2 className="stat-value">{stats.completed}</h2>
            </div>
          </Card>
          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-info"><MdPlayArrow /></div>
            <div className="stat-content">
              <p className="stat-label">Active</p>
              <h2 className="stat-value">{stats.active}</h2>
            </div>
          </Card>
          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-warning"><MdSchedule /></div>
            <div className="stat-content">
              <p className="stat-label">Scheduled</p>
              <h2 className="stat-value">{stats.scheduled}</h2>
            </div>
          </Card>
        </div>

        {/* Filters - Only show when business is set up */}
        {!error && (
          <Card className="filters-section">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', marginRight: '8px', color: 'var(--text-secondary)' }}>Filter:</span>
              <button 
                className={`filter-btn ${filterStatus === 'all' ? 'filter-btn-active' : ''}`}
                onClick={() => { setFilterStatus('all'); setPage(1); }}
              >
                All ({stats.total})
              </button>
              <button 
                className={`filter-btn filter-btn-success ${filterStatus === 'active' ? 'filter-btn-active' : ''}`}
                onClick={() => { setFilterStatus('active'); setPage(1); }}
              >
                Active ({stats.active})
              </button>
              <button 
                className={`filter-btn filter-btn-info ${filterStatus === 'scheduled' ? 'filter-btn-active' : ''}`}
                onClick={() => { setFilterStatus('scheduled'); setPage(1); }}
              >
                Scheduled ({stats.scheduled})
              </button>
              <button 
                className={`filter-btn filter-btn-success ${filterStatus === 'completed' ? 'filter-btn-active' : ''}`}
                onClick={() => { setFilterStatus('completed'); setPage(1); }}
              >
                Completed ({stats.completed})
              </button>
              <button 
                className={`filter-btn filter-btn-warning ${filterStatus === 'paused' ? 'filter-btn-active' : ''}`}
                onClick={() => { setFilterStatus('paused'); setPage(1); }}
              >
                Paused ({stats.paused})
              </button>
              <button 
                className={`filter-btn ${filterStatus === 'draft' ? 'filter-btn-active' : ''}`}
                onClick={() => { setFilterStatus('draft'); setPage(1); }}
              >
                Draft ({stats.draft})
              </button>
            </div>
          </Card>
        )}

        {/* Campaigns Grid/List */}
        {error && (error.includes('business') || error.includes('X-Business-ID')) ? (
          <BusinessSetupRequired 
            message="Please complete your business setup to start creating campaigns"
          />
        ) : error ? (
          <div className="error-message">
            {error}
            <Button variant="outline" size="small" onClick={() => { setPage(1); fetchCampaigns(); }}>
              Retry
            </Button>
          </div>
        ) : null}
        
        {campaigns.length === 0 && !loading && !error ? (
          <div className="empty-state">
            <div className="empty-state-icon"><MdCampaign /></div>
            <h3 className="empty-state-title">No campaigns yet</h3>
            <p className="empty-state-text">Create your first campaign to start sending messages to your customers</p>
            <Button onClick={handleCreateCampaign}>
              <MdAdd /> Create Your First Campaign
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <>
            <div className="card-grid">
              {campaigns.map((campaign) => {
                const statusStyle = getStatusColor(campaign.status);
                const deliveryRate = getDeliveryRate(campaign);
                const readRate = getReadRate(campaign);
                
                return (
                  <Card key={campaign._id} className="campaign-card" hoverable onClick={() => handleViewCampaign(campaign._id)}>
                    <div className="campaign-card-header">
                      <div>
                        <h3 className="campaign-card-title">{campaign.name}</h3>
                        <p className="campaign-card-description">{campaign.description || 'No description'}</p>
                      </div>
                      <span 
                        className="campaign-status-badge"
                        style={{ 
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {getStatusIcon(campaign.status)}
                        {campaign.status}
                      </span>
                    </div>

                    <div className="campaign-card-stats">
                      <div className="campaign-stat">
                        <span className="campaign-stat-icon">📨</span>
                        <div>
                          <p className="campaign-stat-value">{(campaign.stats?.sent || 0).toLocaleString()}</p>
                          <p className="campaign-stat-label">Sent</p>
                        </div>
                      </div>
                      <div className="campaign-stat">
                        <span className="campaign-stat-icon">✅</span>
                        <div>
                          <p className="campaign-stat-value">{deliveryRate}%</p>
                          <p className="campaign-stat-label">Delivered</p>
                        </div>
                      </div>
                      <div className="campaign-stat">
                        <span className="campaign-stat-icon">👁️</span>
                        <div>
                          <p className="campaign-stat-value">{readRate}%</p>
                          <p className="campaign-stat-label">Read</p>
                        </div>
                      </div>
                      <div className="campaign-stat">
                        <span className="campaign-stat-icon">❌</span>
                        <div>
                          <p className="campaign-stat-value">{(campaign.stats?.failed || 0)}</p>
                          <p className="campaign-stat-label">Failed</p>
                        </div>
                      </div>
                    </div>

                    <div className="campaign-card-footer">
                      <div className="campaign-card-meta">
                        <span>👥 {campaign.stats?.total || campaign.recipients?.length || 0} recipients</span>
                        <span>📅 {formatDate(campaign.createdAt)}</span>
                      </div>
                      <div className="campaign-card-actions">
                        <button className="campaign-action-btn" onClick={(e) => { e.stopPropagation(); handleViewCampaign(campaign._id); }}>📊 View</button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <Card className="campaigns-list">
              <div className="campaigns-table">
                <div className="table-header">
                  <div className="table-col-name">Campaign</div>
                  <div className="table-col-status">Status</div>
                  <div className="table-col-number">Sent</div>
                  <div className="table-col-number">Delivered</div>
                  <div className="table-col-number">Read</div>
                  <div className="table-col-number">Failed</div>
                  <div className="table-col-date">Created</div>
                  <div className="table-col-actions">Actions</div>
                </div>

                {campaigns.map((campaign) => {
                  const statusStyle = getStatusColor(campaign.status);
                  const deliveryRate = getDeliveryRate(campaign);
                  const readRate = getReadRate(campaign);
                  
                  return (
                    <div key={campaign._id} className="table-row" onClick={() => handleViewCampaign(campaign._id)}>
                      <div className="table-col-name">
                        <div>
                          <p className="table-campaign-name">{campaign.name}</p>
                          <p className="table-campaign-desc">{campaign.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="table-col-status">
                        <span 
                          className="table-status-badge"
                          style={{ 
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color
                          }}
                        >
                          {campaign.status}
                        </span>
                      </div>
                      <div className="table-col-number">{(campaign.stats?.sent || 0).toLocaleString()}</div>
                      <div className="table-col-number">{deliveryRate}%</div>
                      <div className="table-col-number">{readRate}%</div>
                      <div className="table-col-number">{campaign.stats?.failed || 0}</div>
                      <div className="table-col-date">{formatDate(campaign.createdAt)}</div>
                      <div className="table-col-actions">
                        <button className="table-action-btn" onClick={(e) => { e.stopPropagation(); handleViewCampaign(campaign._id); }}>View</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}
        
        {/* Single Load More button for both views */}
        {hasMore && campaigns.length > 0 && (
          <div className="load-more-container">
            <Button variant="secondary" onClick={handleLoadMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load More Campaigns'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Campaigns;



