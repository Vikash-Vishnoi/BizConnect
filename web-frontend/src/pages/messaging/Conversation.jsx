/**
 * 💬 Conversation Page Component
 * 
 * Individual conversation view with message history and sending capabilities.
 * Displays one-on-one WhatsApp conversation with contact.
 * Supports text messages, media uploads, and real-time updates.
 * 
 * @component
 * @requires react-router-dom - Get conversation ID from URL params
 * @requires Toast - Success/error notifications
 * @requires inboxService - Message and conversation APIs
 * @requires mediaService - Media upload handling
 * 
 * @features
 * - Message history display with status indicators
 * - Real-time message updates (5s polling)
 * - Send text messages
 * - Upload and send media (image, video, audio, document)
 * - Message status icons (sent, delivered, read, failed)
 * - Auto-scroll to bottom on new messages
 * - Mark conversation as read
 * - Upload progress tracking
 * - Date separators in chat
 * - Template message display
 * 
 * @state
 * - loading: Initial load state
 * - conversation: Conversation object with contact info
 * - messages: Array of message objects
 * - messageText: Current input text
 * - sending: Message send state
 * - uploadingMedia: Media upload state
 * - uploadProgress: Upload percentage (0-100)
 * - error: Error message
 * 
 * @constants
 * - MESSAGE_POLL_INTERVAL: 5000ms (5 seconds)
 * - MAX_FILE_SIZE: 16MB (WhatsApp limit)
 * - MESSAGE_LIMIT: 100 messages per load
 * 
 * @navigation
 * - Receives conversation ID from URL params
 * - Back button navigates to inbox
 * 
 * @todo Extract message refresh interval to constant
 * @todo Add WebSocket for real-time updates
 * @todo Add typing indicators
 * 
 * @example
 * <Route path="/inbox/:id" element={<Conversation />} />
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import * as inboxService from '../../services/messaging/inboxService';
import * as mediaService from '../../services/media/mediaService';
import Navbar from '../../components/Navbar';
import Button from '../../components/Button';
import { MdSend, MdAttachFile, MdImage, MdCheckCircle, MdError, MdAccessTime, MdInsertDriveFile, MdChatBubbleOutline, MdClose } from 'react-icons/md';
import { API_BASE_URL } from '../../config/api';
import { get, post } from '../../services/api';
import './Conversation.css';

/**
 * Conversation configuration constants
 */
const CONVERSATION_CONFIG = {
  MESSAGE_POLL_INTERVAL: 5000, // 5 seconds
  MAX_FILE_SIZE: 16 * 1024 * 1024, // 16MB WhatsApp limit
  MESSAGE_LIMIT: 100,
  STATUS_ICON_SIZE: '14px'
};

