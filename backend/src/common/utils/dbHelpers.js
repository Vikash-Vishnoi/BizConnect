const mongoose = require('mongoose');
const { 
  DatabaseError, 
  ValidationError, 
  NotFoundError 
} = require('../../core/middlewares/errorHandler');
const logger = require('../helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../constants');

/**
 * Database Helper Utilities
 * Provides safe database operations with consistent error handling
 */

// ============================================
// CONSTANTS
// ============================================

// Error Messages
const ERROR_MESSAGES = {
  INVALID_ID_FORMAT: 'Invalid {resource} ID format',
  RESOURCE_NOT_FOUND: '{resource} not found',
  RETRIEVE_FAILED: 'Failed to retrieve {resource}',
  FIND_FAILED: 'Failed to find {resource}',
  UPDATE_FAILED: 'Failed to update {resource}',
  DELETE_FAILED: 'Failed to delete {resource}',
  CREATE_FAILED: 'Failed to create {resource}',
  INVALID_DATA: 'Invalid {resource} data',
  DUPLICATE_KEY: '{resource} with this {field} already exists',
  BULK_WRITE_FAILED: 'Failed to execute bulk write for {resource}',
  EXISTS_CHECK_FAILED: 'Failed to check existence in {resource}',
  PAGINATED_QUERY_FAILED: 'Failed to execute paginated query for {resource}',
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MIN_PAGE: 1,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
};

// Query Options
const QUERY_OPTIONS = {
  DEFAULT_NEW: true,
  DEFAULT_RUN_VALIDATORS: true,
  DEFAULT_THROW_IF_NOT_FOUND: true,
  DEFAULT_ORDERED: true,
  COUNT_LIMIT: 1,
};

// Log Messages
const LOG_MESSAGES = {
  FIND_BY_ID_ERROR: 'Database findById error',
  FIND_ONE_ERROR: 'Database findOne error',
  UPDATE_ERROR: 'Database update error',
  DELETE_ERROR: 'Database delete error',
  CREATE_ERROR: 'Database create error',
  BULK_WRITE_ERROR: 'Database bulk write error',
  EXISTS_CHECK_ERROR: 'Database exists check error',
  PAGINATED_QUERY_ERROR: 'Database paginated query error',
  UPDATED: '{model} updated',
  DELETED: '{model} deleted',
  CREATED: '{model} created',
  BULK_WRITE_COMPLETED: '{model} bulk write completed',
};

// MongoDB Error Codes
const MONGO_ERROR_CODES = {
  DUPLICATE_KEY: 11000,
};

// Helper Functions
const formatMessage = (template, params) => {
  let message = template;
  Object.keys(params).forEach(key => {
    message = message.replace(`{${key}}`, params[key]);
  });
  return message;
};

/**
 * Safely find a document by ID
 * @param {Model} Model - Mongoose model
 * @param {string} id - Document ID
 * @param {Object} options - Query options
 * @param {string|Object} options.select - Fields to select
 * @param {string|Object} options.populate - Paths to populate
 * @param {string} options.resourceName - Name of resource for error messages (default: model name)
 * @returns {Promise<Document>} Found document
 * @throws {ValidationError} If ID is invalid
 * @throws {NotFoundError} If document not found
 * @throws {DatabaseError} If database operation fails
 */
async function findByIdSafe(Model, id, options = {}) {
  const startTime = Date.now();
  const resourceName = options.resourceName || Model.modelName;
  
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError(
        formatMessage(ERROR_MESSAGES.INVALID_ID_FORMAT, { resource: resourceName })
      );
    }

    // Build query
    let query = Model.findById(id);
    
    if (options.select) {
      query = query.select(options.select);
    }
    
    if (options.populate) {
      query = query.populate(options.populate);
    }

    const doc = await query.exec();

    if (!doc) {
      throw new NotFoundError(
        formatMessage(ERROR_MESSAGES.RESOURCE_NOT_FOUND, { resource: resourceName }),
        { id }
      );
    }

    const duration = Date.now() - startTime;
    logger.debug('Document retrieved successfully', {
      model: Model.modelName,
      id,
      duration,
      hasSelect: !!options.select,
      hasPopulate: !!options.populate,
    });

    return doc;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error.name === 'ValidationError' || error.name === 'NotFoundError') {
      throw error;
    }
    
    logger.error(LOG_MESSAGES.FIND_BY_ID_ERROR, {
      model: Model.modelName,
      id,
      duration,
      error: error.message,
      stack: error.stack,
      errorCode: ERROR_CODES.DATABASE_ERROR,
    });
    
    throw new DatabaseError(
      formatMessage(ERROR_MESSAGES.RETRIEVE_FAILED, { resource: resourceName }),
      { originalError: error.message }
    );
  }
}

