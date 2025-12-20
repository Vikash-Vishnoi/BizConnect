const fs = require('fs');
const path = require('path');
const logger = require('../common/helpers/logger');
const { ERROR_CODES } = require('../common/constants');

// ========================================
// CONSTANTS
// ========================================

// File Paths
const API_ROUTES_CSV = path.join(__dirname, '../../API_ROUTES_DOCUMENTATION.csv');
const MODELS_CSV = path.join(__dirname, '../../MODELS_DOCUMENTATION.csv');

// CSV Headers
const API_CSV_HEADER = 'Route Path,HTTP Method,Description,Required Permissions,User Type Required,Request Body/Query Parameters,Response Format,Module/Feature';
const MODEL_CSV_HEADER = 'Model Name,Field Name,Field Type,Required,Default Value,Description,Validation Rules';

// File Patterns
const JAVASCRIPT_EXTENSION = '.js';
const INDEX_FILENAME = 'index.js';
const INDEX_IPYNB_FILENAME = 'index';

// Route Detection Patterns
const ROUTE_METHODS = ['get', 'post', 'put', 'delete', 'patch'];
const ROUTER_PREFIX = 'router.';

// Permissions
const PERMISSION_NONE = 'None';
const PERMISSION_ADMIN = 'Admin only';
const PERMISSION_MANAGER = 'Manager+';
const PERMISSION_BUSINESS = 'Business access';

// User Types
const USER_TYPE_PUBLIC = 'Public';
const USER_TYPE_USER = 'User+';
const USER_TYPE_MANAGER = 'Manager+';
const USER_TYPE_ADMIN = 'Admin+';

// Response Format
const RESPONSE_FORMAT_JSON = 'JSON';

// Default Values
const NO_PARAMS = 'None';
const EMPTY_STRING = '';

// Comment Detection
const COMMENT_LOOKAHEAD_LINES = 5;
const COMMENT_LOOKBACK_LINES = 3;

// Field Types
const FIELD_TYPE_MIXED = 'Mixed';
const FIELD_TYPE_ARRAY = 'Array';
const FIELD_TYPE_OBJECT = 'Object';

// Script Status
const EXIT_CODE_SUCCESS = 0;
const EXIT_CODE_FAILURE = 1;
 
/**
 * Extract routes from a route file
 */
function extractRoutesFromFile(filePath, modulePrefix = EMPTY_STRING) {
    const routes = [];
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, JAVASCRIPT_EXTENSION);
    
    // Extract module name from path
    const relativePath = path.relative(path.join(__dirname, '../routes'), filePath);
    const module = relativePath.split(path.sep)[0];
    
    // Regex patterns for different route definitions
    const routePatterns = [
        /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/g,
        /router\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\.(get|post|put|delete|patch)\s*\(([^)]+)\)/g
    ];
    
    // Extract comments above route definitions for descriptions
    const lines = content.split('\n');
    const routeDescriptions = {};
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for comment blocks above routes
        if (line.startsWith('//') || line.startsWith('*')) {
            let description = line.replace(/^(\/\/|\*)\s*/, '').trim();
            
            // Check if next few lines contain a route definition
            for (let j = i + 1; j < Math.min(i + COMMENT_LOOKAHEAD_LINES, lines.length); j++) {
                const nextLine = lines[j];
                if (nextLine.includes(ROUTER_PREFIX)) {
                    const routeMatch = nextLine.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
                    if (routeMatch) {
                        const key = `${routeMatch[1]}_${routeMatch[2]}`;
                        routeDescriptions[key] = description;
                    }
                    break;
                }
            }
        }
    }
    
    // Extract router.(method) patterns
    let match;
    const pattern1 = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/g;
    while ((match = pattern1.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const routePath = match[2];
        const middleware = match[3];
        
        const key = `${match[1]}_${routePath}`;
        const description = routeDescriptions[key] || generateDescription(method, routePath, fileName);
        
        routes.push({
            path: modulePrefix + routePath,
            method: method,
            description: description,
            permissions: extractPermissions(middleware),
            userType: extractUserType(middleware),
            requestParams: extractRequestParams(content, routePath),
            responseFormat: RESPONSE_FORMAT_JSON,
            module: formatModuleName(module)
        });
    }
    
    return routes;
}

/**
 * Generate a description based on method and path
 */
