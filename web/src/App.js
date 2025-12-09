import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import LoadingSkeleton from './components/LoadingSkeleton';
import ProtectedRoute from './components/ProtectedRoute';
import { ROLES } from './utils/roles';

// Authentication Pages (eager load for faster initial access)
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Legal Pages (eager load for public access)
import Terms from './pages/public/Terms';
import PrivacyPolicy from './pages/public/PrivacyPolicy';
import Contact from './pages/contacts/Contact';

// Lazy-loaded Core Pages
const Dashboard = lazy(() => import('./pages/core/Dashboard'));
const BusinessSetupPart1 = lazy(() => import('./pages/business/BusinessSetupPart1'));
const BusinessSetupPart2 = lazy(() => import('./pages/business/BusinessSetupPart2'));
const BusinessSetupPart3 = lazy(() => import('./pages/business/BusinessSetupPart3'));
const Contacts = lazy(() => import('./pages/contacts/Contacts'));
const ContactHistory = lazy(() => import('./pages/contacts/ContactHistory'));
const Settings = lazy(() => import('./pages/core/Settings'));
const NotificationPreferences = lazy(() => import('./pages/core/NotificationPreferences'));
const SearchGlobal = lazy(() => import('./pages/shared/SearchGlobal'));
const StatusComposer = lazy(() => import('./pages/messaging/StatusComposer'));

// Lazy-loaded Messaging Pages
const Inbox = lazy(() => import('./pages/messaging/Inbox'));
const Conversation = lazy(() => import('./pages/messaging/Conversation'));
const Templates = lazy(() => import('./pages/messaging/Templates'));
const TemplateDetail = lazy(() => import('./pages/messaging/TemplateDetail'));
const CreateTemplate = lazy(() => import('./pages/messaging/CreateTemplate'));
const EditTemplate = lazy(() => import('./pages/messaging/EditTemplate'));

// Lazy-loaded Marketing/Campaign Pages
const Campaigns = lazy(() => import('./pages/marketing/Campaigns'));
const CampaignDetail = lazy(() => import('./pages/marketing/CampaignDetail'));
const CreateCampaign = lazy(() => import('./pages/marketing/CreateCampaign'));

// Lazy-loaded Analytics Pages
const Analytics = lazy(() => import('./pages/analytics/Analytics'));
const TemplateAnalytics = lazy(() => import('./pages/analytics/TemplateAnalytics'));
const ConversationAnalytics = lazy(() => import('./pages/analytics/ConversationAnalytics'));

// Lazy-loaded Automation Pages
const FlowList = lazy(() => import('./pages/automation/FlowList'));
const SavedReplies = lazy(() => import('./pages/automation/SavedReplies'));
const ScheduledMessages = lazy(() => import('./pages/automation/ScheduledMessages'));
const WelcomeMessageSettings = lazy(() => import('./pages/automation/WelcomeMessageSettings'));

