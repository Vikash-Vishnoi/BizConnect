const Template = require('../../../core/database/models/Template');
const Business = require('../../../core/database/models/Business');
const logger = require('../../../common/helpers/logger');
const axios = require('axios');

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
      const { page = 1, limit = 20, status = null } = options;

      const query = {
        businessId,
        namespace
      };

      if (status) {
        query.status = status;
      }

      const templates = await Template.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('name category language status namespace qualityScore createdAt');

      const total = await Template.countDocuments(query);

      return {
        templates,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        namespace
      };
    } catch (error) {
      logger.error('Error getting templates by namespace:', error);
      throw new Error('Failed to retrieve templates by namespace');
    }
  }

  /**
   * Get all namespaces for a business
   * @param {String} businessId - Business ID
   * @returns {Promise<Array>} List of namespaces with template counts
   */
  async getBusinessNamespaces(businessId) {
    try {
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

      return namespaces;
    } catch (error) {
      logger.error('Error getting business namespaces:', error);
      throw new Error('Failed to retrieve business namespaces');
    }
  }

  /**
   * Set or update template namespace
   * @param {String} templateId - Template ID
   * @param {String} namespace - Namespace to set
   * @param {String} userId - User ID making the change
   * @returns {Promise<Object>} Updated template
   */
  async setTemplateNamespace(templateId, namespace, userId) {
    try {
      const template = await Template.findById(templateId);

      if (!template) {
        throw new Error('Template not found');
      }

      // Validate namespace format (alphanumeric, underscore, hyphen only)
      const namespaceRegex = /^[a-zA-Z0-9_-]+$/;
      if (namespace && !namespaceRegex.test(namespace)) {
        throw new Error('Invalid namespace format. Only alphanumeric characters, underscores, and hyphens allowed.');
      }

      const oldNamespace = template.namespace;
      template.namespace = namespace || null;
      await template.save();

      logger.info('Template namespace updated', {
        templateId,
        oldNamespace,
        newNamespace: namespace,
        userId
      });

      return {
        templateId: template._id,
        name: template.name,
        oldNamespace,
        newNamespace: namespace,
        updatedAt: template.updatedAt
      };
    } catch (error) {
      logger.error('Error setting template namespace:', error);
      throw error;
    }
  }

  /**
   * Bulk update namespaces for multiple templates
   * @param {Array<String>} templateIds - Array of template IDs
   * @param {String} namespace - Namespace to apply
   * @param {String} userId - User ID making the change
   * @returns {Promise<Object>} Bulk update result
   */
  async bulkSetNamespace(templateIds, namespace, userId) {
    try {
      // Validate namespace format
      const namespaceRegex = /^[a-zA-Z0-9_-]+$/;
      if (namespace && !namespaceRegex.test(namespace)) {
        throw new Error('Invalid namespace format');
      }

      const result = await Template.updateMany(
        { _id: { $in: templateIds } },
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
        modifiedCount: result.modifiedCount
      });

      return {
        templateCount: templateIds.length,
        modifiedCount: result.modifiedCount,
        namespace
      };
    } catch (error) {
      logger.error('Error bulk setting namespace:', error);
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
    try {
      const business = await Business.findById(businessId);

      if (!business) {
        throw new Error('Business not found');
      }

      const { whatsappConfig } = business;
      if (!whatsappConfig?.accessToken || !whatsappConfig?.wabaId) {
        throw new Error('WhatsApp configuration not found');
      }

      // Fetch templates from WhatsApp Graph API
      const response = await axios.get(
        `https://graph.facebook.com/v17.0/${whatsappConfig.wabaId}/message_templates`,
        {
          headers: {
            Authorization: `Bearer ${whatsappConfig.accessToken}`
          },
          params: {
            fields: 'id,name,namespace,status,category,language'
          }
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
          logger.error('Error syncing template namespace:', err);
          errorCount++;
        }
      }

      logger.info('Namespace sync completed', {
        businessId,
        syncedCount,
        errorCount,
        totalTemplates: whatsappTemplates.length
      });

      return {
        syncedCount,
        errorCount,
        totalTemplates: whatsappTemplates.length,
        message: `Synced ${syncedCount} template namespaces from WhatsApp`
      };
    } catch (error) {
      logger.error('Error syncing namespaces from WhatsApp:', error);
      throw new Error('Failed to sync namespaces from WhatsApp');
    }
  }

  /**
   * Get namespace statistics
   * @param {String} businessId - Business ID
   * @returns {Promise<Object>} Namespace statistics
   */
  async getNamespaceStats(businessId) {
    try {
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

      return stats[0] || {
        totalTemplates: 0,
        templatesWithNamespace: 0,
        templatesWithoutNamespace: 0,
        uniqueNamespaceCount: 0
      };
    } catch (error) {
      logger.error('Error getting namespace stats:', error);
      throw new Error('Failed to retrieve namespace statistics');
    }
  }
}

module.exports = new TemplateNamespaceService();
