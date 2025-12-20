/**
 * 💬 Inbox Page Component
 * 
 * Main messaging interface for WhatsApp Business conversations.
 * Displays conversation list with real-time updates and full message view.
 * Supports text messages, media attachments, and conversation management.
 * 
 * @component
 * @requires react-router-dom - Navigation
 * @requires Toast - Notifications
 * @requires AuthContext - User authentication
 * @requires inboxService - Conversation and message APIs
 * @requires mediaService - Media upload handling
 * 
 * @features
 * - Conversation list with search and filtering
 * - Real-time message updates (5s polling)
 * - Infinite scroll for message history
 * - Media upload with progress (images, documents, audio)
 * - Conversation status management (active, closed, blocked)
 * - Unread message indicators
 * - Typing indicators
 * - Mark as read functionality
 * - Date separators in message history
 * - Business setup validation
 * 
 * @state
 * - conversations: Array of conversation objects
 * - selectedConversation: Currently active conversation
 * - conversationMessages: Messages for selected conversation
 * - searchQuery: Filter conversations by name/phone
 * - filterStatus: 'all' | 'active' | 'closed' | 'blocked'
 * - uploadProgress: Media upload percentage (0-100)
 * 
 * @constants
 * - MESSAGES_PER_PAGE: 20
 * - MESSAGE_POLL_INTERVAL: 5000ms
 * - MAX_FILE_SIZE: 16MB (WhatsApp limit)
 * - SCROLL_THRESHOLD: 300px from top triggers load more
 * - SEARCH_DEBOUNCE: 500ms
 * 
 * @accessibility
 * - ARIA labels on controls
 * - aria-busy for loading states
 * - aria-live for dynamic updates
 * 
 * @example
 * <Route path="/inbox" element={<Inbox />} />
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import * as inboxService from '../../services/messaging/inboxService';
import * as mediaService from '../../services/media/mediaService';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import ImageLightbox from '../../components/ImageLightbox';
import { MdSearch, MdSend, MdAttachFile,MdUploadFile,MdInsertDriveFile, MdImage, MdCheckCircle, MdCancel, MdClose, MdMoreVert, MdPersonAdd, MdBlock, MdArchive } from 'react-icons/md';
import { IoCheckmarkDone, IoCheckmark, IoTime, IoSend } from 'react-icons/io5';
import { BsThreeDotsVertical, BsEmojiSmile, BsMic, BsPaperclip } from 'react-icons/bs';
import { BiMessageDetail } from 'react-icons/bi';
import { HiOutlineDocumentText } from 'react-icons/hi';
import { AiOutlinePhone, AiOutlineVideoCamera } from 'react-icons/ai';
import '../../components/Stats.css';
import './Inbox.css';

/**
 * Configuration constants for inbox behavior
 */
const INBOX_CONFIG = {
  MESSAGES_PER_PAGE: 20,
  MESSAGE_HISTORY_PER_PAGE: 9,
  MESSAGE_POLL_INTERVAL: 5000, // 5 seconds
  MAX_FILE_SIZE: 16 * 1024 * 1024, // 16MB WhatsApp limit
  SCROLL_THRESHOLD: 300, // px from top
  SCROLL_BUTTON_THRESHOLD: 100, // px from bottom
  SEARCH_DEBOUNCE: 500, // ms
  TYPING_INDICATOR_TIMEOUT: 3000 // ms
};

