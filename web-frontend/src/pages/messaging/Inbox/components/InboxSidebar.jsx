import React from 'react';
import { MdSearch } from 'react-icons/md';
import { BiMessageDetail } from 'react-icons/bi';
import Input from '../../../../components/Input';
import BusinessSetupRequired from '../../../../components/BusinessSetupRequired';
import { formatTime, getInitials, truncateMessage } from '../utils';

const InboxSidebar = ({
  searchQuery,
  setSearchQuery,
  setPage,
  filterStatus,
  setFilterStatus,
  error,
  conversations,
  selectedConversation,
  handleConversationClick,
  hasMore,
  handleLoadMore,
  loading
}) => {
  return (
    <div className="inbox-sidebar">
      {/* Search and Filters */}
      <div className="inbox-controls">
        <div style={{ position: 'relative' }}>
          <MdSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '20px' }} />
          <Input
            type="text"
            placeholder="Search by contact name or phone number"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="search-input"
            style={{ paddingLeft: '40px' }}
          />
        </div>
        
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => {
              setFilterStatus('all');
              setPage(1);
            }}
          >
            All
          </button>
          <button
            className={`filter-tab ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => {
              setFilterStatus('active');
              setPage(1);
            }}
          >
            Active
          </button>
          <button
            className={`filter-tab ${filterStatus === 'closed' ? 'active' : ''}`}
            onClick={() => {
              setFilterStatus('closed');
              setPage(1);
            }}
          >
            Closed
          </button>
          <button
            className={`filter-tab ${filterStatus === 'blocked' ? 'active' : ''}`}
            onClick={() => {
              setFilterStatus('blocked');
              setPage(1);
            }}
          >
            Blocked
          </button>
        </div>
      </div>

      {error && (error.includes('business') || error.includes('X-Business-ID')) ? (
        <BusinessSetupRequired 
          message="Please complete your business setup to start managing conversations"
        />
      ) : error ? (
        <div className="error-banner">
          <span>{error}</span>
        </div>
      ) : null}

      {/* Conversation List */}
      {!error && (
        <div className="conversation-list">
          {conversations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <BiMessageDetail size={48} />
              </div>
              <h3>No conversations yet</h3>
              <p>Your conversations will appear here</p>
            </div>
          ) : (
          <>
            {conversations.map((conversation) => (
              <div
                key={conversation._id}
                className={`conversation-item ${conversation.unreadCount > 0 ? 'unread' : ''} ${selectedConversation?._id === conversation._id ? 'selected' : ''}`}
                onClick={() => handleConversationClick(conversation)}
              >
                <div className="conversation-avatar">
                  {conversation.contact?.profilePicture ? (
                    <img src={conversation.contact.profilePicture} alt={conversation.contact.name} />
                  ) : (
                    <div className="avatar-placeholder">
                      {getInitials(conversation.contact?.name || conversation.contact?.phoneNumber)}
                    </div>
                  )}
                </div>
                
                <div className="conversation-details">
                  <div className="conversation-header">
                    <h4 className="conversation-name">
                      {conversation.contact?.name || conversation.contact?.phoneNumber}
                    </h4>
                    <span className="conversation-time">
                      {formatTime(conversation.lastMessageAt)}
                    </span>
                  </div>
                  
                  <div className="conversation-preview">
                    <p className="last-message">
                      {conversation.lastMessage?.text 
                        ? truncateMessage(conversation.lastMessage.text) 
                        : conversation.lastMessage?.type === 'template'
                          ? truncateMessage(`Template: ${conversation.lastMessage?.content?.template?.name || 'message'}`)
                          : conversation.lastMessage?.type
                            ? `[${conversation.lastMessage.type.charAt(0).toUpperCase() + conversation.lastMessage.type.slice(1)}]`
                            : 'No messages'}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="unread-badge">{conversation.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {hasMore && (
              <button 
                className="load-more-btn"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            )}
          </>
        )}
        </div>
      )}
    </div>
  );
};

export default InboxSidebar;
// trigger rebuild
