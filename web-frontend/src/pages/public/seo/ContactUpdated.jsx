import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/Toast';
import { createSupportTicket } from '../../../services/support/supportService';

export const ContactUpdated = () => {
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
        <h1>{isHelpPage ? 'Help & Support' : 'Contact Us'}</h1>
        <p>{isHelpPage ? 'Get help from our support team. We typically respond within 24 hours.' : 'Have questions? Our team is here to help with demos, pricing, or technical support.'}</p>
      </div>
      <div className="seo-content">
        <section className="contact-section">
          <div className="contact-grid">
            <div className="contact-info-card">
              <h2>{isHelpPage ? 'Support Channels' : 'Get in Touch'}</h2>
              <p className="contact-subtitle">
                {isHelpPage 
                  ? 'Choose your preferred way to reach us. We\'re available 24/7 to assist you.'
                  : 'Connect with us through any of these channels. We\'ll get back to you promptly.'}
              </p>
              <div className="contact-methods">
                <div className="contact-method-card">
                  <div className="method-icon email-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </div>
                  <div className="method-content">
                    <h4>Email Support</h4>
                    <p>support@whatsappapi.com</p>
                  </div>
                </div>
                <div className="contact-method-card">
                  <div className="method-icon phone-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                  </div>
                  <div className="method-content">
                    <h4>Phone Support</h4>
                    <p>+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="contact-method-card">
                  <div className="method-icon whatsapp-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 012.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.188 8.188 0 01-1.26-4.38c.01-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.87.86-.87 2.07 0 1.22.89 2.39 1 2.56.14.17 1.76 2.67 4.25 3.73.59.27 1.05.42 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.27-.25-.14-1.47-.74-1.69-.82-.23-.08-.37-.12-.56.12-.16.25-.64.81-.78.97-.15.17-.29.19-.53.07-.26-.13-1.06-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.12-.24-.01-.39.11-.5.11-.11.27-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.11-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43-.14 0-.3-.01-.47-.01z"/>
                    </svg>
                  </div>
                  <div className="method-content">
                    <h4>WhatsApp Chat</h4>
                    <p>+1 (555) 123-4567</p>
                  </div>
                </div>
              </div>
              <div className="help-resources">
                <h3>Quick Resources</h3>
                <ul>
                  <li><a href="/docs">Documentation</a></li>
                  <li><a href="/faq">FAQ</a></li>
                  <li><a href="/tutorials">Video Tutorials</a></li>
                  <li><a href="/blog">Knowledge Base</a></li>
                </ul>
              </div>
            </div>
            <div className="contact-form-card">
              <h2>{isHelpPage ? 'Submit a Support Ticket' : 'Send us a Message'}</h2>
              <p className="form-subtitle">
                {isHelpPage 
                  ? 'Fill out the form below and our team will get back to you as soon as possible.'
                  : 'Tell us about your needs and we\'ll reach out to help you get started.'}
              </p>
              <form onSubmit={handleSubmit} className="modern-form">
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input 
                    id="name"
                    type="text" 
                    name="name"
                    placeholder="Enter your full name" 
                    required 
                    value={formData.name}
                    onChange={handleChange}
                    disabled={(isHelpPage && fieldsAutoFilled.name) || isSubmitting}
                    className={fieldsAutoFilled.name ? 'auto-filled' : ''}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="mobile">Mobile Number *</label>
                  <input 
                    id="mobile"
                    type="tel" 
                    name="mobile"
                    placeholder="+919876543210" 
                    required
                    pattern="\+[0-9]{10,15}"
                    minLength="11"
                    maxLength="16"
                    title="Please enter a valid mobile number with country code (e.g., +919876543210)"
                    value={formData.mobile}
                    onChange={handleChange}
                    disabled={(isHelpPage && fieldsAutoFilled.mobile) || isSubmitting}
                    className={fieldsAutoFilled.mobile ? 'auto-filled' : ''}
                  />
                  <span className="field-hint">Include country code (91 for India)</span>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input 
                    id="email"
                    type="email" 
                    name="email"
                    placeholder="your.email@company.com" 
                    value={formData.email}
                    onChange={handleChange}
                    disabled={(isHelpPage && fieldsAutoFilled.email) || isSubmitting}
                    className={fieldsAutoFilled.email ? 'auto-filled' : ''}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="company">Company Name</label>
                  <input 
                    id="company"
                    type="text" 
                    name="company"
                    placeholder="Your company name" 
                    value={formData.company}
                    onChange={handleChange}
                    disabled={(isHelpPage && fieldsAutoFilled.company) || isSubmitting}
                    className={fieldsAutoFilled.company ? 'auto-filled' : ''}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message">{isHelpPage ? 'Describe Your Issue' : 'Your Message'} *</label>
                  <textarea 
                    id="message"
                    name="message"
                    placeholder={isHelpPage ? "Please provide details about the issue you're experiencing..." : "Tell us how we can help you..."} 
                    rows="6" 
                    required
                    value={formData.message}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  ></textarea>
                  <span className="field-hint">{formData.message.length} characters</span>
                </div>

                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                      </svg>
                      {isHelpPage ? 'Submit Support Request' : 'Send Message'}
                    </>
                  )}
                </button>
                
                <p className="form-footer">
                  <svg className="lock-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                  {isHelpPage 
                    ? 'Your information is secure and will only be used to address your support request.'
                    : 'We respect your privacy. Your information will never be shared.'}
                </p>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
