import React, { useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS, ROLES } from '../utils/roles';
import { MdDashboard, MdCampaign, MdMessage, MdDescription, MdAnalytics, MdSchedule, MdContacts, MdBuild, MdAutorenew, MdReply, MdPhoneAndroid, MdSearch, MdAssessment, MdNotifications, MdPeople, MdSettings, MdBusiness, MdHelp, MdExitToApp, MdWhatsapp, MdAdminPanelSettings } from 'react-icons/md';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermissionTo } = useAuth();
  
  // Position dropdowns on hover
  useEffect(() => {
    const handleDropdownPosition = (e) => {
      const wrapper = e.currentTarget;
      const dropdown = wrapper.querySelector('.navbar-dropdown-menu');
      if (dropdown) {
        const rect = wrapper.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.left = `${rect.left}px`;
      }
    };

    const wrappers = document.querySelectorAll('.navbar-dropdown-wrapper');
    wrappers.forEach(wrapper => {
      wrapper.addEventListener('mouseenter', handleDropdownPosition);
    });

    return () => {
      wrappers.forEach(wrapper => {
        wrapper.removeEventListener('mouseenter', handleDropdownPosition);
      });
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;
  
  // Get role badge color
  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case ROLES.SUPER_ADMIN:
        return 'var(--color-purple)';
      case ROLES.BUSINESS_ADMIN:
        return 'var(--color-primary)';
      case ROLES.MANAGER:
        return 'var(--color-success)';
      case ROLES.USER:
        return 'var(--color-info)';
      default:
        return 'var(--color-info)';
    }
  };
  
  const getRoleDisplayName = () => {
    switch (user?.role) {
      case ROLES.SUPER_ADMIN:
        return 'Super Admin';
      case ROLES.BUSINESS_ADMIN:
        return 'Admin';
      case ROLES.MANAGER:
        return 'Manager';
      case ROLES.USER:
        return 'User';
      default:
        return 'User';
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand" onClick={() => navigate('/dashboard')}>
          <span className="navbar-logo"><MdWhatsapp /></span>
          <span className="navbar-title">WhatsApp Marketing</span>
        </div>

        <div className="navbar-menu">
          <button
            className={`navbar-link ${isActive('/dashboard') ? 'navbar-link-active' : ''}`}
            onClick={() => navigate('/dashboard')}
          >
            <span className="navbar-link-icon"><MdDashboard /></span>
            <span>Dashboard</span>
          </button>

          {hasPermissionTo(PERMISSIONS.MANAGE_TEMPLATES) && (
            <button
              className={`navbar-link ${isActive('/templates') || location.pathname.startsWith('/templates/') ? 'navbar-link-active' : ''}`}
              onClick={() => navigate('/templates')}
            >
              <span className="navbar-link-icon"><MdDescription /></span>
              <span>Templates</span>
            </button>
          )}

          {hasPermissionTo(PERMISSIONS.CREATE_CAMPAIGNS) && (
            <button
              className={`navbar-link ${isActive('/campaigns') ? 'navbar-link-active' : ''}`}
              onClick={() => navigate('/campaigns')}
            >
              <span className="navbar-link-icon"><MdCampaign /></span>
              <span>Campaigns</span>
            </button>
          )}

          <button
            className={`navbar-link ${isActive('/inbox') || location.pathname.startsWith('/inbox/') ? 'navbar-link-active' : ''}`}
            onClick={() => navigate('/inbox')}
          >
            <span className="navbar-link-icon"><MdMessage /></span>
            <span>Inbox</span>
          </button>

          {hasPermissionTo(PERMISSIONS.VIEW_ANALYTICS) && (
            <button
              className={`navbar-link ${isActive('/analytics') ? 'navbar-link-active' : ''}`}
              onClick={() => navigate('/analytics')}
            >
              <span className="navbar-link-icon"><MdAnalytics /></span>
              <span>Analytics</span>
            </button>
          )}

          <button
            className={`navbar-link ${isActive('/scheduled-messages') ? 'navbar-link-active' : ''}`}
            onClick={() => navigate('/scheduled-messages')}
          >
            <span className="navbar-link-icon"><MdSchedule /></span>
            <span>Scheduled</span>
          </button>

          <button
            className={`navbar-link ${isActive('/contacts') ? 'navbar-link-active' : ''}`}
            onClick={() => navigate('/contacts')}
          >
            <span className="navbar-link-icon"><MdContacts /></span>
            <span>Contacts</span>
          </button>

          {(hasPermissionTo(PERMISSIONS.MANAGE_AUTOMATIONS) || hasPermissionTo(PERMISSIONS.SEND_MESSAGES)) && (
            <div className="navbar-dropdown-wrapper">
              <button className="navbar-link">
                <span className="navbar-link-icon"><MdBuild /></span>
                <span>Tools</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              <div className="navbar-dropdown-menu">
                {hasPermissionTo(PERMISSIONS.MANAGE_AUTOMATIONS) && (
                  <>
                    <button className="navbar-dropdown-item" onClick={() => navigate('/flows')}>
                      <span><MdAutorenew /></span>
                      <span>Automation Flows</span>
                    </button>
                    <button className="navbar-dropdown-item" onClick={() => navigate('/status-composer')}>
                      <span><MdPhoneAndroid /></span>
                      <span>Status Updates</span>
                    </button>
                  </>
                )}
                <button className="navbar-dropdown-item" onClick={() => navigate('/saved-replies')}>
                  <span><MdReply /></span>
                  <span>Saved Replies</span>
                </button>
                <button className="navbar-dropdown-item" onClick={() => navigate('/search')}>
                  <span><MdSearch /></span>
                  <span>Global Search</span>
                </button>
              </div>
            </div>
          )}

          {hasPermissionTo(PERMISSIONS.VIEW_ANALYTICS) && (
            <div className="navbar-dropdown-wrapper">
              <button className="navbar-link">
                <span className="navbar-link-icon"><MdAssessment /></span>
                <span>Advanced</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              <div className="navbar-dropdown-menu">
                <button className="navbar-dropdown-item" onClick={() => navigate('/template-analytics')}>
                  <span><MdDescription /></span>
                  <span>Template Analytics</span>
                </button>
                <button className="navbar-dropdown-item" onClick={() => navigate('/conversation-analytics')}>
                  <span><MdMessage /></span>
                  <span>Conversation Analytics</span>
                </button>
                <button className="navbar-dropdown-item" onClick={() => navigate('/contact-history')}>
                  <span><MdDescription /></span>
                  <span>Contact History</span>
                </button>
                {hasPermissionTo(PERMISSIONS.MANAGE_BUSINESS_SETTINGS) && (
                  <button className="navbar-dropdown-item" onClick={() => navigate('/message-errors')}>
                    <span><MdNotifications /></span>
                    <span>Message Errors</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {hasPermissionTo(PERMISSIONS.MANAGE_BUSINESS_SETTINGS) && (
            <div className="navbar-dropdown-wrapper">
              <button className="navbar-link">
                <span className="navbar-link-icon"><MdSettings /></span>
                <span>Admin</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              <div className="navbar-dropdown-menu">
                {hasPermissionTo(PERMISSIONS.MANAGE_TEAM) && (
                  <>
                    <button className="navbar-dropdown-item" onClick={() => navigate('/team')}>
                      <span><MdPeople /></span>
                      <span>Team Members</span>
                    </button>
                    <button className="navbar-dropdown-item" onClick={() => navigate('/roles')}>
                      <span><MdPeople /></span>
                      <span>Role Manager</span>
                    </button>
                    <button className="navbar-dropdown-item" onClick={() => navigate('/audit-log')}>
                      <span><MdDescription /></span>
                      <span>Audit Log</span>
                    </button>
                  </>
                )}
                <button className="navbar-dropdown-item" onClick={() => navigate('/alerts')}>
                  <span><MdNotifications /></span>
                  <span>Alerts</span>
                </button>
                <button className="navbar-dropdown-item" onClick={() => navigate('/phone-health')}>
                  <span><MdPhoneAndroid /></span>
                  <span>Phone Health</span>
                </button>
                <button className="navbar-dropdown-item" onClick={() => navigate('/rate-limits')}>
                  <span><MdSchedule /></span>
                  <span>Rate Limits</span>
                </button>
                <button className="navbar-dropdown-item" onClick={() => navigate('/quality-rating-history')}>
                  <span><MdAssessment /></span>
                  <span>Quality History</span>
                </button>
                <button className="navbar-dropdown-item" onClick={() => navigate('/optin-manager')}>
                  <span><MdSettings /></span>
                  <span>Opt-In Manager</span>
                </button>
                <button className="navbar-dropdown-item" onClick={() => navigate('/privacy')}>
                  <span><MdSettings /></span>
                  <span>Privacy & GDPR</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="navbar-actions">
          <button className="navbar-notification">
            <span className="navbar-notification-icon"><MdNotifications /></span>
            <span className="navbar-notification-badge">3</span>
          </button>

          <div className="navbar-user">
            <div className="navbar-user-avatar">
              <MdPeople />
              <span className="navbar-user-role-badge" style={{ backgroundColor: getRoleBadgeColor() }}>
                {getRoleDisplayName()}
              </span>
            </div>
            <div className="navbar-user-dropdown">
              <div className="navbar-user-info">
                <div className="navbar-user-name">{user?.email || 'User'}</div>
                <div className="navbar-user-role" style={{ color: getRoleBadgeColor() }}>
                  <MdAdminPanelSettings /> {getRoleDisplayName()}
                </div>
              </div>
              <div className="navbar-dropdown-divider"></div>
              <button className="navbar-dropdown-item" onClick={() => navigate('/profile')}>
                <span><MdPeople /></span>
                <span>Profile</span>
              </button>
              <button className="navbar-dropdown-item" onClick={() => navigate('/notifications')}>
                <span><MdNotifications /></span>
                <span>Notifications</span>
              </button>
              <div className="navbar-dropdown-divider"></div>
              <button className="navbar-dropdown-item" onClick={handleLogout}>
                <span><MdExitToApp /></span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
