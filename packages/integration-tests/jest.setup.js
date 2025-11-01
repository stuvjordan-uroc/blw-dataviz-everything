// Jest setup file - runs before tests

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
