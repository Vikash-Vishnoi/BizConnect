/**
 * 🌍 SEO Location Pages Module
 * 
 * Location-specific landing pages for major Indian cities.
 * Optimized for local search and regional business targeting.
 * 
 * @module pages/public/seo/locations
 * 
 * City Pages:
 * - WhatsAppAPIServiceDelhi: Delhi NCR
 * - WhatsAppAPIMumbai: Mumbai, Pune, Thane
 * - WhatsAppAPIBangalore: Bangalore
 * - WhatsAppAPIHyderabad: Hyderabad
 * - WhatsAppAPIChennai: Chennai
 * 
 * @features
 * - City-specific content
 * - Local office addresses
 * - Regional language support
 * - INR pricing
 * - Local case studies
 */

import React from 'react';
import { Link } from 'react-router-dom';
import './SEOPages.css';

// Batch 3: Location-Based Routes

export const WhatsAppAPIServiceDelhi = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp API Provider in Delhi NCR - Local Support</h1>
      <p className="seo-hero-text">Leading WhatsApp Business API service provider in Delhi, Noida, Gurgaon, and Faridabad. Local support in Hindi and English.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Get Started</Link>
        <Link to="/contact" className="btn btn-secondary btn-large">Contact Delhi Office</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>Why Choose Us in Delhi?</h2>
      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Local Office</h3>
          <p>Physical office in Connaught Place, Delhi for in-person support</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Hindi Support</h3>
          <p>Customer support available in Hindi and English</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>INR Pricing</h3>
          <p>Transparent pricing in Indian Rupees with GST</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Same Day Setup</h3>
          <p>Get your WhatsApp API activated within 24 hours</p>
        </div>
      </div>

      <h2>Trusted by Delhi Businesses</h2>
      <p>500+ businesses in Delhi NCR trust us for their WhatsApp communication needs - from startups in Cyber City to enterprises in Delhi CBD.</p>
      
      <div className="cta-section">
        <h3>Schedule a Meeting at Our Delhi Office</h3>
        <Link to="/contact" className="btn btn-primary">Book Consultation</Link>
      </div>
    </div>
  </div>
);

export const WhatsAppAPIMumbai = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp API Service in Mumbai - Maharashtra's Top Provider</h1>
      <p className="seo-hero-text">Official WhatsApp Business API partner serving Mumbai, Pune, and Thane. Help businesses grow with enterprise messaging solutions.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Start Free Trial</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>Mumbai Business Solutions</h2>
      <ul className="benefits-list">
        <li>Dedicated account manager for Mumbai businesses</li>
        <li>On-site integration support in BKC and Lower Parel</li>
        <li>Special pricing for Maharashtra-based companies</li>
        <li>24/7 technical support from Mumbai team</li>
        <li>Marathi language template support</li>
      </ul>
    </div>
  </div>
);

export const WhatsAppAPIBangalore = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp API Provider Bangalore - Tech Hub's Choice</h1>
      <p className="seo-hero-text">Bangalore's leading WhatsApp Business API provider. Serving startups and enterprises in Koramangala, Indiranagar, and Whitefield.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Get Started</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>Why Bangalore Startups Choose Us</h2>
      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Startup Friendly</h3>
          <p>Special pricing for early-stage startups and bootstrap companies</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Developer First</h3>
          <p>Comprehensive APIs and webhooks for tech teams</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Scale Ready</h3>
          <p>Infrastructure that grows with your business</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Local Events</h3>
          <p>Regular meetups and workshops in Bangalore</p>
        </div>
      </div>
    </div>
  </div>
);

export const WhatsAppAPIHyderabad = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp Business API Hyderabad - Telangana's Trusted Partner</h1>
      <p className="seo-hero-text">Hyderabad's premier WhatsApp API service provider. Helping businesses in Hitech City, Gachibowli, and Madhapur communicate better.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Start Now</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>Hyderabad Business Features</h2>
      <ul className="benefits-list">
        <li>Office in Hitec City for local support</li>
        <li>Telugu and English language support</li>
        <li>Integration with local payment gateways</li>
        <li>Special rates for Telangana businesses</li>
        <li>Same-day onboarding for Hyderabad companies</li>
      </ul>
    </div>
  </div>
);

export const WhatsAppAPIChennai = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp API Service Chennai - Tamil Nadu's #1 Provider</h1>
      <p className="seo-hero-text">Chennai's most trusted WhatsApp Business API provider. Serving businesses across Tamil Nadu with local support.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Get Started</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>Chennai Business Solutions</h2>
      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Local Presence</h3>
          <p>Office in OMR for face-to-face consultations</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Tamil Support</h3>
          <p>Customer service in Tamil and English languages</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Manufacturing Focus</h3>
          <p>Specialized solutions for Chennai's manufacturing sector</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Automotive Industry</h3>
          <p>Proven solutions for automotive businesses</p>
        </div>
      </div>
    </div>
  </div>
);



