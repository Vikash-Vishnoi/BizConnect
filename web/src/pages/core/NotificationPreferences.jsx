import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import * as businessService from '../../services/business/businessService';
import { MdNotifications, MdRefresh, MdSave } from 'react-icons/md';
import './Settings.css';

const NotificationPreferences = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    messageNotifications: true,
    campaignUpdates: true,
    qualityAlerts: true,
    templateApprovals: true,
    weeklyReports: true
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await businessService.getBusinessById('current');
      const data = response.data || response; // Handle wrapped response

      if (data.notifications) {
        setNotificationPrefs(data.notifications);
      }
    } catch (err) {
      console.error('Notifications fetch error:', err);
      toast.error('Failed to load notification preferences');
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async (e) => {
    e.preventDefault();
    try {
      await businessService.updateBusiness('current', { notifications: notificationPrefs });
      toast.success('✅ Notification preferences updated successfully');
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to update notification preferences');
    }
  };

  return (
    <div className="page-container">
      <Navbar />
      
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-text">
            <h1 className="page-title">Notification Preferences</h1>
            <p className="page-subtitle">Configure how you receive alerts and updates</p>
          </div>
          <div className="page-actions">
            <Button variant="outline" size="small" onClick={fetchNotifications}>
              <MdRefresh /> Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton type="card" />
        ) : (
          <Card>
            <form onSubmit={handleSaveNotifications} className="settings-form">
              <h2>Notification Settings</h2>
              
              <div className="notification-options">
                <div className="notification-item">
                  <div className="notification-info">
                    <h3>Email Notifications</h3>
                    <p>Receive important updates via email</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.emailNotifications}
                      onChange={(e) => setNotificationPrefs({
                        ...notificationPrefs,
                        emailNotifications: e.target.checked
                      })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="notification-item">
                  <div className="notification-info">
                    <h3>Message Notifications</h3>
                    <p>Get notified when you receive new messages</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.messageNotifications}
                      onChange={(e) => setNotificationPrefs({
                        ...notificationPrefs,
                        messageNotifications: e.target.checked
                      })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="notification-item">
                  <div className="notification-info">
                    <h3>Campaign Updates</h3>
                    <p>Track campaign progress and completion</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.campaignUpdates}
                      onChange={(e) => setNotificationPrefs({
                        ...notificationPrefs,
                        campaignUpdates: e.target.checked
                      })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="notification-item">
                  <div className="notification-info">
                    <h3>Quality Alerts</h3>
                    <p>Get alerted about quality rating changes</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.qualityAlerts}
                      onChange={(e) => setNotificationPrefs({
                        ...notificationPrefs,
                        qualityAlerts: e.target.checked
                      })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="notification-item">
                  <div className="notification-info">
                    <h3>Template Approvals</h3>
                    <p>Know when templates are approved or rejected</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.templateApprovals}
                      onChange={(e) => setNotificationPrefs({
                        ...notificationPrefs,
                        templateApprovals: e.target.checked
                      })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="notification-item">
                  <div className="notification-info">
                    <h3>Weekly Reports</h3>
                    <p>Receive weekly performance summary emails</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.weeklyReports}
                      onChange={(e) => setNotificationPrefs({
                        ...notificationPrefs,
                        weeklyReports: e.target.checked
                      })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <Button type="submit"><MdSave /> Save Preferences</Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NotificationPreferences;





