/**
 * 🔔 NotificationDropdown Component
 * 
 * Displays a dropdown with system alerts and notifications.
 * Fetches real-time alerts from the backend and allows users to view, acknowledge, and resolve them.
 * 
 * @component
 * @requires alertService - For fetching and managing alerts
 * 
 * @features
 * - Real-time notification display
 * - Alert severity indicators (critical, high, medium, low)
 * - Mark as read functionality
 * - Quick acknowledge/resolve actions
 * - Empty state when no notifications
 * - Auto-close when clicking outside
 * 
 * @example
 * <NotificationDropdown />
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdNotifications, MdCheckCircle, MdError, MdWarning, MdInfo, MdClose } from 'react-icons/md';
import { getAlerts, updateAlert, getAlertStats } from '../services/core/alertService';
import './NotificationDropdown.css';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await getAlerts({ limit: 10, status: 'unresolved' });
      
      // Handle different response structures
      const alertsData = response?.data?.alerts || response?.data || response?.alerts || [];
      setNotifications(Array.isArray(alertsData) ? alertsData : []);
      
      // Get unread count
      const statsResponse = await getAlertStats();
      const stats = statsResponse?.data || {};
      setUnreadCount(stats.unresolved || stats.total || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]); // Ensure it's always an array on error
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications on mount and set up polling
  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await updateAlert(notificationId, { isRead: true });
      fetchNotifications(); // Refresh notifications
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // View all notifications
  const viewAllNotifications = () => {
    setIsOpen(false);
    navigate('/errors-alerts');
  };

  // Get severity icon
  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <MdError className="notification-icon notification-icon-critical" />;
      case 'high':
        return <MdWarning className="notification-icon notification-icon-high" />;
      case 'medium':
        return <MdWarning className="notification-icon notification-icon-medium" />;
      case 'low':
        return <MdInfo className="notification-icon notification-icon-low" />;
      default:
        return <MdInfo className="notification-icon notification-icon-info" />;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / 60000);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="notification-dropdown-container" ref={dropdownRef}>
      <button 
        className="navbar-notification" 
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        <span className="navbar-notification-icon">
          <MdNotifications />
        </span>
        {unreadCount > 0 && (
          <span className="navbar-notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            <button 
              className="notification-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close notifications"
            >
              <MdClose />
            </button>
          </div>

          <div className="notification-dropdown-body">
            {loading ? (
              <div className="notification-loading">
                <div className="notification-spinner"></div>
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <MdCheckCircle className="notification-empty-icon" />
                <p>No new notifications</p>
                <span>You're all caught up!</span>
              </div>
            ) : (
              <div className="notification-list">
                {notifications.map((notification) => (
                  <div 
                    key={notification._id} 
                    className={`notification-item ${!notification.isRead ? 'notification-unread' : ''}`}
                    onClick={() => markAsRead(notification._id)}
                  >
                    <div className="notification-item-icon">
                      {getSeverityIcon(notification.severity)}
                    </div>
                    <div className="notification-item-content">
                      <div className="notification-item-title">
                        {notification.title || notification.type}
                      </div>
                      <div className="notification-item-message">
                        {notification.message}
                      </div>
                      <div className="notification-item-time">
                        {formatTimestamp(notification.createdAt)}
                      </div>
                    </div>
                    {!notification.isRead && (
                      <div className="notification-unread-dot"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-dropdown-footer">
              <button 
                className="notification-view-all-btn"
                onClick={viewAllNotifications}
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
