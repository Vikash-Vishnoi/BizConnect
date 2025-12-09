import React from 'react';
import { Link } from 'react-router-dom';
import './SEOPages.css';

// Blog Landing Page
export const BlogHome = () => {
  const posts = [
    {
      title: 'Complete WhatsApp Business API Guide 2025',
      slug: 'whatsapp-business-api-guide',
      excerpt: 'Everything you need to know about WhatsApp Business API, from setup to advanced features.',
      category: 'Guide',
      readTime: '15 min read',
      date: 'Nov 15, 2025'
    },
    {
      title: 'WhatsApp API Pricing Comparison 2025',
      slug: 'whatsapp-pricing-comparison',
      excerpt: 'Compare WhatsApp Business API pricing across different providers and find the best value.',
      category: 'Pricing',
      readTime: '10 min read',
      date: 'Nov 10, 2025'
    },
    {
      title: 'WhatsApp vs SMS: Which is Better for Business?',
      slug: 'whatsapp-vs-sms',
      excerpt: 'Detailed comparison of WhatsApp and SMS for business communication, costs, and engagement.',
      category: 'Comparison',
      readTime: '12 min read',
      date: 'Nov 5, 2025'
    }
  ];

  return (
    <div className="seo-page">
      <div className="seo-hero">
        <h1>WhatsApp Business API Blog</h1>
        <p>Latest insights, guides, and best practices for WhatsApp Business API</p>
      </div>

      <div className="seo-content">
        <div className="blog-grid">
          {posts.map(post => (
            <Link to={`/blog/${post.slug}`} key={post.slug} className="blog-card">
              <div className="blog-category">{post.category}</div>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <div className="blog-meta">
                <span>{post.date}</span>
                <span>{post.readTime}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="seo-cta">
          <h2>Ready to Get Started?</h2>
          <p>Start using WhatsApp Business API today</p>
          <Link to="/register" className="cta-button">Start Free Trial</Link>
        </div>
      </div>
    </div>
  );
};

// WhatsApp Business API Guide
export const WhatsAppAPIGuide = () => {
  return (
    <div className="seo-page">
      <div className="seo-hero">
        <h1>Complete WhatsApp Business API Guide 2025</h1>
        <p>Master WhatsApp Business API with our comprehensive guide</p>
      </div>

      <div className="seo-content">
        <div className="guide-section">
          <h2>Table of Contents</h2>
          <ul className="guide-toc">
            <li><a href="#what-is">What is WhatsApp Business API?</a></li>
            <li><a href="#getting-started">Getting Started</a></li>
            <li><a href="#setup">Account Setup Process</a></li>
            <li><a href="#features">Key Features</a></li>
            <li><a href="#use-cases">Business Use Cases</a></li>
            <li><a href="#best-practices">Best Practices</a></li>
          </ul>
        </div>

        <div id="what-is" className="guide-section">
          <h2>What is WhatsApp Business API?</h2>
          <p>WhatsApp Business API is a powerful platform designed for medium to large businesses to communicate with customers at scale. Unlike the WhatsApp Business app, the API allows:</p>
          <ul>
            <li><strong>Multiple Users:</strong> Unlimited team members can access the same business number</li>
            <li><strong>Automation:</strong> Build chatbots, automated responses, and workflows</li>
            <li><strong>Integration:</strong> Connect with CRM, e-commerce platforms, and other systems</li>
            <li><strong>Scale:</strong> Handle millions of conversations simultaneously</li>
            <li><strong>Analytics:</strong> Track message delivery, read rates, and engagement metrics</li>
          </ul>
        </div>

        <div id="getting-started" className="guide-section">
          <h2>Getting Started with WhatsApp Business API</h2>
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <h3>Choose a BSP</h3>
              <p>Select a WhatsApp Business Solution Provider (BSP) like us to get API access quickly.</p>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <h3>Verify Your Business</h3>
              <p>Submit business documents for Meta verification (usually 1-3 business days).</p>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <h3>Configure Settings</h3>
              <p>Set up your business profile, message templates, and webhooks.</p>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <h3>Start Messaging</h3>
              <p>Begin sending messages to customers using approved templates.</p>
            </div>
          </div>
        </div>

        <div id="features" className="guide-section">
          <h2>Key Features of WhatsApp Business API</h2>
          <div className="features-grid">
            <div className="feature-box">
              <span className="feature-icon"></span>
              <h3>Message Templates</h3>
              <p>Pre-approved message templates for notifications, alerts, and promotional content.</p>
            </div>
            <div className="feature-box">
              <span className="feature-icon"></span>
              <h3>Chatbot Integration</h3>
              <p>Build AI-powered chatbots to handle customer queries 24/7.</p>
            </div>
            <div className="feature-box">
              <span className="feature-icon"></span>
              <h3>Analytics Dashboard</h3>
              <p>Real-time insights into message delivery, read rates, and engagement.</p>
            </div>
            <div className="feature-box">
              <span className="feature-icon"></span>
              <h3>API Integration</h3>
              <p>Connect with your existing CRM, e-commerce, and business systems.</p>
            </div>
            <div className="feature-box">
              <span className="feature-icon"></span>
              <h3>Rich Media Support</h3>
              <p>Send images, videos, documents, and interactive buttons.</p>
            </div>
            <div className="feature-box">
              <span className="feature-icon"></span>
              <h3>Green Tick Verification</h3>
              <p>Get official business verification badge for trust and credibility.</p>
            </div>
          </div>
        </div>

        <div id="use-cases" className="guide-section">
          <h2>Business Use Cases</h2>
          <div className="use-cases">
            <div className="use-case">
              <h3>E-commerce</h3>
              <p>Order confirmations, shipping updates, abandoned cart recovery, product recommendations</p>
            </div>
            <div className="use-case">
              <h3>Healthcare</h3>
              <p>Appointment reminders, test results, prescription notifications, health tips</p>
            </div>
            <div className="use-case">
              <h3>Banking & Finance</h3>
              <p>Transaction alerts, OTP delivery, account statements, payment reminders</p>
            </div>
            <div className="use-case">
              <h3>Logistics</h3>
              <p>Shipment tracking, delivery notifications, route updates, proof of delivery</p>
            </div>
            <div className="use-case">
              <h3>Education</h3>
              <p>Exam schedules, attendance alerts, fee reminders, assignment notifications</p>
            </div>
            <div className="use-case">
              <h3>Hospitality</h3>
              <p>Booking confirmations, check-in reminders, special offers, customer feedback</p>
            </div>
          </div>
        </div>

        <div id="best-practices" className="guide-section">
          <h2>Best Practices for WhatsApp Business API</h2>
          <div className="best-practices">
            <div className="practice-item">
              <h3>Always Get Opt-in</h3>
              <p>Ensure customers explicitly consent to receive messages. This is required by WhatsApp policy.</p>
            </div>
            <div className="practice-item">
              <h3>Use Templates Correctly</h3>
              <p>Create clear, valuable templates. Avoid spam-like content or excessive promotional messages.</p>
            </div>
            <div className="practice-item">
              <h3>Respond Within 24 Hours</h3>
              <p>Once a customer messages you, respond within the 24-hour window to maintain the conversation.</p>
            </div>
            <div className="practice-item">
              <h3>Monitor Quality Rating</h3>
              <p>Keep your quality rating high by sending relevant, valuable messages and responding promptly.</p>
            </div>
            <div className="practice-item">
              <h3>Personalize Messages</h3>
              <p>Use customer names, order details, and other variables to make messages feel personal.</p>
            </div>
            <div className="practice-item">
              <h3>Test Before Scaling</h3>
              <p>Test templates and workflows with small groups before sending to your entire customer base.</p>
            </div>
          </div>
        </div>

        <div className="seo-cta">
          <h2>Ready to Implement WhatsApp Business API?</h2>
          <p>Get started with our platform in minutes</p>
          <Link to="/register" className="cta-button">Start Free Trial</Link>
        </div>
      </div>
    </div>
  );
};

// WhatsApp Pricing Comparison
export const WhatsAppPricingComparison = () => {
  return (
    <div className="seo-page">
      <div className="seo-hero">
        <h1>WhatsApp Business API Pricing Comparison 2025</h1>
        <p>Compare costs and find the best WhatsApp API provider for your business</p>
      </div>

      <div className="seo-content">
        <div className="pricing-intro">
          <h2>Understanding WhatsApp API Pricing</h2>
          <p>WhatsApp Business API pricing consists of two main components:</p>
          <ul>
            <li><strong>Meta's Conversation-Based Pricing:</strong> Charged by Meta/WhatsApp per conversation</li>
            <li><strong>BSP Platform Fees:</strong> Additional fees charged by Business Solution Providers</li>
          </ul>
        </div>

        <div className="pricing-comparison">
          <h2>Meta's Conversation Pricing (India)</h2>
          <div className="pricing-table">
            <table>
              <thead>
                <tr>
                  <th>Conversation Type</th>
                  <th>Price per Conversation</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Marketing</td>
                  <td>?0.70 - ?1.10</td>
                  <td>Promotional messages, offers, announcements</td>
                </tr>
                <tr>
                  <td>Utility</td>
                  <td>?0.25 - ?0.40</td>
                  <td>Order updates, account alerts, reminders</td>
                </tr>
                <tr>
                  <td>Authentication</td>
                  <td>?0.30 - ?0.45</td>
                  <td>OTP, verification codes, 2FA messages</td>
                </tr>
                <tr>
                  <td>Service</td>
                  <td>?0.30 - ?0.50</td>
                  <td>Customer inquiries (user-initiated)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="provider-comparison">
          <h2>BSP Platform Comparison</h2>
          <div className="comparison-grid">
            <div className="comparison-card">
              <h3>Our Platform</h3>
              <div className="price-tag">?2,999/month</div>
              <ul className="feature-list">
                <li>No per-message fees</li>
                <li>Unlimited team members</li>
                <li>Advanced analytics</li>
                <li>Chatbot builder included</li>
                <li>CRM integration</li>
                <li>24/7 support</li>
                <li>No setup fees</li>
              </ul>
              <Link to="/pricing" className="btn-primary">View Plans</Link>
            </div>

            <div className="comparison-card">
              <h3>Competitor A</h3>
              <div className="price-tag">?4,999/month</div>
              <ul className="feature-list">
                <li>Additional per-message fees</li>
                <li>Unlimited team members</li>
                <li>Basic analytics</li>
                <li>Chatbot builder extra cost</li>
                <li>CRM integration</li>
                <li>Business hours support</li>
                <li>Setup fee: ?10,000</li>
              </ul>
            </div>

            <div className="comparison-card">
              <h3>Competitor B</h3>
              <div className="price-tag">?3,499/month</div>
              <ul className="feature-list">
                <li>Pay-per-message model</li>
                <li>Limited to 5 users</li>
                <li>Standard analytics</li>
                <li>Basic chatbot only</li>
                <li>Limited integrations</li>
                <li>Email support only</li>
                <li>No setup fees</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="cost-calculator">
          <h2>Cost Savings Calculator</h2>
          <p>See how much you can save with our platform:</p>
          <div className="calculator-example">
            <h3>Example: 10,000 messages/month</h3>
            <div className="calculation">
              <div className="calc-row">
                <span>Meta's Conversation Fees:</span>
                <span>?4,000</span>
              </div>
              <div className="calc-row">
                <span>Our Platform Fee:</span>
                <span>?2,999</span>
              </div>
              <div className="calc-row total">
                <span><strong>Total Monthly Cost:</strong></span>
                <span><strong>?6,999</strong></span>
              </div>
            </div>
            <p className="savings-note">Competitors charge ?8,499+ for the same volume</p>
          </div>
        </div>

        <div className="pricing-tips">
          <h2>Tips to Reduce WhatsApp API Costs</h2>
          <div className="tips-grid">
            <div className="tip-card">
              <h3>1. Use Utility Templates</h3>
              <p>Utility conversations are cheaper than marketing. Use them for transactional messages.</p>
            </div>
            <div className="tip-card">
              <h3>2. Optimize Timing</h3>
              <p>Send messages during business hours when customers are likely to respond quickly.</p>
            </div>
            <div className="tip-card">
              <h3>3. Use Session Messages</h3>
              <p>Within 24-hour window, session messages are free. Encourage customer-initiated chats.</p>
            </div>
            <div className="tip-card">
              <h3>4. Quality Over Quantity</h3>
              <p>High-quality, relevant messages have better engagement and lower costs per conversion.</p>
            </div>
          </div>
        </div>

        <div className="seo-cta">
          <h2>Get the Best Value for WhatsApp API</h2>
          <p>Start with our transparent, affordable pricing</p>
          <Link to="/register" className="cta-button">Start Free Trial</Link>
        </div>
      </div>
    </div>
  );
};

// WhatsApp vs SMS Comparison
export const WhatsAppVsSMS = () => {
  return (
    <div className="seo-page">
      <div className="seo-hero">
        <h1>WhatsApp vs SMS: Which is Better for Business?</h1>
        <p>Comprehensive comparison of WhatsApp Business API and SMS for customer communication</p>
      </div>

      <div className="seo-content">
        <div className="comparison-table-section">
          <h2>Head-to-Head Comparison</h2>
          <div className="comparison-table-wrapper">
            <table className="vs-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="whatsapp-col">WhatsApp Business API</th>
                  <th className="sms-col">SMS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Global Reach</strong></td>
                  <td className="whatsapp-col">2+ billion users worldwide</td>
                  <td className="sms-col">5+ billion users (universal)</td>
                </tr>
                <tr>
                  <td><strong>Cost per Message (India)</strong></td>
                  <td className="whatsapp-col">?0.25 - ?1.10</td>
                  <td className="sms-col">?0.20 - ?0.50 (but limited)</td>
                </tr>
                <tr>
                  <td><strong>Rich Media Support</strong></td>
                  <td className="whatsapp-col">Images, videos, documents, buttons</td>
                  <td className="sms-col">Text only (160 characters)</td>
                </tr>
                <tr>
                  <td><strong>Read Receipts</strong></td>
                  <td className="whatsapp-col">Delivered & read confirmations</td>
                  <td className="sms-col">Delivery only (limited)</td>
                </tr>
                <tr>
                  <td><strong>Open Rate</strong></td>
                  <td className="whatsapp-col">98% open rate</td>
                  <td className="sms-col">90% open rate</td>
                </tr>
                <tr>
                  <td><strong>Response Rate</strong></td>
                  <td className="whatsapp-col">40-60% response rate</td>
                  <td className="sms-col">6-8% response rate</td>
                </tr>
                <tr>
                  <td><strong>Two-way Conversations</strong></td>
                  <td className="whatsapp-col">Native chat experience</td>
                  <td className="sms-col">Limited (requires shortcode)</td>
                </tr>
                <tr>
                  <td><strong>Chatbot Support</strong></td>
                  <td className="whatsapp-col">Advanced AI chatbots</td>
                  <td className="sms-col">Very limited</td>
                </tr>
                <tr>
                  <td><strong>Message Length</strong></td>
                  <td className="whatsapp-col">Up to 4,096 characters</td>
                  <td className="sms-col">160 characters (or multiple SMS)</td>
                </tr>
                <tr>
                  <td><strong>Internet Required</strong></td>
                  <td className="whatsapp-col">Yes (WiFi or mobile data)</td>
                  <td className="sms-col">No (works on 2G)</td>
                </tr>
                <tr>
                  <td><strong>Opt-in Required</strong></td>
                  <td className="whatsapp-col">Yes (mandatory)</td>
                  <td className="sms-col">Recommended (DND)</td>
                </tr>
                <tr>
                  <td><strong>Analytics</strong></td>
                  <td className="whatsapp-col">Detailed metrics & insights</td>
                  <td className="sms-col">Basic delivery reports</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="use-case-comparison">
          <h2>When to Use WhatsApp vs SMS</h2>
          
          <div className="use-case-cards">
            <div className="use-case-card whatsapp-card">
              <h3>Choose WhatsApp When:</h3>
              <ul>
                <li>You need rich media content (images, videos, PDFs)</li>
                <li>You want two-way conversations with customers</li>
                <li>You're targeting urban, smartphone users</li>
                <li>You need detailed analytics and insights</li>
                <li>You want to build chatbots and automation</li>
                <li>Your messages are longer than 160 characters</li>
                <li>You need interactive buttons and quick replies</li>
                <li>Customer engagement is important</li>
              </ul>
            </div>

            <div className="use-case-card sms-card">
              <h3>Choose SMS When:</h3>
              <ul>
                <li>Your audience is in rural areas with limited internet</li>
                <li>You need 100% universal reach (basic phones)</li>
                <li>Messages are time-critical OTPs or alerts</li>
                <li>You're targeting older demographics</li>
                <li>Internet connectivity is unreliable</li>
                <li>Messages are very short and simple</li>
                <li>You need a backup channel for WhatsApp</li>
                <li>Regulatory requirements mandate SMS</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="industry-recommendations">
          <h2>Industry-Specific Recommendations</h2>
          <div className="industry-cards">
            <div className="industry-card">
              <h3>E-commerce</h3>
              <p><strong>Winner: WhatsApp</strong></p>
              <p>Rich product catalogs, order tracking with images, abandoned cart recovery with product images, personalized recommendations.</p>
            </div>
            <div className="industry-card">
              <h3>Banking</h3>
              <p><strong>Hybrid: Both</strong></p>
              <p>Use SMS for OTPs and critical alerts. Use WhatsApp for account statements, offers, and customer support.</p>
            </div>
            <div className="industry-card">
              <h3>Healthcare</h3>
              <p><strong>Winner: WhatsApp</strong></p>
              <p>Share test reports (PDFs), appointment confirmations with location maps, prescription images, health tips with visuals.</p>
            </div>
            <div className="industry-card">
              <h3>Logistics</h3>
              <p><strong>Winner: WhatsApp</strong></p>
              <p>Real-time tracking links, delivery photos, interactive delivery time selection, route maps, proof of delivery images.</p>
            </div>
            <div className="industry-card">
              <h3>Education</h3>
              <p><strong>Winner: WhatsApp</strong></p>
              <p>Share study materials, video lectures, assignment files, result cards, fee receipts, parent-teacher communication.</p>
            </div>
            <div className="industry-card">
              <h3>Hospitality</h3>
              <p><strong>Winner: WhatsApp</strong></p>
              <p>Booking confirmations with images, digital menus, room service via chat, local recommendations with maps, check-out via WhatsApp.</p>
            </div>
          </div>
        </div>

        <div className="cost-comparison-section">
          <h2>Cost Analysis: WhatsApp vs SMS</h2>
          <div className="cost-comparison">
            <h3>For 10,000 Messages/Month</h3>
            <div className="cost-breakdown">
              <div className="cost-option">
                <h4>WhatsApp Business API</h4>
                <ul>
                  <li>Utility messages: ?0.30 × 10,000 = ?3,000</li>
                  <li>Platform fee: ?2,999</li>
                  <li><strong>Total: ?5,999/month</strong></li>
                </ul>
                <p className="cost-benefits">+ Rich media, analytics, chatbots, unlimited length</p>
              </div>
              <div className="cost-option">
                <h4>SMS (Standard)</h4>
                <ul>
                  <li>SMS rate: ?0.25 × 10,000 = ?2,500</li>
                  <li>Platform fee: ?1,000</li>
                  <li><strong>Total: ?3,500/month</strong></li>
                </ul>
                <p className="cost-benefits">Text only, 160 chars, no rich features</p>
              </div>
            </div>
            <p className="cost-note"><strong>ROI Perspective:</strong> WhatsApp's 40-60% response rate vs SMS's 6-8% means WhatsApp delivers 5-7x better engagement, making it more cost-effective per conversion.</p>
          </div>
        </div>

        <div className="hybrid-strategy">
          <h2>Best Practice: Hybrid Approach</h2>
          <p>Most successful businesses use both channels strategically:</p>
          <div className="hybrid-grid">
            <div className="hybrid-item">
              <h3>Use WhatsApp for:</h3>
              <ul>
                <li>Marketing campaigns</li>
                <li>Customer support</li>
                <li>Product updates with images</li>
                <li>Order confirmations with tracking</li>
                <li>Engagement & retention</li>
              </ul>
            </div>
            <div className="hybrid-item">
              <h3>Use SMS for:</h3>
              <ul>
                <li>OTP & verification codes</li>
                <li>Critical time-sensitive alerts</li>
                <li>Backup for failed WhatsApp delivery</li>
                <li>Reaching non-WhatsApp users</li>
                <li>Emergency notifications</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="seo-cta">
          <h2>Get Started with WhatsApp Business API</h2>
          <p>Better engagement, lower cost per conversion, richer features</p>
          <Link to="/register" className="cta-button">Start Free Trial</Link>
        </div>
      </div>
    </div>
  );
};



