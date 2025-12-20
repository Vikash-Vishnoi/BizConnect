const Template = require('../../../core/database/models/Template');
const Business = require('../../../core/database/models/Business');
const logger = require('../../../common/helpers/logger');
const config = require('../../../config/server.config');
const axios = require('axios');
const { ERROR_CODES, PAGINATION } = require('../../../common/constants');

/**
 * Template Namespace Service
 * Manages template namespaces for organizing and categorizing templates
 */

/**
 * Namespace Constants
 */
const NAMESPACE_REGEX = /^[a-zA-Z0-9_-]+$/;
const GRAPH_API_TIMEOUT = 30000; // 30 seconds

class TemplateNamespaceService {
  /**
   * Get all templates for a specific namespace
   * @param {String} businessId - Business ID
   * @param {String} namespace - Template namespace
   * @param {Object} options - Query options (pagination, filtering)
   * @returns {Promise<Object>} Templates and metadata
   */
  async getTemplatesByNamespace(businessId, namespace, options = {}) {
    try {
      // Validate inputs
      if (!businessId) {
        const error = new Error('Business ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      if (!namespace) {
        const error = new Error('Namespace is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const { 
        page = PAGINATION.DEFAULT_PAGE, 
        limit = PAGINATION.DEFAULT_LIMIT, 
        status = null 
      } = options;

      // Validate pagination limits
      const validLimit = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);

      const query = {
        businessId,
        namespace
      };

      if (status) {
        query.status = status;
      }

      const templates = await Template.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * validLimit)
        .limit(validLimit)
        .select('name category language status namespace qualityScore createdAt');

      const total = await Template.countDocuments(query);

      logger.info('Templates retrieved by namespace', {
        businessId,
        namespace,
        count: templates.length,
        total,
        service: 'template-namespace'
      });

      return {
        templates,
        pagination: {
          page: parseInt(page),
          limit: validLimit,
          total,
          pages: Math.ceil(total / validLimit)
        },
        namespace
      };
    } catch (error) {
      logger.error('Error getting templates by namespace', {
        businessId,
        namespace,
        error: error.message,
        code: error.code
      });
      
      if (!error.code) {
        error.code = ERROR_CODES.DATABASE_ERROR;
      }
      throw error;
    }
  }

  /**
   * Get all namespaces for a business
   * @param {String} businessId - Business ID
   * @returns {Promise<Array>} List of namespaces with template counts
   */
  async getBusinessNamespaces(businessId) {
    try {
      // Validate input
      if (!businessId) {
        const error = new Error('Business ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const namespaces = await Template.aggregate([
        {
          $match: { businessId: businessId }
        },
        {
          $group: {
            _id: '$namespace',
            templateCount: { $sum: 1 },
            approvedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            categories: { $addToSet: '$category' }
          }
        },
        {
          $project: {
            _id: 0,
            namespace: '$_id',
            templateCount: 1,
            approvedCount: 1,
            pendingCount: 1,
            categories: 1
          }
        },
        {
          $sort: { templateCount: -1 }
        }
      ]);

      logger.info('Business namespaces retrieved', {
        businessId,
        namespaceCount: namespaces.length,
        service: 'template-namespace'
      });

      return namespaces;
    } catch (error) {
      logger.error('Error getting business namespaces', {
        businessId,
        error: error.message,
        code: error.code
      });
      
      if (!error.code) {
        error.code = ERROR_CODES.DATABASE_ERROR;
      }
      throw error;
    }
  }

