import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdEdit, MdDelete, MdCampaign, MdBuild, MdSecurity, MdDescription, MdImage, MdVideocam, MdInsertDriveFile, MdPhone, MdLink, MdReply, MdSend } from 'react-icons/md';
import { useToast } from '../../components/Toast';
import * as templateService from '../../services/templates/templateService';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import './TemplateDetail.css';

const TemplateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTemplate();
  }, [id]);

  const loadTemplate = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const data = await templateService.getTemplateById(id);
      setTemplate(data);
    } catch (err) {
      console.error('Error loading template:', err);
      
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      
      const errorMsg = err.response?.data?.error || 'Failed to load template';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Analytics endpoint not yet implemented
  // const loadAnalytics = async () => {
  //   const token = localStorage.getItem('token');
  //   
  //   try {
  //     const response = await fetch(`http://localhost:3000/api/templates/${id}/analytics`, {
  //       headers: { 'Authorization': `Bearer ${token}` }
  //     });

  //     if (response.ok) {
  //       const data = await response.json();
  //       setAnalytics(data.analytics);
  //     }
  //   } catch (err) {
  //     console.error('Error loading analytics:', err);
  //   }
  // };

  const handleDelete = async () => {
    setDeleting(true);
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      await templateService.deleteTemplate(id);
      toast.success('Template deleted successfully');
      navigate('/templates');
    } catch (err) {
      console.error('Error deleting template:', err);
      const errorMsg = err.response?.data?.error || 'Failed to delete template';
      setError(errorMsg);
      toast.error(errorMsg);
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    navigate(`/templates/${id}/edit`);
  };

  const handleSubmitForApproval = async () => {
    setSubmitting(true);
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      await templateService.submitTemplate(id);
      toast.success('Template submitted for WhatsApp approval!');
      loadTemplate(); // Reload to get updated status
    } catch (err) {
      console.error('Error submitting template:', err);
      const errorMsg = err.response?.data?.error || 'Failed to submit template';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'approved': 'status-approved',
      'pending': 'status-pending',
      'rejected': 'status-rejected',
      'draft': 'status-draft',
      // Legacy uppercase support
      'APPROVED': 'status-approved',
      'PENDING': 'status-pending',
      'REJECTED': 'status-rejected',
      'PAUSED': 'status-paused'
    };
    return statusMap[status] || 'status-default';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'MARKETING': <MdCampaign className="category-icon-svg" />,
      'UTILITY': <MdBuild className="category-icon-svg" />,
      'AUTHENTICATION': <MdSecurity className="category-icon-svg" />
    };
    return icons[category] || <MdDescription className="category-icon-svg" />;
  };

  const renderComponent = (component) => {
    switch (component.type) {
      case 'HEADER':
        if (component.format === 'TEXT') {
          return (
            <div className="preview-header">
              <strong>{component.text}</strong>
            </div>
          );
        } else if (component.format === 'IMAGE') {
          return (
            <div className="preview-header">
              <div className="preview-media-placeholder">
                <MdImage /> Image Header
              </div>
            </div>
          );
        } else if (component.format === 'VIDEO') {
          return (
            <div className="preview-header">
              <div className="preview-media-placeholder">
                <MdVideocam /> Video Header
              </div>
            </div>
          );
        } else if (component.format === 'DOCUMENT') {
          return (
            <div className="preview-header">
              <div className="preview-media-placeholder">
                <MdInsertDriveFile /> Document Header
              </div>
            </div>
          );
        }
        break;

      case 'BODY':
        return (
          <div className="preview-body">
            {component.text}
          </div>
        );

      case 'FOOTER':
        return (
          <div className="preview-footer">
            {component.text}
          </div>
        );

      case 'BUTTONS':
        return (
          <div className="preview-buttons">
            {component.buttons?.map((button, index) => (
              <div key={index} className="preview-button">
                {button.type === 'PHONE_NUMBER' && <MdPhone style={{ marginRight: '4px' }} />}
                {button.type === 'URL' && <MdLink style={{ marginRight: '4px' }} />}
                {button.type === 'QUICK_REPLY' && <MdReply style={{ marginRight: '4px' }} />}
                {button.text}
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading template...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <Card className="error-state">
            <h3>Template not found</h3>
            <p>{error || 'The template you are looking for does not exist.'}</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Navbar />
      
      <div className="page-content">
        {/* Header */}
        <div className="page-header">
          <div className="page-header-text" style={{ textAlign: 'center', flex: 1 }}>
            <h1 className="page-title">Template Details</h1>
          </div>
        </div>

        <div className="detail-content">
          {/* Left Column - Template Info */}
          <div className="detail-left">
            <Card className="template-info-card">
              <div className="info-header">
                <div className="template-title">
                  <span className="category-icon">{getCategoryIcon(template.category)}</span>
                  <h2>{template.name}</h2>
                </div>
                <span className={`status-badge ${getStatusBadgeClass(template.status)}`}>
                  {template.status}
                </span>
              </div>

              <div className="info-section">
                <h3>Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Category</span>
                    <span className="info-value">{template.category}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Language</span>
                    <span className="info-value">{template.language}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Created</span>
                    <span className="info-value">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Updated</span>
                    <span className="info-value">
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {template.status === 'REJECTED' && template.rejectionReason && (
                <div className="info-section rejection-section">
                  <h3>Rejection Reason</h3>
                  <p className="rejection-text">{template.rejectionReason}</p>
                </div>
              )}

              {template.variables && template.variables.length > 0 && (
                <div className="info-section">
                  <h3>Variables</h3>
                  <div className="variables-list">
                    {template.variables.map((variable, index) => (
                      <div key={index} className="variable-item">
                        <code>{'{{' + (index + 1) + '}}'}</code>
                        <span>{variable.name || `Variable ${index + 1}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="template-actions" style={{ display: 'flex', gap: 'var(--spacing-base)', marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--border)' }}>
                {(template.status === 'draft' || template.status === 'rejected') && (
                  <>
                    <Button type="button" onClick={handleEdit} variant="outline" fullWidth>
                      <MdEdit /> Edit Template
                    </Button>
                    <Button type="button" onClick={handleSubmitForApproval} variant="primary" fullWidth disabled={submitting}>
                      <MdSend /> {submitting ? 'Submitting...' : 'Submit for Approval'}
                    </Button>
                    <Button type="button" onClick={() => setShowDeleteConfirm(true)} variant="danger" fullWidth>
                      <MdDelete /> Delete Template
                    </Button>
                  </>
                )}
              </div>
            </Card>

            {/* Analytics Card */}
            {analytics && (
              <Card className="analytics-card">
                <h3>Performance Analytics</h3>
                <div className="analytics-grid">
                  <div className="analytics-item">
                    <span className="analytics-icon">📤</span>
                    <div className="analytics-content">
                      <span className="analytics-label">Total Sent</span>
                      <span className="analytics-value">{analytics.totalSent || 0}</span>
                    </div>
                  </div>
                  <div className="analytics-item">
                    <span className="analytics-icon"></span>
                    <div className="analytics-content">
                      <span className="analytics-label">Delivered</span>
                      <span className="analytics-value">{analytics.delivered || 0}</span>
                    </div>
                  </div>
                  <div className="analytics-item">
                    <span className="analytics-icon"></span>
                    <div className="analytics-content">
                      <span className="analytics-label">Read</span>
                      <span className="analytics-value">{analytics.read || 0}</span>
                    </div>
                  </div>
                  <div className="analytics-item">
                    <span className="analytics-icon">🖱️</span>
                    <div className="analytics-content">
                      <span className="analytics-label">Button Clicks</span>
                      <span className="analytics-value">{analytics.buttonClicks || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="analytics-rates">
                  <div className="rate-item">
                    <span className="rate-label">Delivery Rate</span>
                    <div className="rate-bar">
                      <div 
                        className="rate-fill" 
                        style={{ width: `${analytics.deliveryRate || 0}%` }}
                      ></div>
                    </div>
                    <span className="rate-value">{analytics.deliveryRate || 0}%</span>
                  </div>
                  <div className="rate-item">
                    <span className="rate-label">Read Rate</span>
                    <div className="rate-bar">
                      <div 
                        className="rate-fill" 
                        style={{ width: `${analytics.readRate || 0}%` }}
                      ></div>
                    </div>
                    <span className="rate-value">{analytics.readRate || 0}%</span>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="detail-right">
            <Card className="preview-card">
              <h3>Template Preview</h3>
              <div className="whatsapp-preview">
                <div className="preview-message">
                  {template.components?.map((component, index) => (
                    <div key={index}>
                      {renderComponent(component)}
                    </div>
                  ))}
                  
                  {/* Timestamp */}
                  <div className="preview-timestamp">
                    {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="template-detail__modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="template-detail__modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Template?</h3>
              <p>Are you sure you want to delete this template? This action cannot be undone.</p>
              <div className="modal-actions">
                <Button 
                  onClick={() => setShowDeleteConfirm(false)} 
                  variant="outline"
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleDelete} 
                  variant="danger"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateDetail;

