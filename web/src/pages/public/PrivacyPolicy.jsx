import React from 'react';
import './Terms.css';

const PrivacyPolicy = () => {
  const appName = process.env.REACT_APP_NAME || 'WhatsApp Marketing Platform';
  
  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-header">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last Updated: November 22, 2025</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Introduction</h2>
            <p>
              {appName} ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our Service.
            </p>
            <p>
              By using the Service, you consent to the data practices described in this policy. If you do not agree 
              with this policy, please do not use the Service.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Information We Collect</h2>
            <h3>2.1 Information You Provide</h3>
            <p>We collect information that you voluntarily provide when using our Service:</p>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, phone number, business name, password</li>
              <li><strong>Business Information:</strong> Company details, WhatsApp Business Account credentials, business profile</li>
              <li><strong>Contact Data:</strong> Contact lists, phone numbers, names, and custom fields you add</li>
              <li><strong>Message Content:</strong> Messages, templates, campaigns, and media files you create or send</li>
              <li><strong>Payment Information:</strong> Billing details (processed securely through third-party payment processors)</li>
            </ul>

            <h3>2.2 Automatically Collected Information</h3>
            <p>We automatically collect certain information when you use the Service:</p>
            <ul>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent, interaction patterns</li>
              <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
              <li><strong>Log Data:</strong> API calls, error logs, performance metrics</li>
              <li><strong>Cookies:</strong> Session cookies, preference cookies, analytics cookies</li>
            </ul>

            <h3>2.3 Information from Third Parties</h3>
            <ul>
              <li><strong>WhatsApp:</strong> Delivery receipts, read receipts, message status, quality ratings</li>
              <li><strong>Meta/Facebook:</strong> Business verification status, WABA information</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. How We Use Your Information</h2>
            <p>We use the collected information for the following purposes:</p>
            <ul>
              <li><strong>Service Delivery:</strong> To provide, maintain, and improve the Service</li>
              <li><strong>Message Processing:</strong> To send messages via WhatsApp Business API on your behalf</li>
              <li><strong>Account Management:</strong> To create and manage your account</li>
              <li><strong>Analytics:</strong> To provide insights, reports, and performance metrics</li>
              <li><strong>Communication:</strong> To send service updates, security alerts, and support messages</li>
              <li><strong>Security:</strong> To detect fraud, abuse, and security threats</li>
              <li><strong>Compliance:</strong> To comply with legal obligations and enforce our Terms</li>
              <li><strong>Improvement:</strong> To develop new features and improve user experience</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Data Sharing and Disclosure</h2>
            <h3>4.1 We Share Your Information With:</h3>
            <ul>
              <li>
                <strong>WhatsApp/Meta:</strong> We share message content and contact information with WhatsApp to 
                deliver messages through their API
              </li>
              <li>
                <strong>Service Providers:</strong> Cloud hosting (AWS/GCP), payment processors, email services, 
                analytics tools
              </li>
              <li>
                <strong>Team Members:</strong> Your business team members who have access to your account
              </li>
              <li>
                <strong>Legal Authorities:</strong> When required by law, subpoena, or legal process
              </li>
            </ul>

            <h3>4.2 We Do NOT:</h3>
            <ul>
              <li>Sell your personal information to third parties</li>
              <li>Share your data with advertisers</li>
              <li>Use your customer contact data for our own marketing</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Data Security</h2>
            <p>We implement industry-standard security measures to protect your information:</p>
            <ul>
              <li><strong>Encryption:</strong> Data encrypted in transit (TLS/SSL) and at rest (AES-256)</li>
              <li><strong>Access Controls:</strong> Role-based access control (RBAC) and authentication</li>
              <li><strong>Secure Infrastructure:</strong> Hosted on secure cloud platforms with regular backups</li>
              <li><strong>Monitoring:</strong> 24/7 security monitoring and intrusion detection</li>
              <li><strong>Compliance:</strong> SOC 2, ISO 27001 compliant infrastructure</li>
            </ul>
            <p>
              However, no method of transmission over the internet is 100% secure. While we strive to protect your 
              data, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Data Retention</h2>
            <p>We retain your information for as long as necessary to provide the Service and comply with legal obligations:</p>
            <ul>
              <li><strong>Account Data:</strong> Retained while your account is active</li>
              <li><strong>Message History:</strong> Retained for the duration specified in your settings (default: indefinitely)</li>
              <li><strong>Analytics Data:</strong> Aggregated analytics retained for 2 years</li>
              <li><strong>Audit Logs:</strong> Retained for 2 years for compliance purposes</li>
              <li><strong>Deleted Data:</strong> Permanently deleted within 90 days after account closure</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>7. Your Rights and Choices</h2>
            <h3>7.1 Access and Control</h3>
            <p>You have the following rights regarding your data:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Objection:</strong> Object to certain data processing activities</li>
              <li><strong>Restriction:</strong> Request restriction of data processing</li>
            </ul>

            <h3>7.2 GDPR Rights (EU Users)</h3>
            <p>If you are in the European Economic Area, you have additional rights under GDPR:</p>
            <ul>
              <li>Right to withdraw consent</li>
              <li>Right to data portability</li>
              <li>Right to lodge a complaint with a supervisory authority</li>
            </ul>

            <h3>7.3 How to Exercise Your Rights</h3>
            <p>
              To exercise any of these rights, please contact us at privacy@{appName.toLowerCase().replace(/\s+/g, '')}.com 
              or use the privacy tools in your account settings.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Cookies and Tracking</h2>
            <h3>8.1 Types of Cookies We Use</h3>
            <ul>
              <li><strong>Essential Cookies:</strong> Required for authentication and security</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how you use the Service</li>
            </ul>

            <h3>8.2 Managing Cookies</h3>
            <p>
              You can control cookies through your browser settings. However, disabling certain cookies may affect 
              Service functionality.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own. We ensure 
              appropriate safeguards are in place, including:
            </p>
            <ul>
              <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
              <li>Data Processing Agreements with all service providers</li>
              <li>Compliance with local data protection laws</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>10. Children's Privacy</h2>
            <p>
              The Service is not intended for children under 13 years of age. We do not knowingly collect personal 
              information from children. If you believe we have collected information from a child, please contact us 
              immediately.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. Third-Party Links</h2>
            <p>
              The Service may contain links to third-party websites or services. We are not responsible for the 
              privacy practices of these third parties. We encourage you to review their privacy policies.
            </p>
          </section>

          <section className="legal-section">
            <h2>12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by:
            </p>
            <ul>
              <li>Sending an email to your registered email address</li>
              <li>Posting a notice in the Service</li>
              <li>Updating the "Last Updated" date at the top of this policy</li>
            </ul>
            <p>
              Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="legal-section">
            <h2>13. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, 
              please contact us:
            </p>
            <div className="contact-info">
              <p><strong>Email:</strong> {process.env.REACT_APP_CONTACT_EMAIL || 'support@whatsappmarketing.com'}</p>
              <p><strong>Data Protection Officer:</strong> dpo@{(process.env.REACT_APP_CONTACT_EMAIL || 'support@whatsappmarketing.com').replace('support', 'dpo')}</p>
              <p><strong>Address:</strong> {process.env.REACT_APP_CONTACT_ADDRESS || 'Your Business Address'}</p>
              <p><strong>Phone:</strong> {process.env.REACT_APP_CONTACT_PHONE || '+91 98765 43210'}</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>14. Compliance and Certifications</h2>
            <p>We are committed to compliance with:</p>
            <ul>
              <li>General Data Protection Regulation (GDPR)</li>
              <li>California Consumer Privacy Act (CCPA)</li>
              <li>WhatsApp Business Policy</li>
              <li>Meta Platform Terms</li>
              <li>Information Technology Act, 2000 (India)</li>
            </ul>
          </section>
        </div>

        <div className="legal-footer">
          <p>
            <a href="/">← Back to Home</a> | <a href="/terms">Terms of Service</a> | <a href="/contact">Contact Us</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;