// Lazy-loaded Admin/Settings Pages
const TeamMembers = lazy(() => import('./pages/admin/TeamMembers'));
const RoleManager = lazy(() => import('./pages/admin/RoleManager'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog'));
const Alerts = lazy(() => import('./pages/admin/Alerts'));
const PhoneHealth = lazy(() => import('./pages/admin/PhoneHealth'));
const QualityRatingHistory = lazy(() => import('./pages/admin/QualityRatingHistory'));
const MessageErrors = lazy(() => import('./pages/admin/MessageErrors'));
const RateLimitDashboard = lazy(() => import('./pages/admin/RateLimitDashboard'));
const Privacy = lazy(() => import('./pages/admin/Privacy'));
const OptInManager = lazy(() => import('./pages/admin/OptInManager'));

// SEO Pages - Keep eager loading for named exports (batched files)
// These are grouped efficiently and don't need individual lazy loading
import * as SEO from './pages/public/seo/SEOPages';
import * as SEOBatch2 from './pages/public/seo/SEOPagesBatch2';
import * as SEOIntegrations from './pages/public/seo/SEOIntegrations';
import * as SEOIndustries from './pages/public/seo/SEOIndustries';
import * as SEOLocations from './pages/public/seo/SEOLocations';
import * as SEOCompliance from './pages/public/seo/SEOCompliance';
import * as SEOBlog from './pages/public/seo/SEOBlog';

// Loading fallback component
const PageLoader = () => (
  <div style={{ padding: '2rem' }}>
    <LoadingSkeleton type="dashboard" />
  </div>
);

function App() {
  console.log('📱 App component rendering...');
  
  return (
    <AuthProvider>
      <ToastProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/contact" element={<Contact />} />
              {/* Core Pages - All Authenticated Users */}
        <Route 
          path="/business/create" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN]}>
              <BusinessSetupPart1 />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/business/create/step2" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN]}>
              <BusinessSetupPart2 />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/business/create/step3" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN]}>
              <BusinessSetupPart3 />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER]}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/inbox" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER]}>
              <Inbox />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/inbox/:id" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER]}>
              <Conversation />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/templates" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <Templates />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/templates/create" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <CreateTemplate />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/templates/:id/edit" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <EditTemplate />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/templates/:id" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <TemplateDetail />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <Analytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/scheduled-messages" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER]}>
              <ScheduledMessages />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/contacts" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER]}>
              <Contacts />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER]}>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/notifications" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER]}>
              <NotificationPreferences />
            </ProtectedRoute>
          } 
        />
        
        {/* Campaign Pages */}
        <Route 
          path="/campaigns" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <Campaigns />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/campaigns/create" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <CreateCampaign />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/campaigns/:id" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <CampaignDetail />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin/Advanced Features - Restricted Access */}
        <Route 
          path="/business-settings" 
          element={<Navigate to="/profile" replace />}
        />
        <Route 
          path="/settings" 
          element={<Navigate to="/profile" replace />}
        />
        <Route 
          path="/team" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <TeamMembers />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/roles" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN]}>
              <RoleManager />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/audit-log" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN]}>
              <AuditLog />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/alerts" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <Alerts />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/phone-health" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN]}>
              <PhoneHealth />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/quality-rating-history" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN]}>
              <QualityRatingHistory />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/message-errors" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <MessageErrors />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/rate-limits" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN]}>
              <RateLimitDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/contact-history" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER]}>
              <ContactHistory />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/flows" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <FlowList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/saved-replies" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER]}>
              <SavedReplies />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/search" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER]}>
              <SearchGlobal />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/template-analytics" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <TemplateAnalytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/conversation-analytics" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <ConversationAnalytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/status-composer" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <StatusComposer />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/privacy" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER]}>
              <Privacy />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/optin-manager" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <OptInManager />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/welcome-message-settings" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <WelcomeMessageSettings />
            </ProtectedRoute>
          } 
        />
        
        {/* SEO Landing Pages - Batch 1 */}
        <Route path="/features" element={<SEO.Features />} />
        <Route path="/pricing" element={<SEO.Pricing />} />
        <Route path="/contact" element={<SEO.Contact />} />
        <Route path="/whatsapp-business-api" element={<SEO.WhatsAppBusinessAPI />} />
        <Route path="/whatsapp-campaigns" element={<SEO.WhatsAppCampaigns />} />
        <Route path="/whatsapp-inbox" element={<SEO.WhatsAppInbox />} />
        <Route path="/whatsapp-templates" element={<SEO.WhatsAppTemplates />} />
        <Route path="/whatsapp-analytics" element={<SEO.WhatsAppAnalytics />} />
        <Route path="/whatsapp-api-for-ecommerce" element={<SEO.WhatsAppAPIForEcommerce />} />
        <Route path="/bulk-whatsapp-messages" element={<SEOBatch2.BulkWhatsAppMessages />} />
        <Route path="/whatsapp-chatbot" element={<SEO.WhatsAppChatbot />} />
        <Route path="/whatsapp-api-integration" element={<SEO.WhatsAppAPIIntegration />} />
        <Route path="/whatsapp-api-provider-india" element={<SEO.WhatsAppAPIProviderIndia />} />
        
        {/* SEO Landing Pages - Batch 2: Feature Details */}
        <Route path="/whatsapp-broadcasts" element={<SEOBatch2.WhatsAppBroadcasts />} />
        <Route path="/whatsapp-notifications" element={<SEOBatch2.WhatsAppNotifications />} />
        <Route path="/whatsapp-order-updates" element={<SEOBatch2.WhatsAppOrderUpdates />} />
        <Route path="/whatsapp-customer-support" element={<SEOBatch2.WhatsAppCustomerSupport />} />
        
        {/* SEO Landing Pages - Batch 2: Integrations */}
        <Route path="/whatsapp-crm-integration" element={<SEOIntegrations.WhatsAppCRMIntegration />} />
        <Route path="/whatsapp-woocommerce" element={<SEOIntegrations.WhatsAppWooCommerce />} />
        <Route path="/whatsapp-shopify" element={<SEOIntegrations.WhatsAppShopify />} />
        <Route path="/whatsapp-api-documentation" element={<SEOIntegrations.WhatsAppAPIDocumentation />} />
        
        {/* SEO Landing Pages - Batch 3: Industries */}
        <Route path="/whatsapp-api-for-healthcare" element={<SEOIndustries.WhatsAppAPIForHealthcare />} />
        <Route path="/whatsapp-api-for-education" element={<SEOIndustries.WhatsAppAPIForEducation />} />
        <Route path="/whatsapp-api-for-banking" element={<SEOIndustries.WhatsAppAPIForBanking />} />
        <Route path="/whatsapp-api-for-logistics" element={<SEOIndustries.WhatsAppAPIForLogistics />} />
        <Route path="/case-studies" element={<SEOIndustries.CaseStudies />} />
        
        {/* SEO Landing Pages - Batch 3: Locations */}
        <Route path="/whatsapp-api-service-delhi" element={<SEOLocations.WhatsAppAPIServiceDelhi />} />
        <Route path="/whatsapp-api-mumbai" element={<SEOLocations.WhatsAppAPIMumbai />} />
        <Route path="/whatsapp-api-bangalore" element={<SEOLocations.WhatsAppAPIBangalore />} />
        <Route path="/whatsapp-api-hyderabad" element={<SEOLocations.WhatsAppAPIHyderabad />} />
        <Route path="/whatsapp-api-chennai" element={<SEOLocations.WhatsAppAPIChennai />} />
        
        {/* SEO Landing Pages - Batch 4: Compliance & Support */}
        <Route path="/whatsapp-api-compliance" element={<SEOCompliance.WhatsAppAPICompliance />} />
        <Route path="/whatsapp-data-security" element={<SEOCompliance.WhatsAppDataSecurity />} />
        <Route path="/whatsapp-template-approval" element={<SEOCompliance.WhatsAppTemplateApproval />} />
        <Route path="/gdpr-whatsapp-compliance" element={<SEOCompliance.GDPRWhatsAppCompliance />} />
        <Route path="/help-center" element={<SEOCompliance.HelpCenter />} />
        <Route path="/webhook-setup" element={<SEOCompliance.WebhookSetup />} />
        
        {/* SEO Blog Pages - Batch 5 */}
        <Route path="/blog" element={<SEOBlog.BlogHome />} />
        <Route path="/blog/whatsapp-business-api-guide" element={<SEOBlog.WhatsAppAPIGuide />} />
        <Route path="/blog/whatsapp-pricing-comparison" element={<SEOBlog.WhatsAppPricingComparison />} />
        <Route path="/blog/whatsapp-vs-sms" element={<SEOBlog.WhatsAppVsSMS />} />
        
              {/* Default Route */}
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
