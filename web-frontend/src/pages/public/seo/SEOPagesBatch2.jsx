/**
 * @fileoverview SEO-optimized marketing pages for WhatsApp features (Batch 2).
 * 
 * @module SEOPagesBatch2
 * 
 * @description
 * Collection of SEO landing pages focused on specific WhatsApp Business API features
 * including bulk messaging, broadcasts, notifications, order updates, and customer support.
 * Each page is optimized for search engines with targeted keywords, feature highlights,
 * benefits lists, and conversion-focused CTAs.
 * 
 * @pages
 * - BulkWhatsAppMessages: Bulk messaging capabilities and use cases
 * - WhatsAppBroadcasts: Broadcast list management and segmentation
 * - WhatsAppNotifications: Transactional notification system
 * - WhatsAppOrderUpdates: E-commerce order tracking notifications
 * - WhatsAppCustomerSupport: Support inbox and chatbot features
 * 
 * @routes
 * - /features/bulk-messages: Bulk WhatsApp messages landing page
 * - /features/broadcasts: WhatsApp broadcasts landing page
 * - /features/notifications: Notification system landing page
 * - /features/order-updates: Order updates landing page
 * - /features/customer-support: Customer support landing page
 * 
 * @seo-keywords
 * - Bulk WhatsApp messages, WhatsApp Business API, message broadcasting
 * - WhatsApp broadcasts, broadcast lists, customer segmentation
 * - WhatsApp notifications, transactional alerts, order confirmations
 * - Order tracking, shipping updates, delivery notifications
 * - Customer support, WhatsApp chatbot, unified inbox
 * 
 * @features
 * - Feature-focused content with benefits and use cases
 * - Feature cards with icon placeholders
 * - Use case cards for different industries
 * - Benefits lists with bullet points
 * - Conversion CTAs (register, pricing, setup)
 * - Responsive grid layouts
 * 
 * @used-by
 * - SEO/marketing route configuration
 * - Organic search traffic landing pages
 * 
 * @extends
 * - SEOPages.css (shared SEO page styling)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import './SEOPages.css';

// Batch 2: Feature Detail Routes

export const BulkWhatsAppMessages = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>Bulk WhatsApp Messages - Send to Thousands Instantly</h1>
      <p className="seo-hero-text">Send bulk WhatsApp messages to your entire customer base with our powerful WhatsApp Business API. Perfect for promotions, announcements, and updates.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Start Sending Bulk Messages</Link>
        <Link to="/pricing" className="btn btn-secondary btn-large">View Pricing</Link>
      </div>
    </div>

    <div className="seo-content">
      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Lightning Fast Delivery</h3>
          <p>Send up to 80 messages per second with WhatsApp Business API infrastructure</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Targeted Campaigns</h3>
          <p>Segment your audience and send personalized bulk messages to specific groups</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Real-time Analytics</h3>
          <p>Track delivery, read rates, and engagement for every bulk campaign</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Template Approval</h3>
          <p>Use pre-approved templates to ensure compliance with WhatsApp policies</p>
        </div>
      </div>

      <h2>Why Choose Our Bulk WhatsApp Service?</h2>
      <ul className="benefits-list">
        <li>98% delivery rate - highest in the industry</li>
        <li>No limits on contact lists - scale as you grow</li>
        <li>Personalization with dynamic variables</li>
        <li>Scheduling for optimal engagement times</li>
        <li>CSV import for easy contact management</li>
        <li>Rich media support - images, videos, documents</li>
      </ul>

      <div className="cta-section">
        <h3>Ready to Scale Your Messaging?</h3>
        <Link to="/register" className="btn btn-primary">Get Started Free</Link>
      </div>
    </div>
  </div>
);

export const WhatsAppBroadcasts = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp Broadcast Lists - Reach Multiple Contacts at Once</h1>
      <p className="seo-hero-text">Create and manage WhatsApp broadcast lists to send messages to multiple contacts simultaneously while maintaining personalization.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Start Broadcasting</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>Broadcast Features</h2>
      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Dynamic Lists</h3>
          <p>Create unlimited broadcast lists based on customer segments</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Auto-sync</h3>
          <p>Automatically update lists based on customer behavior and tags</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Personal Touch</h3>
          <p>Each recipient receives the message as a personal conversation</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Smart Scheduling</h3>
          <p>Schedule broadcasts for timezone-optimized delivery</p>
        </div>
      </div>
    </div>
  </div>
);

export const WhatsAppNotifications = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp Notification System - Transactional Alerts</h1>
      <p className="seo-hero-text">Send automated WhatsApp notifications for orders, bookings, appointments, and important updates with 99% delivery guarantee.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Setup Notifications</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>Notification Types</h2>
      <div className="use-cases">
        <div className="use-case-card">
          <h3>Order Confirmations</h3>
          <p>Instant order confirmation with tracking details</p>
        </div>
        <div className="use-case-card">
          <h3>Shipping Updates</h3>
          <p>Real-time delivery status notifications</p>
        </div>
        <div className="use-case-card">
          <h3>Payment Alerts</h3>
          <p>Transaction confirmations and payment reminders</p>
        </div>
        <div className="use-case-card">
          <h3>Appointment Reminders</h3>
          <p>Automated booking confirmations and reminders</p>
        </div>
      </div>

      <h2>Benefits of WhatsApp Notifications</h2>
      <ul className="benefits-list">
        <li>98% open rate vs 20% for email</li>
        <li>Instant delivery within seconds</li>
        <li>Two-way communication enabled</li>
        <li>Rich media attachments supported</li>
        <li>Multi-language support</li>
      </ul>
    </div>
  </div>
);

export const WhatsAppOrderUpdates = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp Order Updates - Real-time Order Tracking</h1>
      <p className="seo-hero-text">Keep customers informed with automated order status updates via WhatsApp. Reduce support queries by 60%.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Enable Order Updates</Link>
      </div>
    </div>

    <div className="seo-content">
      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Automated Updates</h3>
          <p>Send order confirmations, shipping, and delivery updates automatically</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Tracking Links</h3>
          <p>Include tracking URLs for real-time order monitoring</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Branded Messages</h3>
          <p>Customize templates with your brand identity</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Two-way Support</h3>
          <p>Enable customers to reply with questions instantly</p>
        </div>
      </div>
    </div>
  </div>
);

export const WhatsAppCustomerSupport = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp Customer Support - 24/7 Support on WhatsApp</h1>
      <p className="seo-hero-text">Deliver exceptional customer service through WhatsApp with unified inbox, chatbots, and team collaboration tools.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Setup Support System</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>Support Features</h2>
      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Unified Inbox</h3>
          <p>Manage all customer conversations in one centralized dashboard</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>AI Chatbot</h3>
          <p>Automate responses to common queries 24/7</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Team Collaboration</h3>
          <p>Assign conversations and collaborate with notes</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Response Analytics</h3>
          <p>Track response times and customer satisfaction</p>
        </div>
      </div>

      <h2>Why WhatsApp for Support?</h2>
      <ul className="benefits-list">
        <li>Customers prefer messaging over phone calls</li>
        <li>Handle 3x more conversations simultaneously</li>
        <li>Reduce average response time by 80%</li>
        <li>Share images, videos, and documents easily</li>
        <li>Maintain conversation history automatically</li>
      </ul>
    </div>
  </div>
);



