import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ConfirmationModal from '../../components/ConfirmationModal';
import ScheduleMessageModal from '../../components/ScheduleMessageModal';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { API_BASE_URL } from '../../config/api';
import { MdSchedule, MdCancel, MdCheckCircle, MdError, MdDelete, MdRefresh, MdSearch, MdAdd } from 'react-icons/md';
import './ScheduledMessages.css';

const ScheduledMessages = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, sent: 0, failed: 0, cancelled: 0, total: 0 });
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingMessageId, setCancellingMessageId] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    if (user?.businessId) {
      fetchScheduledMessages();
      fetchStats();
    }
  }, [currentPage, statusFilter, dateRange, user?.businessId]);
  
  useEffect(() => {
    applyFilters();
  }, [scheduledMessages, searchQuery, statusFilter]);
  
  const fetchScheduledMessages = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (dateRange.start) {
        params.append('startDate', dateRange.start);
      }
      
      if (dateRange.end) {
        params.append('endDate', dateRange.end);
      }
      
      const response = await fetch(`${API_BASE_URL}/scheduled-messages?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setScheduledMessages(data.scheduledMessages);
        setFilteredMessages(data.scheduledMessages);
        setTotalPages(data.pages);
      } else {
        throw new Error('Failed to fetch scheduled messages');
      }
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
      toast.error('Failed to load scheduled messages');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/scheduled-messages/stats/summary`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
  const applyFilters = () => {
    let filtered = [...scheduledMessages];
    
    if (searchQuery) {
      filtered = filtered.filter(msg => 
        msg.conversationId?.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.conversationId?.contact?.phoneNumber?.includes(searchQuery) ||
        msg.content?.text?.body?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredMessages(filtered);
  };
  
  const handleCancelClick = (id) => {
    setCancellingMessageId(id);
    setShowCancelModal(true);
  };

  const handleCancelMessage = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/scheduled-messages/${cancellingMessageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        toast.success('Scheduled message cancelled successfully');
        setShowCancelModal(false);
        setCancellingMessageId(null);
        fetchScheduledMessages();
        fetchStats();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel message');
      }
    } catch (error) {
      console.error('Error cancelling message:', error);
      toast.error(error.message || 'Failed to cancel message');
      setShowCancelModal(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return <MdSchedule style={{ color: '#f59e0b' }} />;
      case 'sent': return <MdCheckCircle style={{ color: '#10b981' }} />;
      case 'failed': return <MdError style={{ color: '#ef4444' }} />;
      case 'cancelled': return <MdCancel style={{ color: '#6b7280' }} />;
      default: return <MdSchedule />;
    }
  };
  
  const handleEditMessage = (message) => {
    setEditingMessage(message);
    setShowScheduleModal(true);
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
  
  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'status-pending', text: 'Pending' },
      sent: { class: 'status-sent', text: 'Sent' },
      failed: { class: 'status-failed', text: 'Failed' },
      cancelled: { class: 'status-cancelled', text: 'Cancelled' }
    };
    
    const badge = badges[status] || badges.pending;
    
    return (
      <span className={`status-badge ${badge.class}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {getStatusIcon(status)}
        {badge.text}
      </span>
    );
  };
  
  const getMessagePreview = (message) => {
    if (message.messageType === 'text') {
      const text = message.content?.text?.body || message.content?.body || '';
      return text.length > 50 ? text.substring(0, 50) + '...' : text;
    }
    return `[${message.messageType}]`;
  };
  
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
    <div className="scheduled-messages-page">
      <Navbar />
      <div className="page-header">
        <div>
          <h1>📅 Scheduled Messages</h1>
          <p>Manage and track your scheduled WhatsApp messages</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              fetchScheduledMessages();
              fetchStats();
            }}
          >
            <MdRefresh /> Refresh
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setEditingMessage(null);
              setShowScheduleModal(true);
            }}
          >
            <MdSchedule /> Schedule Message
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon"></div>
          <div className="stat-content">
            <div className="stat-value">{stats.sent}</div>
            <div className="stat-label">Sent</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-value">{stats.failed}</div>
            <div className="stat-label">Failed</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🚫</div>
          <div className="stat-content">
            <div className="stat-value">{stats.cancelled}</div>
            <div className="stat-label">Cancelled</div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search scheduled messages by contact name or message content"
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <select 
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        
        <div className="filter-group">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="date-input"
          />
          <span className="date-separator">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="date-input"
          />
        </div>
      </div>
      
      {/* Messages Table */}
      {loading ? (
        <LoadingSkeleton type="table" />
      ) : filteredMessages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No scheduled messages</h3>
          <p>Schedule a message to send it automatically at a specific time</p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowScheduleModal(true)}
          >
            Schedule Your First Message
          </button>
        </div>
      ) : (
        <>
          <div className="messages-table">
            <table>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Scheduled Time</th>
                  <th>Message Preview</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Recurrence</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMessages.map(message => (
                  <tr key={message._id}>
                    <td>
                      <div className="contact-info">
                        <div className="contact-name">
                          {message.conversationId?.contact?.name || 'Unknown'}
                        </div>
                        <div className="contact-phone">
                          {message.conversationId?.contact?.phoneNumber}
                        </div>
                      </div>
                    </td>
                    <td>{formatDate(message.scheduledTime)}</td>
                    <td className="message-preview">{getMessagePreview(message)}</td>
                    <td><span className="type-badge">{message.messageType}</span></td>
                    <td>{getStatusBadge(message.status)}</td>
                    <td>
                      {message.recurrence?.enabled ? (
                        <span className="recurrence-badge">
                          {message.recurrence.frequency}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {message.status === 'pending' && (
                          <>
                            <button
                              className="btn-icon"
                              onClick={() => handleEditMessage(message)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-icon btn-danger"
                              onClick={() => handleCancelClick(message._id)}
                              title="Cancel"
                            >
                              <MdCancel />
                            </button>
                          </>
                        )}
                        {message.status === 'failed' && message.failureReason && (
                          <button
                            className="btn-icon"
                            onClick={() => alert(message.failureReason)}
                            title="View Error"
                          >
                            ℹ️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
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
        </>
      )}
      
      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleMessageModal
          message={editingMessage}
          onClose={() => {
            setShowScheduleModal(false);
            setEditingMessage(null);
          }}
          onSuccess={() => {
            setShowScheduleModal(false);
            setEditingMessage(null);
            fetchScheduledMessages();
            fetchStats();
          }}
        />
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setCancellingMessageId(null);
        }}
        onConfirm={handleCancelMessage}
        title="Cancel Scheduled Message"
        message="Are you sure you want to cancel this scheduled message? This action cannot be undone."
        variant="danger"
        confirmText="Cancel Message"
      />
    </div>
  );
};

export default ScheduledMessages;

