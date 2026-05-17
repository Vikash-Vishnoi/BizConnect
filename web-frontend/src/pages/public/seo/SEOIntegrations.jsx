/**
 * 🔗 SEO Integration Pages Module
 * 
 * Platform integration landing pages for e-commerce and CRM systems.
 * Optimized for integration-focused search queries.
 * 
 * @module pages/public/seo/integrations
 * 
 * Integration Pages:
 * - WhatsAppCRMIntegration: Salesforce, HubSpot, Zoho
 * - WhatsAppWooCommerce: WooCommerce plugin
 * - WhatsAppShopify: Shopify app
 * - WhatsAppAPIDocumentation: Developer docs
 * 
 * @features
 * - Platform-specific guides
 * - Setup instructions
 * - Code examples
 * - API documentation
 * - Integration benefits
 */

import React from 'react';
import { Link } from 'react-router-dom';
import './SEOPages.css';

// Batch 2: Integration Routes

export const WhatsAppCRMIntegration = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp CRM Integration - Sync with Your CRM</h1>
      <p className="seo-hero-text">Connect WhatsApp Business API with your CRM system. Sync contacts, conversations, and customer data seamlessly.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Start Integration</Link>
        <Link to="/api-documentation" className="btn btn-secondary btn-large">View API Docs</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>Supported CRM Platforms</h2>
      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Salesforce</h3>
          <p>Native integration with Salesforce CRM for automatic contact sync</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>HubSpot</h3>
          <p>Bi-directional sync with HubSpot for complete customer view</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Zoho CRM</h3>
          <p>Real-time conversation sync with Zoho CRM records</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Custom CRM</h3>
          <p>REST API for integration with any custom CRM system</p>
        </div>
      </div>

      <h2>Integration Features</h2>
      <ul className="benefits-list">
        <li>Automatic contact synchronization</li>
        <li>Conversation history in CRM timeline</li>
        <li>Lead capture from WhatsApp chats</li>
        <li>Trigger campaigns based on CRM events</li>
        <li>Custom field mapping</li>
        <li>Webhook support for real-time updates</li>
      </ul>

      <div className="cta-section">
        <h3>Connect Your CRM Today</h3>
        <Link to="/contact" className="btn btn-primary">Schedule Demo</Link>
      </div>
    </div>
  </div>
);

export const WhatsAppWooCommerce = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp WooCommerce Integration - Boost E-commerce Sales</h1>
      <p className="seo-hero-text">Integrate WhatsApp with WooCommerce to send order notifications, abandoned cart reminders, and provide customer support.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Install Plugin</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>WooCommerce Features</h2>
      <div className="use-cases">
        <div className="use-case-card">
          <h3>Abandoned Cart Recovery</h3>
          <p>Automatically remind customers about abandoned carts via WhatsApp</p>
        </div>
        <div className="use-case-card">
          <h3>Order Notifications</h3>
          <p>Send order confirmations, shipping, and delivery updates</p>
        </div>
        <div className="use-case-card">
          <h3>Order Support</h3>
          <p>Enable customers to track orders and get support via WhatsApp</p>
        </div>
        <div className="use-case-card">
          <h3>Review Requests</h3>
          <p>Request product reviews after successful delivery</p>
        </div>
      </div>

      <h2>Setup Process</h2>
      <div className="setup-steps">
        <div className="step">
          <span className="step-number">1</span>
          <div>
            <h4>Install Plugin</h4>
            <p>Download and install our WooCommerce plugin from WordPress marketplace</p>
          </div>
        </div>
        <div className="step">
          <span className="step-number">2</span>
          <div>
            <h4>Connect API</h4>
            <p>Enter your WhatsApp Business API credentials in plugin settings</p>
          </div>
        </div>
        <div className="step">
          <span className="step-number">3</span>
          <div>
            <h4>Configure Templates</h4>
            <p>Customize message templates for different order events</p>
          </div>
        </div>
        <div className="step">
          <span className="step-number">4</span>
          <div>
            <h4>Go Live</h4>
            <p>Activate notifications and start engaging customers</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const WhatsAppShopify = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp Shopify Integration - Automated Store Notifications</h1>
      <p className="seo-hero-text">Connect WhatsApp Business API with Shopify to automate customer communications and increase sales by 40%.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Install Shopify App</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>Shopify Integration Features</h2>
      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Real-time Notifications</h3>
          <p>Instant order confirmations and shipping updates</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Cart Recovery</h3>
          <p>Recover 30% of abandoned carts with WhatsApp reminders</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Product Catalog</h3>
          <p>Share product catalogs directly in WhatsApp conversations</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>COD Confirmation</h3>
          <p>Verify cash on delivery orders via WhatsApp</p>
        </div>
      </div>

      <h2>Benefits</h2>
      <ul className="benefits-list">
        <li>Reduce order confirmation time by 90%</li>
        <li>Increase customer satisfaction with real-time updates</li>
        <li>Lower support costs with automated responses</li>
        <li>Boost repeat purchases with personalized offers</li>
        <li>Track customer journey from notification to purchase</li>
      </ul>
    </div>
  </div>
);

export const WhatsAppAPIDocumentation = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp API Documentation - Developer Guide</h1>
      <p className="seo-hero-text">Complete API documentation for WhatsApp Business API integration. RESTful APIs with comprehensive examples.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Get API Key</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>API Endpoints</h2>
      <div className="api-sections">
        <div className="api-section">
          <h3>Messages API</h3>
          <p>Send text, media, and template messages</p>
          <code>POST /api/messages/send</code>
        </div>
        <div className="api-section">
          <h3>Templates API</h3>
          <p>Create and manage message templates</p>
          <code>GET /api/templates</code>
        </div>
        <div className="api-section">
          <h3>Analytics API</h3>
          <p>Retrieve message and campaign analytics</p>
          <code>GET /api/analytics</code>
        </div>
        <div className="api-section">
          <h3>Webhooks</h3>
          <p>Receive real-time message status updates</p>
          <code>POST /webhook/whatsapp</code>
        </div>
      </div>

      <h2>Quick Start</h2>
      <div className="code-example">
        <h4>Send a Message</h4>
        <pre>{`curl -X POST https://api.yourservice.com/messages/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "919876543210",
    "type": "text",
    "text": {
      "body": "Hello from WhatsApp API!"
    }
  }'`}</pre>
      </div>

      <h2>Authentication</h2>
      <p>All API requests require Bearer token authentication. Get your API key from the dashboard after registration.</p>

      <div className="cta-section">
        <h3>Ready to Integrate?</h3>
        <Link to="/register" className="btn btn-primary">Get Started</Link>
      </div>
    </div>
  </div>
);



