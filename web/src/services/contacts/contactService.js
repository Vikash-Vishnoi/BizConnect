/**
 * 👥 Contacts Service
 * Handles all contact-related API calls
 */

import { get, post, put, del } from '../api';

/**
 * Get contacts list
 */
export const getContacts = async (params) => {
  return await get('/contacts', params);
};

/**
 * Get contact by ID
 */
export const getContactById = async (id) => {
  return await get(`/contacts/${id}`);
};

/**
 * Create new contact
 */
export const createContact = async (data) => {
  return await post('/contacts', data);
};

/**
 * Update contact
 */
export const updateContact = async (id, data) => {
  return await put(`/contacts/${id}`, data);
};

/**
 * Delete contact
 */
export const deleteContact = async (id) => {
  return await del(`/contacts/${id}`);
};

/**
 * Bulk import contacts
 */
export const bulkImportContacts = async (contacts) => {
  return await post('/contacts/bulk-import', { contacts });
};

/**
 * Bulk delete contacts
 */
export const bulkDeleteContacts = async (contactIds) => {
  return await post('/contacts/bulk-delete', { contactIds });
};

/**
 * Get contact history
 */
export const getContactHistory = async (params) => {
  return await get('/contacts/history', params);
};

/**
 * Get contact history by phone number
 */
export const getContactHistoryByPhone = async (phoneNumber) => {
  return await get(`/contacts/history/${phoneNumber}`);
};

/**
 * Get recent contact changes
 */
export const getRecentChanges = async (params) => {
  return await get('/contacts/recent-changes', params);
};

/**
 * Get contact change summary
 */
export const getChangeSummary = async () => {
  return await get('/contacts/change-summary');
};

/**
 * Get unprocessed contacts
 */
export const getUnprocessedContacts = async (params) => {
  return await get('/contacts/unprocessed', params);
};

/**
 * Mark contacts as processed
 */
export const markAsProcessed = async (contactIds) => {
  return await post('/contacts/mark-processed', { contactIds });
};

/**
 * Get contact statistics
 */
export const getContactStats = async () => {
  return await get('/contacts/stats');
};

/**
 * Deduplicate contacts
 */
export const deduplicateContacts = async (params) => {
  return await post('/contacts/deduplicate', params);
};

/**
 * Get duplicate contacts
 */
export const getDuplicates = async (params) => {
  return await get('/contacts/duplicates', params);
};

/**
 * Merge duplicate contact
 */
export const mergeContact = async (id, data) => {
  return await post(`/contacts/${id}/merge`, data);
};

/**
 * Unmark contact as duplicate
 */
export const unmarkDuplicate = async (id) => {
  return await post(`/contacts/${id}/unmark-duplicate`);
};

/**
 * Get contact rate limit status
 */
export const getContactRateLimit = async (phoneNumber) => {
  return await get(`/contacts/${phoneNumber}/rate-limit`);
};

/**
 * Get contact message queue
 */
export const getContactQueue = async (phoneNumber) => {
  return await get(`/contacts/${phoneNumber}/message-queue`);
};

/**
 * Check contact rate limit
 */
export const checkRateLimit = async (phoneNumber) => {
  return await post(`/contacts/${phoneNumber}/rate-limit/check`);
};

/**
 * Increment contact rate limit
 */
export const incrementRateLimit = async (phoneNumber) => {
  return await post(`/contacts/${phoneNumber}/rate-limit/increment`);
};

/**
 * Get throttled contacts
 */
export const getThrottledContacts = async (params) => {
  return await get('/contacts/rate-limit/throttled', params);
};

