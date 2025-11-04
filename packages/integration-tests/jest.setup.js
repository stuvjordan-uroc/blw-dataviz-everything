// Jest setup file - runs before tests

// Load environment variables from root .env file
require('dotenv').config({ path: '../../.env' });

// Check that test environment is properly configured
// Set VERBOSE_TEST_SETUP=true to see configuration warnings
if (process.env.VERBOSE_TEST_SETUP === 'true') {
  if (!process.env.TEST_API_URL) {
    console.warn('⚠️  TEST_API_URL not set. Using default: http://localhost:3004');
  }

  if (!process.env.TEST_DATABASE_URL) {
    console.warn('⚠️  TEST_DATABASE_URL not set. Using default: postgresql://postgres:password@localhost:5433/blw_dataviz_test');
  }
}

// Suppress dotenv console logs during testing
const originalLog = console.log;
console.log = (...args) => {
  // Filter out dotenv messages
  const message = args[0];
  if (typeof message === 'string' && message.includes('[dotenv')) {
    return;
  }
  originalLog(...args);
};

