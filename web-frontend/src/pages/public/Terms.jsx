/**
 * 📜 Terms of Service Page
 * 
 * Legal terms and conditions for using the WhatsApp Marketing Platform.
 * Dynamically displays app name from environment variables.
 * Covers user accounts, acceptable use, compliance, data privacy, billing, and liability.
 * 
 * @component
 * @returns {JSX.Element} Terms of Service page
 * 
 * @features
 * - Comprehensive 15-section legal document
 * - WhatsApp Business API compliance requirements
 * - GDPR and privacy considerations
 * - Dispute resolution and governing law
 * - Semantic HTML structure for accessibility
 * - Responsive design with smooth animations
 * 
 * @example
 * <Route path="/terms" element={<Terms />} />
 */

import React from 'react';
import './Terms.css';

/**
 * Default application name fallback
 */
const DEFAULT_APP_NAME = 'WhatsApp Marketing Platform';

/**
 * Default contact email fallback
 */
const DEFAULT_CONTACT_EMAIL = 'support@whatsappmarketing.com';

/**
 * Default contact address fallback
 */
const DEFAULT_CONTACT_ADDRESS = 'Your Business Address';

/**
 * Last updated date for terms
 */
const LAST_UPDATED = 'November 22, 2025';

const Terms = () => {
  const appName = process.env.REACT_APP_NAME || DEFAULT_APP_NAME;
  
  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-header">
          <h1>Terms of Service</h1>
          <p className="legal-updated">Last Updated: {LAST_UPDATED}</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using {appName} (the "Service"), you accept and agree to be bound by the terms and 
              provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Description of Service</h2>
            <p>
              {appName} provides a cloud-based platform for businesses to manage WhatsApp messaging, marketing campaigns,
              customer communications, and analytics. The Service includes:
            </p>
            <ul>
              <li>WhatsApp Business API integration</li>
              <li>Message template management</li>
              <li>Campaign creation and execution</li>
              <li>Contact management and CRM features</li>
              <li>Analytics and reporting tools</li>
              <li>Automation and workflow features</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. User Accounts</h2>
            <h3>3.1 Registration</h3>
            <p>
              To use the Service, you must create an account by providing accurate and complete information. You are 
              responsible for maintaining the confidentiality of your account credentials.
            </p>
            <h3>3.2 Account Security</h3>
            <p>
              You are responsible for all activities that occur under your account. You must notify us immediately of 
              any unauthorized use of your account or any other breach of security.
            </p>
            <h3>3.3 Account Termination</h3>
            <p>
              We reserve the right to suspend or terminate your account if you violate these Terms of Service or 
              WhatsApp's policies.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Acceptable Use Policy</h2>
            <p>You agree NOT to use the Service to:</p>
            <ul>
              <li>Send spam, unsolicited messages, or marketing content to users who have not opted in</li>
              <li>Violate WhatsApp's Commerce Policy or Business Policy</li>
              <li>Send illegal, harmful, threatening, abusive, or offensive content</li>
              <li>Impersonate any person or entity</li>
              <li>Engage in any activity that could harm the Service or other users</li>
              <li>Circumvent rate limits or other technical limitations</li>
              <li>Scrape or harvest user data without permission</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. WhatsApp Business API Compliance</h2>
            <h3>5.1 WhatsApp Policies</h3>
            <p>
              You must comply with all WhatsApp Business API policies, including but not limited to:
            </p>
            <ul>
              <li>WhatsApp Business Policy</li>
              <li>WhatsApp Commerce Policy</li>
              <li>Meta Platform Terms</li>
              <li>Template message guidelines</li>
            </ul>
            <h3>5.2 Opt-In Requirements</h3>
            <p>
              You must obtain proper opt-in consent from users before sending them messages. You are responsible 
              for maintaining records of user consent.
            </p>
            <h3>5.3 Quality Rating</h3>
            <p>
              Your WhatsApp phone number has a quality rating. If your quality rating drops to RED, your messaging 
              capabilities may be limited or suspended by WhatsApp.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Data and Privacy</h2>
            <h3>6.1 Your Data</h3>
            <p>
              You retain all rights to the data you input into the Service, including contacts, messages, and 
              campaign content.
            </p>
            <h3>6.2 Privacy Policy</h3>
            <p>
              Our collection and use of personal information is described in our{' '}
              <a href="/privacy">Privacy Policy</a>.
            </p>
            <h3>6.3 Data Security</h3>
            <p>
              We implement industry-standard security measures to protect your data. However, no method of 
              transmission over the internet is 100% secure.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Intellectual Property</h2>
            <h3>7.1 Service Ownership</h3>
            <p>
              The Service, including all software, designs, text, graphics, and other content, is owned by {appName} 
              and is protected by copyright, trademark, and other intellectual property laws.
            </p>
            <h3>7.2 License Grant</h3>
            <p>
              We grant you a limited, non-exclusive, non-transferable license to access and use the Service for 
              your business purposes.
            </p>
            <h3>7.3 User Content</h3>
            <p>
              You retain ownership of content you create using the Service. By uploading content, you grant us a 
              license to store and process it to provide the Service.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Billing and Payment</h2>
            <h3>8.1 Subscription Plans</h3>
            <p>
              The Service is offered under various subscription plans. Pricing and features are described on our 
              pricing page.
            </p>
            <h3>8.2 Payment Terms</h3>
            <p>
              Subscription fees are billed in advance on a monthly or annual basis. You must provide valid payment 
              information to use paid features.
            </p>
            <h3>8.3 WhatsApp Messaging Costs</h3>
            <p>
              WhatsApp charges conversation-based fees for business-initiated messages. These costs are separate 
              from our subscription fees and are billed by WhatsApp/Meta.
            </p>
            <h3>8.4 Refunds</h3>
            <p>
              Subscription fees are non-refundable except as required by law or as otherwise stated in your 
              subscription agreement.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Service Availability</h2>
            <h3>9.1 Uptime</h3>
            <p>
              We strive to provide 99.9% uptime but do not guarantee uninterrupted service. The Service may be 
              unavailable due to maintenance, updates, or unforeseen circumstances.
            </p>
            <h3>9.2 Changes to Service</h3>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of the Service with or without notice.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Limitations of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {appName.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, 
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST DATA, OR 
              BUSINESS INTERRUPTION.
            </p>
            <p>
              OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU 
              PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless {appName}, its officers, directors, employees, and agents 
              from any claims, damages, losses, liabilities, and expenses (including attorney fees) arising from:
            </p>
            <ul>
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of WhatsApp policies</li>
              <li>Your violation of any third-party rights</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>12. Dispute Resolution</h2>
            <h3>12.1 Governing Law</h3>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India, without regard 
              to its conflict of law provisions.
            </p>
            <h3>12.2 Arbitration</h3>
            <p>
              Any dispute arising from these Terms shall be resolved through binding arbitration in accordance with 
              the Arbitration and Conciliation Act, 1996.
            </p>
          </section>

          <section className="legal-section">
            <h2>13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of material changes by 
              email or through the Service. Your continued use of the Service after changes constitutes acceptance 
              of the new Terms.
            </p>
          </section>

          <section className="legal-section">
            <h2>14. Contact Information</h2>
            <p>
              If you have questions about these Terms, please contact us at:
            </p>
            <div className="contact-info" role="complementary" aria-label="Contact information">
              <p><strong>Email:</strong> <a href={`mailto:${process.env.REACT_APP_CONTACT_EMAIL || DEFAULT_CONTACT_EMAIL}`}>{process.env.REACT_APP_CONTACT_EMAIL || DEFAULT_CONTACT_EMAIL}</a></p>
              <p><strong>Address:</strong> {process.env.REACT_APP_CONTACT_ADDRESS || DEFAULT_CONTACT_ADDRESS}</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>15. Entire Agreement</h2>
            <p>
              These Terms, together with our Privacy Policy and any other agreements referenced herein, constitute 
              the entire agreement between you and {appName} regarding the Service.
            </p>
          </section>
        </div>

        <footer className="legal-footer" role="contentinfo">
          <nav aria-label="Legal page navigation">
            <a href="/">← Back to Home</a> | <a href="/privacy">Privacy Policy</a> | <a href="/contact">Contact Us</a>
          </nav>
        </footer>
      </div>
    </div>
  );
};

export default Terms;