/**
 * Safely find one document by criteria
 * @param {Model} Model - Mongoose model
 * @param {Object} criteria - Query criteria
 * @param {Object} options - Query options
 * @param {string|Object} options.select - Fields to select
 * @param {string|Object} options.populate - Paths to populate
 * @param {boolean} options.throwIfNotFound - Throw error if not found (default: true)
 * @param {string} options.resourceName - Name of resource for error messages
 * @returns {Promise<Document|null>} Found document or null
 * @throws {NotFoundError} If document not found and throwIfNotFound is true
 * @throws {DatabaseError} If database operation fails
 */
async function findOneSafe(Model, criteria, options = {}) {
  const startTime = Date.now();
  const resourceName = options.resourceName || Model.modelName;
  const throwIfNotFound = options.throwIfNotFound !== false ? QUERY_OPTIONS.DEFAULT_THROW_IF_NOT_FOUND : options.throwIfNotFound;
  
  try {
    let query = Model.findOne(criteria);
    
    if (options.select) {
      query = query.select(options.select);
    }
    
    if (options.populate) {
      query = query.populate(options.populate);
    }

    const doc = await query.exec();

    if (!doc && throwIfNotFound) {
      throw new NotFoundError(
        formatMessage(ERROR_MESSAGES.RESOURCE_NOT_FOUND, { resource: resourceName }),
        { criteria }
      );
    }

    const duration = Date.now() - startTime;
    logger.debug('FindOne query executed', {
      model: Model.modelName,
      found: !!doc,
      duration,
      hasSelect: !!options.select,
      hasPopulate: !!options.populate,
    });

    return doc;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error.name === 'NotFoundError') {
      throw error;
    }
    
    logger.error(LOG_MESSAGES.FIND_ONE_ERROR, {
      model: Model.modelName,
      criteria,
      duration,
      error: error.message,
      stack: error.stack,
      errorCode: ERROR_CODES.DATABASE_ERROR,
    });
    
    throw new DatabaseError(
      formatMessage(ERROR_MESSAGES.FIND_FAILED, { resource: resourceName }),
      { originalError: error.message }
    );
  }
}

/**
 * Safely update a document by ID
 * @param {Model} Model - Mongoose model
 * @param {string} id - Document ID
 * @param {Object} updateData - Data to update
 * @param {Object} options - Query options
 * @param {boolean} options.new - Return updated document (default: true)
 * @param {boolean} options.runValidators - Run validators (default: true)
 * @param {string|Object} options.select - Fields to select
 * @param {string} options.resourceName - Name of resource for error messages
 * @returns {Promise<Document>} Updated document
 * @throws {ValidationError} If ID or update data is invalid
 * @throws {NotFoundError} If document not found
 * @throws {DatabaseError} If database operation fails
 */
async function updateByIdSafe(Model, id, updateData, options = {}) {
  const startTime = Date.now();
  const resourceName = options.resourceName || Model.modelName;
  
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError(
        formatMessage(ERROR_MESSAGES.INVALID_ID_FORMAT, { resource: resourceName })
      );
    }

    // Build query options
    const queryOptions = {
      new: options.new !== false ? QUERY_OPTIONS.DEFAULT_NEW : options.new,
      runValidators: options.runValidators !== false ? QUERY_OPTIONS.DEFAULT_RUN_VALIDATORS : options.runValidators,
      context: 'query'
    };

    let query = Model.findByIdAndUpdate(id, updateData, queryOptions);
    
    if (options.select) {
      query = query.select(options.select);
    }

    const doc = await query.exec();

    if (!doc) {
      throw new NotFoundError(
        formatMessage(ERROR_MESSAGES.RESOURCE_NOT_FOUND, { resource: resourceName }),
        { id }
      );
    }

    const duration = Date.now() - startTime;
    logger.info(
      formatMessage(LOG_MESSAGES.UPDATED, { model: Model.modelName }),
      { id, duration, updateFields: Object.keys(updateData) }
    );
    
    return doc;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error.name === 'ValidationError') {
      throw new ValidationError(
        formatMessage(ERROR_MESSAGES.INVALID_DATA, { resource: resourceName }),
        { errors: error.errors }
      );
    }
    
    if (error.name === 'NotFoundError') {
      throw error;
    }
    
    logger.error(LOG_MESSAGES.UPDATE_ERROR, {
      model: Model.modelName,
      id,
      duration,
      error: error.message,
      stack: error.stack,
      errorCode: ERROR_CODES.DATABASE_ERROR,
    });
    
    throw new DatabaseError(
      formatMessage(ERROR_MESSAGES.UPDATE_FAILED, { resource: resourceName }),
      { originalError: error.message }
    );
  }
}