function generateDescription(method, path, fileName) {
    const pathParts = path.split('/').filter(p => p && !p.startsWith(':'));
    const resource = pathParts[pathParts.length - 1] || fileName.replace('Routes', '');
    
    const descriptions = {
        GET: path.includes(':id') ? `Get ${resource} by ID` : `List all ${resource}`,
        POST: `Create new ${resource}`,
        PUT: `Update ${resource}`,
        PATCH: `Partially update ${resource}`,
        DELETE: `Delete ${resource}`
    };
    
    return descriptions[method] || `${method} ${resource}`;
}

/**
 * Extract permissions from middleware string
 */
function extractPermissions(middleware) {
    const permissionMatch = middleware.match(/requireBusinessPermission\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
    if (permissionMatch) {
        return permissionMatch[1];
    }
    
    if (middleware.includes('requireAdmin')) return PERMISSION_ADMIN;
    if (middleware.includes('requireManager')) return PERMISSION_MANAGER;
    if (middleware.includes('requireBusiness')) return PERMISSION_BUSINESS;
    
    return PERMISSION_NONE;
}

/**
 * Extract user type requirement
 */
function extractUserType(middleware) {
    if (middleware.includes('requireAdmin')) return USER_TYPE_ADMIN;
    if (middleware.includes('requireManager')) return USER_TYPE_MANAGER;
    if (middleware.includes('requireBusiness')) return USER_TYPE_USER;
    if (middleware.includes('auth')) return USER_TYPE_USER;
    return USER_TYPE_PUBLIC;
}

/**
 * Extract request parameters from route handler
 */
function extractRequestParams(content, routePath) {
    const params = [];
    
    // Path parameters
    const pathParams = routePath.match(/:(\w+)/g);
    if (pathParams) {
        params.push(...pathParams.map(p => `${p.substring(1)} (path param)`));
    }
    
    // Look for req.body usage
    if (content.includes('req.body')) {
        params.push('body: {...}');
    }
    
    // Look for req.query usage
    if (content.includes('req.query')) {
        params.push('query params');
    }
    
    return params.length > 0 ? params.join(', ') : NO_PARAMS;
}

/**
 * Format module name for display
 */
function formatModuleName(module) {
    return module
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Scan all route files in a directory
 */
function scanRoutesDirectory(dir, prefix = EMPTY_STRING) {
    let allRoutes = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            // Recursively scan subdirectories
            const subRoutes = scanRoutesDirectory(fullPath, prefix);
            allRoutes = allRoutes.concat(subRoutes);
        } else if (entry.isFile() && entry.name.endsWith(JAVASCRIPT_EXTENSION) && entry.name !== INDEX_FILENAME) {
            // Extract routes from file
            const routes = extractRoutesFromFile(fullPath, prefix);
            allRoutes = allRoutes.concat(routes);
        }
    }
    
    return allRoutes;
}

/**
 * Extract model information from model files
 */