  /**
   * Set or update template namespace
   * @param {String} templateId - Template ID
   * @param {String} namespace - Namespace to set
   * @param {String} userId - User ID making the change
   * @param {String} businessId - Business ID for context
   * @returns {Promise<Object>} Updated template
   */
  async setTemplateNamespace(templateId, namespace, userId, businessId = null) {
    try {
      // Validate inputs
      if (!templateId) {
        const error = new Error('Template ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const query = { _id: templateId };
      if (businessId) {
        query.businessId = businessId;
      }

      const template = await Template.findOne(query);

      if (!template) {
        const error = new Error('Template not found or access denied');
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      // Validate namespace format (alphanumeric, underscore, hyphen only)
      if (namespace && !NAMESPACE_REGEX.test(namespace)) {
        const error = new Error('Invalid namespace format. Only alphanumeric characters, underscores, and hyphens allowed.');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const oldNamespace = template.namespace;
      template.namespace = namespace || null;
      await template.save();

      logger.info('Template namespace updated', {
        templateId,
        businessId: template.businessId,
        oldNamespace,
        newNamespace: namespace,
        userId,
        service: 'template-namespace'
      });

      return {
        templateId: template._id,
        name: template.name,
        businessId: template.businessId,
        oldNamespace,
        newNamespace: namespace,
        updatedAt: template.updatedAt
      };
    } catch (error) {
      logger.error('Error setting template namespace', {
        templateId,
        namespace,
        userId,
        businessId,
        error: error.message,
        code: error.code
      });
      throw error;
    }
  }

  /**
   * Bulk update namespaces for multiple templates
   * @param {Array<String>} templateIds - Array of template IDs
   * @param {String} namespace - Namespace to apply
   * @param {String} userId - User ID making the change
   * @param {String} businessId - Business ID for context
   * @returns {Promise<Object>} Bulk update result
   */
  async bulkSetNamespace(templateIds, namespace, userId, businessId = null) {
    try {
      // Validate inputs
      if (!templateIds || !Array.isArray(templateIds) || templateIds.length === 0) {
        const error = new Error('Template IDs array is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      // Validate namespace format
      if (namespace && !NAMESPACE_REGEX.test(namespace)) {
        const error = new Error('Invalid namespace format');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const query = { _id: { $in: templateIds } };
      if (businessId) {
        query.businessId = businessId;
      }

      const result = await Template.updateMany(
        query,
        { 
          $set: { 
            namespace: namespace || null,
            updatedAt: new Date()
          } 
        }
      );

      logger.info('Bulk namespace update completed', {
        templateCount: templateIds.length,
        namespace,
        userId,
        businessId,
        modifiedCount: result.modifiedCount,
        service: 'template-namespace'
      });

      return {
        templateCount: templateIds.length,
        modifiedCount: result.modifiedCount,
        namespace,
        businessId
      };
    } catch (error) {
      logger.error('Error bulk setting namespace', {
        templateCount: templateIds?.length,
        namespace,
        userId,
        businessId,
        error: error.message,
        code: error.code
      });
      throw error;
    }
  }

  /**
   * Sync namespace from WhatsApp Business Account
   * Enterprise feature: Some WABA configs have namespaces
   * @param {String} businessId - Business ID
   * @returns {Promise<Object>} Sync result
   */
  async syncNamespacesFromWhatsApp(businessId) {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!businessId) {
        const error = new Error('Business ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      // Get business through the template query to avoid redundant lookup
      const sampleTemplate = await Template.findOne({ businessId }).populate('businessId');

      if (!sampleTemplate || !sampleTemplate.businessId) {
        const error = new Error('Business not found');
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      const business = sampleTemplate.businessId;
      const { whatsappConfig } = business;
      
      if (!whatsappConfig?.accessToken || !whatsappConfig?.wabaId) {
        const error = new Error('WhatsApp configuration not found');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const apiVersion = config.whatsapp?.apiVersion || 'v17.0';

      // Fetch templates from WhatsApp Graph API
      const response = await axios.get(
        `https://graph.facebook.com/${apiVersion}/${whatsappConfig.wabaId}/message_templates`,
        {
          headers: {
            Authorization: `Bearer ${whatsappConfig.accessToken}`
          },
          params: {
            fields: 'id,name,namespace,status,category,language'
          },
          timeout: GRAPH_API_TIMEOUT
        }
      );

      const whatsappTemplates = response.data.data;
      let syncedCount = 0;
      let errorCount = 0;

      // Update local templates with WhatsApp namespaces
      for (const waTemplate of whatsappTemplates) {
        try {
          const localTemplate = await Template.findOne({
            businessId,
            whatsappTemplateId: waTemplate.id
          });

          if (localTemplate && waTemplate.namespace) {
            localTemplate.namespace = waTemplate.namespace;
            await localTemplate.save();
            syncedCount++;
          }
        } catch (err) {
          logger.error('Error syncing template namespace', {
            businessId,
            templateId: waTemplate.id,
            error: err.message
          });
          errorCount++;
        }
      }

      const processingTime = Date.now() - startTime;
      logger.info('Namespace sync completed', {
        businessId,
        syncedCount,
        errorCount,
        totalTemplates: whatsappTemplates.length,
        processingTime,
        service: 'template-namespace'
      });

      return {
        syncedCount,
        errorCount,
        totalTemplates: whatsappTemplates.length,
        processingTime,
        message: `Synced ${syncedCount} template namespaces from WhatsApp`
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error syncing namespaces from WhatsApp', {
        businessId,
        error: error.message,
        code: error.code,
        processingTime
      });
      
      if (!error.code) {
        error.code = error.response?.data?.error?.code || ERROR_CODES.EXTERNAL_SERVICE_ERROR;
      }
      throw error;
    }
  }

  /**
   * Get namespace statistics
   * @param {String} businessId - Business ID
   * @returns {Promise<Object>} Namespace statistics
   */
  async getNamespaceStats(businessId) {
    try {
      // Validate input
      if (!businessId) {
        const error = new Error('Business ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const stats = await Template.aggregate([
        {
          $match: { businessId: businessId }
        },
        {
          $group: {
            _id: null,
            totalTemplates: { $sum: 1 },
            templatesWithNamespace: {
              $sum: {
                $cond: [
                  { $ne: ['$namespace', null] },
                  1,
                  0
                ]
              }
            },
            templatesWithoutNamespace: {
              $sum: {
                $cond: [
                  { $eq: ['$namespace', null] },
                  1,
                  0
                ]
              }
            },
            uniqueNamespaces: { $addToSet: '$namespace' }
          }
        },
        {
          $project: {
            _id: 0,
            totalTemplates: 1,
            templatesWithNamespace: 1,
            templatesWithoutNamespace: 1,
            uniqueNamespaceCount: { $size: '$uniqueNamespaces' }
          }
        }
      ]);

      const result = stats[0] || {
        totalTemplates: 0,
        templatesWithNamespace: 0,
        templatesWithoutNamespace: 0,
        uniqueNamespaceCount: 0
      };

      logger.info('Namespace stats retrieved', {
        businessId,
        ...result,
        service: 'template-namespace'
      });

      return result;
    } catch (error) {
      logger.error('Error getting namespace stats', {
        businessId,
        error: error.message,
        code: error.code
      });
      
      if (!error.code) {
        error.code = ERROR_CODES.DATABASE_ERROR;
      }
      throw error;
    }
  }
}

module.exports = new TemplateNamespaceService();
