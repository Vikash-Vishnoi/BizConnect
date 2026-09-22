/**
 * 👋 Welcome Message Settings Component
 * 
 * Automation settings for automatic welcome messages to new contacts.
 * Features auto-save and live preview of welcome message.
 * 
 * @component
 * @features
 * - Enable/disable welcome messages
 * - Customizable message text (1000 char limit)
 * - Configurable delay (0-300 seconds)
 * - Send only on first message option
 * - Business hours restriction
 * - Auto-save form data
 * - Live message preview
 * - Character counter
 * 
 * @example
 * <Route path="/automation/welcome-message" element={<WelcomeMessageSettings />} />
 */

import React, { useState, useEffect } from 'react';
import useAutoSave, { loadAutoSaved } from '../../hooks/useAutoSave';
import Navbar from '../../components/Navbar';
import { get, put } from '../../services/api';
import './WelcomeMessageSettings.css';

/**
 * Message constraints
 */
const MESSAGE_CONSTRAINTS = {
  MAX_LENGTH: 1000,
  MIN_DELAY: 0,
  MAX_DELAY: 300
};

const WelcomeMessageSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(() => 
    loadAutoSaved('welcomeMessageSettings', {
      enabled: false,
      message: '',
      delay: 0,
      sendOnFirstMessage: false,
      sendOnBusinessHours: false
    })
  );
  
  // Auto-save settings
  const { clearSaved } = useAutoSave('welcomeMessageSettings', settings);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await get(`/business/welcome-message`);
      if (data && data.success !== false) {
        setSettings(data.settings || data.data?.settings || settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await put(`/business/welcome-message`, settings);
      if (data) {
        alert('Welcome message settings saved successfully');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="welcome-settings-container">
          <div className="loading">Loading settings...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="welcome-settings-container">
        <div className="welcome-header">
          <h1>👋 Welcome Message Settings</h1>
          <p>Configure automatic welcome messages for new contacts</p>
        </div>

        <div className="settings-card">
          <div className="setting-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({...settings, enabled: e.target.checked})}
              />
              <span>Enable Welcome Messages</span>
            </label>
          </div>

          <div className="form-group">
            <label>Welcome Message</label>
            <textarea
              value={settings.message}
              onChange={(e) => setSettings({...settings, message: e.target.value})}
              placeholder="Hi! Welcome to our WhatsApp Business. How can we help you today?"
              rows="6"
              maxLength={MESSAGE_CONSTRAINTS.MAX_LENGTH}
              disabled={!settings.enabled}
              aria-label="Welcome message text"
            />
            <div className="char-count">{settings.message.length}/{MESSAGE_CONSTRAINTS.MAX_LENGTH}</div>
          </div>

          <div className="form-group">
            <label>Delay Before Sending (seconds)</label>
            <input
              type="number"
              value={settings.delay}
              onChange={(e) => setSettings({...settings, delay: parseInt(e.target.value) || 0})}
              min={MESSAGE_CONSTRAINTS.MIN_DELAY}
              max={MESSAGE_CONSTRAINTS.MAX_DELAY}
              disabled={!settings.enabled}
              aria-label="Delay in seconds"
            />
            <p className="field-hint">Wait time before sending the welcome message</p>
          </div>

          <div className="setting-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.sendOnFirstMessage}
                onChange={(e) => setSettings({...settings, sendOnFirstMessage: e.target.checked})}
                disabled={!settings.enabled}
              />
              <span>Send only on first message from contact</span>
            </label>
          </div>

          <div className="setting-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.sendOnBusinessHours}
                onChange={(e) => setSettings({...settings, sendOnBusinessHours: e.target.checked})}
                disabled={!settings.enabled}
              />
              <span>Send only during business hours</span>
            </label>
          </div>

          <button
            className="save-button"
            onClick={handleSave}
            disabled={saving || !settings.enabled}
          >
            {saving ? 'Saving...' : '💾 Save Settings'}
          </button>
        </div>

        <div className="preview-card">
          <h3>Preview</h3>
          <div className="message-preview">
            <div className="preview-bubble">
              {settings.message || 'Your welcome message will appear here...'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WelcomeMessageSettings;