/**
 * Safely delete a document by ID
 * @param {Model} Model - Mongoose model
 * @param {string} id - Document ID
 * @param {Object} options - Query options
 * @param {string} options.resourceName - Name of resource for error messages
 * @returns {Promise<Document>} Deleted document
 * @throws {ValidationError} If ID is invalid
 * @throws {NotFoundError} If document not found
 * @throws {DatabaseError} If database operation fails
 */
async function deleteByIdSafe(Model, id, options = {}) {
  const startTime = Date.now();
  const resourceName = options.resourceName || Model.modelName;
  
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError(
        formatMessage(ERROR_MESSAGES.INVALID_ID_FORMAT, { resource: resourceName })
      );
    }

    const doc = await Model.findByIdAndDelete(id);

    if (!doc) {
      throw new NotFoundError(
        formatMessage(ERROR_MESSAGES.RESOURCE_NOT_FOUND, { resource: resourceName }),
        { id }
      );
    }

    const duration = Date.now() - startTime;
    logger.info(
      formatMessage(LOG_MESSAGES.DELETED, { model: Model.modelName }),
      { id, duration }
    );
    
    return doc;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error.name === 'ValidationError' || error.name === 'NotFoundError') {
      throw error;
    }
    
    logger.error(LOG_MESSAGES.DELETE_ERROR, {
      model: Model.modelName,
      id,
      duration,
      error: error.message,
      stack: error.stack,
      errorCode: ERROR_CODES.DATABASE_ERROR,
    });
    
    throw new DatabaseError(
      formatMessage(ERROR_MESSAGES.DELETE_FAILED, { resource: resourceName }),
      { originalError: error.message }
    );
  }
}

/**
 * Execute a paginated query
 * @param {Model} Model - Mongoose model
 * @param {Object} criteria - Query criteria
 * @param {Object} options - Pagination options
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.limit - Items per page
 * @param {string|Object} options.sort - Sort criteria
 * @param {string|Object} options.select - Fields to select
 * @param {string|Object} options.populate - Paths to populate
 * @returns {Promise<Object>} Paginated results
 * @throws {ValidationError} If pagination parameters are invalid
 * @throws {DatabaseError} If database operation fails
 */
async function paginatedQuery(Model, criteria = {}, options = {}) {
  const startTime = Date.now();
  
  try {
    // Validate pagination parameters
    const page = Math.max(
      PAGINATION.MIN_PAGE,
      parseInt(options.page) || PAGINATION.DEFAULT_PAGE
    );
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      Math.max(
        PAGINATION.MIN_LIMIT,
        parseInt(options.limit) || PAGINATION.DEFAULT_LIMIT
      )
    );
    const skip = (page - PAGINATION.MIN_PAGE) * limit;

    // Build query
    let query = Model.find(criteria);
    
    if (options.select) {
      query = query.select(options.select);
    }
    
    if (options.populate) {
      query = query.populate(options.populate);
    }
    
    if (options.sort) {
      query = query.sort(options.sort);
    }

    query = query.skip(skip).limit(limit);

    // Execute query and count in parallel
    const [docs, total] = await Promise.all([
      query.exec(),
      Model.countDocuments(criteria)
    ]);

    const totalPages = Math.ceil(total / limit);
    const duration = Date.now() - startTime;

    logger.debug('Paginated query executed', {
      model: Model.modelName,
      page,
      limit,
      total,
      totalPages,
      resultCount: docs.length,
      duration,
    });

    return {
      docs,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > PAGINATION.MIN_PAGE,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > PAGINATION.MIN_PAGE ? page - 1 : null
      }
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error(LOG_MESSAGES.PAGINATED_QUERY_ERROR, {
      model: Model.modelName,
      criteria,
      page: options.page,
      limit: options.limit,
      duration,
      error: error.message,
      stack: error.stack,
      errorCode: ERROR_CODES.DATABASE_ERROR,
    });
    
    throw new DatabaseError(
      formatMessage(ERROR_MESSAGES.PAGINATED_QUERY_FAILED, { resource: Model.modelName }),
      { originalError: error.message }
    );
  }
}

