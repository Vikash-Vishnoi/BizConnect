/**
 * 🚀 Main Application Component
 * 
 * Root component that sets up routing, context providers, and lazy loading.
 * Manages authentication, notifications, and defines all application routes.
 * 
 * @module App
 * 
 * @description
 * This is the main entry point component for the WhatsApp Marketing Platform.
 * It configures React Router with lazy loading for optimal performance,
 * wraps the app with AuthProvider and ToastProvider context, and defines
 * all application routes with role-based access control.
 * 
 * @features
 * - Lazy loading for all non-critical pages (improved initial load time)
 * - Eager loading for auth and public pages (faster access)
 * - Route-based code splitting with React.lazy and Suspense
 * - Protected routes with role-based access control
 * - Context providers (AuthProvider, ToastProvider)
 * - Loading skeleton fallback during lazy loading
 * - 404 catch-all route
 * - SEO pages for marketing and public content
 * 
 * @routing
 * Route organization:
 * - Public routes: /login, /register, /terms, /privacy, /contact
 * - Auth-required routes: Dashboard, Inbox, Templates, Analytics, Campaigns
 * - Admin routes: Team, Roles, Audit Log, Alerts, Phone Health, Quality Rating
 * - Manager routes: Templates, Campaigns, Analytics, Flows
 * - User routes: Inbox, Contacts, Saved Replies, Profile
 * - SEO routes: Features, Pricing, Integrations, Industries, Locations
 * 
 * @contexts
 * - AuthProvider: User authentication and authorization state
 * - ToastProvider: Global notification system
 * 
 * @performance
 * - Lazy loading reduces initial bundle size
 * - Route-based code splitting
 * - Suspense boundaries with loading fallbacks
 * - React Router v6 with future flags enabled
 * 
 * @example
 * // Usage in index.js
 * import App from './App';
 * const root = ReactDOM.createRoot(document.getElementById('root'));
 * root.render(<App />);
 */

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

// Lazy-loaded Core Pages
const Dashboard = lazy(() => import('./pages/core/Dashboard'));
const BusinessSetupPart1 = lazy(() => import('./pages/business/BusinessSetupPart1'));
const BusinessSetupPart2 = lazy(() => import('./pages/business/BusinessSetupPart2'));
const BusinessSetupPart3 = lazy(() => import('./pages/business/BusinessSetupPart3'));
const Profile = lazy(() => import('./pages/core/Profile'));
const WhatsAppCredentials = lazy(() => import('./pages/core/WhatsAppCredentials'));
const StatusComposer = lazy(() => import('./pages/messaging/StatusComposer'));
const NotFound = lazy(() => import('./pages/core/NotFound'));

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
const Scheduled = lazy(() => import('./pages/automation/Scheduled'));
const ScheduleMessage = lazy(() => import('./pages/automation/ScheduleMessage'));
const WelcomeMessageSettings = lazy(() => import('./pages/automation/WelcomeMessageSettings'));

// Lazy-loaded Admin/Settings Pages
const TeamMembers = lazy(() => import('./pages/admin/TeamMembers'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog'));
const ErrorsAndAlerts = lazy(() => import('./pages/admin/ErrorsAndAlerts'));
const PhoneHealth = lazy(() => import('./pages/admin/PhoneHealth'));
const RateLimitDashboard = lazy(() => import('./pages/admin/RateLimitDashboard'));

// SEO Pages - Keep eager loading for named exports (batched files)
// These are grouped efficiently and don't need individual lazy loading
import * as SEO from './pages/public/seo/SEOPages';
import * as SEOBatch2 from './pages/public/seo/SEOPagesBatch2';
import * as SEOIntegrations from './pages/public/seo/SEOIntegrations';
import * as SEOIndustries from './pages/public/seo/SEOIndustries';
import * as SEOLocations from './pages/public/seo/SEOLocations';
import * as SEOCompliance from './pages/public/seo/SEOCompliance';
import * as SEOBlog from './pages/public/seo/SEOBlog';
import { ContactUpdated } from './pages/public/seo/ContactUpdated';

// Loading fallback component
const PageLoader = () => (
  <div style={{ padding: '2rem' }}>
    <LoadingSkeleton type="dashboard" />
  </div>
);

function App() {
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
          path="/scheduled" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER]}>
              <Scheduled />
            </ProtectedRoute>
          } 
        />        <Route 
          path="/scheduled/message" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER]}>
              <ScheduleMessage />
            </ProtectedRoute>
          } 
        />        <Route 
          path="/profile" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER]}>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings/credentials" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN]}>
              <WhatsAppCredentials />
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
          path="/campaigns/:id/edit" 
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
          path="/audit-log" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN]}>
              <AuditLog />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/errors-alerts" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <ErrorsAndAlerts />
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
          path="/phone-health/:historyId" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN]}>
              <PhoneHealth />
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
          path="/welcome-message-settings" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]}>
              <WelcomeMessageSettings />
            </ProtectedRoute>
          } 
        />
        
        {/* SEO Landing Pages - Batch 1 */}
        
        {/* Help & Support - Protected Route */}
        <Route 
          path="/help" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER]}>
              <ContactUpdated />
            </ProtectedRoute>
          } 
        />
        
        {/* SEO Landing Pages - Batch 1 */}
        <Route path="/features" element={<SEO.Features />} />
        <Route path="/pricing" element={<SEO.Pricing />} />
        <Route path="/contact" element={<ContactUpdated />} />
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
        <Route path="/help-center" element={<SEOCompliance.HelpCenter />} />
        <Route path="/webhook-setup" element={<SEOCompliance.WebhookSetup />} />
        
        {/* SEO Blog Pages - Batch 5 */}
        <Route path="/blog" element={<SEOBlog.BlogHome />} />
        <Route path="/blog/whatsapp-business-api-guide" element={<SEOBlog.WhatsAppAPIGuide />} />
        <Route path="/blog/whatsapp-pricing-comparison" element={<SEOBlog.WhatsAppPricingComparison />} />
        <Route path="/blog/whatsapp-vs-sms" element={<SEOBlog.WhatsAppVsSMS />} />
        
              {/* Default Route */}
              <Route path="/" element={<Navigate to="/dashboard" />} />
              
              {/* 404 Catch-All Route (must be last) */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
