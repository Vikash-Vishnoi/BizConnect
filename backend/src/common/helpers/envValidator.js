/**
 * Environment Variable Validator
 * Ensures all required environment variables are set before app startup
 */

const { ERROR_CODES } = require('../constants');

/**
 * Environment Validation Constants
 */
const ENV_DEFAULTS = {
  PORT: '3000',
  NODE_ENV: 'development',
  WHATSAPP_API_URL: 'https://graph.facebook.com/v18.0',
  FRONTEND_URL: 'http://localhost:8081',
  MAX_FILE_SIZE: '5242880', // 5MB in bytes
  UPLOAD_DIR: './uploads',
  RATE_LIMIT_WINDOW_MS: '900000', // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: '100',
  JWT_EXPIRE: '30d'
};

const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'JWT_SECRET'
];

const PLACEHOLDER_PATTERNS = [
  /your-.*-here/i,
  /change-this/i,
  /placeholder/i,
  /example/i,
  /your_/i
];

const PRODUCTION_SECURE_PROTOCOLS = {
  WEBHOOK_URL: 'https://',
  FRONTEND_URL: 'https://'
};

const DEFAULT_JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';

const requiredEnvVars = REQUIRED_ENV_VARS; // Backward compatibility
const optionalEnvVars = ENV_DEFAULTS; // Backward compatibility

/**
 * Validate all required environment variables
 * @throws {Error} If any required env var is missing
 */
function validateEnv() {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar] || process.env[envVar].trim() === '') {
      missing.push(envVar);
    }
  }

  // Check for placeholder values
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar];
    if (value) {
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(value)) {
          warnings.push(`${envVar} appears to contain a placeholder value: "${value}"`);
        }
      }
    }
  }

  // Set default values for optional variables
  for (const [envVar, defaultValue] of Object.entries(ENV_DEFAULTS)) {
    if (!process.env[envVar]) {
      process.env[envVar] = defaultValue;
      // Note: Using console.log intentionally for startup config visibility
      console.log(`ℹ Using default value for ${envVar}: ${defaultValue}`);
    }
  }

  // Report results
  if (missing.length > 0) {
    // Note: Using console.error intentionally for critical startup failures
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(envVar => console.error(`   - ${envVar}`));
    console.error('\nPlease set these variables in your .env file');
    console.error('Copy .env.example to .env and fill in the values\n');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (warnings.length > 0) {
    // Note: Using console.warn intentionally for startup warnings
    console.warn('\n⚠️  Environment variable warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('');
  }

  // Note: Using console.log intentionally for startup confirmation
  console.log('✅ Environment variables validated successfully\n');
}

/**
 * Check if running in production mode
 */
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get environment info for logging
 */
function getEnvInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    mongoUri: process.env.MONGODB_URI ? '[CONFIGURED]' : '[NOT SET]',
    jwtSecret: process.env.JWT_SECRET ? '[CONFIGURED]' : '[NOT SET]',
    whatsappConfigured: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    frontendUrl: process.env.FRONTEND_URL
  };
}

/**
 * Validate production-specific requirements
 */
function validateProductionEnv() {
  if (!isProduction()) {
    return;
  }

  const productionIssues = [];

  // Check JWT secret is not default
  if (process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
    productionIssues.push('JWT_SECRET is still using the default value!');
  }

  // Check MongoDB is not localhost
  if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('localhost')) {
    productionIssues.push('MONGODB_URI is pointing to localhost in production!');
  }

  // Check secure protocols for production URLs
  for (const [envVar, requiredProtocol] of Object.entries(PRODUCTION_SECURE_PROTOCOLS)) {
    const value = process.env[envVar];
    if (value && !value.startsWith(requiredProtocol)) {
      const varType = envVar === 'WEBHOOK_URL' ? 'must' : 'should';
      productionIssues.push(`${envVar} ${varType} use HTTPS in production`);
    }
  }

  if (productionIssues.length > 0) {
    // Note: Using console.error intentionally for critical production issues
    console.error('\n❌ PRODUCTION ENVIRONMENT ISSUES:');
    productionIssues.forEach(issue => console.error(`   - ${issue}`));
    console.error('');
    throw new Error('Production environment validation failed');
  }
}

module.exports = {
  validateEnv,
  validateProductionEnv,
  isProduction,
  getEnvInfo
};
