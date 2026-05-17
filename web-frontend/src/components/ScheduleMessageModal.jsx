/**
 * 📅 Schedule Message Modal Component
 * 
 * Modal for scheduling WhatsApp messages with optional recurrence.
 * Supports text messages and template messages with date/time picker.
 * 
 * @component
 * @features
 * - Schedule messages for future delivery
 * - Select date and time for scheduling
 * - Choose between text and template messages
 * - Enable recurrence (daily/weekly/monthly)
 * - Set recurrence interval and end date
 * - Conversation selector (for new messages)
 * - Form validation (future date, required fields)
 * - Character counter for text messages (4096 max)
 * - Edit existing scheduled messages
 * - Responsive mobile layout
 * 
 * @props
 * - conversationId: Pre-selected conversation ID (optional)
 * - message: Existing message for editing (optional)
 * - onClose: Callback to close modal
 * - onSuccess: Callback after successful scheduling
 * 
 * @state
 * - formData: Form fields (date, time, content, recurrence)
 * - conversations: Available conversations list
 * - templates: Approved templates list
 * - loading: Submit loading state
 * - error: Validation or API error message
 * 
 * @api
 * - GET /inbox: Fetch conversations
 * - GET /templates: Fetch approved templates
 * - POST /scheduled: Create scheduled message
 * - PUT /scheduled/:id: Update scheduled message
 * 
 * @example
 * <ScheduleMessageModal 
 *   conversationId={conv._id}
 *   onClose={() => setShowModal(false)}
 *   onSuccess={() => fetchMessages()}
 * />
 */

import React, { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../config/constants';
import '../pages/automation/Scheduled.css';

/**
 * Message type options
 */
const MESSAGE_TYPES = {
  TEXT: 'text',
  TEMPLATE: 'template'
};

/**
 * Recurrence frequency options
 */
const RECURRENCE_FREQUENCIES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly'
};

/**
 * Message constraints
 */
const MESSAGE_CONSTRAINTS = {
  MAX_TEXT_LENGTH: 4096,
  MIN_RECURRENCE_INTERVAL: 1,
  MAX_RECURRENCE_INTERVAL: 30
};

