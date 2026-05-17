/**
 * 🍞 Breadcrumbs Navigation Component
 * Provides hierarchical navigation trail for nested pages
 * Improves wayfinding and reduces cognitive load
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MdHome, MdChevronRight } from 'react-icons/md';
import './Breadcrumbs.css';

/**
 * Route name mappings for better UX
 * Maps URL segments to user-friendly display labels
 * @constant {Object.<string, string>}
 */
const ROUTE_LABELS = {
  dashboard: 'Dashboard',
  inbox: 'Inbox',
  templates: 'Templates',
  'template-detail': 'Template Details',
  'create-template': 'Create Template',
  'edit-template': 'Edit Template',
  campaigns: 'Campaigns',
  'campaign-detail': 'Campaign Details',
  'create-campaign': 'Create Campaign',
  contacts: 'Contacts',
  'contact-history': 'Contact History',
  analytics: 'Analytics',
  'template-analytics': 'Template Analytics',
  'conversation-analytics': 'Conversation Analytics',
  automation: 'Automation',
  flows: 'Flows',
  'saved-replies': 'Saved Replies',
  'scheduled-messages': 'Scheduled Messages',
  'welcome-message': 'Welcome Message',
  settings: 'Settings',
  notifications: 'Notifications',
  'team-members': 'Team Members',
  'role-manager': 'Roles',
  'audit-log': 'Audit Log',
  alerts: 'Alerts',
  'phone-health': 'Phone Health',
  'quality-rating': 'Quality Rating',
  'message-errors': 'Message Errors',
  'rate-limits': 'Rate Limits',
  business: 'Business Setup',
  search: 'Search',
};

/**
 * Breadcrumbs Component
 * @param {Object} props
 * @param {string} [props.currentPageTitle] - Override title for current page
 * @param {Array} [props.customPath] - Custom breadcrumb path [{label, path}]
 */
const Breadcrumbs = ({ currentPageTitle, customPath }) => {
  const location = useLocation();

  // If custom path provided, use it directly
  if (customPath && customPath.length > 0) {
    return (
      <nav className="breadcrumbs" aria-label="Breadcrumb navigation">
        <ol className="breadcrumbs-list">
          <li className="breadcrumb-item">
            <Link to="/dashboard" className="breadcrumb-link" aria-label="Home">
              <MdHome size={18} />
              <span>Home</span>
            </Link>
          </li>
          {customPath.map((item, index) => {
            const isLast = index === customPath.length - 1;
            return (
              <li key={item.path} className="breadcrumb-item">
                <MdChevronRight className="breadcrumb-separator" aria-hidden="true" />
                {isLast ? (
                  <span className="breadcrumb-current" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <Link to={item.path} className="breadcrumb-link">
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  // Auto-generate breadcrumbs from URL
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  // Skip breadcrumbs for root or single-level pages
  if (pathSegments.length <= 1) {
    return null;
  }

  // Build breadcrumb trail
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
    const label = ROUTE_LABELS[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const isLast = index === pathSegments.length - 1;

    return {
      path,
      label: isLast && currentPageTitle ? currentPageTitle : label,
      isLast
    };
  });

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb navigation">
      <ol className="breadcrumbs-list">
        {/* Home link */}
        <li className="breadcrumb-item">
          <Link to="/dashboard" className="breadcrumb-link" aria-label="Home">
            <MdHome size={18} />
            <span>Home</span>
          </Link>
        </li>

        {/* Dynamic breadcrumb trail */}
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path} className="breadcrumb-item">
            <MdChevronRight className="breadcrumb-separator" aria-hidden="true" />
            {crumb.isLast ? (
              <span className="breadcrumb-current" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link to={crumb.path} className="breadcrumb-link">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
