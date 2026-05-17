/**
 * 🔍 404 Not Found Page
 * 
 * User-friendly error page displayed when users navigate to invalid routes.
 * Provides helpful navigation options and quick links to common pages.
 * Part of graceful error handling strategy.
 * 
 * @component
 * @requires react-router-dom - Navigation functions
 * @requires Button - Action buttons
 * @requires Navbar - Consistent header
 * 
 * @features
 * - Large 404 number display
 * - Clear error message
 * - Multiple navigation options (Home, Back, Search)
 * - Quick links to common pages
 * - Accessible button labels with ARIA
 * - Consistent branding via Navbar
 * 
 * @navigation
 * - Home: Navigate to /
 * - Back: Navigate to previous page
 * - Search: Navigate to /search
 * - Quick links: Dashboard, Inbox, Templates, Campaigns, Contacts
 * 
 * @accessibility
 * - ARIA labels on all action buttons
 * - Semantic HTML structure
 * - Keyboard navigation support
 * 
 * @used-in
 * - Route catch-all: <Route path="*" element={<NotFound />} />
 * 
 * @example
 * // In App.js routes
 * <Route path="*" element={<NotFound />} />
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdHome, MdArrowBack } from 'react-icons/md';
import Button from '../../components/Button';
import Navbar from '../../components/Navbar';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <Navbar />
      
      <div className="not-found-container">
        <div className="not-found-content">
          {/* 404 Illustration */}
          <div className="not-found-number">404</div>
          
          {/* Error Message */}
          <h1 className="not-found-title">Page Not Found</h1>
          <p className="not-found-description">
            The page you're looking for doesn't exist or has been moved.
            <br />
            Let's get you back on track.
          </p>

          {/* Action Buttons */}
          <div className="not-found-actions">
            <Button 
              variant="primary" 
              onClick={() => navigate('/')}
              aria-label="Go to home page"
            >
              <MdHome size={20} />
              Go to Home
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              aria-label="Go back to previous page"
            >
              <MdArrowBack size={20} />
              Go Back
            </Button>
          </div>

          {/* Helpful Links */}
          <div className="not-found-links">
            <h3>Quick Links:</h3>
            <ul>
              <li>
                <a href="/dashboard" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/inbox" onClick={(e) => { e.preventDefault(); navigate('/inbox'); }}>
                  Inbox
                </a>
              </li>
              <li>
                <a href="/templates" onClick={(e) => { e.preventDefault(); navigate('/templates'); }}>
                  Templates
                </a>
              </li>
              <li>
                <a href="/campaigns" onClick={(e) => { e.preventDefault(); navigate('/campaigns'); }}>
                  Campaigns
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
