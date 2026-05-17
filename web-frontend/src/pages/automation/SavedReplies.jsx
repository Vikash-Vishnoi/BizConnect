/**
 * 💬 Saved Replies Component
 * 
 * Manage quick reply templates for faster customer messaging.
 * Create shortcuts (e.g., /hello) that expand into full messages.
 * 
 * @component
 * @features
 * - Create reply templates with shortcuts
 * - Search by shortcut, message, or category
 * - Copy message to clipboard
 * - Edit existing replies
 * - Delete replies with confirmation
 * - Track usage count per reply
 * - Auto-save form data on edit
 * - Category-based organization
 * - Grid layout for reply cards
 * 
 * @state
 * - replies: Array of saved reply objects
 * - searchTerm: Filter text for search
 * - showModal: Create/edit modal visibility
 * - editingReply: Reply being edited (null for new)
 * - formData: Reply form fields (shortcut, message, category)
 * 
 * @api
 * - GET /messages/saved-replies: Fetch all replies
 * - POST /messages/saved-replies: Create new reply
 * - PUT /messages/saved-replies/:id: Update reply
 * - DELETE /messages/saved-replies/:id: Delete reply
 * 
 * @example
 * <Route path="/automation/saved-replies" element={<SavedReplies />} />
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import useAutoSave, { loadAutoSaved } from '../../hooks/useAutoSave';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ConfirmationModal from '../../components/ConfirmationModal';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdContentCopy, MdLabel, MdClose, MdChatBubble, MdTrendingUp, MdFolder, MdChatBubbleOutline } from 'react-icons/md';
import { API_BASE_URL } from '../../config/api';
import { STORAGE_KEYS } from '../../config/constants';
import '../../components/Stats.css';
import './SavedReplies.css';

/**
 * Auto-save storage key for reply form
 */
const AUTOSAVE_KEY = 'savedReplyForm';

