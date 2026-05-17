/**
 * @fileoverview Campaign listing page with filtering, search, and statistics.
 * 
 * @component Campaigns
 * 
 * @description
 * Main campaign management page displaying all WhatsApp marketing campaigns with
 * status filtering, search functionality, statistics dashboard, and grid/list view modes.
 * 
 * @features
 * - Campaign listing with grid/list view modes
 * - Status filtering (all, active, scheduled, completed, paused, draft, failed)
 * - Campaign search by name or description
 * - Statistics dashboard (total, completed, active, scheduled, failed)
 * - Delivery and read rate calculations
 * - Status-based color coding with icons
 * - Load more pagination
 * - Floating action button for quick campaign creation
 * - Business setup validation
 * 
 * @state
 * - campaigns: Array of campaign objects
 * - stats: Campaign statistics (total, active, scheduled, completed, paused, draft, failed)
 * - filterStatus: Current filter ('all', 'active', 'scheduled', etc.)
 * - searchQuery: Search input value
 * - viewMode: Display mode ('grid' or 'list')
 * - page: Current pagination page
 * 
 * @api
 * - GET /campaigns: Fetch campaigns with filters and pagination
 * 
 * @routes
 * - /campaigns: Campaign listing page
 * - /campaigns/create: Create new campaign
 * - /campaigns/:id: View campaign details
 * 
 * @example
 * // Route configuration
 * <Route path="/campaigns" element={<Campaigns />} />
 */

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
import { MdAdd, MdRefresh, MdPlayArrow, MdPause, MdCheckCircle, MdSchedule, MdCampaign, MdBuild, MdSearch, MdClose, MdApps, MdSend, MdBarChart, MdPeople, MdCalendarToday, MdDoneAll, MdError, MdVisibility } from 'react-icons/md';
import '../../components/Stats.css';
import './Campaigns.css';

/**
 * Pagination configuration
 * @constant {Object}
 */
const PAGINATION_CONFIG = {
  ITEMS_PER_PAGE: 20
};

/**
 * Campaign status configuration with colors and icons
 * @constant {Object}
 */
const STATUS_CONFIG = {
  active: {
    bg: '#e8f5e9',
    color: '#4caf50',
    icon: MdPlayArrow
  },
  completed: {
    bg: '#f5f5f5',
    color: '#757575',
    icon: MdCheckCircle
  },
  scheduled: {
    bg: '#e3f2fd',
    color: '#2196f3',
    icon: MdSchedule
  },
  paused: {
    bg: '#fff3e0',
    color: '#ff9800',
    icon: MdPause
  },
  draft: {
    bg: '#f3f4f6',
    color: '#6b7280',
    icon: null
  },
  failed: {
    bg: '#ffebee',
    color: '#f44336',
    icon: null
  },
  default: {
    bg: '#fafafa',
    color: '#9e9e9e',
    icon: null
  }
};

