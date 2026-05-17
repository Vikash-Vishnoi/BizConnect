/**
 * @fileoverview User registration component with password strength validation and business setup flow.
 * 
 * @component Register
 * 
 * @description
 * Registration page that handles new user signup with comprehensive password validation,
 * business name collection, and automatic redirection to business setup flow after successful registration.
 * 
 * @features
 * - User registration form with validation
 * - Real-time password strength indicator
 * - Password requirements display (uppercase, lowercase, number, length)
 * - Business name collection during signup
 * - Platform statistics display (total messages, active users, delivery rate)
 * - Feature highlights for new users
 * - Automatic token storage and redirect to business setup
 * - Form validation with error display
 * - Terms of service and privacy policy links
 * 
 * @state
 * - formData: { name, email, password, confirmPassword, businessName }
 * - error: Error message display
 * - loading: Form submission loading state
 * - stats: Platform statistics from API
 * 
 * @api
 * - POST /auth/register: User registration endpoint
 * - GET /public/stats: Platform statistics for marketing display
 * 
 * @routes
 * - /register: Registration page route
 * - Redirects to /business/create after successful registration
 * 
 * @example
 * // Route configuration
 * <Route path="/register" element={<Register />} />
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { API_BASE_URL } from '../../config/api';
import { STORAGE_KEYS } from '../../config/constants';
import './Register.css';

/**
 * Password validation requirements configuration
 * @constant {Object}
 */
const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  REGEX: {
    UPPERCASE: /[A-Z]/,
    LOWERCASE: /[a-z]/,
    NUMBER: /[0-9]/
  }
};

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const appName = process.env.REACT_APP_NAME || 'WhatsApp Marketing Platform';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: ''
  });

  // Check for email in query params (from invitation link)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setFormData(prev => ({ ...prev, email: emailParam }));
    }
  }, [location.search]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
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

  /**
   * Validates password against security requirements
   * @param {string} password - Password to validate
   * @returns {Object} Object with boolean flags for each requirement
   */
  const getPasswordStrength = (password) => {
    const hasLength = password.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH;
    const hasUpperCase = PASSWORD_REQUIREMENTS.REGEX.UPPERCASE.test(password);
    const hasLowerCase = PASSWORD_REQUIREMENTS.REGEX.LOWERCASE.test(password);
    const hasNumber = PASSWORD_REQUIREMENTS.REGEX.NUMBER.test(password);
    return { hasLength, hasUpperCase, hasLowerCase, hasNumber };
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  /**
   * Handles form submission, validates password, and registers new user
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const { hasLength, hasUpperCase, hasLowerCase, hasNumber } = getPasswordStrength(formData.password);
    if (!hasLength || !hasUpperCase || !hasLowerCase || !hasNumber) {
      setError(`Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters with uppercase, lowercase, and number`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          businessName: formData.businessName
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Manually set auth state since we already have the token and user
        const userWithRole = { ...data.user, role: data.user.role || 'user' };
        localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userWithRole));
        
        // Store business name for setup page
        if (formData.businessName) {
          localStorage.setItem(STORAGE_KEYS.REGISTERED_BUSINESS_NAME, formData.businessName);
        }
        
        // Clear any old business setup data to start fresh
        localStorage.removeItem(STORAGE_KEYS.BUSINESS_SETUP_PART1);
        localStorage.removeItem(STORAGE_KEYS.BUSINESS_SETUP_FORM_DATA);
        
        // Force auth context to reinitialize and redirect to business setup
        window.location.href = '/business/create';
      } else {
        setError(data.error || data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordReqs = getPasswordStrength(formData.password);

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-branding">
          <div className="brand-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M24 4C12.96 4 4 12.96 4 24C4 27.36 4.84 30.52 6.32 33.28L4.24 41.76L13.04 39.72C15.68 41.08 18.72 41.84 22 41.84C33.04 41.84 42 32.88 42 21.84C42 16.52 39.92 11.56 36.24 7.88C32.56 4.2 27.6 2.12 22.28 2.12L24 4Z" fill="#25D366"/>
              <path d="M35.2 31.6C34.8 32.8 33.2 33.84 32 34.08C31.2 34.24 30.16 34.36 26.96 33.04C22.56 31.28 19.68 26.88 19.44 26.56C19.2 26.24 17.6 24.08 17.6 21.84C17.6 19.6 18.72 18.52 19.12 18.08C19.52 17.64 20 17.52 20.32 17.52C20.48 17.52 20.64 17.52 20.8 17.52C21.12 17.52 21.52 17.52 21.84 18.28C22.24 19.2 23.2 21.44 23.28 21.6C23.36 21.76 23.44 21.96 23.28 22.28C23.12 22.6 23.04 22.76 22.8 23.04C22.56 23.32 22.28 23.68 22.08 23.88C21.84 24.12 21.56 24.36 21.84 24.84C22.12 25.32 23.2 27.08 24.8 28.48C26.88 30.28 28.56 30.84 29.04 31.08C29.52 31.32 29.84 31.28 30.12 30.96C30.4 30.64 31.36 29.52 31.68 29.04C32 28.56 32.32 28.64 32.72 28.8C33.12 28.96 35.36 30.04 35.84 30.28C36.32 30.52 36.64 30.64 36.72 30.84C36.8 31.04 36.8 31.96 35.2 31.6Z" fill="white"/>
            </svg>
          </div>
          <h1 className="brand-title">Join {appName}</h1>
          <p className="brand-subtitle">Start growing your business with powerful WhatsApp marketing tools</p>
        </div>

        <div className="auth-features">
          <div className="feature-item">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <div className="feature-content">
              <h3>Secure & Compliant</h3>
              <p>Enterprise-grade security with GDPR compliance</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
            <div className="feature-content">
              <h3>Instant Setup</h3>
              <p>Get started in minutes with our easy onboarding</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className="feature-content">
              <h3>24/7 Support</h3>
              <p>Our team is always here to help you succeed</p>
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

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Create Your Account</h2>
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
              label="Your Full Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              required
            />

            <Input
              label="Business Name"
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              placeholder="Your Company Name"
              required
            />

            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@company.com"
              required
            />

            <div>
              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                required
              />
              {formData.password.length > 0 && (
                <div className="password-requirements">
                  <div className={`password-req ${passwordReqs.hasLength ? 'password-req-met' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`password-req ${passwordReqs.hasUpperCase ? 'password-req-met' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>One uppercase letter</span>
                  </div>
                  <div className={`password-req ${passwordReqs.hasLowerCase ? 'password-req-met' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>One lowercase letter</span>
                  </div>
                  <div className={`password-req ${passwordReqs.hasNumber ? 'password-req-met' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>One number</span>
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              loading={loading}
            >
              Create Account
            </Button>

            <p className="terms-text">
              By signing up, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>
            </p>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="link-primary link-bold">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-help">
          <p>Need help? <Link to="/contact" className="link-primary">Contact Support</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