function extractModelInfo(modelPath) {
    const fields = [];
    const content = fs.readFileSync(modelPath, 'utf8');
    const modelName = path.basename(modelPath, JAVASCRIPT_EXTENSION);
    
    // Skip index.js
    if (modelName === INDEX_IPYNB_FILENAME) return fields;
    
    // Extract schema definition - handle multiple formats
    let schemaContent = '';
    
    // Try to find the schema definition
    const schemaPatterns = [
        /new\s+mongoose\.Schema\s*\(\s*{([\s\S]*?)}\s*,\s*{/,  // With mongoose.Schema and options
        /new\s+mongoose\.Schema\s*\(\s*{([\s\S]*?)}\s*\)/,      // With mongoose.Schema no options
        /new\s+Schema\s*\(\s*{([\s\S]*?)}\s*,\s*{/,            // With Schema and options
        /new\s+Schema\s*\(\s*{([\s\S]*?)}\s*\)/,                // With Schema no options
        /const\s+\w+Schema\s*=\s*{([\s\S]*?)};/                 // Plain object
    ];
    
    for (const pattern of schemaPatterns) {
        const match = content.match(pattern);
        if (match) {
            schemaContent = match[1];
            break;
        }
    }
    
    if (!schemaContent) return fields;
    
    // Remove nested objects temporarily to avoid confusion
    let cleanedContent = schemaContent;
    
    // Extract top-level fields
    const lines = cleanedContent.split('\n');
    let currentField = null;
    let currentDef = '';
    let braceDepth = 0;
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('//')) continue;
        
        // Check for field definition start
        const fieldMatch = trimmed.match(/^(\w+):\s*(.*)$/);
        if (fieldMatch && braceDepth === 0) {
            // Save previous field
            if (currentField) {
                parseFieldDefinition(currentField, currentDef, fields, modelName);
            }
            
            currentField = fieldMatch[1];
            currentDef = fieldMatch[2];
            
            // Count braces in this line
            braceDepth = (currentDef.match(/{/g) || []).length - (currentDef.match(/}/g) || []).length;
        } else if (currentField) {
            currentDef += ' ' + trimmed;
            braceDepth += (trimmed.match(/{/g) || []).length - (trimmed.match(/}/g) || []).length;
        }
        
        // If braces are balanced, field definition is complete
        if (currentField && braceDepth === 0 && currentDef.trim().endsWith(',')) {
            parseFieldDefinition(currentField, currentDef, fields, modelName);
            currentField = null;
            currentDef = '';
        }
    }
    
    // Don't forget the last field
    if (currentField) {
        parseFieldDefinition(currentField, currentDef, fields, modelName);
    }
    
    return fields;
}

/**
 * Parse a field definition and add to fields array
 */
function parseFieldDefinition(fieldName, fieldDef, fields, modelName) {
    // Skip if already exists
    if (fields.some(f => f.fieldName === fieldName)) return;
    
    let fieldType = FIELD_TYPE_MIXED;
    let required = 'false';
    let defaultValue = EMPTY_STRING;
    
    // Extract type
    if (fieldDef.includes('type:')) {
        const typeMatch = fieldDef.match(/type:\s*(\w+)/);
        if (typeMatch) fieldType = typeMatch[1];
    } else if (fieldDef.match(/^\s*(String|Number|Boolean|Date|ObjectId|Array|Buffer)/)) {
        const simpleTypeMatch = fieldDef.match(/^\s*(String|Number|Boolean|Date|ObjectId|Array|Buffer)/);
        if (simpleTypeMatch) fieldType = simpleTypeMatch[1];
    } else if (fieldDef.includes('[')) {
        fieldType = FIELD_TYPE_ARRAY;
    } else if (fieldDef.includes('{')) {
        fieldType = FIELD_TYPE_OBJECT;
    }
    
    // Extract required
    if (fieldDef.match(/required:\s*true/)) {
        required = 'true';
    }
    
    // Extract default
    const defaultMatch = fieldDef.match(/default:\s*([^,}\n]+)/);
    if (defaultMatch) {
        defaultValue = defaultMatch[1].trim().replace(/['"]/g, EMPTY_STRING);
    }
    
    fields.push({
        modelName: modelName,
        fieldName: fieldName,
        fieldType: fieldType,
        required: required,
        defaultValue: defaultValue,
        description: EMPTY_STRING,
        validation: extractValidation(fieldDef)
    });
}

/**
 * Extract field description from comments
 */
function extractFieldDescription(content, fieldName) {
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(fieldName + ':')) {
            // Look backwards for comments
            for (let j = i - 1; j >= Math.max(0, i - COMMENT_LOOKBACK_LINES); j--) {
                const line = lines[j].trim();
                if (line.startsWith('//')) {
                    return line.replace(/^\/\/\s*/, EMPTY_STRING);
                }
            }
        }
    }
    
    return EMPTY_STRING;
}

/**
 * Extract validation rules
 */
function extractValidation(fieldDef) {
    const validations = [];
    
    if (fieldDef.includes('minlength')) {
        const match = fieldDef.match(/minlength:\s*(\d+)/);
        if (match) validations.push(`min length: ${match[1]}`);
    }
    
    if (fieldDef.includes('maxlength')) {
        const match = fieldDef.match(/maxlength:\s*(\d+)/);
        if (match) validations.push(`max length: ${match[1]}`);
    }
    
    if (fieldDef.includes('enum')) {
        validations.push('enum values');
    }
    
    if (fieldDef.includes('match')) {
        validations.push('regex pattern');
    }
    
    return validations.join(', ');
}

/**
 * Scan all model files
 */
function scanModelsDirectory(dir) {
    let allFields = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isFile() && entry.name.endsWith(JAVASCRIPT_EXTENSION) && entry.name !== INDEX_FILENAME) {
            const fields = extractModelInfo(fullPath);
            allFields = allFields.concat(fields);
        }
    }
    
    return allFields;
}

/**
 * Generate CSV content from routes array
 */
