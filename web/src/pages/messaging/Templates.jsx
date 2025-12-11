import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import * as templateService from '../../services/templates/templateService';
import { useDebounce } from '../../hooks/useDebounce';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import { MdAdd, MdRefresh, MdCheckCircle, MdAccessTime, MdError, MdDescription, MdCampaign, MdBuild, MdSecurity, MdInsertDriveFile, MdCalendarToday, MdSearch, MdClose, MdApps } from 'react-icons/md';
import './Templates.css';

const Templates = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [error, setError] = useState('');
  
  // Debounce search query to avoid too many API calls
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Reload templates when filters change
  useEffect(() => {
    loadTemplates();
  }, [debouncedSearch, statusFilter, categoryFilter]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError('');

    try {
      const params = {};
      
      // Add search parameter
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      
      // Add status filter
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      // Add category filter
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      
      const data = await templateService.getTemplates(params);
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Error loading templates:', err);
      const errorMsg = err.response?.data?.message || 'Failed to load templates. Please try again.';
      setError(errorMsg);
      
      // Don't show toast for business setup errors
      if (!errorMsg.includes('business') && !errorMsg.includes('X-Business-ID')) {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await templateService.getTemplateStats();
      setStats(data || stats);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleTemplateClick = (templateId) => {
    navigate(`/templates/${templateId}`);
  };

  const handleCreateTemplate = () => {
    // Clear any auto-saved template data for fresh start
    localStorage.removeItem('createTemplate');
    navigate('/templates/create');
  };

  const getStatusBadge = (status) => {
    const badges = {
      'draft': { icon: <MdBuild />, text: 'Draft', className: 'status-draft', color: '#6b7280' },
      'approved': { icon: <MdCheckCircle />, text: 'Approved', className: 'status-approved', color: '#4caf50' },
      'pending': { icon: <MdAccessTime />, text: 'Pending', className: 'status-pending', color: '#ff9800' },
      'rejected': { icon: <MdError />, text: 'Rejected', className: 'status-rejected', color: '#f44336' },
      // Legacy uppercase support
      'APPROVED': { icon: <MdCheckCircle />, text: 'Approved', className: 'status-approved', color: '#4caf50' },
      'PENDING': { icon: <MdAccessTime />, text: 'Pending', className: 'status-pending', color: '#ff9800' },
      'REJECTED': { icon: <MdError />, text: 'Rejected', className: 'status-rejected', color: '#f44336' }
    };
    const badge = badges[status] || { icon: <MdDescription />, text: status, className: 'status-default', color: '#757575' };
    
    return (
      <span className={`status-badge ${badge.className}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: badge.color }}>
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'MARKETING': <MdCampaign className="category-icon-svg" />,
      'UTILITY': <MdBuild className="category-icon-svg" />,
      'AUTHENTICATION': <MdSecurity className="category-icon-svg" />
    };
    return icons[category] || <MdInsertDriveFile className="category-icon-svg" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Check if business setup is complete
  if (!user?.businessId) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <BusinessSetupRequired 
            title="Business Setup Required"
            message="Please complete your business setup to manage message templates"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Navbar />
      
      <div className="page-content templates-page-content">
        {/* Header */}
        <div className="templates-header">
          <div className="templates-header-text" style={{ textAlign: 'center', width: '100%' }}>
            <h1 className="templates-title">Templates</h1>
            <p className="templates-subtitle">Create and manage WhatsApp message templates • {templates.length} total</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-primary"><MdDescription /></div>
            <div className="stat-content">
              <p className="stat-label">Total Templates</p>
              <h2 className="stat-value">{stats.total}</h2>
            </div>
          </Card>

          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-success"><MdCheckCircle /></div>
            <div className="stat-content">
              <p className="stat-label">Approved</p>
              <h2 className="stat-value">{stats.approved}</h2>
            </div>
          </Card>

          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-warning"><MdAccessTime /></div>
            <div className="stat-content">
              <p className="stat-label">Pending</p>
              <h2 className="stat-value">{stats.pending}</h2>
            </div>
          </Card>

          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-info"><MdBuild /></div>
            <div className="stat-content">
              <p className="stat-label">Draft</p>
              <h2 className="stat-value">{stats.draft}</h2>
            </div>
          </Card>

          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-danger"><MdError /></div>
            <div className="stat-content">
              <p className="stat-label">Rejected</p>
              <h2 className="stat-value">{stats.rejected}</h2>
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="templates-search-wrapper">
          <div className="templates-search-container">
            <MdSearch className="search-icon" />
            <input
              type="text"
              className="templates-search-input"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search templates..."
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={handleClearSearch}>
                <MdClose />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="filters-card">
          <div className="filter-section">
            <span className="filter-label">Status:</span>
            <div className="filter-chips">
            <button 
              className={`filter-chip ${statusFilter === 'all' ? 'filter-chip-active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              <MdApps className="filter-chip-icon" />
              <span>All</span>
            </button>
            <button 
              className={`filter-chip ${statusFilter === 'approved' ? 'filter-chip-active' : ''}`}
              onClick={() => setStatusFilter('approved')}
            >
              <MdCheckCircle className="filter-chip-icon" />
              <span>Approved</span>
            </button>
            <button 
              className={`filter-chip ${statusFilter === 'pending' ? 'filter-chip-active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              <MdAccessTime className="filter-chip-icon" />
              <span>Pending</span>
            </button>
            <button 
              className={`filter-chip ${statusFilter === 'draft' ? 'filter-chip-active' : ''}`}
              onClick={() => setStatusFilter('draft')}
            >
              <MdBuild className="filter-chip-icon" />
              <span>Draft</span>
            </button>
            <button 
              className={`filter-chip ${statusFilter === 'rejected' ? 'filter-chip-active' : ''}`}
              onClick={() => setStatusFilter('rejected')}
            >
              <MdError className="filter-chip-icon" />
              <span>Rejected</span>
            </button>
          </div>
          </div>
          <div className="filter-section">
            <span className="filter-label">Category:</span>
            <div className="filter-chips">
            <button 
              className={`filter-chip ${categoryFilter === 'all' ? 'filter-chip-active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              <MdApps className="filter-chip-icon" />
              <span>All</span>
            </button>
            <button 
              className={`filter-chip ${categoryFilter === 'UTILITY' ? 'filter-chip-active' : ''}`}
              onClick={() => setCategoryFilter('UTILITY')}
            >
              <MdBuild className="filter-chip-icon" />
              <span>Utility</span>
            </button>
            <button 
              className={`filter-chip ${categoryFilter === 'MARKETING' ? 'filter-chip-active' : ''}`}
              onClick={() => setCategoryFilter('MARKETING')}
            >
              <MdCampaign className="filter-chip-icon" />
              <span>Marketing</span>
            </button>
            <button 
              className={`filter-chip ${categoryFilter === 'AUTHENTICATION' ? 'filter-chip-active' : ''}`}
              onClick={() => setCategoryFilter('AUTHENTICATION')}
            >
              <MdSecurity className="filter-chip-icon" />
              <span>Authentication</span>
            </button>
          </div>
          </div>
        </Card>

        {/* Error Message */}
        {error && (error.includes('business') || error.includes('X-Business-ID')) ? (
          <BusinessSetupRequired 
            message="Please complete your business setup to start creating templates"
          />
        ) : error ? (
          <Card className="error-card">
            <p>{error}</p>
            <Button onClick={loadTemplates}>Retry</Button>
          </Card>
        ) : null}

        {/* Templates List */}
        {!error && (
          <>
            {loading ? (
              <LoadingSkeleton type="card" />
            ) : templates.length === 0 ? (
              <Card className="templates-empty-state">
                <div className="empty-state-icon"><MdDescription /></div>
                <h3 className="empty-state-title">No Templates Found</h3>
                <p className="empty-state-text">
                  {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'No templates match your current filters. Try adjusting them to see more results.'
                    : 'Get started by creating your first WhatsApp message template'}
                </p>
                {!searchQuery && statusFilter === 'all' && categoryFilter === 'all' && (
                  <Button onClick={handleCreateTemplate}><MdAdd /> Create Your First Template</Button>
                )}
              </Card>
            ) : (
              <div className="templates-list">
                {templates.map(template => (
                  <Card 
                    key={template._id} 
                    className="template-list-item"
                    hoverable
                    onClick={() => handleTemplateClick(template._id)}
                  >
                    <div className="template-item-header">
                      <div className="template-item-left">
                        <div className="template-category-badge">
                          {getCategoryIcon(template.category)}
                          <span>{template.category}</span>
                        </div>
                        <h3 className="template-item-name">{template.name}</h3>
                      </div>
                      <div className="template-item-right">
                        {getStatusBadge(template.status)}
                      </div>
                    </div>

                    <div className="template-item-body">
                      <p className="template-item-language">Language: {template.language}</p>
                      
                      {template.components?.find(c => c.type === 'BODY') && (
                        <div className="template-item-preview">
                          {template.components.find(c => c.type === 'BODY').text?.substring(0, 150)}
                          {template.components.find(c => c.type === 'BODY').text?.length > 150 && '...'}
                        </div>
                      )}
                    </div>

                    <div className="template-item-footer">
                      <span className="template-item-meta">
                        {template.usageCount || 0} uses
                      </span>
                      <span className="template-item-meta">
                        <MdCalendarToday /> {formatDate(template.createdAt)}
                      </span>
                    </div>

                    {template.status === 'REJECTED' && template.rejectionReason && (
                      <div className="template-rejection-reason">
                        {template.rejectionReason}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Floating Action Button */}
        {templates.length > 0 && (
          <button className="templates-fab" onClick={handleCreateTemplate} title="Create Template">
            <MdAdd />
          </button>
        )}
      </div>
    </div>
  );
};

export default Templates;



