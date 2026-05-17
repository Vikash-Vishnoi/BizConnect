/**
 * 🏢 Business Setup Part 1 Component
 * 
 * First step of 3-part business onboarding wizard.
 * Collects basic business information before API credentials.
 * Data is saved to localStorage for multi-step flow.
 * 
 * @component
 * @requires react-router-dom - Navigation
 * @requires AuthContext - User state
 * @requires Toast - Notifications
 * @requires businessService - Business API
 * 
 * @features
 * - Business information form (name, industry, description)
 * - Contact information (email, phone, website)
 * - Business address (street, city, state, country)
 * - Progress indicator (3 steps)
 * - Auto-save to localStorage
 * - Pre-fill from registration data
 * - Form validation
 * 
 * @state
 * - formData: Business information object with 11 fields
 * 
 * @navigation
 * - Entry point: No redirect check (first step)
 * - Next: /business/create/step2 (Part 2)
 * 
 * @localStorage
 * - businessSetupPart1: Form data persistence
 * - registeredBusinessName: Pre-fill from registration
 * 
 * @workflow
 * 1. User enters business information
 * 2. Data saved to localStorage
 * 3. Navigate to Part 2 (API credentials)
 * 
 * @example
 * <Route path="/business/create" element={<BusinessSetupPart1 />} />
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import * as businessService from '../../services/business/businessService';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import { MdBusiness, MdArrowForward } from 'react-icons/md';
import './BusinessSetupPart1.css';

const BusinessSetupPart1 = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    email: '',
    phoneNumber: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: '',
    industry: ''
  });

  // No redirect check - Part 1 is the entry point

  // Load saved data from localStorage if exists
  useEffect(() => {
    const savedData = localStorage.getItem('businessSetupPart1');
    const registeredBusinessName = localStorage.getItem('registeredBusinessName');
    
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setFormData(parsedData);
    } else if (registeredBusinessName) {
      // Pre-fill business name from registration
      setFormData(prev => ({
        ...prev,
        name: registeredBusinessName
      }));
    }
  }, []);

  const handleChange = (e) => {
    const newFormData = {
      ...formData,
      [e.target.name]: e.target.value
    };
    setFormData(newFormData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Business name is required');
      return;
    }

    // Save to localStorage
    localStorage.setItem('businessSetupPart1', JSON.stringify(formData));
    
    // Navigate to Part 2
    navigate('/business/create/step2');
  };

  return (
    <div className="setup-part1-page page-container">
      <Navbar />
      <div className="page-content setup-page">
        <Card className="setup-card">
          <div className="setup-header center">
            <h1>Business Information</h1>
            <p className="setup-description">Tell us about your business to get started with WhatsApp Business API</p>
            <div className="progress-indicator">
              <div className="progress-step active">
                <div className="step-circle">1</div>
                <span>Business Info</span>
              </div>
              <div className="progress-line"></div>
              <div className="progress-step">
                <div className="step-circle">2</div>
                <span>API Credentials</span>
              </div>
              <div className="progress-line"></div>
              <div className="progress-step">
                <div className="step-circle">3</div>
                <span>Webhook Setup</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="setup-form">
          <div className="form-section">
            <div className="section-header">
              <h2 className="section-title">Business Details</h2>
            </div>
           
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Business Name *</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your registered business name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Display Name</label>
                <Input
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="How customers will see your business"
                />
              </div>

              <div className="form-group">
                <label>Industry</label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Select Industry</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="education">Education</option>
                  <option value="banking">Banking & Finance</option>
                  <option value="logistics">Logistics</option>
                  <option value="hospitality">Hospitality</option>
                  <option value="retail">Retail</option>
                  <option value="technology">Technology</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>Business Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe your business and the services you provide"
                  rows="3"
                  className="form-textarea"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h2 className="section-title">Contact Information</h2>
            </div>  
            
            <div className="form-grid">
              <div className="form-group">
                <label>Email Address</label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="business@example.com"
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <Input
                  name="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="+91 9874563210"
                />
              </div>

              <div className="form-group full-width">
                <label>Website</label>
                <Input
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h2 className="section-title">Business Address</h2>
            </div>
            
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Street Address</label>
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="form-group">
                <label>City</label>
                <Input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                />
              </div>

              <div className="form-group">
                <label>State / Province</label>
                <Input
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                />
              </div>

              <div className="form-group">
                <label>Country</label>
                <Input
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Country"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <Button type="submit" variant="primary" size="large">
              Next <MdArrowForward />
            </Button>
          </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default BusinessSetupPart1;





