import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AccessDenied.css';

const AccessDenied = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const appName = process.env.REACT_APP_NAME || 'WhatsApp Marketing Platform';

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleContactSupport = () => {
    navigate('/contact');
  };

  return (
    <div className="access-denied-container">
      <div className="access-denied-content">
        {/* Animated Lock Icon */}
        <div className="lock-icon-wrapper">
          <div className="lock-glow"></div>
          <svg className="lock-icon" width="120" height="120" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="11" width="14" height="10" rx="2" stroke="#6366F1" strokeWidth="2"/>
            <path d="M8 11V7C8 4.79086 9.79086 3 12 3V3C14.2091 3 16 4.79086 16 7V11" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="15.5" r="1.5" fill="#6366F1"/>
            <line x1="12" y1="17" x2="12" y2="19" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Error Code Badge */}
        <div className="error-badge">
          <span className="error-code">403</span>
          <span className="error-separator">|</span>
          <span className="error-label">FORBIDDEN</span>
        </div>

        {/* Main Content */}
        <h1 className="access-denied-title">Access Denied</h1>
        <p className="access-denied-description">
          You don't have the required permissions to view this page. 
          If you believe this is a mistake, please contact your administrator.
        </p>

        {/* Permission Info Card */}
        <div className="permission-info-card">
          <div className="permission-info-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <div className="permission-info-text">
            <strong>Need access?</strong>
            <p>Contact your administrator to request appropriate permissions for this resource.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="access-denied-actions">
          <button 
            className="btn-secondary" 
            onClick={handleGoBack}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Go Back
          </button>
          
          <button 
            className="btn-primary" 
            onClick={handleGoHome}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Go to Dashboard
          </button>
        </div>

        {/* Support Link */}
        <div className="access-denied-footer">
          <p>
            Still having issues? 
            <button className="link-button" onClick={handleContactSupport}>
              Contact Support
            </button>
          </p>
        </div>
      </div>

      {/* Decorative Background Elements */}
      <div className="bg-decoration bg-decoration-1"></div>
      <div className="bg-decoration bg-decoration-2"></div>
      <div className="bg-decoration bg-decoration-3"></div>
    </div>
  );
};

export default AccessDenied;



