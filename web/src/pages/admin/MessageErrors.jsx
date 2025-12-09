import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import Navbar from '../../components/Navbar';
import { MdError, MdWarning, MdNetworkCheck, MdPhone, MdBlock, MdTimer, MdDescription, MdRefresh, MdCheckCircle, MdCancel } from 'react-icons/md';
import './MessageErrors.css';

const MessageErrors = () => {
  const toast = useToast();
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const errorsPerPage = 15;

  const errorTypes = ['all', 'NETWORK_ERROR', 'INVALID_NUMBER', 'BLOCKED', 'RATE_LIMIT', 'TEMPLATE_ERROR', 'OTHER'];

  useEffect(() => {
    fetchErrors();
  }, [currentPage, filter]);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: errorsPerPage
      };
      if (filter !== 'all') {
        params.errorType = filter;
      }

      const data = await fetch(`/api/messages/failed?${new URLSearchParams(params)}`);
      setErrors(data.errors || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch message errors:', error);
      toast.error('Failed to load message errors');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (errorId) => {
    try {
      await fetch(`/api/messages/${errorId}/retry`, { method: 'POST' });
      toast.success('✅ Message retry queued');
      fetchErrors();
    } catch (error) {
      console.error('Failed to retry message:', error);
      toast.error('Failed to retry message');
    }
  };

  const handleDismiss = async (errorId) => {
    try {
      await fetch(`/api/messages/${errorId}/dismiss`, { method: 'PUT' });
      toast.success('✅ Error dismissed');
      fetchErrors();
    } catch (error) {
      console.error('Failed to dismiss error:', error);
      toast.error('Failed to dismiss error');
    }
  };

  const getErrorIcon = (errorType) => {
    const iconStyle = { fontSize: '18px' };
    switch (errorType) {
      case 'NETWORK_ERROR': return <MdNetworkCheck style={iconStyle} />;
      case 'INVALID_NUMBER': return <MdPhone style={iconStyle} />;
      case 'BLOCKED': return <MdBlock style={iconStyle} />;
      case 'RATE_LIMIT': return <MdTimer style={iconStyle} />;
      case 'TEMPLATE_ERROR': return <MdDescription style={iconStyle} />;
      default: return <MdWarning style={iconStyle} />;
    }
  };

  const getErrorColor = (errorType) => {
    switch (errorType) {
      case 'NETWORK_ERROR': return '#FF9800';
      case 'INVALID_NUMBER': return '#F44336';
      case 'BLOCKED': return '#E91E63';
      case 'RATE_LIMIT': return '#FFC107';
      case 'TEMPLATE_ERROR': return '#9C27B0';
      default: return '#9E9E9E';
    }
  };

  if (loading && currentPage === 1) {
    return (
      <>
        <Navbar />
        <div className="message-errors-container">
          <LoadingSkeleton type="list" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="message-errors-container">
        <div className="message-errors-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
            <h1><MdError style={{ verticalAlign: 'middle' }} /> Message Errors</h1>
            <button
              onClick={fetchErrors}
              className="icon-button"
              title="Refresh"
              style={{ marginLeft: 'auto' }}
            >
              <MdRefresh /> Refresh
            </button>
          </div>
          <p>Monitor and resolve failed message deliveries</p>
        </div>

        <div className="error-stats">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{errors.length}</div>
              <div className="stat-label">Total Errors</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔄</div>
            <div className="stat-content">
              <div className="stat-value">
                {errors.filter(e => e.status === 'PENDING').length}
              </div>
              <div className="stat-label">Pending Retry</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <div className="stat-value">
                {errors.filter(e => e.status === 'FAILED').length}
              </div>
              <div className="stat-label">Failed</div>
            </div>
          </div>
        </div>

        <div className="filters-section">
          <div className="filter-buttons">
            {errorTypes.map(type => (
              <button
                key={type}
                className={`filter-btn ${filter === type ? 'active' : ''}`}
                onClick={() => { setFilter(type); setCurrentPage(1); }}
              >
                {type === 'all' ? 'All Errors' : type.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {errors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><MdCheckCircle style={{ fontSize: '64px', color: '#4CAF50' }} /></div>
            <h3>No message errors</h3>
            <p>All messages are being delivered successfully!</p>
          </div>
        ) : (
          <>
            <div className="errors-list">
              {errors.map((error) => (
                <div key={error._id} className="error-card">
                  <div className="error-header">
                    <div className="error-type-badge" style={{ background: `${getErrorColor(error.errorType)}20`, color: getErrorColor(error.errorType) }}>
                      {getErrorIcon(error.errorType)} {error.errorType}
                    </div>
                    <div className="error-timestamp">
                      {new Date(error.timestamp || error.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="error-content">
                    <div className="error-details">
                      <h4>Error Details</h4>
                      <p className="error-message">{error.errorMessage || error.message}</p>
                      {error.errorCode && (
                        <p className="error-code">Code: {error.errorCode}</p>
                      )}
                    </div>
                    
                    <div className="message-info">
                      <div className="info-item">
                        <span className="info-label">To:</span>
                        <span className="info-value">{error.to || error.recipient}</span>
                      </div>
                      {error.contact && (
                        <div className="info-item">
                          <span className="info-label">Contact:</span>
                          <span className="info-value">{error.contact.name}</span>
                        </div>
                      )}
                      {error.messageContent && (
                        <div className="info-item">
                          <span className="info-label">Message:</span>
                          <span className="info-value message-preview">
                            {error.messageContent.substring(0, 100)}
                            {error.messageContent.length > 100 ? '...' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="error-footer">
                    <div className="error-status">
                      <span className={`status-badge ${error.status?.toLowerCase()}`}>
                        {error.status || 'FAILED'}
                      </span>
                      {error.retryCount > 0 && (
                        <span className="retry-count">🔄 Retried {error.retryCount} times</span>
                      )}
                    </div>
                    <div className="error-actions">
                      <button 
                        className="retry-btn"
                        onClick={() => handleRetry(error._id)}
                        disabled={error.status === 'RETRYING'}
                      >
                        <MdRefresh /> Retry
                      </button>
                      <button 
                        className="dismiss-btn"
                        onClick={() => handleDismiss(error._id)}
                      >
                        <MdCheckCircle /> Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>
                <div className="page-info">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default MessageErrors;