const SavedReplies = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState(null);
  const [editingReply, setEditingReply] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    greeting: 0,
    support: 0,
    sales: 0,
    other: 0
  });
  const [formData, setFormData] = useState(() => 
    loadAutoSaved(AUTOSAVE_KEY, {
      shortcut: '',
      message: '',
      category: ''
    })
  );
  
  // Auto-save form data when modal is open
  const { clearSaved } = useAutoSave(AUTOSAVE_KEY, formData, 500, showModal);

  useEffect(() => {
    if (user?.businessId) {
      fetchReplies();
    }
  }, [user?.businessId]);

  /**
   * Fetch all saved replies for current business
   */
  const fetchReplies = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const response = await fetch(`${API_BASE_URL}/messages/saved-replies`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Business-ID': user?.businessId
        }
      });

      if (response.ok) {
        const result = await response.json();
        const repliesData = result.data || [];
        setReplies(repliesData);
        
        // Calculate stats
        const newStats = {
          total: repliesData.length,
          greeting: repliesData.filter(r => r.category === 'greeting').length,
          support: repliesData.filter(r => r.category === 'support').length,
          sales: repliesData.filter(r => r.category === 'sales').length,
          other: repliesData.filter(r => !['greeting', 'support', 'sales'].includes(r.category)).length
        };
        setStats(newStats);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch replies');
      }
    } catch (error) {
      console.error('Failed to fetch saved replies:', error);
      toast.error(error.message || 'Failed to load saved replies');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submit new or updated reply
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const url = editingReply
        ? `${API_BASE_URL}/messages/saved-replies/${editingReply._id}`
        : `${API_BASE_URL}/messages/saved-replies`;
      const method = editingReply ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Business-ID': user?.businessId
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        clearSaved(); // Clear auto-saved data
        toast.success(editingReply ? '✅ Reply updated' : '🎉 Reply created');
        fetchReplies();
        handleCloseModal();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save reply');
      }
    } catch (error) {
      console.error('Failed to save reply:', error);
      toast.error(error.message || 'Failed to save reply');
    }
  };

  const handleDeleteClick = (replyId) => {
    setDeletingReplyId(replyId);
    setShowDeleteModal(true);
  };

  /**
   * Delete saved reply with confirmation
   */
  const handleDelete = async () => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const response = await fetch(`${API_BASE_URL}/messages/saved-replies/${deletingReplyId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Business-ID': user?.businessId
        }
      });

      if (response.ok) {
        toast.success('Reply deleted successfully');
        setShowDeleteModal(false);
        setDeletingReplyId(null);
        fetchReplies();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete reply');
      }
    } catch (error) {
      console.error('Failed to delete reply:', error);
      toast.error(error.message || 'Failed to delete reply');
      setShowDeleteModal(false);
      setDeletingReplyId(null);
    }
  };

  const handleEdit = (reply) => {
    setEditingReply(reply);
    setFormData({
      shortcut: reply.shortcut,
      message: reply.message,
      category: reply.category || ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingReply(null);
    setFormData({ shortcut: '', message: '', category: '' });
  };

  const filteredReplies = replies.filter(reply => {
    const matchesSearch = reply.shortcut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reply.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reply.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || reply.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('✅ Copied to clipboard');
  };

  if (!user?.businessId) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <BusinessSetupRequired
            title="Business Setup Required"
            message="Please complete your business setup to manage saved replies."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="saved-replies-container">
          <LoadingSkeleton type="list" />
        </div>
      </>
    );
  }

  return (
    <div className="saved-replies-page page-container">
      <Navbar />
      <div className="page-content">
        {/* Header */}
        <div className="saved-replies-header">
          <div className="saved-replies-header-text" style={{ textAlign: 'center', width: '100%' }}>
            <h1 className="saved-replies-title">Saved Replies</h1>
            <p className="saved-replies-subtitle">Quick response templates for faster messaging • {filteredReplies.length} shown of {replies.length} total</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid" style={{ marginBottom: 'var(--spacing-base)' }}>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--primary"><MdChatBubble /></div>
              <div className="stat-card__content">
                <p className="stat-card__label">Total Replies</p>
                <div className="stat-card__value">{stats.total || 0}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--success"><MdLabel /></div>
              <div className="stat-card__content">
                <p className="stat-card__label">Greeting</p>
                <div className="stat-card__value">{stats.greeting || 0}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--info"><MdLabel /></div>
              <div className="stat-card__content">
                <p className="stat-card__label">Support</p>
                <div className="stat-card__value">{stats.support || 0}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--warning"><MdLabel /></div>
              <div className="stat-card__content">
                <p className="stat-card__label">Sales</p>
                <div className="stat-card__value">{stats.sales || 0}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--secondary"><MdFolder /></div>
              <div className="stat-card__content">
                <p className="stat-card__label">Other</p>
                <div className="stat-card__value">{stats.other || 0}</div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="saved-replies-search-wrapper">
            <div className="saved-replies-search-container">
              <MdSearch className="search-icon" />
              <input
                type="text"
                className="saved-replies-search-input"
                placeholder="Search replies by shortcut, message, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search saved replies"
              />
              {searchTerm && (
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

          {/* Category Filters */}
          <Card className="filters-card">
            <div className="filter-section">
              <span className="filter-label">Category:</span>
              <div className="filter-chips">
                <button 
                  className={`filter-chip ${categoryFilter === 'all' ? 'filter-chip-active' : ''}`}
                  onClick={() => setCategoryFilter('all')}
                >
                  <MdFolder className="filter-chip-icon" />
                  <span>All</span>
                </button>
                <button 
                  className={`filter-chip ${categoryFilter === 'greeting' ? 'filter-chip-active' : ''}`}
                  onClick={() => setCategoryFilter('greeting')}
                >
                  <MdLabel className="filter-chip-icon" />
                  <span>Greeting</span>
                </button>
                <button 
                  className={`filter-chip ${categoryFilter === 'support' ? 'filter-chip-active' : ''}`}
                  onClick={() => setCategoryFilter('support')}
                >
                  <MdLabel className="filter-chip-icon" />
                  <span>Support</span>
                </button>
                <button 
                  className={`filter-chip ${categoryFilter === 'sales' ? 'filter-chip-active' : ''}`}
                  onClick={() => setCategoryFilter('sales')}
                >
                  <MdLabel className="filter-chip-icon" />
                  <span>Sales</span>
                </button>
                <button 
                  className={`filter-chip ${categoryFilter === 'other' ? 'filter-chip-active' : ''}`}
                  onClick={() => setCategoryFilter('other')}
                >
                  <MdFolder className="filter-chip-icon" />
                  <span>Other</span>
                </button>
              </div>
            </div>
          </Card>

        <div className="replies-grid">
          {filteredReplies.length === 0 ? (
            <div className="empty-state">
              <MdChatBubbleOutline className="empty-icon" />
              <h3>{searchTerm ? 'No replies found' : 'No saved replies yet'}</h3>
              <p>{searchTerm ? 'Try a different search term' : 'Create quick reply templates to save time'}</p>
              {!searchTerm && (
                <button className="create-btn-secondary" onClick={() => setShowModal(true)}>
                  Create Reply
                </button>
              )}
            </div>
          ) : (
            filteredReplies.map((reply) => (
              <div key={reply._id} className="reply-card">
                <div className="reply-header">
                  <div className="shortcut-badge">/{reply.shortcut}</div>
                  <div className="reply-actions">
                    <button className="copy-btn" onClick={() => handleCopy(reply.message)} title="Copy message">
                      <MdContentCopy />
                    </button>
                    <button className="edit-btn" onClick={() => handleEdit(reply)}>
                      <MdEdit />
                    </button>
                    <button className="delete-btn" onClick={() => handleDeleteClick(reply._id)}>
                      <MdDelete />
                    </button>
                  </div>
                </div>
                <p className="reply-message">{reply.message}</p>
                {reply.category && (
                  <div className="reply-footer">
                    <span className="category-tag"><MdLabel /> {reply.category}</span>
                  </div>
                )}
                <div className="reply-meta">
                  <span className="usage-count">Used {reply.usageCount || 0} times</span>
                </div>
              </div>
            ))
          )}
        </div>

        {showModal && (
          <div className="saved-replies__modal-overlay" onClick={handleCloseModal}>
            <div className="saved-replies__modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="saved-replies__modal-header">
                <h2>{editingReply ? 'Edit Reply' : 'Create New Reply'}</h2>
                <button className="saved-replies__close-btn" onClick={handleCloseModal}>×</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="saved-replies__form-group">
                  <label>Shortcut *</label>
                  <div className="shortcut-input-wrapper">
                    <span className="shortcut-prefix"></span>
                    <input
                      type="text"
                      value={formData.shortcut}
                      onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                      required
                      placeholder="hello"
                      className="shortcut-input"
                    />
                  </div>
                  <small>Type /shortcut in chat to use this reply</small>
                </div>
                <div className="saved-replies__form-group">
                  <label>Message *</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    placeholder="Type your saved reply message (e.g., 'Thanks for contacting us! We'll respond within 24 hours.')"
                    rows="4"
                  />
                  <small>{formData.message.length} characters</small>
                </div>
                <div className="saved-replies__form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="category-select"
                  >
                    <option value="">Select a category</option>
                    <option value="greeting">Greeting</option>
                    <option value="support">Support</option>
                    <option value="sales">Sales</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    {editingReply ? 'Update Reply' : 'Create Reply'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingReplyId(null);
          }}
          onConfirm={handleDelete}
          title="Delete Saved Reply"
          message="Are you sure you want to delete this saved reply? This action cannot be undone."
          variant="danger"
          confirmText="Delete"
        />

        {/* Floating Action Button - Only show when there are replies */}
        {user?.businessId && replies.length > 0 && (
          <button className="saved-replies-fab" onClick={() => setShowModal(true)} title="Create new reply">
            <MdAdd />
          </button>
        )}
        </div>
      </div>
    );
  };
  
  export default SavedReplies;

