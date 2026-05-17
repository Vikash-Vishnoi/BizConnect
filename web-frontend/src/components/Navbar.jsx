/**
 * 🧭 Navbar Component
 * 
 * Main navigation bar with role-based access control.
 * Dynamically shows/hides menu items based on user permissions.
 * Includes dropdown menus for Tools, Advanced analytics, and Admin functions.
 * 
 * @component
 * @requires AuthContext - For user authentication and permissions
 * @requires roles - For PERMISSIONS and ROLES constants
 * 
 * @features
 * - Role-based permission checks (hasPermissionTo)
 * - Dynamic dropdown positioning on hover
 * - Visual role badges with color coding
 * - Active link highlighting
 * - Notification indicator
 * - User profile dropdown
 * 
 * @permissions
 * - MANAGE_TEMPLATES: Access to Templates page
 * - CREATE_CAMPAIGNS: Access to Campaigns page
 * - VIEW_ANALYTICS: Access to Analytics pages
 * - MANAGE_AUTOMATIONS: Access to automation tools
 * - MANAGE_BUSINESS_SETTINGS: Access to Admin section
 * - MANAGE_TEAM: Access to team management
 * 
 * @example
 * <Navbar />
 */

import React, { useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS, ROLES } from '../utils/roles';
import { MdDashboard,MdAssessment, MdCampaign, MdMessage, MdDescription, MdAnalytics, MdSchedule, MdBuild, MdAutorenew, MdReply, MdPhoneAndroid, MdSearch, MdNotifications, MdPeople, MdSettings, MdBusiness, MdHelp, MdExitToApp, MdWhatsapp, MdAdminPanelSettings, MdVpnKey, MdError, MdHistory } from 'react-icons/md';
import NotificationDropdown from './NotificationDropdown';
import './Navbar.css';

/**
 * Role badge color configuration
 */
const ROLE_BADGE_COLORS = {
  [ROLES.SUPER_ADMIN]: 'var(--color-purple)',
  [ROLES.BUSINESS_ADMIN]: 'var(--color-primary)',
  [ROLES.MANAGER]: 'var(--color-success)',
  [ROLES.USER]: 'var(--color-info)'
};

const DEFAULT_ROLE_COLOR = 'var(--color-info)';

/**
 * Role display name mapping
 */
const ROLE_DISPLAY_NAMES = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.BUSINESS_ADMIN]: 'Admin',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.USER]: 'User'
};