const ScheduleMessageModal = ({ conversationId, message, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    conversationId: conversationId || message?.conversationId?._id || '',
    scheduledDate: '',
    scheduledTime: '',
    messageType: 'text',
    textContent: '',
    templateId: '',
    recurrenceEnabled: false,
    recurrenceFrequency: 'daily',
    recurrenceInterval: 1,
    recurrenceEndDate: ''
  });
  
  const [conversations, setConversations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (!conversationId) {
      fetchConversations();
    }
    
    // Pre-fill form if editing
    if (message) {
      const scheduledDateTime = new Date(message.scheduledTime);
      const date = scheduledDateTime.toISOString().split('T')[0];
      const time = scheduledDateTime.toTimeString().slice(0, 5);
      
      setFormData({
        conversationId: message.conversationId?._id || '',
        scheduledDate: date,
        scheduledTime: time,
        messageType: message.messageType,
        textContent: message.content?.text?.body || message.content?.body || '',
        templateId: message.templateId?._id || '',
        recurrenceEnabled: message.recurrence?.enabled || false,
        recurrenceFrequency: message.recurrence?.frequency || 'daily',
        recurrenceInterval: message.recurrence?.interval || 1,
        recurrenceEndDate: message.recurrence?.endDate ? 
          new Date(message.recurrence.endDate).toISOString().split('T')[0] : ''
      });
    }
  }, [message, conversationId]);
  
  useEffect(() => {
    if (formData.messageType === 'template') {
      fetchTemplates();
    }
  }, [formData.messageType]);
  
  /**
   * Fetch available conversations for selection
   */
  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/inbox?status=open&limit=100', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };
  
  /**
   * Fetch approved templates for selection
   */
  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates?status=APPROVED&limit=100', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  /**
   * Validate form inputs before submission
   */
  const validateForm = () => {
    if (!formData.conversationId) {
      setError('Please select a conversation');
      return false;
    }
    
    if (!formData.scheduledDate || !formData.scheduledTime) {
      setError('Please select date and time');
      return false;
    }
    
    // Check if scheduled time is in the future
    const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
    if (scheduledDateTime <= new Date()) {
      setError('Scheduled time must be in the future');
      return false;
    }
    
    if (formData.messageType === MESSAGE_TYPES.TEXT && !formData.textContent.trim()) {
      setError('Please enter message content');
      return false;
    }
    
    if (formData.messageType === MESSAGE_TYPES.TEMPLATE && !formData.templateId) {
      setError('Please select a template');
      return false;
    }
    
    if (formData.recurrenceEnabled) {
      if (formData.recurrenceInterval < MESSAGE_CONSTRAINTS.MIN_RECURRENCE_INTERVAL) {
        setError(`Recurrence interval must be at least ${MESSAGE_CONSTRAINTS.MIN_RECURRENCE_INTERVAL}`);
        return false;
      }
      
      if (formData.recurrenceEndDate) {
        const endDate = new Date(formData.recurrenceEndDate);
        if (endDate <= scheduledDateTime) {
          setError('Recurrence end date must be after scheduled time');
          return false;
        }
      }
    }
    
    setError('');
    return true;
  };
  
  /**
   * Submit scheduled message (create or update)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Combine date and time into ISO string
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      
      // Build request payload
      const payload = {
        conversationId: formData.conversationId,
        scheduledTime: scheduledDateTime.toISOString(),
        messageType: formData.messageType
      };
      
      // Add message content based on type
      if (formData.messageType === MESSAGE_TYPES.TEXT) {
        payload.content = {
          text: {
            body: formData.textContent
          }
        };
      } else if (formData.messageType === MESSAGE_TYPES.TEMPLATE) {
        payload.templateId = formData.templateId;
      }
      
      // Add recurrence if enabled
      if (formData.recurrenceEnabled) {
        payload.recurrence = {
          enabled: true,
          frequency: formData.recurrenceFrequency,
          interval: parseInt(formData.recurrenceInterval)
        };
        
        if (formData.recurrenceEndDate) {
          payload.recurrence.endDate = new Date(formData.recurrenceEndDate).toISOString();
        }
      }
      
      // Determine API method and endpoint
      const method = message ? 'PUT' : 'POST';
      const endpoint = message 
        ? `/api/scheduled/${message._id}` 
        : '/api/scheduled';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        onSuccess();
      } else {
        setError(data.message || 'Failed to schedule message');
      }
    } catch (error) {
      console.error('Error scheduling message:', error);
      setError('An error occurred while scheduling the message');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="schedule-modal-title">
      <div className="schedule-modal-content" onClick={(e) => e.stopPropagation()} role="document">
        <div className="modal-header">
          <h2 id="schedule-modal-title">{message ? 'Edit Scheduled Message' : 'Schedule Message'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}
          
          {/* Conversation Selector (only for new messages) */}
          {!conversationId && !message && (
            <div className="form-group">
              <label htmlFor="conversationId">
                Conversation <span className="required">*</span>
              </label>
              <select
                id="conversationId"
                name="conversationId"
                value={formData.conversationId}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a conversation</option>
                {conversations.map(conv => (
                  <option key={conv._id} value={conv._id}>
                    {conv.contact?.name || conv.contact?.phoneNumber}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Date and Time */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="scheduledDate">
                Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="scheduledDate"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="scheduledTime">
                Time <span className="required">*</span>
              </label>
              <input
                type="time"
                id="scheduledTime"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          {/* Message Type */}
          <div className="form-group">
            <label>
              Message Type <span className="required">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="messageType"
                  value="text"
                  checked={formData.messageType === 'text'}
                  onChange={handleInputChange}
                />
                <span>Text Message</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="messageType"
                  value="template"
                  checked={formData.messageType === 'template'}
                  onChange={handleInputChange}
                />
                <span>Template Message</span>
              </label>
            </div>
          </div>
          
          {/* Message Content */}
          {formData.messageType === 'text' ? (
            <div className="form-group">
              <label htmlFor="textContent">
                Message Content <span className="required">*</span>
              </label>
              <textarea
                id="textContent"
                name="textContent"
                value={formData.textContent}
                onChange={handleInputChange}
                rows="4"
                placeholder="Type your WhatsApp message content (up to 4096 characters)"
                required
              />
              <div className="char-count">
                {formData.textContent.length} / 4096 characters
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="templateId">
                Template <span className="required">*</span>
              </label>
              <select
                id="templateId"
                name="templateId"
                value={formData.templateId}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a template</option>
                {templates.map(template => (
                  <option key={template._id} value={template._id}>
                    {template.name} ({template.category})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Recurrence Settings */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="recurrenceEnabled"
                checked={formData.recurrenceEnabled}
                onChange={handleInputChange}
              />
              <span>Enable Recurrence</span>
            </label>
          </div>
          
          {formData.recurrenceEnabled && (
            <div className="recurrence-section">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="recurrenceFrequency">Frequency</label>
                  <select
                    id="recurrenceFrequency"
                    name="recurrenceFrequency"
                    value={formData.recurrenceFrequency}
                    onChange={handleInputChange}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="recurrenceInterval">Interval</label>
                  <input
                    type="number"
                    id="recurrenceInterval"
                    name="recurrenceInterval"
                    value={formData.recurrenceInterval}
                    onChange={handleInputChange}
                    min="1"
                    max="30"
                  />
                  <small className="help-text">
                    Repeat every {formData.recurrenceInterval} {formData.recurrenceFrequency === 'daily' ? 'day(s)' : formData.recurrenceFrequency === 'weekly' ? 'week(s)' : 'month(s)'}
                  </small>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="recurrenceEndDate">End Date (Optional)</label>
                <input
                  type="date"
                  id="recurrenceEndDate"
                  name="recurrenceEndDate"
                  value={formData.recurrenceEndDate}
                  onChange={handleInputChange}
                  min={formData.scheduledDate || new Date().toISOString().split('T')[0]}
                />
                <small className="help-text">
                  Leave blank for indefinite recurrence
                </small>
              </div>
            </div>
          )}
          
          {/* Submit Buttons */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Scheduling...' : message ? 'Update Schedule' : 'Schedule Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleMessageModal;