const Inbox = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const previousScrollHeightRef = useRef(0);
  const autoRefreshIntervalRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [messagePage, setMessagePage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [lightboxImage, setLightboxImage] = useState({ isOpen: false, url: '', caption: '' });

  useEffect(() => {
    loadInboxData();
  }, [filterStatus, page]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery) {
        loadInboxData();
      }
    }, INBOX_CONFIG.SEARCH_DEBOUNCE);
    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  // Cleanup auto-refresh interval on unmount or conversation change
  useEffect(() => {
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [selectedConversation]);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
      setShowScrollButton(false);
      setUnreadMessageCount(0);
    }
  };

  const scrollToBottomInstant = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
      setShowScrollButton(false);
      setUnreadMessageCount(0);
    }
  };

  const loadInboxData = async () => {
    try {
      if (page === 1) setLoading(true);

      // Build query params
      const params = {
        page,
        limit: INBOX_CONFIG.MESSAGES_PER_PAGE,
        sortBy: 'lastMessageAt',
        sortOrder: -1
      };

      if (filterStatus && filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      // Fetch conversations and stats in parallel
      const promises = [
        inboxService.getConversations(params)
      ];

      if (page === 1) {
        promises.push(inboxService.getInboxStats());
      }

      const results = await Promise.all(promises);
      const conversationsData = results[0];
      const statsData = results[1];
      
      if (page === 1) {
        setConversations(conversationsData.conversations || []);
      } else {
        setConversations(prev => [...prev, ...(conversationsData.conversations || [])]);
      }
      
      setHasMore((conversationsData.page || 1) < (conversationsData.pages || 1));

      if (statsData) {
        setStats(statsData);
      }

      setError('');
    } catch (err) {
      console.error('Error loading inbox data:', err);
      const errorMsg = err.response?.data?.message || 'Failed to load inbox. Please try again.';
      setError(errorMsg);
      
      // Don't show toast for business setup errors
      if (!errorMsg.includes('business') && !errorMsg.includes('X-Business-ID')) {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = useCallback(async () => {
    if (!selectedConversation || !hasMoreMessages || loadingMoreMessages) {
      console.log('Load more blocked:', { 
        selectedConversation: !!selectedConversation, 
        hasMoreMessages, 
        loadingMoreMessages,
        currentPage: messagePage 
      });
      return;
    }
    
    console.log('Loading more messages, page:', messagePage + 1, 'Current messages:', conversationMessages.length);
    setLoadingMoreMessages(true);
    const container = messagesContainerRef.current;
    if (container) {
      previousScrollHeightRef.current = container.scrollHeight;
    }
    
    try {
      const nextPage = messagePage + 1;
      const response = await inboxService.getMessages(selectedConversation._id, { page: nextPage, limit: 9 });
      const data = response.data || response; // Handle both wrapped and unwrapped responses
      
      console.log('Loaded messages:', {
        messagesCount: data.messages?.length,
        hasMore: data.pagination?.hasMore,
        totalInResponse: data.pagination?.total,
        page: data.pagination?.page
      });
      
      if (data.messages && data.messages.length > 0) {
        setConversationMessages(prev => {
          console.log('Prepending messages. Before:', prev.length, 'Adding:', data.messages.length);
          return [...data.messages, ...prev];
        });
        setMessagePage(nextPage);
        setHasMoreMessages(data.pagination?.hasMore || false);
        
        // Restore scroll position after adding messages at top
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            const scrollDiff = newScrollHeight - previousScrollHeightRef.current;
            container.scrollTop = scrollDiff;
            console.log('Scroll restored. Diff:', scrollDiff, 'New scrollTop:', container.scrollTop);
          }
        }, 50);
      } else {
        console.log('No messages returned, setting hasMoreMessages to false');
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error('Error loading more messages:', err);
      toast.error('Failed to load more messages');
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [selectedConversation, hasMoreMessages, loadingMoreMessages, messagePage, toast, conversationMessages.length]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !selectedConversation) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrolledFromTop = scrollTop;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      console.log('Scroll event:', { 
        scrollTop, 
        scrollHeight, 
        clientHeight, 
        distanceFromBottom, 
        hasMoreMessages,
        loadingMoreMessages,
        messagePage 
      });
      
      // Show scroll to bottom button when user scrolls up from bottom
      setShowScrollButton(distanceFromBottom > INBOX_CONFIG.SCROLL_BUTTON_THRESHOLD);
      
      // Load more messages when scrolled near the top
      if (scrolledFromTop < INBOX_CONFIG.SCROLL_THRESHOLD && hasMoreMessages && !loadingMoreMessages) {
        console.log('Triggering load more messages - Page:', messagePage + 1);
        loadMoreMessages();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMoreMessages, loadingMoreMessages, selectedConversation, loadMoreMessages, messagePage]);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getDateSeparator = (date) => {
    const msgDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const shouldShowDateSeparator = (currentMsg, previousMsg) => {
    if (!previousMsg) return true;
    const currentDate = new Date(currentMsg.timestamp).toDateString();
    const previousDate = new Date(previousMsg.timestamp).toDateString();
    return currentDate !== previousDate;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const truncateMessage = (text, maxLength = 50) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Helper to render message status indicators (DRY principle)
  const renderMessageStatus = (message) => {
    if (message.direction !== 'outgoing') return null;
    
    return (
      <span className="message-status">
        {message.status === 'read' && <IoCheckmarkDone size={16} color="#53bdeb" title="Read" />}
        {message.status === 'delivered' && <IoCheckmarkDone size={16} color="#8696a0" title="Delivered" />}
        {message.status === 'sent' && <IoCheckmark size={16} color="#8696a0" title="Sent" />}
        {message.status === 'pending' && <IoTime size={16} color="#8696a0" title="Pending" />}
        {message.status === 'failed' && <MdCancel size={16} color="#ef4444" title="Failed" />}
      </span>
    );
  };

  // Helper to render message metadata (timestamp and status)
  const renderMessageMeta = (message, inline = false) => {
    const className = inline ? "message-meta-inline" : "message-meta";
    return (
      <div className={className}>
        <span className="message-time">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {renderMessageStatus(message)}
      </div>
    );
  };

  const handleConversationClick = async (conversation) => {
    // Clear any existing auto-refresh interval immediately
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
    
    setSelectedConversation(conversation);
    setLoadingMessages(true);
    setMessagePage(1);
    setConversationMessages([]);
    
    try {
      // Load all messages (no pagination needed)
      const response = await inboxService.getMessages(conversation._id, { page: 1, limit: 1000 });
      const data = response.data || response; // Handle both wrapped and unwrapped responses
      console.log('Initial messages loaded:', {
        count: data.messages?.length,
        hasMore: data.pagination?.hasMore,
        total: data.pagination?.total,
        page: data.pagination?.page
      });
      setConversationMessages(data.messages || []);
      setHasMoreMessages(data.pagination?.hasMore || false);
      
      // Update conversation in list to remove unread count immediately for better UX
      setConversations(prev => prev.map(c => 
        c._id === conversation._id ? { ...c, unreadCount: 0 } : c
      ));
      
      // Mark as read on server (non-blocking to avoid timeout issues)
      inboxService.markAsRead(conversation._id).catch(err => {
        console.warn('Failed to mark as read:', err);
      });
      
      // Note: Auto-refresh disabled to prevent timeout issues
      // New messages will be received via WebSocket or manual refresh
    } catch (err) {
      console.error('Error loading conversation messages:', err);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
      setShowScrollButton(false);
      setUnreadMessageCount(0);
      // Scroll to bottom after loading completes
      setTimeout(() => {
        scrollToBottomInstant();
      }, 100);
    }
  };

  const handleTyping = (e) => {
    setMessageText(e.target.value);
    // Simulate typing indicator (in real app, send via socket)
    if (e.target.value.length > 0 && !isTyping) {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || sending || !selectedConversation) return;

    setSending(true);
    const messageToSend = messageText;
    
    try {
      // Send message
      await inboxService.sendMessage(selectedConversation._id, {
        type: 'text',
        text: messageToSend
      });

      setMessageText('');
      toast.success('✅ Message sent');
      
      // Reload messages in background (non-blocking)
      inboxService.getMessages(selectedConversation._id, { limit: 1000 })
        .then(response => {
          const data = response.data || response;
          setConversationMessages(data.messages || []);
        })
        .catch(err => console.warn('Failed to reload messages:', err));
      
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMsg = err.response?.data?.message || 'Failed to send message';
      toast.error(errorMsg);
    } finally {
      setSending(false);
    }
  };

  const handleCloseConversation = async () => {
    if (!selectedConversation) return;

    try {
      await inboxService.updateConversationStatus(selectedConversation._id, 'closed');
      toast.success('Conversation closed');
      
      // Clear selection and reload
      setSelectedConversation(null);
      loadInboxData();
    } catch (err) {
      console.error('Error closing conversation:', err);
      const errorMsg = err.response?.data?.message || 'Failed to close conversation';
      toast.error(errorMsg);
    }
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    // Validate file size (WhatsApp limit)
    if (file.size > INBOX_CONFIG.MAX_FILE_SIZE) {
      toast.error(`File size must be less than ${INBOX_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    setUploadingMedia(true);
    setUploadProgress(0);

    try {
      // Upload media file to Cloudinary
      console.log('📤 Starting Cloudinary upload...', { filename: file.name, size: file.size, type: file.type });
      
      const uploadData = await mediaService.uploadMedia(file, (progress) => {
        setUploadProgress(progress);
        console.log(`⏳ Upload progress: ${progress}%`);
      });
      
      console.log('✅ Cloudinary upload successful:', uploadData);
      
      // Validate upload response
      if (!uploadData?.media?.cloudinaryUrl) {
        throw new Error('Invalid upload response: missing cloudinaryUrl');
      }
      
      // Send message with Cloudinary URL (WhatsApp will fetch from this URL)
      const mediaType = uploadData.media.mediaType;
      const messagePayload = {
        type: mediaType,
        mediaUrl: uploadData.media.cloudinaryUrl,
        caption: ''
      };
      
      console.log('📨 Sending message with payload:', messagePayload);

      await inboxService.sendMessage(selectedConversation._id, messagePayload);
      
      toast.success(`${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} sent successfully`);
      
      // Reload messages in background (non-blocking)
      inboxService.getMessages(selectedConversation._id, { limit: 1000 })
        .then(response => {
          const data = response.data || response;
          setConversationMessages(data.messages || []);
        })
        .catch(err => console.warn('Failed to reload messages:', err));
      
    } catch (err) {
      console.error('❌ Media upload/send error:', {
        message: err.message,
        response: err.response?.data,
        stack: err.stack
      });
      
      let errorMsg = 'Failed to send media';
      if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      toast.error(errorMsg);
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  };

  if (loading && page === 1) {
    return (
      <div className="inbox" aria-busy="true" aria-live="polite">
        <Navbar />
        <div className="inbox-container">
          <LoadingSkeleton type="list" />
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
            message="Please complete your business setup to start managing conversations"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Navbar />
      
      <div className="page-content">
        <div className="inbox-content">
          {/* Sidebar with conversation list */}
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

          {/* Main content area */}
          <div className="inbox-main">
            {!selectedConversation ? (
              <div className="inbox-placeholder">
                <div className="placeholder-icon">
                  <BiMessageDetail size={64} />
                </div>
                <h2>Select a conversation</h2>
                <p>Choose a conversation from the list to view messages</p>
              </div>
            ) : (
              <div className="conversation-view">
                {/* Conversation Header */}
                <div className="conversation-header-bar">
                  <div className="conversation-info">
                    <div className="conversation-avatar-container">
                      <div className="conversation-avatar">
                        {selectedConversation.contact?.profilePicture ? (
                          <img src={selectedConversation.contact.profilePicture} alt={selectedConversation.contact.name} />
                        ) : (
                          <div className="avatar-placeholder">
                            {getInitials(selectedConversation.contact?.name || selectedConversation.contact?.phoneNumber)}
                          </div>
                        )}
                      </div>
                      {isOnline && <span className="online-indicator"></span>}
                    </div>
                    <div className="conversation-details-header">
                      <h3>{selectedConversation.contact?.name || selectedConversation.contact?.phoneNumber}</h3>
                      <p className="contact-status">
                        {isTyping ? (
                          <span className="typing-indicator">
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-text">typing...</span>
                          </span>
                        ) : isOnline ? (
                          <span className="status-online">online</span>
                        ) : selectedConversation.lastMessageAt ? (
                          <span className="status-last-seen">
                            last seen {formatTime(selectedConversation.lastMessageAt)}
                          </span>
                        ) : (
                          selectedConversation.contact?.phoneNumber
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="conversation-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      onClick={() => setShowQuickReplies(!showQuickReplies)}
                      title="Quick Replies"
                    >
                      <BiMessageDetail size={20} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      onClick={() => navigate(`/contacts/${selectedConversation.contact?.phoneNumber}`)}
                      title="View Contact"
                    >
                      <MdPersonAdd size={20} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      onClick={handleCloseConversation}
                      title="Archive Conversation"
                    >
                      <MdArchive size={20} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      onClick={() => setSelectedConversation(null)}
                      title="Dismiss"
                    >
                      <MdClose size={20} />
                    </Button>
                  </div>
                </div>

                {/* Quick Replies */}
                {showQuickReplies && (
                  <div className="quick-replies-section">
                    <div className="quick-replies-header">
                      <span>Quick Replies</span>
                      <button onClick={() => setShowQuickReplies(false)}>✕</button>
                    </div>
                    <div className="quick-replies-list">
                      <button
                        className="quick-reply-btn"
                        onClick={() => {
                          setMessageText('Thank you for your message! How can I help you today?');
                          setShowQuickReplies(false);
                        }}
                      >
                        👋 Greeting
                      </button>
                      <button
                        className="quick-reply-btn"
                        onClick={() => {
                          setMessageText('I\'ll get back to you shortly.');
                          setShowQuickReplies(false);
                        }}
                      >
                        ⏰ Follow-up
                      </button>
                      <button
                        className="quick-reply-btn"
                        onClick={() => {
                          setMessageText('For more information, please visit our website.');
                          setShowQuickReplies(false);
                        }}
                      >
                        🔗 Info
                      </button>
                      <button
                        className="quick-reply-btn"
                        onClick={() => {
                          setMessageText('Thank you! Have a great day!');
                          setShowQuickReplies(false);
                        }}
                      >
                        ✅ Closing
                      </button>
                    </div>
                  </div>
                )}

                {/* Messages Area */}
                <div className="messages-container" ref={messagesContainerRef}>
                  {loadingMoreMessages && (
                    <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-secondary)' }}>
                      Loading older messages...
                    </div>
                  )}
                  {loadingMessages ? (
                    <LoadingSkeleton type="chat" />
                  ) : conversationMessages.length === 0 ? (
                    <div className="empty-messages">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="messages-list">{conversationMessages.map((message, index) => (
                        <React.Fragment key={message._id}>
                          {shouldShowDateSeparator(message, conversationMessages[index - 1]) && (
                            <div className="date-separator">
                              <span>{getDateSeparator(message.timestamp)}</span>
                            </div>
                          )}
                          <div 
                            className={`message ${message.direction === 'outgoing' ? 'outgoing' : 'incoming'}`}
                          >
                          <div className="message-bubble">
                            {message.type === 'text' && (
                              <div className="message-content-wrapper">
                                <p className="message-text">{message.content?.text || message.text?.body}</p>
                                {renderMessageMeta(message, true)}
                              </div>
                            )}
                            {message.type === 'image' && (
                              <div className="message-media">
                                <img 
                                  src={message.content?.mediaUrl} 
                                  alt="Sent" 
                                  className="message-image" 
                                  onClick={() => setLightboxImage({ 
                                    isOpen: true, 
                                    url: message.content?.mediaUrl, 
                                    caption: message.content?.caption || '' 
                                  })}
                                  style={{ cursor: 'pointer' }}
                                />
                                {message.content?.caption && <p className="media-caption">{message.content.caption}</p>}
                                {renderMessageMeta(message)}
                              </div>
                            )}
                            {message.type === 'video' && (
                              <div className="message-media">
                                <video src={message.content?.mediaUrl} controls className="message-video" />
                                {message.content?.caption && <p className="media-caption">{message.content.caption}</p>}
                                {renderMessageMeta(message)}
                              </div>
                            )}
                            {message.type === 'document' && (
                              <div className="message-document">
                                <a href={message.content?.mediaUrl} target="_blank" rel="noopener noreferrer" className="document-link">
                                  <MdInsertDriveFile size={18} /> {message.content?.filename || 'Document'}
                                </a>
                                {message.content?.caption && <p className="media-caption">{message.content.caption}</p>}
                                {renderMessageMeta(message)}
                              </div>
                            )}
                          </div>
                        </div>
                        </React.Fragment>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                  
                  {/* Scroll to Bottom Button */}
                  {showScrollButton && (
                    <button
                      className="scroll-to-bottom-btn"
                      onClick={scrollToBottom}
                      aria-label="Scroll to bottom"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 10l5 5 5-5z"/>
                      </svg>
                      {unreadMessageCount > 0 && (
                        <span className="unread-count-badge">{unreadMessageCount}</span>
                      )}
                    </button>
                  )}
                </div>

                {/* Message Input */}
                <div className="message-input-area">
                  {uploadingMedia && (
                    <div className="upload-progress">
                      <MdUploadFile size={18} /> Uploading... {uploadProgress}%
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="message-input-form">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*,.pdf,.doc,.docx"
                      onChange={handleMediaUpload}
                      style={{ display: 'none' }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="small"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingMedia || sending}
                    >
                      <MdAttachFile size={20} />
                    </Button>
                    <Input
                      type="text"
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={handleTyping}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      disabled={sending || uploadingMedia}
                      style={{ flex: 1 }}
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="small"
                      disabled={!messageText.trim() || sending || uploadingMedia}
                    >
                      <MdSend size={20} />
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={lightboxImage.isOpen}
        onClose={() => setLightboxImage({ isOpen: false, url: '', caption: '' })}
        imageUrl={lightboxImage.url}
        caption={lightboxImage.caption}
      />
    </div>
  );
};

export default Inbox;



