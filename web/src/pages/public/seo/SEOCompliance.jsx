import React from 'react';
import { Link } from 'react-router-dom';
import './SEOPages.css';

// Batch 4: Compliance & Support Routes

export const WhatsAppAPICompliance = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp API Compliance - Policy Guidelines</h1>
      <p className="seo-hero-text">Stay compliant with WhatsApp Business policies. Complete guide to messaging guidelines, template approval, and best practices.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Get Started</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>Compliance Requirements</h2>
      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Opt-in Required</h3>
          <p>Users must opt-in before receiving marketing messages</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Template Approval</h3>
          <p>All marketing templates require WhatsApp approval</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>24-Hour Window</h3>
          <p>Respond to customer messages within 24 hours</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Content Restrictions</h3>
          <p>No spam, illegal content, or misleading information</p>
        </div>
      </div>

      <h2>Quality Rating</h2>
      <p>Maintain high quality rating by following WhatsApp's messaging guidelines:</p>
      <ul className="benefits-list">
        <li>Send messages only to opted-in users</li>
        <li>Provide clear opt-out mechanism</li>
        <li>Use approved templates for marketing</li>
        <li>Monitor block and report rates</li>
        <li>Respond promptly to customer queries</li>
      </ul>

      <h2>Consequences of Non-Compliance</h2>
      <p>Violating WhatsApp policies can result in:</p>
      <ul className="benefits-list">
        <li>Quality rating degradation (Green ? Yellow ? Red)</li>
        <li>Messaging tier demotion (reduced message limits)</li>
        <li>Template rejection</li>
        <li>Account suspension or ban</li>
      </ul>
    </div>
  </div>
);

export const WhatsAppDataSecurity = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp Data Security - Enterprise-Grade Protection</h1>
      <p className="seo-hero-text">Bank-level security for your WhatsApp communications. End-to-end encryption, secure storage, and compliance with global standards.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Secure Your Messaging</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>Security Features</h2>
      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>End-to-End Encryption</h3>
          <p>All messages encrypted using Signal Protocol</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Secure Infrastructure</h3>
          <p>ISO 27001 certified data centers</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>API Authentication</h3>
          <p>OAuth 2.0 and JWT token-based security</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Audit Logs</h3>
          <p>Complete activity tracking for compliance</p>
        </div>
      </div>

      <h2>Compliance Certifications</h2>
      <ul className="benefits-list">
        <li>ISO 27001 - Information Security Management</li>
        <li>SOC 2 Type II - Security and Availability</li>
        <li>GDPR Compliant - European data protection</li>
        <li>HIPAA Ready - Healthcare data security</li>
        <li>PCI DSS - Payment data security</li>
      </ul>
    </div>
  </div>
);

export const WhatsAppTemplateApproval = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp Template Approval Guide - Get Templates Approved Fast</h1>
      <p className="seo-hero-text">Complete guide to WhatsApp template approval process. Learn best practices and avoid common rejection reasons.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Create Templates</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>Template Approval Process</h2>
      <div className="setup-steps">
        <div className="step">
          <span className="step-number">1</span>
          <div>
            <h4>Create Template</h4>
            <p>Design your message with placeholders for dynamic content</p>
          </div>
        </div>
        <div className="step">
          <span className="step-number">2</span>
          <div>
            <h4>Submit for Review</h4>
            <p>Template submitted to WhatsApp for compliance review</p>
          </div>
        </div>
        <div className="step">
          <span className="step-number">3</span>
          <div>
            <h4>Review (24-48 hours)</h4>
            <p>WhatsApp reviews template against policy guidelines</p>
          </div>
        </div>
        <div className="step">
          <span className="step-number">4</span>
          <div>
            <h4>Approved & Active</h4>
            <p>Template approved and ready to use in campaigns</p>
          </div>
        </div>
      </div>

      <h2>Common Rejection Reasons</h2>
      <ul className="benefits-list">
        <li>Misleading or false information</li>
        <li>Abusive or threatening language</li>
        <li>Grammar and spelling errors</li>
        <li>Too many variables (max 4 per template)</li>
        <li>Promotional content in utility templates</li>
        <li>Missing or incomplete information</li>
      </ul>

      <h2>Best Practices for Approval</h2>
      <ul className="benefits-list">
        <li>Use clear, concise language</li>
        <li>Include complete business information</li>
        <li>Provide opt-out instructions</li>
        <li>Use proper grammar and punctuation</li>
        <li>Choose correct template category</li>
        <li>Add relevant examples for variables</li>
      </ul>
    </div>
  </div>
);

