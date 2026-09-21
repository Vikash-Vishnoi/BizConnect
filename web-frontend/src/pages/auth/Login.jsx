/**
 * 🔐 Login Component
 * 
 * User authentication page with email/password login.
 * Features platform statistics, feature highlights, and responsive layout.
 * 
 * @component
 * @features
 * - Email and password authentication
 * - Platform statistics display (messages, users, delivery rate)
 * - Feature highlights with animations
 * - Keep me signed in option
 * - Password visibility toggle
 * - Forgot password link
 * - Redirect based on business setup status
 * - Error handling with shake animation
 * - Loading state during login
 * - Auto-redirect to dashboard/setup
 * 
 * @state
 * - formData: Login credentials (email, password)
 * - error: Authentication error message
 * - loading: Submit button loading state
 * - stats: Platform statistics from API
 * - showPassword: Password visibility toggle
 * 
 * @api
 * - POST /auth/login: Authenticate user
 * - GET /public/stats: Fetch platform statistics
 * 
 * @redirects
 * - /dashboard: After successful login (default)
 * - /business/setup: If business setup incomplete
 * - Based on setupStatus.redirectTo from backend
 * 
 * @example
 * <Route path="/login" element={<Login />} />
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { API_BASE_URL } from '../../config/api';
import { STORAGE_KEYS } from '../../config/constants';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const appName = process.env.REACT_APP_NAME || 'WhatsApp Marketing Platform';
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Fetch platform statistics from API
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/public/stats`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.log('Could not fetch stats');
      }
    };
    fetchStats();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData);

      if (result.success) {
        // Use setup status from backend to determine redirect
        const redirectPath = result.setupStatus?.redirectTo || '/dashboard';
        
        // Auto-redirect
        navigate(redirectPath);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container auth-container-gradient">
      <div className="auth-left">
        <div className="auth-branding">
          <div className="brand-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M24 4C12.96 4 4 12.96 4 24C4 27.36 4.84 30.52 6.32 33.28L4.24 41.76L13.04 39.72C15.68 41.08 18.72 41.84 22 41.84C33.04 41.84 42 32.88 42 21.84C42 16.52 39.92 11.56 36.24 7.88C32.56 4.2 27.6 2.12 22.28 2.12L24 4Z" fill="#10B981"/>
              <path d="M35.2 31.6C34.8 32.8 33.2 33.84 32 34.08C31.2 34.24 30.16 34.36 26.96 33.04C22.56 31.28 19.68 26.88 19.44 26.56C19.2 26.24 17.6 24.08 17.6 21.84C17.6 19.6 18.72 18.52 19.12 18.08C19.52 17.64 20 17.52 20.32 17.52C20.48 17.52 20.64 17.52 20.8 17.52C21.12 17.52 21.52 17.52 21.84 18.28C22.24 19.2 23.2 21.44 23.28 21.6C23.36 21.76 23.44 21.96 23.28 22.28C23.12 22.6 23.04 22.76 22.8 23.04C22.56 23.32 22.28 23.68 22.08 23.88C21.84 24.12 21.56 24.36 21.84 24.84C22.12 25.32 23.2 27.08 24.8 28.48C26.88 30.28 28.56 30.84 29.04 31.08C29.52 31.32 29.84 31.28 30.12 30.96C30.4 30.64 31.36 29.52 31.68 29.04C32 28.56 32.32 28.64 32.72 28.8C33.12 28.96 35.36 30.04 35.84 30.28C36.32 30.52 36.64 30.64 36.72 30.84C36.8 31.04 36.8 31.96 35.2 31.6Z" fill="white"/>
            </svg>
          </div>
          <h1 className="brand-title">{appName}</h1>
          <p className="brand-subtitle">Powerful messaging solutions for modern businesses</p>
        </div>

        <div className="auth-features">
          <div className="feature-item feature-card">
            <div className="feature-icon feature-icon-success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="feature-content">
              <h3>Automated Campaigns</h3>
              <p>Create and schedule marketing campaigns with ease</p>
            </div>
          </div>

          <div className="feature-item" style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <div className="feature-icon" style={{ color: '#10B981' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div className="feature-content">
              <h3>Unified Inbox</h3>
              <p>Manage all conversations in one place</p>
            </div>
          </div>

          <div className="feature-item" style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <div className="feature-icon" style={{ color: '#10B981' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18"></path>
                <path d="M18 17V9"></path>
                <path d="M13 17V5"></path>
                <path d="M8 17v-3"></path>
              </svg>
            </div>
            <div className="feature-content">
              <h3>Real-time Analytics</h3>
              <p>Track performance and optimize your strategy</p>
            </div>
          </div>
        </div>

        {stats && (
          <div className="auth-stats">
            <div className="stat-item">
              <div className="stat-value">{stats.totalMessages || '1M+'}</div>
              <div className="stat-label">Messages Sent</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.activeUsers || '5K+'}</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.deliveryRate || '99.9%'}</div>
              <div className="stat-label">Delivery Rate</div>
            </div>
          </div>
        )}
      </div>

      <div className="auth-right auth-right-panel">
        <div className="auth-card auth-card-elevated">
          <div className="auth-header">
            <h2>Welcome Back</h2>
            <p>Sign in to continue to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="error-alert">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@company.com"
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Your account password"
              required
            />

            <div className="auth-options">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Keep me signed in</span>
              </label>
              <Link to="/forgot-password" className="link-primary">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              loading={loading}
            >
              Sign In
            </Button>
          </form>

          <div className="auth-footer">
            <p style={{ color: '#6B7280' }}>
              New to our platform?{' '}
              <Link to="/register" className="link-primary link-bold" style={{ color: '#6366F1', fontWeight: '600' }}>
                Create an account
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-help">
          <p style={{ color: '#6B7280' }}>Need help? <Link to="/contact" className="link-primary" style={{ color: '#6366F1' }}>Contact Support</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
