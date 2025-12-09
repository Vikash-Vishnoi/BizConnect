import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import useAutoSave, { loadAutoSaved } from '../../hooks/useAutoSave';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ConfirmationModal from '../../components/ConfirmationModal';
import * as flowService from '../../services/automations/flowService';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { MdAdd, MdEdit, MdDelete, MdRefresh, MdCheckCircle, MdCancel, MdPlayArrow } from 'react-icons/md';
import './FlowList.css';

const FlowList = () => {
  const toast = useToast();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingFlowId, setDeletingFlowId] = useState(null);
  const [editingFlow, setEditingFlow] = useState(null);
  const [formData, setFormData] = useState(() => 
    loadAutoSaved('flowForm', {
      name: '',
      description: '',
      trigger: 'keyword',
      isActive: true
    })
  );
  
  // Auto-save form data when modal is open
  const { clearSaved } = useAutoSave('flowForm', formData, 500, showModal);

  const triggerTypes = ['keyword', 'webhook', 'schedule', 'manual'];

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const data = await flowService.getFlows();
      setFlows(data.flows || []);
    } catch (error) {
      console.error('Failed to fetch flows:', error);
      toast.error('Failed to load flows');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFlow) {
        await flowService.updateFlow(editingFlow._id, formData);
        toast.success('✅ Flow updated successfully');
      } else {
        await flowService.createFlow(formData);
        toast.success('🎉 Flow created successfully');
      }
      clearSaved(); // Clear auto-saved data
      fetchFlows();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save flow:', error);
      toast.error(error.message || 'Failed to save flow');
    }
  };

  const handleDeleteClick = (flowId) => {
    setDeletingFlowId(flowId);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      await flowService.deprecateFlow(deletingFlowId);
      toast.success('Flow deleted successfully');
      setShowDeleteModal(false);
      setDeletingFlowId(null);
      fetchFlows();
    } catch (error) {
      console.error('Failed to delete flow:', error);
      toast.error(error.message || 'Failed to delete flow');
      setShowDeleteModal(false);
    }
  };

  const handleToggleStatus = async (flowId, currentStatus) => {
    try {
      await flowService.updateFlow(flowId, { isActive: !currentStatus });
      toast.success(currentStatus ? 'Flow disabled' : 'Flow enabled');
      fetchFlows();
    } catch (error) {
      console.error('Failed to toggle flow status:', error);
      toast.error('Failed to toggle flow status');
    }
  };

  const handleEdit = (flow) => {
    setEditingFlow(flow);
    setFormData({
      name: flow.name,
      description: flow.description || '',
      trigger: flow.trigger || 'keyword',
      isActive: flow.isActive !== false
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFlow(null);
    setFormData({ name: '', description: '', trigger: 'keyword', isActive: true });
  };

  const getTriggerIcon = (trigger) => {
    switch (trigger) {
      case 'keyword': return '🔑';
      case 'webhook': return '🔗';
      case 'schedule': return '⏰';
      case 'manual': return '✋';
      default: return '⚡';
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flow-list-container">
          <LoadingSkeleton type="card" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flow-list-container">
        <div className="flow-list-header">
          <div>
            <h1>⚡ Automation Flows</h1>
            <p>Create and manage automated message flows</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="refresh-btn" onClick={fetchFlows}>
              <MdRefresh /> Refresh
            </button>
            <button className="create-btn" onClick={() => setShowModal(true)}>
              <MdAdd /> Create Flow
            </button>
          </div>
        </div>

        <div className="flows-grid">
          {flows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚡</div>
              <h3>No automation flows yet</h3>
              <p>Create your first automation flow to streamline your messaging</p>
              <button className="create-btn-secondary" onClick={() => setShowModal(true)}>
                Create Flow
              </button>
            </div>
          ) : (
            flows.map((flow) => (
              <div key={flow._id} className="flow-card">
                <div className="flow-status-indicator">
                  <div className={`status-dot ${flow.isActive ? 'active' : 'inactive'}`}></div>
                </div>
                <div className="flow-header">
                  <div className="flow-title-section">
                    <span className="trigger-icon">{getTriggerIcon(flow.trigger)}</span>
                    <h3>{flow.name}</h3>
                  </div>
                  <div className="flow-actions">
                    <button 
                      className="toggle-btn"
                      onClick={() => handleToggleStatus(flow._id, flow.isActive)}
                      title={flow.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {flow.isActive ? <MdCancel /> : <MdPlayArrow />}
                    </button>
                    <button className="edit-btn" onClick={() => handleEdit(flow)}>
                      <MdEdit />
                    </button>
                    <button className="delete-btn" onClick={() => handleDeleteClick(flow._id)}>
                      <MdDelete />
                    </button>
                  </div>
                </div>
                <p className="flow-description">{flow.description || 'No description'}</p>
                <div className="flow-meta">
                  <span className="meta-item">
                    <span className="meta-label">Trigger:</span>
                    <span className="meta-value">{flow.trigger}</span>
                  </span>
                  <span className="meta-item">
                    <span className="meta-label">Status:</span>
                    <span className={`status-badge ${flow.isActive ? 'active' : 'inactive'}`}>
                      {flow.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </span>
                </div>
                <div className="flow-stats">
                  <div className="stat-item">
                    <span className="stat-value">{flow.executionCount || 0}</span>
                    <span className="stat-label">Executions</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{flow.successRate || 0}%</span>
                    <span className="stat-label">Success Rate</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {showModal && (
          <div className="flow-list__modal-overlay" onClick={handleCloseModal}>
            <div className="flow-list__modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="flow-list__modal-header">
                <h2>{editingFlow ? 'Edit Flow' : 'Create New Flow'}</h2>
                <button className="flow-list__close-btn" onClick={handleCloseModal}>×</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="flow-list__form-group">
                  <label>Flow Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Welcome Message Flow"
                  />
                </div>
                <div className="flow-list__form-group">
                  <label>Flow Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the automation flow purpose and behavior (e.g., 'Sends welcome message to new customers')"
                    rows="3"
                  />
                </div>
                <div className="flow-list__form-group">
                  <label>Trigger Type *</label>
                  <select
                    value={formData.trigger}
                    onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                    required
                  >
                    {triggerTypes.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flow-list__form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <span>Active (flow will execute when triggered)</span>
                  </label>
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    {editingFlow ? 'Update Flow' : 'Create Flow'}
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
            setDeletingFlowId(null);
          }}
          onConfirm={handleDelete}
          title="Delete Flow"
          message="Are you sure you want to delete this flow? This action cannot be undone."
          variant="danger"
          confirmText="Delete"
        />
      </div>
    </>
  );
};

export default FlowList;