const DEFAULT_ROLE_NAME = 'User';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermissionTo } = useAuth();
  
  // Position dropdowns on hover with delay to prevent rapid closing
  useEffect(() => {
    const timeouts = new Map();
    
    const showDropdown = (wrapper) => {
      wrapper.classList.add('dropdown-open');
      const dropdown = wrapper.querySelector('.navbar-dropdown-menu');
      if (dropdown) {
        const rect = wrapper.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom}px`;
        dropdown.style.left = `${rect.left}px`;
      }
    };

    const hideDropdown = (wrapper) => {
      wrapper.classList.remove('dropdown-open');
    };

    const handleMouseEnter = (e) => {
      const wrapper = e.currentTarget;
      // Clear any pending hide timeout
      if (timeouts.has(wrapper)) {
        clearTimeout(timeouts.get(wrapper));
        timeouts.delete(wrapper);
      }
      showDropdown(wrapper);
    };

    const handleMouseLeave = (e) => {
      const wrapper = e.currentTarget;
      
      // Add delay before hiding
      const timeout = setTimeout(() => {
        hideDropdown(wrapper);
      }, 500); // 500ms delay gives time to move cursor
      
      timeouts.set(wrapper, timeout);
    };

    const handleDropdownEnter = (e) => {
      const dropdown = e.currentTarget;
      const wrapper = dropdown.closest('.navbar-dropdown-wrapper');
      if (wrapper && timeouts.has(wrapper)) {
        clearTimeout(timeouts.get(wrapper));
        timeouts.delete(wrapper);
      }
    };

    const handleDropdownLeave = (e) => {
      const dropdown = e.currentTarget;
      const wrapper = dropdown.closest('.navbar-dropdown-wrapper');
      if (wrapper) {
        const timeout = setTimeout(() => {
          hideDropdown(wrapper);
        }, 500);
        timeouts.set(wrapper, timeout);
      }
    };

    const wrappers = document.querySelectorAll('.navbar-dropdown-wrapper');
    wrappers.forEach(wrapper => {
      const dropdown = wrapper.querySelector('.navbar-dropdown-menu');
      wrapper.addEventListener('mouseenter', handleMouseEnter);
      wrapper.addEventListener('mouseleave', handleMouseLeave);
      if (dropdown) {
        dropdown.addEventListener('mouseenter', handleDropdownEnter);
        dropdown.addEventListener('mouseleave', handleDropdownLeave);
      }
    });

    return () => {
      wrappers.forEach(wrapper => {
        const dropdown = wrapper.querySelector('.navbar-dropdown-menu');
        wrapper.removeEventListener('mouseenter', handleMouseEnter);
        wrapper.removeEventListener('mouseleave', handleMouseLeave);
        if (dropdown) {
          dropdown.removeEventListener('mouseenter', handleDropdownEnter);
          dropdown.removeEventListener('mouseleave', handleDropdownLeave);
        }
      });
      // Clear all timeouts
      timeouts.forEach(timeout => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  /**
   * Handle user logout
   * Clears authentication and redirects to login page
   */
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /**
   * Check if current path is active
   * @param {string} path - Path to check
   * @returns {boolean} True if path matches current location
   */
  const isActive = (path) => location.pathname === path;
  
  /**
   * Get role badge color based on user role
   * @returns {string} CSS color variable
   */
  const getRoleBadgeColor = () => {
    return ROLE_BADGE_COLORS[user?.role] || DEFAULT_ROLE_COLOR;
  };
  
  /**
   * Get user-friendly role display name
   * @returns {string} Role display name
   */
  const getRoleDisplayName = () => {
    return ROLE_DISPLAY_NAMES[user?.role] || DEFAULT_ROLE_NAME;
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
            <div className="navbar-dropdown-wrapper">
              <button className={`navbar-link ${isActive('/analytics') || isActive('/template-analytics') || isActive('/conversation-analytics') ? 'navbar-link-active' : ''}`}>
                <span className="navbar-link-icon"><MdAnalytics /></span>
                <span>Analytics</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              <div className="navbar-dropdown-menu">
                <button className="navbar-dropdown-item" onClick={() => navigate('/analytics')}>
                  <span><MdAssessment /></span>
                  <span>Overview</span>
                </button>
                <button className="navbar-dropdown-item" onClick={() => navigate('/template-analytics')}>
                  <span><MdDescription /></span>
                  <span>Template Analytics</span>
                </button>
                <button className="navbar-dropdown-item" onClick={() => navigate('/conversation-analytics')}>
                  <span><MdMessage /></span>
                  <span>Conversation Analytics</span>
                </button>
              </div>
            </div>
          )}

          <button
            className={`navbar-link ${isActive('/scheduled') ? 'navbar-link-active' : ''}`}
            onClick={() => navigate('/scheduled')}
          >
            <span className="navbar-link-icon"><MdSchedule /></span>
            <span>Scheduled</span>
          </button>

          {(hasPermissionTo(PERMISSIONS.MANAGE_AUTOMATIONS) || hasPermissionTo(PERMISSIONS.SEND_MESSAGES)) && (
            <button
              className={`navbar-link ${location.pathname === '/saved-replies' ? 'active' : ''}`}
              onClick={() => navigate('/saved-replies')}
            >
              <span className="navbar-link-icon"><MdReply /></span>
              <span>Saved Replies</span>
            </button>
          )}

          {user?.role === ROLES.BUSINESS_ADMIN && (
            <button
              className={`navbar-link ${isActive('/team') ? 'navbar-link-active' : ''}`}
              onClick={() => navigate('/team')}
            >
              <span className="navbar-link-icon"><MdPeople /></span>
              <span>Team</span>
            </button>
          )}

          {hasPermissionTo(PERMISSIONS.MANAGE_BUSINESS_SETTINGS) && (
            <button
              className={`navbar-link ${isActive('/phone-health') ? 'navbar-link-active' : ''}`}
              onClick={() => navigate('/phone-health')}
            >
              <span className="navbar-link-icon"><MdPhoneAndroid /></span>
              <span>Phone Health</span>
            </button>
          )}

          {hasPermissionTo(PERMISSIONS.MANAGE_BUSINESS_SETTINGS) && (
            <button
              className={`navbar-link ${isActive('/errors-alerts') ? 'navbar-link-active' : ''}`}
              onClick={() => navigate('/errors-alerts')}
            >
              <span className="navbar-link-icon"><MdError /></span>
              <span>Errors & Alerts</span>
            </button>
          )}
        </div>

        <div className="navbar-actions">
          <NotificationDropdown />

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
              {(user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.BUSINESS_ADMIN) && (
                <button className="navbar-dropdown-item" onClick={() => navigate('/settings/credentials')}>
                  <span><MdVpnKey /></span>
                  <span>WhatsApp Credentials</span>
                </button>
              )}
              {hasPermissionTo(PERMISSIONS.MANAGE_BUSINESS_SETTINGS) && (
                <button className="navbar-dropdown-item" onClick={() => navigate('/audit-log')}>
                  <span><MdHistory /></span>
                  <span>Audit Log</span>
                </button>
              )}
              <button className="navbar-dropdown-item" onClick={() => navigate('/help')}>
                <span><MdHelp /></span>
                <span>Help & Support</span>
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