const Campaigns = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('grid');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
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
    draft: 0,
    failed: 0
  });

  useEffect(() => {
    fetchCampaigns();
  }, [filterStatus, searchQuery, page]);

  /**
   * Fetches campaigns from API with filters and pagination
   */
  const fetchCampaigns = async () => {
    try {
      const params = { page, limit: PAGINATION_CONFIG.ITEMS_PER_PAGE };
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const data = await campaignService.getCampaigns(params);
      
      // Backend returns { success, data: { campaigns, count, page, pages, total } }
      const responseData = data.data || data;
      const campaignsList = responseData.campaigns || [];
      
      if (page === 1) {
        setCampaigns(campaignsList);
      } else {
        setCampaigns(prev => [...prev, ...campaignsList]);
      }
      
      setHasMore(responseData.page < responseData.pages);
      calculateStats(campaignsList);
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

  /**
   * Calculates campaign statistics from campaign list
   * @param {Array} campaignList - Array of campaign objects
   */
  const calculateStats = (campaignList) => {
    const newStats = {
      total: campaignList.length,
      active: campaignList.filter(c => c.status === 'active').length,
      scheduled: campaignList.filter(c => c.status === 'scheduled').length,
      completed: campaignList.filter(c => c.status === 'completed').length,
      paused: campaignList.filter(c => c.status === 'paused').length,
      draft: campaignList.filter(c => c.status === 'draft').length,
      failed: campaignList.filter(c => c.status === 'failed').length
    };
    setStats(newStats);
  };

  /**
   * Calculates delivery rate percentage
   * @param {Object} campaign - Campaign object
   * @returns {string} Delivery rate as percentage string
   */
  const getDeliveryRate = (campaign) => {
    if (!campaign.stats || campaign.stats.sent === 0) return '0.0';
    return ((campaign.stats.delivered / campaign.stats.sent) * 100).toFixed(1);
  };

  /**
   * Calculates read rate percentage
   * @param {Object} campaign - Campaign object
   * @returns {string} Read rate as percentage string
   */
  const getReadRate = (campaign) => {
    if (!campaign.stats || campaign.stats.delivered === 0) return '0.0';
    return ((campaign.stats.read / campaign.stats.delivered) * 100).toFixed(1);
  };

  /**
   * Navigates to campaign creation page
   */
  const handleCreateCampaign = () => {
    navigate('/campaigns/create');
  };

  /**
   * Navigates to campaign detail page
   * @param {string} campaignId - Campaign ID
   */
  const handleViewCampaign = (campaignId) => {
    navigate(`/campaigns/${campaignId}`);
  };

  /**
   * Loads next page of campaigns
   */
  const handleLoadMore = () => {
    setPage(page + 1);
  };

  /**
   * Handles search input change
   * @param {Object} e - Event object
   */
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page on new search
  };

  /**
   * Clears search input
   */
  const handleClearSearch = () => {
    setSearchQuery('');
    setPage(1); // Reset to first page
  };

  /**
   * Renders a status badge with icon and text
   * @param {string} status - Campaign status
   * @returns {JSX.Element} Status badge component
   */
  const renderStatusBadge = (status) => {
    const config = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.default;
    const IconComponent = config.icon;
    const statusClass = `campaign-status-badge campaign-status-${status?.toLowerCase() || 'default'}`;
    
    return (
      <span className={statusClass}>
        {IconComponent && <IconComponent className="status-badge-icon" />}
        {status}
      </span>
    );
  };

  /**
   * Formats date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string
   */  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && page === 1) {
    return (
      <div className="campaigns" aria-busy="true" aria-live="polite">
        <Navbar />
        <div className="campaigns-content">
          <LoadingSkeleton type="card" />
        </div>
      </div>
    );
  }

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
    <div className="page-container campaigns-page">
      <Navbar />
      
      <div className="page-content">
        {/* Header */}
        <div className="campaigns-header">
          <div className="campaigns-header-text" style={{ textAlign: 'center', width: '100%' }}>
            <h1 className="campaigns-title">Campaigns</h1>
            <p className="campaigns-subtitle">Manage and track your WhatsApp marketing campaigns • {campaigns.length} total</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--primary"><MdCampaign /></div>
            <div className="stat-card__content">
              <p className="stat-card__label">Total Campaigns</p>
              <div className="stat-card__value">{stats.total || 0}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--success"><MdCheckCircle /></div>
            <div className="stat-card__content">
              <p className="stat-card__label">Completed</p>
              <div className="stat-card__value">{stats.completed || 0}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--info"><MdPlayArrow /></div>
            <div className="stat-card__content">
              <p className="stat-card__label">Active</p>
              <div className="stat-card__value">{stats.active || 0}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--warning"><MdSchedule /></div>
            <div className="stat-card__content">
              <p className="stat-card__label">Scheduled</p>
              <div className="stat-card__value">{stats.scheduled || 0}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--warning"><MdPause /></div>
            <div className="stat-card__content">
              <p className="stat-card__label">Paused</p>
              <div className="stat-card__value">{stats.paused || 0}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--info"><MdBuild /></div>
            <div className="stat-card__content">
              <p className="stat-card__label">Draft</p>
              <div className="stat-card__value">{stats.draft || 0}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--danger"><MdError /></div>
            <div className="stat-card__content">
              <p className="stat-card__label">Failed</p>
              <div className="stat-card__value">{stats.failed || 0}</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="campaigns-search-wrapper">
          <div className="campaigns-search-container">
            <MdSearch className="search-icon" />
            <input
              type="text"
              className="campaigns-search-input"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search campaigns..."
              aria-label="Search campaigns"
            />
            {searchQuery && (
              <button 
                className="search-clear-btn" 
                onClick={handleClearSearch}
                aria-label="Clear search"
              >
                <MdClose />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="filters-card">
          <div className="filter-section">
            <span className="filter-label">Status:</span>
            <div className="filter-chips">
              <button 
                className={`filter-chip ${filterStatus === 'all' ? 'filter-chip-active' : ''}`}
                onClick={() => { setFilterStatus('all'); setPage(1); }}
              >
                <MdApps className="filter-chip-icon" />
                <span>All</span>
              </button>
              <button 
                className={`filter-chip ${filterStatus === 'active' ? 'filter-chip-active' : ''}`}
                onClick={() => { setFilterStatus('active'); setPage(1); }}
              >
                <MdPlayArrow className="filter-chip-icon" />
                <span>Active</span>
              </button>
              <button 
                className={`filter-chip ${filterStatus === 'scheduled' ? 'filter-chip-active' : ''}`}
                onClick={() => { setFilterStatus('scheduled'); setPage(1); }}
              >
                <MdSchedule className="filter-chip-icon" />
                <span>Scheduled</span>
              </button>
              <button 
                className={`filter-chip ${filterStatus === 'completed' ? 'filter-chip-active' : ''}`}
                onClick={() => { setFilterStatus('completed'); setPage(1); }}
              >
                <MdCheckCircle className="filter-chip-icon" />
                <span>Completed</span>
              </button>
              <button 
                className={`filter-chip ${filterStatus === 'paused' ? 'filter-chip-active' : ''}`}
                onClick={() => { setFilterStatus('paused'); setPage(1); }}
              >
                <MdPause className="filter-chip-icon" />
                <span>Paused</span>
              </button>
              <button 
                className={`filter-chip ${filterStatus === 'draft' ? 'filter-chip-active' : ''}`}
                onClick={() => { setFilterStatus('draft'); setPage(1); }}
              >
                <MdBuild className="filter-chip-icon" />
                <span>Draft</span>
              </button>
              <button 
                className={`filter-chip ${filterStatus === 'failed' ? 'filter-chip-active' : ''}`}
                onClick={() => { setFilterStatus('failed'); setPage(1); }}
              >
                <MdError className="filter-chip-icon" />
                <span>Failed</span>
              </button>
            </div>
          </div>
        </Card>

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
          <Card className="campaigns-empty-state">
            <div className="empty-state-icon"><MdCampaign /></div>
            <h3 className="empty-state-title">No campaigns yet</h3>
            <p className="empty-state-text">
              {searchQuery || filterStatus !== 'all'
                ? 'No campaigns match your current filters. Try adjusting them to see more results.'
                : 'Create your first campaign to start sending messages to your customers'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <Button onClick={handleCreateCampaign}>
                <MdAdd /> Create Your First Campaign
              </Button>
            )}
          </Card>
        ) : (
          <div className="campaigns-list">
            {campaigns.map((campaign) => {
              const deliveryRate = getDeliveryRate(campaign);
              const readRate = getReadRate(campaign);
              
              return (
                <Card 
                  key={campaign._id} 
                  className="campaign-list-item"
                  hoverable
                  onClick={() => handleViewCampaign(campaign._id)}
                >
                  <div className="campaign-item-header">
                    <div className="campaign-item-left">
                      <h3 className="campaign-item-name">{campaign.name}</h3>
                      <p className="campaign-item-description">{campaign.description || 'No description'}</p>
                    </div>
                    <div className="campaign-item-right">
                      {renderStatusBadge(campaign.status)}
                    </div>
                  </div>

                  <div className="campaign-item-stats">
                    <div className="campaign-stat-item">
                      <MdSchedule className="campaign-stat-icon" />
                      <span className="campaign-stat-value">{(campaign.stats?.pending || 0).toLocaleString()}</span>
                      <span className="campaign-stat-label">Pending</span>
                    </div>
                    <div className="campaign-stat-item">
                      <MdSend className="campaign-stat-icon" />
                      <span className="campaign-stat-value">{(campaign.stats?.sent || 0).toLocaleString()}</span>
                      <span className="campaign-stat-label">Sent</span>
                    </div>
                    <div className="campaign-stat-item">
                      <MdDoneAll className="campaign-stat-icon" />
                      <span className="campaign-stat-value">{(campaign.stats?.delivered || 0).toLocaleString()}</span>
                      <span className="campaign-stat-label">Delivered</span>
                    </div>
                    <div className="campaign-stat-item">
                      <MdVisibility className="campaign-stat-icon" />
                      <span className="campaign-stat-value">{(campaign.stats?.read || 0).toLocaleString()}</span>
                      <span className="campaign-stat-label">Read</span>
                    </div>
                    <div className="campaign-stat-item">
                      <MdError className="campaign-stat-icon" />
                      <span className="campaign-stat-value">{(campaign.stats?.failed || 0)}</span>
                      <span className="campaign-stat-label">Failed</span>
                    </div>
                  </div>

                  <div className="campaign-item-footer">
                    <div className="campaign-item-meta">
                      <span><MdPeople /> {campaign.stats?.total || campaign.recipients?.length || 0} recipients</span>
                      <span><MdCalendarToday /> {formatDate(campaign.createdAt)}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
        }
        
        {/* Single Load More button */}
        {hasMore && campaigns.length > 0 && (
          <div className="load-more-container">
            <Button variant="secondary" onClick={handleLoadMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load More Campaigns'}
            </Button>
          </div>
        )}
        
        {/* Floating Action Button */}
        {campaigns.length > 0 && (
          <button className="campaigns-fab" onClick={handleCreateCampaign} title="Create Campaign">
            <MdAdd />
          </button>
        )}
      </div>
    </div>
  );
};

export default Campaigns;