function generateRoutesCSV(routes) {
    let csv = API_CSV_HEADER + '\n';
    
    // Sort routes by module and path
    routes.sort((a, b) => {
        if (a.module !== b.module) return a.module.localeCompare(b.module);
        return a.path.localeCompare(b.path);
    });
    
    for (const route of routes) {
        const row = [
            route.path,
            route.method,
            escapeCSV(route.description),
            escapeCSV(route.permissions),
            route.userType,
            escapeCSV(route.requestParams),
            route.responseFormat,
            route.module
        ].join(',');
        
        csv += row + '\n';
    }
    
    return csv;
}

/**
 * Generate CSV content from model fields array
 */
function generateModelsCSV(fields) {
    let csv = MODEL_CSV_HEADER + '\n';
    
    // Sort fields by model name and field name
    fields.sort((a, b) => {
        if (a.modelName !== b.modelName) return a.modelName.localeCompare(b.modelName);
        return a.fieldName.localeCompare(b.fieldName);
    });
    
    for (const field of fields) {
        const row = [
            field.modelName,
            field.fieldName,
            field.fieldType,
            field.required,
            escapeCSV(field.defaultValue),
            escapeCSV(field.description),
            escapeCSV(field.validation)
        ].join(',');
        
        csv += row + '\n';
    }
    
    return csv;
}

/**
 * Escape CSV values
 */
function escapeCSV(value) {
    if (typeof value !== 'string') return value;
    
    // If value contains comma, newline, or quote, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        return '"' + value.replace(/"/g, '""') + '"';
    }
    
    return value;
}

/**
 * Main execution
 */
function main() {
    const startTime = Date.now();
    
    try {
        logger.info('Starting documentation generation...');
        
        logger.info('Scanning route files...');
        const routeScanStartTime = Date.now();
        const routesDir = path.join(__dirname, '../routes');
        const routes = scanRoutesDirectory(routesDir);
        const routeScanTime = Date.now() - routeScanStartTime;
        logger.info('Route scanning complete', {
            routesFound: routes.length,
            scanTime: `${routeScanTime}ms`
        });
        
        logger.info('Scanning model files...');
        const modelScanStartTime = Date.now();
        const modelsDir = path.join(__dirname, '../models');
        const fields = scanModelsDirectory(modelsDir);
        const modelScanTime = Date.now() - modelScanStartTime;
        logger.info('Model scanning complete', {
            fieldsFound: fields.length,
            scanTime: `${modelScanTime}ms`
        });
        
        logger.info('Generating API Routes CSV...');
        const routesCsvStartTime = Date.now();
        const routesCSV = generateRoutesCSV(routes);
        fs.writeFileSync(API_ROUTES_CSV, routesCSV, 'utf8');
        const routesCsvTime = Date.now() - routesCsvStartTime;
        logger.info('API Routes CSV saved', {
            filePath: API_ROUTES_CSV,
            generateTime: `${routesCsvTime}ms`
        });
        
        logger.info('Generating Models CSV...');
        const modelsCsvStartTime = Date.now();
        const modelsCSV = generateModelsCSV(fields);
        fs.writeFileSync(MODELS_CSV, modelsCSV, 'utf8');
        const modelsCsvTime = Date.now() - modelsCsvStartTime;
        logger.info('Models CSV saved', {
            filePath: MODELS_CSV,
            generateTime: `${modelsCsvTime}ms`
        });
        
        const totalTime = Date.now() - startTime;
        
        logger.info('Documentation generation complete!');
        logger.info('Summary:', {
            totalRoutes: routes.length,
            totalModelFields: fields.length,
            totalExecutionTime: `${totalTime}ms`
        });
        
        const moduleStats = {};
        routes.forEach(r => {
            moduleStats[r.module] = (moduleStats[r.module] || 0) + 1;
        });
        
        logger.info('Routes by Module:');
        Object.entries(moduleStats)
            .sort((a, b) => b[1] - a[1])
            .forEach(([module, count]) => {
                logger.info(`  - ${module}: ${count} routes`);
            });
            
    } catch (error) {
        const executionTime = Date.now() - startTime;
        logger.error('Documentation generation failed', {
            error: error.message,
            stack: error.stack,
            code: error.code || ERROR_CODES.INTERNAL_ERROR,
            executionTime: `${executionTime}ms`
        });
        throw error;
    }
}

// Run the script
if (require.main === module) {
    try {
        main();
        logger.info('Script completed successfully');
        process.exit(EXIT_CODE_SUCCESS);
    } catch (error) {
        logger.error('Script failed', {
            error: error.message,
            stack: error.stack
        });
        process.exit(EXIT_CODE_FAILURE);
    }
}

module.exports = { scanRoutesDirectory, scanModelsDirectory, generateRoutesCSV, generateModelsCSV };