/**
 * Safely create a document
 * @param {Model} Model - Mongoose model
 * @param {Object} data - Document data
 * @param {Object} options - Options
 * @param {string} options.resourceName - Name of resource for error messages
 * @returns {Promise<Document>} Created document
 * @throws {ValidationError} If data is invalid or duplicate key
 * @throws {DatabaseError} If database operation fails
 */
async function createSafe(Model, data, options = {}) {
  const startTime = Date.now();
  const resourceName = options.resourceName || Model.modelName;
  
  try {
    const doc = await Model.create(data);
    const duration = Date.now() - startTime;
    
    logger.info(
      formatMessage(LOG_MESSAGES.CREATED, { model: Model.modelName }),
      { id: doc._id, duration }
    );
    
    return doc;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error.name === 'ValidationError') {
      throw new ValidationError(
        formatMessage(ERROR_MESSAGES.INVALID_DATA, { resource: resourceName }),
        { errors: error.errors }
      );
    }
    
    if (error.code === MONGO_ERROR_CODES.DUPLICATE_KEY) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      throw new ValidationError(
        formatMessage(ERROR_MESSAGES.DUPLICATE_KEY, { resource: resourceName, field }),
        { field, value: error.keyValue[field] }
      );
    }
    
    logger.error(LOG_MESSAGES.CREATE_ERROR, {
      model: Model.modelName,
      duration,
      error: error.message,
      stack: error.stack,
      errorCode: ERROR_CODES.DATABASE_ERROR,
    });
    
    throw new DatabaseError(
      formatMessage(ERROR_MESSAGES.CREATE_FAILED, { resource: resourceName }),
      { originalError: error.message }
    );
  }
}

/**
 * Safely execute bulk write operations
 * @param {Model} Model - Mongoose model
 * @param {Array} operations - Bulk operations
 * @param {Object} options - Options
 * @param {boolean} options.ordered - Execute in order (default: true)
 * @returns {Promise<Object>} Bulk write result
 * @throws {DatabaseError} If bulk operation fails
 */
async function bulkWriteSafe(Model, operations, options = {}) {
  const startTime = Date.now();
  
  try {
    const result = await Model.bulkWrite(operations, {
      ordered: options.ordered !== false ? QUERY_OPTIONS.DEFAULT_ORDERED : options.ordered
    });
    
    const duration = Date.now() - startTime;
    
    logger.info(
      formatMessage(LOG_MESSAGES.BULK_WRITE_COMPLETED, { model: Model.modelName }),
      {
        inserted: result.insertedCount,
        modified: result.modifiedCount,
        deleted: result.deletedCount,
        operationCount: operations.length,
        duration,
      }
    );
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error(LOG_MESSAGES.BULK_WRITE_ERROR, {
      model: Model.modelName,
      operationCount: operations.length,
      duration,
      error: error.message,
      stack: error.stack,
      errorCode: ERROR_CODES.DATABASE_ERROR,
    });
    
    throw new DatabaseError(
      formatMessage(ERROR_MESSAGES.BULK_WRITE_FAILED, { resource: Model.modelName }),
      { originalError: error.message }
    );
  }
}

/**
 * Check if a document exists
 * @param {Model} Model - Mongoose model
 * @param {Object} criteria - Query criteria
 * @returns {Promise<boolean>} True if exists
 * @throws {DatabaseError} If database operation fails
 */
async function exists(Model, criteria) {
  const startTime = Date.now();
  
  try {
    const count = await Model.countDocuments(criteria).limit(QUERY_OPTIONS.COUNT_LIMIT);
    const duration = Date.now() - startTime;
    
    logger.debug('Existence check executed', {
      model: Model.modelName,
      exists: count > 0,
      duration,
    });
    
    return count > 0;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error(LOG_MESSAGES.EXISTS_CHECK_ERROR, {
      model: Model.modelName,
      criteria,
      duration,
      error: error.message,
      stack: error.stack,
      errorCode: ERROR_CODES.DATABASE_ERROR,
    });
    
    throw new DatabaseError(
      formatMessage(ERROR_MESSAGES.EXISTS_CHECK_FAILED, { resource: Model.modelName }),
      { originalError: error.message }
    );
  }
}

module.exports = {
  findByIdSafe,
  findOneSafe,
  updateByIdSafe,
  deleteByIdSafe,
  paginatedQuery,
  createSafe,
  bulkWriteSafe,
  exists
};
