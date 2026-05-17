/**
 * @fileoverview SEO-optimized marketing landing pages for WhatsApp Business API platform.
 * 
 * @module SEOPages
 * 
 * @description
 * Collection of SEO landing pages targeting specific keywords and use cases for WhatsApp
 * Business API services. Each page is optimized for search engines with targeted content,
 * feature highlights, industry solutions, and conversion-focused CTAs.
 * 
 * @pages
 * - WhatsAppBusinessAPI: Main platform landing page with all features
 * - WhatsAppCampaigns: Campaign management and bulk messaging
 * - WhatsAppInbox: Unified inbox and conversation management
 * - WhatsAppTemplates: Message template creation and approval
 * - WhatsAppAnalytics: Analytics and reporting features
 * - WhatsAppAPIForEcommerce: E-commerce specific use cases
 * - BulkWhatsAppMessages: Bulk messaging capabilities
 * - WhatsAppChatbot: Chatbot integration features
 * - WhatsAppAPIIntegration: API integration documentation
 * - WhatsAppAPIProviderIndia: India-specific landing page
 * - Features: Complete feature list
 * - Pricing: Pricing plans and tiers
 * - Contact: Contact form and support information
 * 
 * @routes
 * - /whatsapp-business-api: Main platform page
 * - /whatsapp-campaigns: Campaign features
 * - /whatsapp-inbox: Inbox features
 * - /whatsapp-templates: Template management
 * - /whatsapp-analytics: Analytics features
 * - /whatsapp-api-for-ecommerce: E-commerce solutions
 * - /bulk-whatsapp-messages: Bulk messaging
 * - /whatsapp-chatbot: Chatbot features
 * - /whatsapp-api-integration: Integration docs
 * - /whatsapp-api-provider-india: India-specific page
 * - /features: All features
 * - /pricing: Pricing plans
 * - /contact: Contact page
 * 
 * @seo-keywords
 * - WhatsApp Business API, WhatsApp API provider, bulk WhatsApp messaging
 * - WhatsApp campaign management, WhatsApp inbox, WhatsApp templates
 * - WhatsApp analytics, WhatsApp chatbot, WhatsApp API integration
 * - WhatsApp for e-commerce, WhatsApp for healthcare, WhatsApp for education
 * - WhatsApp API India, official WhatsApp partner
 * 
 * @features
 * - SEO-optimized hero sections with H1 tags
 * - Feature grids with benefit highlights
 * - Industry-specific use case cards
 * - Pricing tier comparison
 * - Contact forms with multiple methods
 * - CTA buttons for registration and demos
 * 
 * @used-by
 * - SEO/marketing route configuration
 * - Organic search traffic landing pages
 * - PPC campaign landing pages
 * 
 * @extends
 * - SEOPages.css (shared SEO page styling)
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/Toast';
import { createSupportTicket } from '../../../services/support/supportService';
import './SEOPages.css';

export const WhatsAppBusinessAPI = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp Business API Provider | Enterprise Messaging Solutions</h1>
      <p>Official WhatsApp Business API partner offering bulk messaging, campaign management, and chatbot solutions for businesses of all sizes.</p>
      <div className="seo-cta">
        <a href="/register" className="btn-primary">Get Started Free</a>
        <a href="/contact" className="btn-secondary">Contact Sales</a>
      </div>
    </div>

    <div className="seo-content">
      <section className="features-section">
        <h2>Complete WhatsApp Business API Platform</h2>
        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon"></span>
            <h3>Bulk Messaging</h3>
            <p>Send personalized WhatsApp messages to thousands of customers instantly with our powerful API.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon"></span>
            <h3>Campaign Management</h3>
            <p>Create, schedule, and track WhatsApp campaigns with real-time analytics and performance metrics.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon"></span>
            <h3>Inbox Management</h3>
            <p>Manage all customer conversations from a unified inbox with team collaboration features.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon"></span>
            <h3>Message Templates</h3>
            <p>Create and manage WhatsApp-approved message templates for marketing and notifications.</p>
          </div>
        </div>
      </section>

      <section className="benefits-section">
        <h2>Why Choose Our WhatsApp Business API Service?</h2>
        <ul className="benefits-list">
          <li>Official WhatsApp Business API partner</li>
          <li>99.9% uptime guarantee with enterprise-grade infrastructure</li>
          <li>Dedicated account manager and 24/7 support</li>
          <li>Competitive pricing with flexible plans</li>
          <li>Easy integration with REST API and webhooks</li>
          <li>GDPR compliant and secure data handling</li>
        </ul>
      </section>

      <section className="industries-section">
        <h2>Industry Solutions</h2>
        <div className="industries-grid">
          <a href="/whatsapp-api-for-ecommerce" className="industry-card">
            <h4>E-commerce</h4>
            <p>Order updates, abandoned cart recovery, customer support</p>
          </a>
          <a href="/whatsapp-api-for-healthcare" className="industry-card">
            <h4>Healthcare</h4>
            <p>Appointment reminders, test results, patient engagement</p>
          </a>
          <a href="/whatsapp-api-for-education" className="industry-card">
            <h4>Education</h4>
            <p>Admission updates, exam notifications, parent communication</p>
          </a>
          <a href="/whatsapp-api-for-banking" className="industry-card">
            <h4>Banking</h4>
            <p>Transaction alerts, loan updates, customer verification</p>
          </a>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to Transform Customer Communication?</h2>
        <p>Join thousands of businesses using WhatsApp Business API to engage customers</p>
        <a href="/register" className="btn-large">Start Your Free Trial</a>
      </section>
    </div>
  </div>
);

export const WhatsAppCampaigns = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp Campaign Management | Bulk Campaign Solutions</h1>
      <p>Create and manage effective WhatsApp campaigns with our API. Send bulk messages, track performance, and engage customers efficiently.</p>
    </div>
    <div className="seo-content">
      <section>
        <h2>Powerful WhatsApp Campaign Features</h2>
        <ul>
          <li>Schedule campaigns for optimal delivery times</li>
          <li>Personalize messages with dynamic variables</li>
          <li>Track delivery, read rates, and engagement metrics</li>
          <li>A/B test different message templates</li>
          <li>Segment audiences for targeted campaigns</li>
        </ul>
      </section>
    </div>
  </div>
);

export const WhatsAppInbox = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp Inbox Solution | Unified Customer Conversations</h1>
      <p>Manage all WhatsApp conversations from a single inbox. Team collaboration, automated responses, and conversation analytics.</p>
    </div>
  </div>
);

export const WhatsAppTemplates = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp Message Templates | Pre-approved Templates</h1>
      <p>Create, submit, and manage WhatsApp Business API templates. Get faster approvals with our template optimization tools.</p>
    </div>
  </div>
);

export const WhatsAppAnalytics = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp Analytics & Reporting | Data-Driven Insights</h1>
      <p>Track message performance, campaign ROI, and customer engagement with comprehensive analytics dashboards.</p>
    </div>
  </div>
);

export const WhatsAppAPIForEcommerce = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp API for E-commerce | Order Updates & Customer Engagement</h1>
      <p>Boost e-commerce sales with WhatsApp API. Send order updates, abandoned cart reminders, and personalized offers to customers.</p>
    </div>
    <div className="seo-content">
      <section>
        <h2>E-commerce Use Cases</h2>
        <div className="use-cases">
          <div className="use-case-card">
            <h3>Order Notifications</h3>
            <p>Real-time order confirmations, shipping updates, and delivery notifications</p>
          </div>
          <div className="use-case-card">
            <h3>Abandoned Cart Recovery</h3>
            <p>Automated reminders to customers who left items in their cart</p>
          </div>
          <div className="use-case-card">
            <h3>Product Recommendations</h3>
            <p>Personalized product suggestions based on browsing history</p>
          </div>
          <div className="use-case-card">
            <h3>Customer Support</h3>
            <p>Quick resolution of queries, returns, and exchanges via WhatsApp</p>
          </div>
        </div>
      </section>
    </div>
  </div>
);

export const BulkWhatsAppMessages = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>Bulk WhatsApp Messages | Send Thousands of Messages Instantly</h1>
      <p>Send bulk WhatsApp messages to your customers with high delivery rates. Perfect for marketing campaigns, notifications, and alerts.</p>
    </div>
  </div>
);

export const WhatsAppChatbot = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp Chatbot Integration | Automated Customer Service</h1>
      <p>Build intelligent WhatsApp chatbots with our API. Automate responses, qualify leads, and provide 24/7 customer support.</p>
    </div>
  </div>
);

export const WhatsAppAPIIntegration = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp API Integration | Easy Setup & Documentation</h1>
      <p>Integrate WhatsApp Business API with your systems in minutes. Complete documentation, SDKs, and developer support.</p>
    </div>
  </div>
);

export const WhatsAppAPIProviderIndia = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>WhatsApp API Provider India | Best WhatsApp Business API Service</h1>
      <p>Leading WhatsApp Business API provider in India. Serving businesses across Delhi, Mumbai, Bangalore, Hyderabad, and Chennai.</p>
    </div>
    <div className="seo-content">
      <section>
        <h2>Why Choose Us for WhatsApp Business API in India?</h2>
        <ul>
          <li>Local support team available in Indian business hours</li>
          <li>Competitive pricing in INR with flexible payment options</li>
          <li>Compliance with Indian data protection regulations</li>
          <li>Integration with popular Indian payment gateways</li>
          <li>Multi-language template support (Hindi, English, and regional languages)</li>
        </ul>
      </section>
    </div>
  </div>
);

export const Features = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>Features | WhatsApp Business API Platform</h1>
      <p>Explore all features of our WhatsApp Business API platform. From messaging to analytics, we have everything you need.</p>
    </div>
  </div>
);

export const Pricing = () => (
  <div className="seo-page">
    <div className="seo-hero">
      <h1>Pricing | Affordable WhatsApp Business API Plans</h1>
      <p>Transparent pricing for WhatsApp Business API. Choose a plan that fits your business needs with no hidden costs.</p>
    </div>
    <div className="seo-content">
      <section className="pricing-section">
        <div className="pricing-grid">
          <div className="pricing-card">
            <h3>Starter</h3>
            <p className="price">$49<span>/month</span></p>
            <ul>
              <li>1,000 conversations/month</li>
              <li>Basic templates</li>
              <li>Email support</li>
              <li>API access</li>
            </ul>
            <a href="/register" className="btn-secondary">Get Started</a>
          </div>
          <div className="pricing-card featured">
            <span className="badge">Popular</span>
            <h3>Professional</h3>
            <p className="price">$149<span>/month</span></p>
            <ul>
              <li>5,000 conversations/month</li>
              <li>Unlimited templates</li>
              <li>Priority support</li>
              <li>Advanced analytics</li>
              <li>Chatbot integration</li>
            </ul>
            <a href="/register" className="btn-primary">Get Started</a>
          </div>
          <div className="pricing-card">
            <h3>Enterprise</h3>
            <p className="price">Custom</p>
            <ul>
              <li>Unlimited conversations</li>
              <li>Dedicated account manager</li>
              <li>24/7 phone support</li>
              <li>Custom integrations</li>
              <li>SLA guarantee</li>
            </ul>
            <a href="/contact" className="btn-secondary">Contact Sales</a>
          </div>
        </div>
      </section>
    </div>
  </div>
);

export const Contact = () => {
  const location = useLocation();
  const { user, currentBusiness } = useAuth();
  const { success, error } = useToast();
  const isHelpPage = location.pathname === '/help';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldsAutoFilled, setFieldsAutoFilled] = useState({
    name: false,
    email: false,
    company: false,
    mobile: false
  });
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    mobile: '',
    message: ''
  });

  useEffect(() => {
    if (isHelpPage && user) {
      const autoFilledData = {
        name: user.name || '',
        email: user.email || '',
        company: currentBusiness?.name || user.businessName || '',
        mobile: user.phoneNumber || user.mobile || ''
      };
      
      setFormData(prev => ({
        ...prev,
        ...autoFilledData
      }));
      
      setFieldsAutoFilled({
        name: !!autoFilledData.name,
        email: !!autoFilledData.email,
        company: !!autoFilledData.company,
        mobile: !!autoFilledData.mobile
      });
    }
  }, [isHelpPage, user, currentBusiness]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createSupportTicket({
        ...formData,
        type: isHelpPage ? 'help' : 'contact'
      });

      success(isHelpPage ? 'Support request submitted successfully! We\'ll get back to you soon.' : 'Message sent successfully! We\'ll contact you shortly.');
      
      // Reset form
      if (!isHelpPage) {
        setFormData({ name: '', email: '', company: '', mobile: '', message: '' });
      } else {
        setFormData(prev => ({ ...prev, message: '' }));
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      error(err.response?.data?.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="seo-page">
      <div className="seo-hero">
        <h1>{isHelpPage ? 'Help Center' : 'Contact Us'} | {isHelpPage ? 'Support & Assistance' : 'Get in Touch with WhatsApp API Experts'}</h1>
        <p>{isHelpPage ? 'Need assistance? Our support team is here to help you with any issues or questions.' : 'Have questions about WhatsApp Business API? Our team is here to help. Reach out for demos, pricing, or technical support.'}</p>
      </div>
      <div className="seo-content">
        <section className="contact-section">
          <div className="contact-grid">
            <div className="contact-info">
              <h2>{isHelpPage ? 'Support Channels' : 'Get in Touch'}</h2>
              <div className="contact-methods">
                <div className="contact-method">
                  <span className="icon"></span>
                  <div>
                    <h4>Email</h4>
                    <p>support@whatsappapi.com</p>
                  </div>
                </div>
                <div className="contact-method">
                  <span className="icon"></span>
                  <div>
                    <h4>Phone</h4>
                    <p>+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="contact-method">
                  <span className="icon"></span>
                  <div>
                    <h4>WhatsApp</h4>
                    <p>+1 (555) 123-4567</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="contact-form">
              <h2>{isHelpPage ? 'Submit a Support Request' : 'Send us a Message'}</h2>
              <form onSubmit={handleSubmit}>
                <input 
                  type="text" 
                  name="name"
                  placeholder="Your Name" 
                  required 
                  value={formData.name}
                  onChange={handleChange}
                  disabled={(isHelpPage && fieldsAutoFilled.name) || isSubmitting}
                />
                <input 
                  type="email" 
                  name="email"
                  placeholder="Your Email (optional)" 
                  value={formData.email}
                  onChange={handleChange}
                  disabled={(isHelpPage && fieldsAutoFilled.email) || isSubmitting}
                />
                <input 
                  type="tel" 
                  name="mobile"
                  placeholder="Mobile Number (with country code)" 
                  required
                  pattern="\+[0-9]{10,15}"
                  minLength="11"
                  maxLength="16"
                  title="Please enter a valid mobile number with country code (e.g., 919876543210)"
                  value={formData.mobile}
                  onChange={handleChange}
                  disabled={(isHelpPage && fieldsAutoFilled.mobile) || isSubmitting}
                />
                <input 
                  type="text" 
                  name="company"
                  placeholder="Company Name (optional)" 
                  value={formData.company}
                  onChange={handleChange}
                  disabled={(isHelpPage && fieldsAutoFilled.company) || isSubmitting}
                />
                <textarea 
                  name="message"
                  placeholder={isHelpPage ? "Describe your issue..." : "Your Message"} 
                  rows="5" 
                  required
                  value={formData.message}
                  onChange={handleChange}
                  disabled={isSubmitting}
                ></textarea>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : (isHelpPage ? 'Submit Request' : 'Send Message')}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};



