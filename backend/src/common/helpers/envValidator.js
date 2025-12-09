/**
 * Environment Variable Validator
 * Ensures all required environment variables are set before app startup
 */

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET'
];
 
const optionalEnvVars = {
  'PORT': '3000',
  'NODE_ENV': 'development',
  'WHATSAPP_API_URL': 'https://graph.facebook.com/v18.0',
  'FRONTEND_URL': 'http://localhost:8081',
  'MAX_FILE_SIZE': '5242880',
  'UPLOAD_DIR': './uploads',
  'RATE_LIMIT_WINDOW_MS': '900000',
  'RATE_LIMIT_MAX_REQUESTS': '100',
  'JWT_EXPIRE': '30d'
};

/**
 * Validate all required environment variables
 * @throws {Error} If any required env var is missing
 */
function validateEnv() {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar] || process.env[envVar].trim() === '') {
      missing.push(envVar);
    }
  }

  // Check for placeholder values
  const placeholderPatterns = [
    /your-.*-here/i,
    /change-this/i,
    /placeholder/i,
    /example/i,
    /your_/i
  ];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      for (const pattern of placeholderPatterns) {
        if (pattern.test(value)) {
          warnings.push(`${envVar} appears to contain a placeholder value: "${value}"`);
        }
      }
    }
  }

  // Set default values for optional variables
  for (const [envVar, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[envVar]) {
      process.env[envVar] = defaultValue;
      console.log(`ℹ Using default value for ${envVar}: ${defaultValue}`);
    }
  }

  // Report results
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(envVar => console.error(`   - ${envVar}`));
    console.error('\nPlease set these variables in your .env file');
    console.error('Copy .env.example to .env and fill in the values\n');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment variable warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('');
  }

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
  if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
    productionIssues.push('JWT_SECRET is still using the default value!');
  }

  // Check MongoDB is not localhost
  if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('localhost')) {
    productionIssues.push('MONGODB_URI is pointing to localhost in production!');
  }

  // Check webhook URL is HTTPS
  if (process.env.WEBHOOK_URL && !process.env.WEBHOOK_URL.startsWith('https://')) {
    productionIssues.push('WEBHOOK_URL must use HTTPS in production');
  }

  // Check frontend URL is HTTPS
  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.startsWith('https://')) {
    productionIssues.push('FRONTEND_URL should use HTTPS in production');
  }

  if (productionIssues.length > 0) {
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
