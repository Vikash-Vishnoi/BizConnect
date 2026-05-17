/**
 * 📅 Schedule Message Component
 * 
 * Interface for scheduling individual WhatsApp messages.
 * Supports selecting existing contacts or adding new ones.
 * 
 * @component
 * @features
 * - Select existing contacts from inbox
 * - Add new contact manually
 * - Schedule message for specific date/time
 * - Message preview
 * - Template support (optional)
 * - Message type selection (text, image, document)
 * 
 * @routes
 * - /scheduled/message
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import * as inboxService from '../../services/messaging/inboxService';
import * as mediaService from '../../services/media/mediaService';
import api from '../../services/api';
import { STORAGE_KEYS } from '../../config/constants';
import { MdArrowBack, MdPerson, MdPhone, MdMessage, MdSchedule, MdSend, MdSearch, MdClose, MdAdd, MdAttachFile, MdImage, MdVideoLibrary, MdDescription } from 'react-icons/md';
import './ScheduleMessage.css';

const ScheduleMessage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  
  // Existing contacts from inbox
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [selectedContact, setSelectedContact] = useState(null);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [messageText, setMessageText] = useState('');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaData, setMediaData] = useState(null);
  
  useEffect(() => {
    // Set minimum datetime to current time (backend validates it must be future)
    const now = new Date();
    const minDateTime = now.toISOString().slice(0, 16);
    setScheduledDateTime(minDateTime);
  }, []);
  
  const fetchConversations = async () => {
    setLoadingConversations(true);
    try {
      const data = await inboxService.getConversations({ 
        page: 1, 
        limit: 100,
        status: 'active'
      });
      setConversations(data.data?.conversations || data.conversations || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      toast.error('Failed to load contacts');
    } finally {
      setLoadingConversations(false);
    }
  };
  
  const handleSelectExisting = () => {
    setShowContactSelector(true);
    setShowAddContact(false);
    fetchConversations();
  };
  
  const handleAddNew = () => {
    setShowAddContact(true);
    setShowContactSelector(false);
    setSelectedContact(null);
  };
  
  const handleSelectContact = (conversation) => {
    setSelectedContact({
      conversationId: conversation._id,
      phone: conversation.contact?.phoneNumber || conversation.contactPhone,
      name: conversation.contact?.name || conversation.contactName || conversation.contact?.phoneNumber || conversation.contactPhone
    });
    setShowContactSelector(false);
  };
  
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (16MB WhatsApp limit)
    const MAX_FILE_SIZE = 16 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 16MB');
      return;
    }
    
    setSelectedFile(file);
    setUploadingFile(true);
    setUploadProgress(0);
    
    try {
      // Determine message type from file
      const fileType = file.type;
      if (fileType.startsWith('image/')) {
        setMessageType('image');
      } else if (fileType.startsWith('video/')) {
        setMessageType('video');
      } else if (fileType.startsWith('audio/')) {
        setMessageType('audio');
      } else {
        setMessageType('document');
      }
      
      // Upload to Cloudinary
      const uploadData = await mediaService.uploadMedia(file, (progress) => {
        setUploadProgress(progress);
      });
      
      setMediaData({
        mediaUrl: uploadData.media?.cloudinaryUrl,
        mediaId: uploadData.media?.cloudinaryPublicId,
        mediaType: uploadData.media?.type || 'document',
        filename: file.name,
        caption: ''
      });
      
      toast.success('File uploaded successfully!');
    } catch (err) {
      console.error('Error uploading file:', err);
      toast.error('Failed to upload file');
      setSelectedFile(null);
      setMessageType('text');
    } finally {
      setUploadingFile(false);
    }
  };
  
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setMediaData(null);
    setMessageType('text');
    setUploadProgress(0);
  };
  
  const handleScheduleMessage = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!selectedContact && !newContactPhone) {
      toast.error('Please select a contact or add a new one');
      return;
    }
    
    if (messageType === 'text' && !messageText.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    if (messageType !== 'text' && !mediaData) {
      toast.error('Please upload a file');
      return;
    }
    
    if (!scheduledDateTime) {
      toast.error('Please select a date and time');
      return;
    }
    
    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledDateTime);
    const now = new Date();
    if (scheduledDate <= now) {
      toast.error('Scheduled time must be in the future');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        messageType,
        scheduledFor: scheduledDate.toISOString()
      };
      
      // Add message content based on type
      if (messageType === 'text') {
        payload.text = messageText;
      } else if (mediaData) {
        payload.mediaUrl = mediaData.mediaUrl;
        payload.mediaId = mediaData.mediaId;
        payload.mediaType = mediaData.mediaType;
        payload.filename = mediaData.filename;
        payload.caption = messageText; // Use messageText as caption for media
      }
      
      if (selectedContact) {
        payload.conversationId = selectedContact.conversationId;
      } else {
        // For new contacts, we need to create a conversation first or handle differently
        toast.error('Please select an existing contact from inbox. Adding new contacts for scheduled messages is not yet supported.');
        setSubmitting(false);
        return;
      }
      
      console.log('Scheduling message with payload:', payload);
      
      const response = await api.post('/scheduled/messages', payload);
      
      toast.success('✅ Message scheduled successfully!');
      navigate('/scheduled');
    } catch (err) {
      console.error('Error scheduling message:', err);
      const errorMessage = typeof err === 'string' ? err : err.message || err.error || 'Failed to schedule message';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };
  
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const contactName = conv.contact?.name || conv.contactName || '';
    const contactPhone = conv.contact?.phoneNumber || conv.contactPhone || '';
    return (
      contactName.toLowerCase().includes(query) ||
      contactPhone.includes(query)
    );
  });
  
  if (!user?.businessId) {
    return <BusinessSetupRequired />;
  }
  
  return (
    <div className="page-container">
      <Navbar />
      
      <div className="page-content">
        <div className="schedule-message-wrapper">
          {/* Header */}
          <div className="page-header">
            <div className="page-header-text">
              <h1 className="page-title">Schedule Message</h1>
            </div>
          </div>
          
          <form onSubmit={handleScheduleMessage}>
            <Card className="schedule-message-card">
              {/* Contact Selection Section */}
              <div className="form-section">
                <h3 className="section-title">
                  <MdPerson /> Recipient
                </h3>
                
                {!selectedContact && !showAddContact && !showContactSelector && (
                  <div className="contact-choice">
                    <div className="choice-card" onClick={handleSelectExisting}>
                      <div className="choice-icon">
                        <MdSearch />
                      </div>
                      <div className="choice-content">
                        <h4>Select from Inbox</h4>
                        <p>Choose an existing contact from your conversations</p>
                      </div>
                    </div>
                    <div className="choice-card" onClick={handleAddNew}>
                      <div className="choice-icon">
                        <MdAdd />
                      </div>
                      <div className="choice-content">
                        <h4>Add New Contact</h4>
                        <p>Enter phone number manually</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Selected Contact Display */}
                {selectedContact && (
                  <div className="selected-contact">
                    <div className="contact-info">
                      <MdPerson className="contact-icon" />
                      <div>
                        <div className="contact-name">{selectedContact.name}</div>
                        <div className="contact-phone">{selectedContact.phone}</div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setSelectedContact(null)}
                      size="small"
                    >
                      <MdClose /> Change
                    </Button>
                  </div>
                )}
                
                {/* Contact Selector */}
                {showContactSelector && (
                  <div className="contact-selector">
                    <div className="selector-header">
                      <h4>Select Contact</h4>
                      <button 
                        type="button"
                        className="close-btn"
                        onClick={() => setShowContactSelector(false)}
                        aria-label="Close"
                      >
                        <MdClose />
                      </button>
                    </div>
                    <div className="search-wrapper">
                      <Input
                        icon={MdSearch}
                        placeholder="Search contacts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="contact-list">
                      {loadingConversations ? (
                        <LoadingSkeleton type="list" />
                      ) : filteredConversations.length === 0 ? (
                        <div className="empty-state">
                          <p>No contacts found</p>
                        </div>
                      ) : (
                        filteredConversations.map(conv => {
                          const contactName = conv.contact?.name || conv.contactName;
                          const contactPhone = conv.contact?.phoneNumber || conv.contactPhone;
                          return (
                            <div
                              key={conv._id}
                              className="contact-item"
                              onClick={() => handleSelectContact(conv)}
                            >
                              <MdPerson className="contact-icon" />
                              <div className="contact-details">
                                <div className="contact-name">{contactName || contactPhone}</div>
                                <div className="contact-phone">{contactPhone}</div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
                
                {/* Add New Contact Form */}
                {showAddContact && (
                  <div className="add-contact-form">
                    <div className="form-header">
                      <h4>Add New Contact</h4>
                      <button 
                        type="button"
                        className="close-btn"
                        onClick={() => setShowAddContact(false)}
                        aria-label="Close"
                      >
                        <MdClose />
                      </button>
                    </div>
                    <Input
                      icon={MdPerson}
                      label="Contact Name (Optional)"
                      placeholder="Enter contact name"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                    />
                    <Input
                      icon={MdPhone}
                      label="Phone Number"
                      placeholder="Enter phone number (with country code)"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>
              
              {/* Message Section */}
              <div className="form-section">
                <h3 className="section-title">
                  <MdMessage /> Message
                </h3>
                
                {/* Message Type Selector */}
                <div className="form-group">
                  <label>Message Type</label>
                  <div className="message-type-buttons">
                    <button
                      type="button"
                      className={`type-btn ${messageType === 'text' ? 'active' : ''}`}
                      onClick={() => { setMessageType('text'); handleRemoveFile(); }}
                    >
                      <MdMessage /> Text
                    </button>
                    <button
                      type="button"
                      className={`type-btn ${messageType === 'image' ? 'active' : ''}`}
                      onClick={() => document.getElementById('fileInput').click()}
                    >
                      <MdImage /> Image
                    </button>
                    <button
                      type="button"
                      className={`type-btn ${messageType === 'video' ? 'active' : ''}`}
                      onClick={() => document.getElementById('fileInput').click()}
                    >
                      <MdVideoLibrary /> Video
                    </button>
                    <button
                      type="button"
                      className={`type-btn ${messageType === 'document' ? 'active' : ''}`}
                      onClick={() => document.getElementById('fileInput').click()}
                    >
                      <MdDescription /> Document
                    </button>
                  </div>
                  <input
                    type="file"
                    id="fileInput"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                </div>
                
                {/* File Upload Progress */}
                {uploadingFile && (
                  <div className="upload-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <span>{uploadProgress}%</span>
                  </div>
                )}
                
                {/* Selected File Display */}
                {selectedFile && !uploadingFile && (
                  <div className="selected-file">
                    <div className="file-info">
                      <MdAttachFile className="file-icon" />
                      <div>
                        <div className="file-name">{selectedFile.name}</div>
                        <div className="file-size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleRemoveFile}
                      size="small"
                    >
                      <MdClose /> Remove
                    </Button>
                  </div>
                )}
                
                <div className="form-group">
                  <label htmlFor="messageText">{messageType === 'text' ? 'Message Text' : 'Caption (Optional)'}</label>
                  <textarea
                    id="messageText"
                    className="message-textarea"
                    placeholder={messageType === 'text' ? 'Enter your message...' : 'Add a caption (optional)...'}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={6}
                    required={messageType === 'text'}
                  />
                  <div className="char-count">{messageText.length} characters</div>
                </div>
              </div>
              
              {/* Schedule Section */}
              <div className="form-section">
                <h3 className="section-title">
                  <MdSchedule /> Schedule
                </h3>
                <div className="form-group">
                  <label htmlFor="scheduledDateTime">Date & Time</label>
                  <input
                    type="datetime-local"
                    id="scheduledDateTime"
                    className="datetime-input"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
                    required
                  />
                  <small className="help-text">Message will be sent at the specified time</small>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="form-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/automation/scheduled')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting || (!selectedContact && !newContactPhone) || !messageText.trim()}
                >
                  {submitting ? 'Scheduling...' : <> Schedule Message</>}
                </Button>
              </div>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ScheduleMessage;