export const GDPRWhatsAppCompliance = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>GDPR WhatsApp Compliance - European Data Protection</h1>
      <p className="seo-hero-text">GDPR-compliant WhatsApp messaging for European businesses. Respect user privacy and meet regulatory requirements.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Ensure GDPR Compliance</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>GDPR Requirements</h2>
      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Explicit Consent</h3>
          <p>Clear opt-in mechanism for data collection</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Right to Erasure</h3>
          <p>Easy data deletion upon user request</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Data Portability</h3>
          <p>Export user data in machine-readable format</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon"></span>
          <h3>Data Protection</h3>
          <p>Secure storage and processing of personal data</p>
        </div>
      </div>

      <h2>How We Help with GDPR</h2>
      <ul className="benefits-list">
        <li>Built-in consent management system</li>
        <li>Automated data deletion workflows</li>
        <li>Data processing agreements (DPA)</li>
        <li>EU-based data storage options</li>
        <li>Privacy policy templates</li>
        <li>Audit trail for compliance reporting</li>
      </ul>
    </div>
  </div>
);

export const HelpCenter = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp API Help Center - Support & Resources</h1>
      <p className="seo-hero-text">Get help with WhatsApp Business API setup, troubleshooting, and best practices. Comprehensive documentation and 24/7 support.</p>
      <div className="seo-cta">
        <Link to="/contact" className="btn btn-primary btn-large">Contact Support</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>Popular Help Topics</h2>
      <div className="help-topics">
        <div className="help-topic">
          <h3>Getting Started</h3>
          <ul>
            <li>Account setup and verification</li>
            <li>Phone number registration</li>
            <li>First message tutorial</li>
            <li>Dashboard overview</li>
          </ul>
        </div>
        <div className="help-topic">
          <h3>Messaging</h3>
          <ul>
            <li>How to send messages</li>
            <li>Template creation guide</li>
            <li>Media message formats</li>
            <li>Message status meanings</li>
          </ul>
        </div>
        <div className="help-topic">
          <h3>Integration</h3>
          <ul>
            <li>API authentication</li>
            <li>Webhook setup</li>
            <li>CRM integration guides</li>
            <li>E-commerce platform plugins</li>
          </ul>
        </div>
        <div className="help-topic">
          <h3>Billing</h3>
          <ul>
            <li>Understanding pricing</li>
            <li>Invoice and payments</li>
            <li>Usage monitoring</li>
            <li>Plan upgrades</li>
          </ul>
        </div>
      </div>

      <h2>Need More Help?</h2>
      <div className="support-options">
        <div className="support-option">
          <h4>Email Support</h4>
          <p>support@yourservice.com</p>
          <p>Response within 24 hours</p>
        </div>
        <div className="support-option">
          <h4>Live Chat</h4>
          <p>Available 24/7</p>
          <p>Average response: 2 minutes</p>
        </div>
        <div className="support-option">
          <h4>Phone Support</h4>
          <p>+91-XXXX-XXXXXX</p>
          <p>Mon-Fri: 9 AM - 6 PM IST</p>
        </div>
      </div>
    </div>
  </div>
);

export const WebhookSetup = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp Webhook Setup - Real-time Message Updates</h1>
      <p className="seo-hero-text">Configure webhooks to receive real-time notifications about message status, incoming messages, and delivery updates.</p>
      <div className="seo-cta">
        <Link to="/register" className="btn btn-primary btn-large">Setup Webhooks</Link>
      </div>
    </div>

    <div className="seo-content">
      <h2>Webhook Configuration</h2>
      <div className="setup-steps">
        <div className="step">
          <span className="step-number">1</span>
          <div>
            <h4>Create Endpoint</h4>
            <p>Set up an HTTPS endpoint to receive webhook events</p>
          </div>
        </div>
        <div className="step">
          <span className="step-number">2</span>
          <div>
            <h4>Register URL</h4>
            <p>Add your webhook URL in the dashboard settings</p>
          </div>
        </div>
        <div className="step">
          <span className="step-number">3</span>
          <div>
            <h4>Verify</h4>
            <p>Complete webhook verification challenge</p>
          </div>
        </div>
        <div className="step">
          <span className="step-number">4</span>
          <div>
            <h4>Test</h4>
            <p>Test webhook with sample events</p>
          </div>
        </div>
      </div>

      <h2>Webhook Events</h2>
      <ul className="benefits-list">
        <li><strong>message.sent</strong> - Message successfully sent</li>
        <li><strong>message.delivered</strong> - Message delivered to recipient</li>
        <li><strong>message.read</strong> - Message read by recipient</li>
        <li><strong>message.failed</strong> - Message delivery failed</li>
        <li><strong>message.received</strong> - Incoming message from customer</li>
      </ul>

      <h2>Example Webhook Payload</h2>
      <div className="code-example">
        <pre>{`{
  "event": "message.delivered",
  "timestamp": "2025-11-20T10:30:00Z",
  "messageId": "wamid.XXXXXXXXX",
  "to": "919876543210",
  "status": "delivered"
}`}</pre>
      </div>
    </div>
  </div>
);



