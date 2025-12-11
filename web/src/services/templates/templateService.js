/**
 * 📋 Templates Service
 * Handles all template-related API calls
 */

import { get, post, put, del } from '../api';

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
 * Delete template
 */
export const deleteTemplate = async (id) => {
  return await del(`/templates/${id}`);
};

/**
 * Get template analytics
 */
export const getTemplateAnalytics = async (params) => {
  return await get('/templates/analytics', params);
};