const Conversation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [savedReplies, setSavedReplies] = useState([]);
  const [showSavedReplies, setShowSavedReplies] = useState(false);
  const [filteredReplies, setFilteredReplies] = useState([]);

  useEffect(() => {
    loadConversation();
    loadMessages();
    loadSavedReplies();
    // Mark as read
    markAsRead();
    
    // Auto-refresh messages
    const interval = setInterval(loadMessages, CONVERSATION_CONFIG.MESSAGE_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Detect shortcut typing (starts with /)
  useEffect(() => {
    if (messageText.startsWith('/') && messageText.length > 1) {
      const searchTerm = messageText.slice(1).toLowerCase();
      const matches = savedReplies.filter(reply => 
        reply.shortcut.toLowerCase().includes(searchTerm)
      );
      setFilteredReplies(matches);
      setShowSavedReplies(matches.length > 0);
    } else {
      setShowSavedReplies(false);
      setFilteredReplies([]);
    }
  }, [messageText, savedReplies]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async () => {
    try {
      const data = await inboxService.getConversationById(id);
      setConversation(data.conversation);
    } catch (err) {
      console.error('Error loading conversation:', err);
      const errorMsg = err.response?.data?.message || 'Failed to load conversation';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await inboxService.getMessages(id, { limit: CONVERSATION_CONFIG.MESSAGE_LIMIT });
      const data = response.data || response; // Handle both wrapped and unwrapped responses
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await inboxService.markAsRead(id);
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const loadSavedReplies = async () => {
    try {
      const response = await get(`/messages/saved-replies`);
      if (response && response.success !== false) {
        setSavedReplies(response.data || []);
      }
    } catch (err) {
      console.error('Error loading saved replies:', err);
    }
  };

  const handleSelectSavedReply = async (reply) => {
    setMessageText(reply.message);
    setShowSavedReplies(false);
    setFilteredReplies([]);
    
    // Track usage
    try {
      await post(`/messages/saved-replies/${reply._id}/use`);
    } catch (err) {
      console.error('Error tracking usage:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    setSending(true);
    setError('');
    
    try {
      await inboxService.sendMessage(id, {
        type: 'text',
        text: { body: messageText }
      });

      setMessageText('');
      toast.success('✅ Message sent');
      await loadMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMsg = err.response?.data?.message || 'Failed to send message';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSending(false);
    }
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (WhatsApp limit)
    if (file.size > CONVERSATION_CONFIG.MAX_FILE_SIZE) {
      const errorMsg = `File size must be less than ${CONVERSATION_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`;
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setUploadingMedia(true);
    setUploadProgress(0);
    setError('');

    try {
      // Step 1: Upload media file to WhatsApp with progress tracking
      const uploadData = await mediaService.uploadMedia(file, 'conversation', (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(progress);
      });
      
      // Step 2: Send message with media
      const mediaType = uploadData.media.mediaType;
      const messagePayload = {
        type: mediaType,
        [mediaType]: {
          id: uploadData.media.whatsappMediaId
        }
      };

      await inboxService.sendMessage(id, messagePayload);
      
      toast.success(`📎 ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} sent successfully`);
      await loadMessages();
    } catch (err) {
      console.error('Error uploading media:', err);
      const errorMsg = err.response?.data?.message || 'Failed to send media';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const renderStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <MdAccessTime style={{ fontSize: '14px', color: '#999' }} title="Sent" />;
      case 'delivered':
        return <MdCheckCircle style={{ fontSize: '14px', color: '#666' }} title="Delivered" />;
      case 'read':
        return <MdCheckCircle style={{ fontSize: '14px', color: '#4fc3f7' }} title="Read" />;
      case 'failed':
        return <MdError style={{ fontSize: '14px', color: '#f44336' }} title="Failed" />;
      default:
        return <MdAccessTime style={{ fontSize: '14px', color: '#ccc' }} title="Pending" />;
    }
  };

  const renderMessage = (message) => {
    const isOutgoing = message.direction === 'out';
    
    return (
      <div key={message._id} className={`message ${isOutgoing ? 'outgoing' : 'incoming'}`}>
        <div className="message-content">
          {message.type === 'text' && (
            <div className="message-text">{message.content?.text || message.text}</div>
          )}
          
          {message.type === 'image' && (
            <div className="message-media">
              <img src={message.content?.mediaUrl || message.mediaUrl} alt="Image" />
              {message.content?.caption && (
                <div className="message-text">{message.content.caption}</div>
              )}
            </div>
          )}

          {message.type === 'video' && (
            <div className="message-media">
              <video controls src={message.content?.mediaUrl || message.mediaUrl} />
              {message.content?.caption && (
                <div className="message-text">{message.content.caption}</div>
              )}
            </div>
          )}

          {message.type === 'audio' && (
            <div className="message-media">
              <audio controls src={message.content?.mediaUrl || message.mediaUrl} />
            </div>
          )}

          {message.type === 'document' && (
            <div className="message-document">
              <span className="document-icon"><MdInsertDriveFile /></span>
              <span className="document-name">{message.content?.filename || 'Document'}</span>
            </div>
          )}

          {message.type === 'template' && (
            <div className="message-template">
              <div className="template-badge">Template Message</div>
              <div className="message-text">{message.content?.text}</div>
              {message.campaignName && (
                <div className="campaign-badge">Campaign: {message.campaignName}</div>
              )}
            </div>
          )}

          <div className="message-meta">
            <span className="message-time">{formatTime(message.timestamp)}</span>
            {isOutgoing && message.status && (
              <span className="message-status">
                {renderStatusIcon(message.status)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(message => {
      const date = formatDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  if (loading) {
    return (
      <div className="conversation-page">
        <Navbar />
        <div className="conversation-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="conversation-page">
        <Navbar />
        <div className="conversation-container">
          <div className="error-state">
            <p>Conversation not found</p>
            <Button onClick={() => navigate('/inbox')}>Back to Inbox</Button>
          </div>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="conversation-page">
      <Navbar />
      
      <div className="conversation-container">
        {/* Header */}
        <div className="conversation-header">
          <button className="back-button" onClick={() => navigate('/inbox')}>
            ← Back
          </button>
          
          <div className="contact-info">
            <div className="contact-avatar">
              {conversation.contact?.profilePhoto ? (
                <img src={conversation.contact.profilePhoto} alt={conversation.contact.name} />
              ) : (
                <div className="avatar-placeholder">
                  {conversation.contact?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div className="contact-details">
              <h2 className="contact-name">
                {conversation.contact?.name || conversation.phoneNumber}
              </h2>
              <p className="contact-phone">{conversation.phoneNumber}</p>
            </div>
          </div>

          <div className="conversation-actions">
            <button className="icon-button" title="Search in conversation">
              🔍
            </button>
            <button className="icon-button" title="More options">
              ⋮
            </button>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* Messages Area */}
        <div className="messages-area">
          {Object.entries(messageGroups).map(([date, msgs]) => (
            <div key={date}>
              <div className="date-divider">
                <span>{date}</span>
              </div>
              {msgs.map(renderMessage)}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-area">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleMediaUpload}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
            style={{ display: 'none' }}
          />
          
          <button
            className="attach-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingMedia}
            title="Attach media"
          >
            {uploadingMedia ? '⏳' : '📎'}
          </button>

          <button
            className="saved-replies-button"
            onClick={() => {
              setShowSavedReplies(!showSavedReplies);
              setFilteredReplies(savedReplies);
            }}
            disabled={sending}
            title="Saved Replies"
          >
            <MdChatBubbleOutline size={20} />
          </button>

          <form onSubmit={handleSendMessage} className="message-form">
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="message-input"
                placeholder="Type your WhatsApp message or / for saved replies"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={sending}
              />
              
              {/* Autocomplete Dropdown */}
              {showSavedReplies && filteredReplies.length > 0 && (
                <div className="saved-replies-dropdown">
                  {filteredReplies.slice(0, 5).map((reply) => (
                    <div
                      key={reply._id}
                      className="saved-reply-item"
                      onClick={() => handleSelectSavedReply(reply)}
                    >
                      <div className="saved-reply-shortcut">/{reply.shortcut}</div>
                      <div className="saved-reply-message">{reply.message.substring(0, 50)}...</div>
                      {reply.category && <span className="saved-reply-category">{reply.category}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              className="send-button"
              disabled={!messageText.trim() || sending}
            >
              {sending ? '⏳' : '➤'}
            </button>
          </form>
        </div>

        {/* Saved Replies Picker Modal */}
        {showSavedReplies && messageText === '' && (
          <div className="saved-replies-modal">
            <div className="saved-replies-modal-header">
              <h3>Saved Replies</h3>
              <button onClick={() => setShowSavedReplies(false)}>
                <MdClose />
              </button>
            </div>
            <div className="saved-replies-modal-content">
              {savedReplies.length === 0 ? (
                <div className="no-saved-replies">
                  <MdChatBubbleOutline size={48} />
                  <p>No saved replies yet</p>
                  <small>Create saved replies to send messages quickly</small>
                </div>
              ) : (
                <div className="saved-replies-list">
                  {savedReplies.map((reply) => (
                    <div
                      key={reply._id}
                      className="saved-reply-card"
                      onClick={() => handleSelectSavedReply(reply)}
                    >
                      <div className="saved-reply-header">
                        <span className="saved-reply-shortcut">/{reply.shortcut}</span>
                        {reply.category && (
                          <span className="saved-reply-category">{reply.category}</span>
                        )}
                      </div>
                      <p className="saved-reply-text">{reply.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversation;



