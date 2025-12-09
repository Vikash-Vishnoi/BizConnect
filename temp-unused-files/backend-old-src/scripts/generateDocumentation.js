const fs = require('fs');
const path = require('path');

// Output files
const API_ROUTES_CSV = path.join(__dirname, '../../API_ROUTES_DOCUMENTATION.csv');
const MODELS_CSV = path.join(__dirname, '../../MODELS_DOCUMENTATION.csv');

// CSV Headers
const API_CSV_HEADER = 'Route Path,HTTP Method,Description,Required Permissions,User Type Required,Request Body/Query Parameters,Response Format,Module/Feature';
const MODEL_CSV_HEADER = 'Model Name,Field Name,Field Type,Required,Default Value,Description,Validation Rules';
 
/**
 * Extract routes from a route file
 */
function extractRoutesFromFile(filePath, modulePrefix = '') {
    const routes = [];
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, '.js');
    
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
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                const nextLine = lines[j];
                if (nextLine.includes('router.')) {
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
            responseFormat: 'JSON',
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
    
    if (middleware.includes('requireAdmin')) return 'Admin only';
    if (middleware.includes('requireManager')) return 'Manager+';
    if (middleware.includes('requireBusiness')) return 'Business access';
    
    return 'None';
}

/**
 * Extract user type requirement
 */
function extractUserType(middleware) {
    if (middleware.includes('requireAdmin')) return 'Admin+';
    if (middleware.includes('requireManager')) return 'Manager+';
    if (middleware.includes('requireBusiness')) return 'User+';
    if (middleware.includes('auth')) return 'User+';
    return 'Public';
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
    
    return params.length > 0 ? params.join(', ') : 'None';
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
function scanRoutesDirectory(dir, prefix = '') {
    let allRoutes = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            // Recursively scan subdirectories
            const subRoutes = scanRoutesDirectory(fullPath, prefix);
            allRoutes = allRoutes.concat(subRoutes);
        } else if (entry.isFile() && entry.name.endsWith('.js') && entry.name !== 'index.js') {
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
    const modelName = path.basename(modelPath, '.js');
    
    // Skip index.js
    if (modelName === 'index') return fields;
    
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
    
    let fieldType = 'Mixed';
    let required = 'false';
    let defaultValue = '';
    
    // Extract type
    if (fieldDef.includes('type:')) {
        const typeMatch = fieldDef.match(/type:\s*(\w+)/);
        if (typeMatch) fieldType = typeMatch[1];
    } else if (fieldDef.match(/^\s*(String|Number|Boolean|Date|ObjectId|Array|Buffer)/)) {
        const simpleTypeMatch = fieldDef.match(/^\s*(String|Number|Boolean|Date|ObjectId|Array|Buffer)/);
        if (simpleTypeMatch) fieldType = simpleTypeMatch[1];
    } else if (fieldDef.includes('[')) {
        fieldType = 'Array';
    } else if (fieldDef.includes('{')) {
        fieldType = 'Object';
    }
    
    // Extract required
    if (fieldDef.match(/required:\s*true/)) {
        required = 'true';
    }
    
    // Extract default
    const defaultMatch = fieldDef.match(/default:\s*([^,}\n]+)/);
    if (defaultMatch) {
        defaultValue = defaultMatch[1].trim().replace(/['"]/g, '');
    }
    
    fields.push({
        modelName: modelName,
        fieldName: fieldName,
        fieldType: fieldType,
        required: required,
        defaultValue: defaultValue,
        description: '',
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
            for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
                const line = lines[j].trim();
                if (line.startsWith('//')) {
                    return line.replace(/^\/\/\s*/, '');
                }
            }
        }
    }
    
    return '';
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
        
        if (entry.isFile() && entry.name.endsWith('.js') && entry.name !== 'index.js') {
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
    console.log('🔍 Scanning route files...');
    const routesDir = path.join(__dirname, '../routes');
    const routes = scanRoutesDirectory(routesDir);
    console.log(`✅ Found ${routes.length} routes`);
    
    console.log('\n🔍 Scanning model files...');
    const modelsDir = path.join(__dirname, '../models');
    const fields = scanModelsDirectory(modelsDir);
    console.log(`✅ Found ${fields.length} model fields`);
    
    console.log('\n📝 Generating API Routes CSV...');
    const routesCSV = generateRoutesCSV(routes);
    fs.writeFileSync(API_ROUTES_CSV, routesCSV, 'utf8');
    console.log(`✅ Saved to ${API_ROUTES_CSV}`);
    
    console.log('\n📝 Generating Models CSV...');
    const modelsCSV = generateModelsCSV(fields);
    fs.writeFileSync(MODELS_CSV, modelsCSV, 'utf8');
    console.log(`✅ Saved to ${MODELS_CSV}`);
    
    console.log('\n✨ Documentation generation complete!');
    console.log(`\nSummary:`);
    console.log(`- Total Routes: ${routes.length}`);
    console.log(`- Total Model Fields: ${fields.length}`);
    console.log(`- Routes by Module:`);
    
    const moduleStats = {};
    routes.forEach(r => {
        moduleStats[r.module] = (moduleStats[r.module] || 0) + 1;
    });
    
    Object.entries(moduleStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([module, count]) => {
            console.log(`  - ${module}: ${count} routes`);
        });
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { scanRoutesDirectory, scanModelsDirectory, generateRoutesCSV, generateModelsCSV };
