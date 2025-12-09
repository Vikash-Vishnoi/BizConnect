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
import { MdAdd, MdEdit, MdDelete, MdRefresh, MdSearch, MdContentCopy } from 'react-icons/md';
import { API_BASE_URL } from '../../config/api';
import './SavedReplies.css';

const SavedReplies = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState(null);
  const [editingReply, setEditingReply] = useState(null);
  const [formData, setFormData] = useState(() => 
    loadAutoSaved('savedReplyForm', {
      shortcut: '',
      message: '',
      category: ''
    })
  );
  
  // Auto-save form data when modal is open
  const { clearSaved } = useAutoSave('savedReplyForm', formData, 500, showModal);

  useEffect(() => {
    if (user?.businessId) {
      fetchReplies();
    }
  }, [user?.businessId]);

  const fetchReplies = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/messages/saved-replies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReplies(data.replies || []);
      } else {
        throw new Error('Failed to fetch replies');
      }
    } catch (error) {
      console.error('Failed to fetch saved replies:', error);
      toast.error('Failed to load saved replies');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingReply
        ? `${API_BASE_URL}/messages/saved-replies/${editingReply._id}`
        : `${API_BASE_URL}/messages/saved-replies`;
      const method = editingReply ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        clearSaved(); // Clear auto-saved data
        toast.success(editingReply ? '✅ Reply updated' : '🎉 Reply created');
        fetchReplies();
        handleCloseModal();
      } else {
        throw new Error('Failed to save reply');
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

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/messages/saved-replies/${deletingReplyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Reply deleted successfully');
        setShowDeleteModal(false);
        setDeletingReplyId(null);
        fetchReplies();
      } else {
        throw new Error('Failed to delete reply');
      }
    } catch (error) {
      console.error('Failed to delete reply:', error);
      toast.error(error.message || 'Failed to delete reply');
      setShowDeleteModal(false);
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

  const filteredReplies = replies.filter(reply =>
    reply.shortcut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reply.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reply.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <>
      <Navbar />
      <div className="saved-replies-container">
        <div className="saved-replies-header">
          <div>
            <h1>💬 Saved Replies</h1>
            <p>Quick response templates for faster messaging</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="refresh-btn" onClick={fetchReplies}>
              <MdRefresh /> Refresh
            </button>
            <button className="create-btn" onClick={() => setShowModal(true)}>
              <MdAdd /> Create Reply
            </button>
          </div>
        </div>

        <div className="search-section" style={{ position: 'relative' }}>
          <MdSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: '20px' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Search replies by shortcut, message, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>

        <div className="replies-grid">
          {filteredReplies.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"></div>
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
                    <span className="category-tag">📁 {reply.category}</span>
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
                    <span className="shortcut-prefix">/</span>
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
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Greetings, Support, Sales"
                  />
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
      </div>
    </>
  );
};

export default SavedReplies;

