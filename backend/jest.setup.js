/**
 * Jest Setup File
 * Runs before each test suite
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.MONGODB_URI_TEST = 'mongodb://localhost:27017/whatsapp-business-test';
process.env.PORT = '5001';

// Increase test timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests (optional)
global.console = {
  ...console,
  log: jest.fn(), // Mock console.log
  debug: jest.fn(), // Mock console.debug
  info: jest.fn(), // Mock console.info
  warn: jest.fn(), // Keep console.warn for important warnings
  error: jest.fn(), // Keep console.error for errors
};

// Clean up after all tests
afterAll(async () => {
  // Close database connections, etc.
  // This will be implemented when database connection is set up in tests
});
