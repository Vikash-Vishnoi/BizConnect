/**
 * Role Manager Page
 * 
 * @component RoleManager
 * @description Admin page for creating and managing custom user roles with permissions (RBAC system).
 * Allows business admins to define custom roles with specific permission sets for granular access control.
 * 
 * @features
 * - Custom role creation with name and description
 * - Permission management with checkbox selection
 * - Role editing and deletion
 * - User count per role
 * - Role cards with permission preview
 * - Modal form for role creation/editing
 * - Empty states for no roles
 * - Business setup requirement check
 * 
 * @state
 * - roles: Array of role objects with permissions
 * - loading: Boolean loading state
 * - showModal: Boolean modal visibility
 * - editingRole: Object of role being edited (null for creation)
 * - formData: Object with name, description, permissions
 * 
 * @api
 * - GET /auth/roles: Fetch all custom roles
 * - POST /auth/roles: Create new role
 * - PUT /auth/roles/:id: Update existing role
 * - DELETE /auth/roles/:id: Delete role
 * 
 * @routes /admin/role-manager (requires BUSINESS_ADMIN role)
 * 
 * @example
 * // Usage in router
 * <Route path="/admin/role-manager" element={<RoleManager />} />
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Navbar';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import { API_BASE_URL } from '../../config/api';
import { STORAGE_KEYS } from '../../config/constants';
import './RoleManager.css';

/**
 * @constant {Array<string>} AVAILABLE_PERMISSIONS - All available permissions for role assignment
 */
const AVAILABLE_PERMISSIONS = [
  'create_campaign',
  'view_analytics',
  'manage_contacts',
  'manage_templates',
  'manage_users',
  'view_inbox',
  'send_messages',
  'manage_settings',
  'export_data',
  'manage_roles'
];

/**
 * @constant {Object} DEFAULT_FORM_DATA - Default values for role form
 */
const DEFAULT_FORM_DATA = {
  name: '',
  description: '',
  permissions: []
};

/**
 * @constant {number} PERMISSION_PREVIEW_LIMIT - Max permissions to show in card preview
 */
const PERMISSION_PREVIEW_LIMIT = 5;

const RoleManager = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  useEffect(() => {
    if (user?.businessId) {
      fetchRoles();
    }
  }, [user?.businessId]);

  /**
   * Fetch all custom roles from API
   */
  const fetchRoles = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const response = await fetch(`${API_BASE_URL}/auth/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle role form submission (create or update)
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const url = editingRole
        ? `${API_BASE_URL}/auth/roles/${editingRole._id}`
        : `${API_BASE_URL}/auth/roles`;
      const method = editingRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchRoles();
        handleCloseModal();
      }
    } catch (error) {
      console.error('Failed to save role:', error);
    }
  };

  /**
   * Delete role with confirmation
   * @param {string} roleId - Role ID to delete
   */
  const handleDelete = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;

    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const response = await fetch(`${API_BASE_URL}/auth/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchRoles();
      }
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  /**
   * Open modal to edit existing role
   * @param {Object} role - Role object to edit
   */
  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || []
    });
    setShowModal(true);
  };

  /**
   * Close modal and reset form state
   */
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormData(DEFAULT_FORM_DATA);
  };

  /**
   * Toggle permission selection in form
   * @param {string} permission - Permission to toggle
   */
  const togglePermission = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  if (!user?.businessId) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <BusinessSetupRequired
            title="Business Setup Required"
            message="Please complete your business setup to manage roles."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="role-manager-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading roles...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="role-manager-container">
        <div className="role-manager-header">
          <div>
            <h1>👥 Role Manager</h1>
            <p>Manage user roles and permissions (RBAC)</p>
          </div>
          <button 
            className="create-btn" 
            onClick={() => setShowModal(true)}
            aria-label="Create new role"
          >
            Create Role
          </button>
        </div>

        <div className="roles-grid">
          {roles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"></div>
              <h3>No roles created yet</h3>
              <p>Create your first role to manage user permissions</p>
              <button className="create-btn-secondary" onClick={() => setShowModal(true)}>
                Create Role
              </button>
            </div>
          ) : (
            roles.map((role) => (
              <div key={role._id} className="role-card">
                <div className="role-header">
                  <h3>{role.name}</h3>
                  <div className="role-actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEdit(role)}
                      aria-label={`Edit ${role.name} role`}
                    >
                      ✏️
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDelete(role._id)}
                      aria-label={`Delete ${role.name} role`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <p className="role-description">{role.description || 'No description'}</p>
                <div className="permissions-section">
                  <h4>Permissions ({role.permissions?.length || 0})</h4>
                  <div className="permissions-list">
                    {role.permissions?.slice(0, PERMISSION_PREVIEW_LIMIT).map((perm) => (
                      <span key={perm} className="permission-badge">{perm}</span>
                    ))}
                    {role.permissions?.length > PERMISSION_PREVIEW_LIMIT && (
                      <span className="permission-badge more">+{role.permissions.length - PERMISSION_PREVIEW_LIMIT} more</span>
                    )}
                  </div>
                </div>
                <div className="role-footer">
                  <span className="role-users">👤 {role.userCount || 0} users</span>
                </div>
              </div>
            ))
          )}
        </div>

        {showModal && (
          <div 
            className="role-manager__modal-overlay" 
            onClick={handleCloseModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-modal-title"
          >
            <div className="role-manager__modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="role-manager__modal-header">
                <h2 id="role-modal-title">{editingRole ? 'Edit Role' : 'Create New Role'}</h2>
                <button 
                  className="role-manager__close-btn" 
                  onClick={handleCloseModal}
                  aria-label="Close role modal"
                >×</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="role-manager__form-group">
                  <label htmlFor="role-name">Role Name *</label>
                  <input
                    id="role-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Marketing Manager"
                    aria-required="true"
                  />
                </div>
                <div className="role-manager__form-group">
                  <label htmlFor="role-description">Role Description</label>
                  <textarea
                    id="role-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe responsibilities and access level (e.g., 'Manages campaigns and views analytics')"
                    rows="3"
                  />
                </div>
                <div className="role-manager__form-group">
                  <label>Permissions</label>
                  <div className="permissions-checkboxes" role="group" aria-label="Select role permissions">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <label key={perm} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm)}
                          onChange={() => togglePermission(perm)}
                        />
                        <span>{perm.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="cancel-btn" 
                    onClick={handleCloseModal}
                    aria-label="Cancel role editing"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="submit-btn"
                    aria-label={editingRole ? 'Update role' : 'Create role'}
                  >
                    {editingRole ? 'Update Role' : 'Create Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RoleManager;

