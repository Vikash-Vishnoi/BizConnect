/**
 * 📅 Scheduled Items Page Component
 * 
 * Manage and track scheduled WhatsApp messages and campaigns.
 * Features filtering, pagination, cancellation, and statistics.
 * 
 * @component
 * @features
 * - View all scheduled messages and campaigns
 * - Filter by status, date range, search query
 * - Statistics dashboard (pending/sent/failed/cancelled)
 * - Cancel pending messages
 * - Schedule new messages
 * - Pagination for large lists
 * - Real-time status updates
 * - Message preview
 * - Contact information display
 * 
 * @state
 * - scheduledMessages: All items array (messages & campaigns)
 * - filteredMessages: Search/filter results
 * - loading: Data fetch state
 * - stats: Summary statistics

 * - currentPage: Pagination state
 * 
 * @example
 * <Route path="/automation/scheduled" element={<Scheduled />} />
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { useDebounce } from '../../hooks/useDebounce';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ConfirmationModal from '../../components/ConfirmationModal';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { get, post, del } from '../../services/api';
import { MdSchedule, MdCancel, MdPlayArrow, MdPause, MdCheckCircle, MdError, MdPeople, MdDelete, MdSearch, MdAdd, MdPerson, MdPhone, MdMessage, MdEdit, MdInfo, MdClose, MdApps, MdCampaign, MdSms, MdCalendarToday, MdSend, MdDoneAll, MdVisibility } from 'react-icons/md';
import { sanitizeHTML, formatDate, truncateText } from '../../utils/format';
import '../../components/Stats.css';
import '../marketing/Campaigns.css'; // Import Campaigns CSS for campaign-item-* classes
import './Scheduled.css';


/**
 * Configuration for scheduled items feature
 */
const SCHEDULED_CONFIG = {
  searchDebounceDelay: 500,
  previewTextLength: 100,
  defaultType: 'all',
  defaultStatus: 'all'
};

/**
 * Message status configuration
 */
const MESSAGE_STATUS = {
  PENDING: { key: 'pending', color: '#f59e0b', icon: MdSchedule },
  SENT: { key: 'sent', color: '#10b981', icon: MdCheckCircle },
  FAILED: { key: 'failed', color: '#ef4444', icon: MdError },
  CANCELLED: { key: 'cancelled', color: '#6b7280', icon: MdCancel }
};

/**
 * Pagination configuration
 */
const PAGINATION_CONFIG = {
  ITEMS_PER_PAGE: 20,
  MESSAGE_PREVIEW_LENGTH: 50
};

