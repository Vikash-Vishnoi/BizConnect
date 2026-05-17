/**
 * 📋 Templates Service
 * Handles all WhatsApp message template-related API calls
 * Templates must be approved by WhatsApp before use in conversations
 * 
 * @module services/templates/templateService
 */

import { get, post, put, del } from '../api';

/**
 * Get templates list with optional filtering
 * @param {Object} [params] - Query parameters (status, category, search, page, limit)
 * @param {string} [params.status] - Filter by status (APPROVED, PENDING, REJECTED)
 * @param {string} [params.category] - Filter by category (MARKETING, UTILITY, AUTHENTICATION)
 * @param {string} [params.search] - Search by name or content
 * @param {number} [params.page] - Page number for pagination
 * @param {number} [params.limit] - Items per page
 * @returns {Promise<Object>} Paginated templates list
 */
export const getTemplates = async (params) => {
  return await get('/templates', params);
};

/**
 * Get template statistics overview
 * @returns {Promise<Object>} Template stats (total, approved, pending, rejected)
 */
export const getTemplateStats = async () => {
  return await get('/templates/stats');
};

/**
 * Get template by ID
 * @param {string} id - Template ID
 * @returns {Promise<Object>} Template details with full content and metadata
 */
export const getTemplateById = async (id) => {
  return await get(`/templates/${id}`);
};

/**
 * Create new template and submit to WhatsApp for approval
 * @param {Object} data - Template data
 * @param {string} data.name - Template name (lowercase, underscores only)
 * @param {string} data.category - Template category (MARKETING, UTILITY, AUTHENTICATION)
 * @param {string} data.language - Language code (e.g., 'en_US')
 * @param {Array} data.components - Template components (header, body, footer, buttons)
 * @returns {Promise<Object>} Created template
 */
export const createTemplate = async (data) => {
  return await post('/templates', data);
};

/**
 * Save template as draft without submitting for approval
 * @param {Object} data - Template draft data
 * @returns {Promise<Object>} Saved draft template
 */
export const saveDraft = async (data) => {
  return await post('/templates/draft', data);
};

/**
 * Update existing template
 * Note: Cannot update approved templates, must create new version
 * @param {string} id - Template ID
 * @param {Object} data - Updated template data
 * @returns {Promise<Object>} Updated template
 */
export const updateTemplate = async (id, data) => {
  return await put(`/templates/${id}`, data);
};

/**
 * Submit draft template for WhatsApp approval
 * @param {string} id - Template ID
 * @returns {Promise<Object>} Submission confirmation
 */
export const submitTemplate = async (id) => {
  return await post(`/templates/${id}/submit`);
};

/**
 * Get current template approval status from WhatsApp
 * @param {string} id - Template ID
 * @returns {Promise<Object>} Status info (APPROVED, PENDING, REJECTED with reason)
 */
export const getTemplateStatus = async (id) => {
  return await get(`/templates/${id}/status`);
};

/**
 * Delete template (soft delete, can only delete drafts)
 * @param {string} id - Template ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteTemplate = async (id) => {
  return await del(`/templates/${id}`);
};

/**
 * Get template analytics and performance metrics
 * @param {Object} [params] - Query parameters
 * @param {string} [params.startDate] - Start date for analytics
 * @param {string} [params.endDate] - End date for analytics
 * @param {string} [params.templateId] - Specific template ID
 * @returns {Promise<Object>} Template analytics (sent, delivered, read, clicked)
 */
export const getTemplateAnalytics = async (params) => {
  return await get('/templates/analytics', params);
};

/**
 * Get individual template performance metrics
 * @param {string} id - Template ID
 * @param {Object} [params] - Date range parameters
 * @returns {Promise<Object>} Detailed template performance data
 */
export const getTemplatePerformance = async (id, params) => {
  return await get(`/templates/${id}/performance`, params);
};

/**
 * Duplicate existing template to create a new one
 * @param {string} id - Template ID to duplicate
 * @param {Object} [modifications] - Optional modifications to apply
 * @returns {Promise<Object>} Newly created template copy
 */
export const duplicateTemplate = async (id, modifications = {}) => {
  return await post(`/templates/${id}/duplicate`, modifications);
};

// Default export with all template service methods
export default {
  getTemplates,
  getTemplateStats,
  getTemplateById,
  createTemplate,
  saveDraft,
  updateTemplate,
  submitTemplate,
  getTemplateStatus,
  deleteTemplate,
  getTemplateAnalytics,
  getTemplatePerformance,
  duplicateTemplate,
};
