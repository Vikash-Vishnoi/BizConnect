/**
 * 📋 Templates Service
 * Handles all template-related API calls
 */

import { get, post, put } from '../api';

/**
 * Get templates list
 */
export const getTemplates = async (params) => {
  return await get('/templates', params);
};

/**
 * Get template statistics
 */
export const getTemplateStats = async () => {
  return await get('/templates/stats');
};

/**
 * Get template by ID
 */
export const getTemplateById = async (id) => {
  return await get(`/templates/${id}`);
};

/**
 * Create new template
 */
export const createTemplate = async (data) => {
  return await post('/templates', data);
};

/**
 * Save template as draft
 */
export const saveDraft = async (data) => {
  return await post('/templates/draft', data);
};

/**
 * Update template
 */
export const updateTemplate = async (id, data) => {
  return await put(`/templates/${id}`, data);
};

/**
 * Submit template for approval
 */
export const submitTemplate = async (id) => {
  return await post(`/templates/${id}/submit`);
};

/**
 * Get template status from WhatsApp
 */
export const getTemplateStatus = async (id) => {
  return await get(`/templates/${id}/status`);
};

/**
 * Validate template compliance
 */
export const validateTemplate = async (data) => {
  return await post('/templates/validate', data);
};

/**
 * Get compliance rules
 */
export const getComplianceRules = async () => {
  return await get('/templates/compliance-rules');
};

/**
 * Get template rejections
 */
export const getTemplateRejections = async (id) => {
  return await get(`/templates/${id}/rejections`);
};

/**
 * Analyze template
 */
export const analyzeTemplate = async (id) => {
  return await post(`/templates/${id}/analyze`);
};

/**
 * Get rejection patterns
 */
export const getRejectionPatterns = async () => {
  return await get('/templates/rejection-patterns');
};

/**
 * Get template analytics overview
 */
export const getTemplateAnalytics = async (params) => {
  return await get('/templates/analytics', params);
};

/**
 * Get top performing templates
 */
export const getTopTemplates = async (params) => {
  return await get('/templates/analytics/top', params);
};

/**
 * Get specific template analytics
 */
export const getTemplateAnalyticsById = async (templateId) => {
  return await get(`/templates/analytics/${templateId}`);
};

/**
 * Export template analytics
 */
export const exportTemplateAnalytics = async (data) => {
  return await post('/templates/analytics/export', data);
};

/**
 * Track template usage
 */
export const trackTemplateUsage = async (templateId, data) => {
  return await post(`/templates/analytics/${templateId}/track`, data);
};

/**
 * Reset template analytics
 */
export const resetTemplateAnalytics = async (templateId) => {
  return await post(`/templates/analytics/${templateId}/reset`);
};

// ============================================
// P3 FEATURE: Template Namespace Support
// ============================================

/**
 * Get all namespaces for a business
 */
export const getNamespaces = async (businessId) => {
  return await get(`/templates/namespaces/business/${businessId}`);
};

/**
 * Get templates by namespace
 */
export const getTemplatesByNamespace = async (namespace, businessId, params = {}) => {
  return await get(`/templates/namespaces/${namespace}/business/${businessId}`, params);
};

/**
 * Set template namespace
 */
export const setNamespace = async (templateId, namespace) => {
  return await put(`/templates/${templateId}/namespace`, { namespace });
};

/**
 * Remove template namespace
 */
export const removeNamespace = async (templateId) => {
  return await del(`/templates/${templateId}/namespace`);
};

/**
 * Bulk update template namespaces
 */
export const bulkUpdateNamespaces = async (templateIds, namespace) => {
  return await post('/templates/namespaces/bulk-update', { templateIds, namespace });
};

/**
 * Sync namespaces from WhatsApp
 */
export const syncNamespaces = async (businessId) => {
  return await post(`/templates/namespaces/sync/${businessId}`);
};

/**
 * Get namespace statistics
 */
export const getNamespaceStats = async (businessId) => {
  return await get(`/templates/namespaces/stats/${businessId}`);
};