const Scheduled = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, sent: 0, failed: 0, cancelled: 0, total: 0 });
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const debouncedSearch = useDebounce(searchQuery, SCHEDULED_CONFIG.searchDebounceDelay);
  
  // Apply client-side filtering
  const filteredMessages = useMemo(() => {
    let items = scheduledMessages;
    
    // Filter by type
    if (typeFilter !== 'all') {
      items = items.filter(item => {
        const itemType = item.messageType === 'campaign' || item.campaignId ? 'campaign' : 'message';
        return itemType === typeFilter;
      });
    }
    
    // Filter by search query
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      items = items.filter(item => {
        const contactName = item.conversationId?.contact?.name?.toLowerCase() || '';
        const phoneNumber = item.conversationId?.contact?.phoneNumber || item.phoneNumber || '';
        const text = item.text?.toLowerCase() || '';
        const caption = item.caption?.toLowerCase() || '';
        const name = item.name?.toLowerCase() || '';
        
        return contactName.includes(searchLower) || 
               phoneNumber.includes(searchLower) || 
               text.includes(searchLower) ||
               caption.includes(searchLower) ||
               name.includes(searchLower);
      });
    }
    
    return items;
  }, [scheduledMessages, typeFilter, debouncedSearch]);
  
  // Modal states
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [cancellingMessageId, setCancellingMessageId] = useState(null);
  const [actioningItem, setActioningItem] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    if (user?.businessId) {
      fetchScheduledMessages();
      fetchStats();
    }
  }, [currentPage, statusFilter, user?.businessId]);
  
  /**
   * Fetch scheduled messages with filters
   */
  const fetchScheduledMessages = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: PAGINATION_CONFIG.ITEMS_PER_PAGE
      });
      
      // Add search if present
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      
      // Add status filter
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      console.log('Fetching scheduled items with params:', params.toString());
      const data = await get(`/scheduled?${params}`);
      
      console.log('========== SCHEDULED ITEMS DEBUG ==========');
      console.log('Full response data:', JSON.stringify(data, null, 2));
      console.log('data.success:', data?.success);
      console.log('data.data exists:', !!data?.data);
      console.log('data.data:', data?.data);
      console.log('scheduledMessages path 1 (data.data.scheduledMessages):', data?.data?.scheduledMessages);
      console.log('scheduledMessages path 2 (data.scheduledMessages):', data?.scheduledMessages);
      console.log('==========================================');
      
      if (data && data.success !== false) {
        // Backend wraps response in { success: true, data: { scheduledMessages, total, page, pages }, message }
        const responseData = data.data || {};
        const items = responseData.scheduledMessages || data.scheduledMessages || [];
        console.log('Final items array:', items);
        console.log('Items count:', items.length);
        if (items.length > 0) {
          console.log('First item:', JSON.stringify(items[0], null, 2));
        }
        setScheduledMessages(items);
        setTotalPages(responseData.pages || 1);
      } else {
        console.error('Failed to fetch scheduled messages:', data);
        throw new Error(data?.message || 'Failed to fetch scheduled messages');
      }
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
      toast.error('Failed to load scheduled messages');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Fetch statistics summary
   */
  const fetchStats = async () => {
    try {
      console.log('Fetching stats from:', `/scheduled/stats/summary`);
      const data = await get(`/scheduled/stats/summary`);
      
      console.log('Stats response:', { data });
      
      if (data && data.success !== false) {
        // Backend wraps response in { success, data, message }
        const statsData = data.data || data;
        console.log('Setting stats:', statsData);
        setStats(statsData);
      } else {
        console.error('Failed to fetch stats:', data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  

  
  const handleCancelClick = (item) => {
    setActioningItem(item);
    setShowCancelModal(true);
  };

  /**
   * Cancel scheduled message or campaign
   */
  const handleCancelMessage = async () => {
    try {
      const isCampaign = actioningItem.messageType === 'campaign' || actioningItem.campaignId;
      const itemId = actioningItem.campaignId || actioningItem._id;
      
      let response;
      if (isCampaign) {
        // Cancel campaign
        response = await post(`/scheduled/campaigns/${itemId}/cancel`);
      } else {
        // Cancel message
        response = await del(`/scheduled/${itemId}`);
      }
      
      if (response && response.success !== false) {
        toast.success(isCampaign ? 'Campaign cancelled successfully' : 'Scheduled message cancelled successfully');
        setShowCancelModal(false);
        setActioningItem(null);
        fetchScheduledMessages();
        fetchStats();
      } else {
        throw new Error(response?.message || 'Failed to cancel');
      }
    } catch (error) {
      console.error('Error cancelling:', error);
      toast.error(error.message || 'Failed to cancel');
      setShowCancelModal(false);
    }
  };

  /**
   * Pause campaign
   */
  const handlePauseCampaign = async () => {
    try {
      const itemId = actioningItem.campaignId || actioningItem._id;
      
      const response = await post(`/scheduled/campaigns/${itemId}/pause`);
      
      if (response && response.success !== false) {
        toast.success('Campaign paused successfully');
        setShowPauseModal(false);
        setActioningItem(null);
        fetchScheduledMessages();
        fetchStats();
      } else {
        throw new Error(response?.message || 'Failed to pause campaign');
      }
    } catch (error) {
      console.error('Error pausing campaign:', error);
      toast.error(error.message || 'Failed to pause campaign');
      setShowPauseModal(false);
    }
  };

  /**
   * Resume campaign
   */
  const handleResumeCampaign = async () => {
    try {
      const itemId = actioningItem.campaignId || actioningItem._id;
      
      const response = await post(`/scheduled/campaigns/${itemId}/resume`);
      
      if (response && response.success !== false) {
        toast.success('Campaign resumed successfully');
        setShowResumeModal(false);
        setActioningItem(null);
        fetchScheduledMessages();
        fetchStats();
      } else {
        throw new Error(response?.message || 'Failed to resume campaign');
      }
    } catch (error) {
      console.error('Error resuming campaign:', error);
      toast.error(error.message || 'Failed to resume campaign');
      setShowResumeModal(false);
    }
  };

  /**
   * Get icon for message status
   */
  const getStatusIcon = (status) => {
    const statusKey = status?.toLowerCase();
    const statusConfig = Object.values(MESSAGE_STATUS).find(s => s.key === statusKey);
    if (!statusConfig) return <MdSchedule />;
    const IconComponent = statusConfig.icon;
    return <IconComponent style={{ color: statusConfig.color }} />;
  };
  
  /**
   * Handle edit message - TODO: Implement edit functionality
   */
  const handleEditMessage = (message) => {
    // TODO: Implement edit functionality
    console.log('Edit message:', message);
    toast.info('Edit functionality coming soon');
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  /**
   * Renders a status badge with icon and text (matching Campaigns.jsx pattern)
   * @param {string} status - Item status
   * @returns {JSX.Element} Status badge component
   */
  const renderStatusBadge = (status) => {
    const badges = {
      pending: { icon: MdSchedule },
      scheduled: { icon: MdSchedule },
      active: { icon: MdPlayArrow },
      sent: { icon: MdCheckCircle },
      failed: { icon: MdError },
      cancelled: { icon: MdCancel },
      paused: { icon: MdPause },
      completed: { icon: MdCheckCircle }
    };
    
    const badge = badges[status?.toLowerCase()] || badges.pending;
    const IconComponent = badge.icon;
    const statusClass = `campaign-status-badge campaign-status-${status?.toLowerCase() || 'pending'}`;
    
    return (
      <span className={statusClass}>
        {IconComponent && <IconComponent className="status-badge-icon" />}
        {status}
      </span>
    );
  };
  
  /**
   * Get preview text for message
   */
  const getMessagePreview = (message) => {
    // Handle campaigns
    if (message.messageType === 'campaign' || message.campaignId) {
      const desc = message.caption || message.description || 'Campaign scheduled';
      return desc.length > PAGINATION_CONFIG.MESSAGE_PREVIEW_LENGTH
        ? desc.substring(0, PAGINATION_CONFIG.MESSAGE_PREVIEW_LENGTH) + '...'
        : desc;
    }
    
    // Handle text messages
    if (message.messageType === 'text') {
      const text = message.text || '';
      return text.length > PAGINATION_CONFIG.MESSAGE_PREVIEW_LENGTH 
        ? text.substring(0, PAGINATION_CONFIG.MESSAGE_PREVIEW_LENGTH) + '...' 
        : text;
    }
    
    // Handle media with caption
    if (message.caption) {
      return message.caption.length > PAGINATION_CONFIG.MESSAGE_PREVIEW_LENGTH
        ? message.caption.substring(0, PAGINATION_CONFIG.MESSAGE_PREVIEW_LENGTH) + '...'
        : message.caption;
    }
    
    return `[${message.messageType}]`;
  };
  
  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchQuery(sanitizeHTML(value));
  }, []);
  
  /**
   * Handle clear search button click
   */
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);
  
  /**
   * Handle schedule new - show choice modal
   */
  const handleScheduleNew = useCallback(() => {
    setShowChoiceModal(true);
  }, []);
  
  /**
   * Handle schedule message choice
   */
  const handleScheduleMessage = useCallback(() => {
    console.log('Schedule Message clicked');
    setShowChoiceModal(false);
    // Navigate to schedule message page
    navigate('/scheduled/message');
  }, [navigate]);
  
  /**
   * Handle schedule campaign choice
   */
  const handleScheduleCampaign = useCallback(() => {
    console.log('Schedule Campaign clicked');
    setShowChoiceModal(false);
    navigate('/campaigns/create');
  }, [navigate]);
  
  /**
   * Handle item click - navigate to details
   */
  const handleItemClick = useCallback((item) => {
    if (item.messageType === 'campaign' || item.campaignId) {
      // Navigate to campaign details
      navigate(`/campaigns/${item.campaignId || item._id}`);
    } else {
      // Navigate to conversation/inbox for messages
      if (item.conversationId?._id || item.conversationId) {
        const conversationId = item.conversationId?._id || item.conversationId;
        navigate(`/inbox?conversation=${conversationId}`);
      }
    }
  }, [navigate]);
  
  if (!user?.businessId) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <BusinessSetupRequired
            title="Business Setup Required"
            message="Please complete your business setup to manage scheduled messages."
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="scheduled-page page-container">
      <Navbar />
      
      <div className="page-content scheduled-page-content">
        {/* Header */}
        <div className="scheduled-header">
          <div className="scheduled-header-text" style={{ textAlign: 'center', width: '100%' }}>
            <h1 className="scheduled-title">Scheduled Items</h1>
            <p className="scheduled-subtitle">Manage scheduled messages and campaigns • {filteredMessages?.length || 0} shown of {scheduledMessages?.length || 0} total</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--primary">
              <MdApps />
            </div>
            <div className="stat-card__content">
              <p className="stat-card__label">Total</p>
              <div className="stat-card__value">{stats.total || 0}</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--warning">
              <MdSchedule />
            </div>
            <div className="stat-card__content">
              <p className="stat-card__label">Pending</p>
              <div className="stat-card__value">{stats.pending}</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--success">
              <MdCheckCircle />
            </div>
            <div className="stat-card__content">
              <p className="stat-card__label">Sent</p>
              <div className="stat-card__value">{stats.sent}</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--danger">
              <MdError />
            </div>
            <div className="stat-card__content">
              <p className="stat-card__label">Failed</p>
              <div className="stat-card__value">{stats.failed}</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--secondary">
              <MdCancel />
            </div>
            <div className="stat-card__content">
              <p className="stat-card__label">Cancelled</p>
              <div className="stat-card__value">{stats.cancelled}</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="scheduled-search-wrapper">
          <div className="scheduled-search-container">
            <MdSearch className="search-icon" />
            <input
              type="text"
              className="scheduled-search-input"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search scheduled items..."
              aria-label="Search scheduled items"
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
            <span className="filter-label">Type:</span>
            <div className="filter-chips">
              <button 
                className={`filter-chip ${typeFilter === 'all' ? 'filter-chip-active' : ''}`}
                onClick={() => setTypeFilter('all')}
              >
                <MdApps className="filter-chip-icon" />
                <span>All</span>
              </button>
              <button 
                className={`filter-chip ${typeFilter === 'message' ? 'filter-chip-active' : ''}`}
                onClick={() => setTypeFilter('message')}
              >
                <MdSms className="filter-chip-icon" />
                <span>Messages</span>
              </button>
              <button 
                className={`filter-chip ${typeFilter === 'campaign' ? 'filter-chip-active' : ''}`}
                onClick={() => setTypeFilter('campaign')}
              >
                <MdCampaign className="filter-chip-icon" />
                <span>Campaigns</span>
              </button>
            </div>
          </div>
          
          <div className="filter-section">
            <span className="filter-label">Status:</span>
            <div className="filter-chips">
              <button 
                className={`filter-chip ${statusFilter === 'all' ? 'filter-chip-active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                <MdApps className="filter-chip-icon" />
                <span>All</span>
              </button>
              <button 
                className={`filter-chip ${statusFilter === 'pending' ? 'filter-chip-active' : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                <MdSchedule className="filter-chip-icon" />
                <span>Pending</span>
              </button>
              <button 
                className={`filter-chip ${statusFilter === 'sent' ? 'filter-chip-active' : ''}`}
                onClick={() => setStatusFilter('sent')}
              >
                <MdCheckCircle className="filter-chip-icon" />
                <span>Sent</span>
              </button>
              <button 
                className={`filter-chip ${statusFilter === 'failed' ? 'filter-chip-active' : ''}`}
                onClick={() => setStatusFilter('failed')}
              >
                <MdError className="filter-chip-icon" />
                <span>Failed</span>
              </button>
              <button 
                className={`filter-chip ${statusFilter === 'cancelled' ? 'filter-chip-active' : ''}`}
                onClick={() => setStatusFilter('cancelled')}
              >
                <MdCancel className="filter-chip-icon" />
                <span>Cancelled</span>
              </button>
            </div>
          </div>
        </Card>
      
        {/* Scheduled Items List */}
        {loading ? (
          <div aria-busy="true" aria-live="polite">
            <LoadingSkeleton type="card" />
          </div>
        ) : (filteredMessages?.length || 0) === 0 ? (
          <Card className="scheduled-empty-state">
            <div className="empty-state-icon"><MdSchedule /></div>
            <h3 className="empty-state-title">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'No Matching Results'
                : 'No Scheduled Items Found'}
            </h3>
            <p className="empty-state-text">
              {searchQuery && statusFilter !== 'all' && typeFilter !== 'all'
                ? `No ${typeFilter === 'all' ? 'items' : typeFilter} with "${statusFilter}" status matching "${searchQuery}" found. Try different search terms or filters.`
                : searchQuery && statusFilter !== 'all'
                ? `No ${statusFilter} items matching "${searchQuery}" found. Try a different search term or status filter.`
                : searchQuery && typeFilter !== 'all'
                ? `No ${typeFilter} matching "${searchQuery}" found. Try a different search term or type filter.`
                : searchQuery
                ? `No items matching "${searchQuery}" found. Try a different search term.`
                : statusFilter !== 'all' && typeFilter !== 'all'
                ? `No ${typeFilter} with "${statusFilter}" status found. Try adjusting your filters.`
                : statusFilter !== 'all'
                ? `No ${statusFilter} items found. Try selecting a different status or clear the filter.`
                : typeFilter !== 'all'
                ? `No ${typeFilter} scheduled yet. Schedule your first ${typeFilter === 'messages' ? 'message' : 'campaign'} to get started.`
                : 'Schedule messages and campaigns to send them automatically at a specific time'}
            </p>
            {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
              <Button onClick={handleScheduleNew}>
                <MdAdd /> Schedule New Item
              </Button>
            )}
          </Card>
        ) : (
          <div className="scheduled-list">
            {filteredMessages?.map(item => (
              <Card 
                key={item._id} 
                className="scheduled-list-item"
                hoverable
                onClick={() => handleItemClick(item)}
              >
                <div className="campaign-item-header">
                  <div className="campaign-item-left">
                    <h3 className="campaign-item-name">
                      {item.messageType === 'campaign' || item.campaignId 
                        ? item.name || item.text || 'Campaign'
                        : item.conversationId?.contact?.name || 'Unknown Contact'}
                    </h3>
                    <p className="campaign-item-description">
                      {item.messageType === 'campaign' || item.campaignId
                        ? item.description || 'No description'
                        : item.conversationId?.contact?.phoneNumber || item.phoneNumber || 'No phone'}
                    </p>
                  </div>
                  <div className="campaign-item-right">
                    {renderStatusBadge(item.status)}
                  </div>
                </div>

                <div className="campaign-item-stats">
                  <div className="campaign-stat-item">
                    <MdSchedule className="campaign-stat-icon" />
                    <span className="campaign-stat-value">{(item.stats?.pending || 0).toLocaleString()}</span>
                    <span className="campaign-stat-label">Pending</span>
                  </div>
                  <div className="campaign-stat-item">
                    <MdSend className="campaign-stat-icon" />
                    <span className="campaign-stat-value">{(item.stats?.sent || 0).toLocaleString()}</span>
                    <span className="campaign-stat-label">Sent</span>
                  </div>
                  <div className="campaign-stat-item">
                    <MdDoneAll className="campaign-stat-icon" />
                    <span className="campaign-stat-value">{(item.stats?.delivered || 0).toLocaleString()}</span>
                    <span className="campaign-stat-label">Delivered</span>
                  </div>
                  <div className="campaign-stat-item">
                    <MdVisibility className="campaign-stat-icon" />
                    <span className="campaign-stat-value">{(item.stats?.read || 0).toLocaleString()}</span>
                    <span className="campaign-stat-label">Read</span>
                  </div>
                  <div className="campaign-stat-item">
                    <MdError className="campaign-stat-icon" />
                    <span className="campaign-stat-value">{(item.stats?.failed || 0)}</span>
                    <span className="campaign-stat-label">Failed</span>
                  </div>
                  
                  {/* Action buttons in stats row - absolute positioned */}
                  <div className="campaign-item-actions-wrapper">
                    {/* Campaign actions */}
                    {(item.messageType === 'campaign' || item.campaignId) && (
                      <>
                        {/* Pause button for scheduled/active campaigns */}
                        {['scheduled', 'active'].includes(item.status) && (
                          <button
                            className="action-btn action-btn-pause"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActioningItem(item);
                              setShowPauseModal(true);
                            }}
                          >
                            Pause
                          </button>
                        )}
                        
                        {/* Resume button for paused campaigns */}
                        {item.status === 'paused' && (
                          <button
                            className="action-btn action-btn-success"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActioningItem(item);
                              setShowResumeModal(true);
                            }}
                          >
                            Resume
                          </button>
                        )}
                        
                        {/* Cancel button for scheduled/paused campaigns */}
                        {['scheduled', 'paused'].includes(item.status) && (
                          <button
                            className="action-btn action-btn-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelClick(item);
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </>
                    )}
                    
                    {/* Message actions */}
                    {!(item.messageType === 'campaign' || item.campaignId) && item.status === 'pending' && (
                      <button
                        className="action-btn action-btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelClick(item);
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="campaign-item-footer">
                  <div className="campaign-item-meta">
                    <span><MdPeople /> {item.stats?.total || item.recipients?.length || (item.messageType === 'campaign' || item.campaignId ? 0 : 1)} recipients</span>
                    <span><MdCalendarToday /> {formatDate(item.scheduledFor || item.createdAt)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </button>
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn btn-secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        )}

        {/* Floating Action Button - Only show when there are scheduled items */}
        {user?.businessId && (stats.total > 0) && (
          <button 
            className="scheduled-fab" 
            onClick={handleScheduleNew}
            title="Schedule Message"
          >
            <MdAdd />
          </button>
        )}
      </div>
      
      {/* Schedule Choice Modal */}
      {showChoiceModal && (
        <div className="modal-overlay" onClick={() => setShowChoiceModal(false)} role="dialog" aria-modal="true">
          <div className="confirmation-modal" role="document" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-button" 
              onClick={() => setShowChoiceModal(false)}
              aria-label="Close modal"
            >
              <MdClose />
            </button>

            <div className="modal-icon-container">
              <MdSchedule className="modal-icon modal-icon-info" />
            </div>

            <h2 className="modal-title">What would you like to schedule?</h2>
            <p className="modal-message">Choose whether to schedule a message or a campaign.</p>

            <div className="modal-actions" style={{ display: 'flex', gap: 'var(--spacing-sm)', flexDirection: 'column' }}>
              <Button 
                variant="primary"
                onClick={handleScheduleMessage}
                icon={<MdSms />}
                fullWidth={true}
              >
                Schedule Message
              </Button>
              <Button 
                variant="primary"
                onClick={handleScheduleCampaign}
                icon={<MdCampaign />}
                fullWidth={true}
              >
                Schedule Campaign
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setActioningItem(null);
        }}
        onConfirm={handleCancelMessage}
        title={`Cancel ${actioningItem?.messageType === 'campaign' || actioningItem?.campaignId ? 'Campaign' : 'Message'}`}
        message={`Are you sure you want to cancel this ${actioningItem?.messageType === 'campaign' || actioningItem?.campaignId ? 'campaign' : 'scheduled message'}? This action cannot be undone.`}
        variant="danger"
        confirmText="Cancel Item"
      />

      {/* Pause Campaign Modal */}
      <ConfirmationModal
        isOpen={showPauseModal}
        onClose={() => {
          setShowPauseModal(false);
          setActioningItem(null);
        }}
        onConfirm={handlePauseCampaign}
        title="Pause Campaign"
        message="Are you sure you want to pause this campaign? You can resume it later."
        variant="warning"
        confirmText="Pause Campaign"
      />

      {/* Resume Campaign Modal */}
      <ConfirmationModal
        isOpen={showResumeModal}
        onClose={() => {
          setShowResumeModal(false);
          setActioningItem(null);
        }}
        onConfirm={handleResumeCampaign}
        title="Resume Campaign"
        message="Are you sure you want to resume this campaign? It will continue from where it was paused."
        variant="success"
        confirmText="Resume Campaign"
      />
    </div>
  );
};

export default Scheduled;

