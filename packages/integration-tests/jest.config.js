/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Node environment (we're testing a Node.js/NestJS backend)
  testEnvironment: 'node',

  // Where to find test files
  testMatch: ['**/tests/**/*.test.ts'],

  // Control test execution order and behavior
  // Auth tests run first (alphabetically), then api-polls-admin
  // Tests within each suite run in the order they appear in the file
  testSequencer: '<rootDir>/jest-test-sequencer.js',

  // Stop running tests after the first failure
  // This ensures api-polls-admin tests won't run if auth tests fail
  bail: 1,

  // Transform TypeScript files with ts-jest
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // Module name mapping to resolve workspace package aliases
  moduleNameMapper: {
    '^db$': '<rootDir>/../db/src/index.ts',
    '^shared-schemas$': '<rootDir>/../shared-schemas/src/index.ts',
    '^shared-schemas/(.*)$': '<rootDir>/../shared-schemas/$1',
    '^shared-auth$': '<rootDir>/../shared-auth/src/index.ts',
    '^api-polls-admin$': '<rootDir>/../api-polls-admin/src',
  },

  // Coverage configuration
  collectCoverageFrom: [
    '../api-polls-admin/src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],

  // Longer timeout for integration tests (they're slower than unit tests)
  testTimeout: 30000, // 30 seconds

  // Run tests serially to avoid database conflicts
  maxWorkers: 1,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output for better debugging
  verbose: true,

  // Suppress console logs from external libraries during tests
  silent: false, // Keep our test output

  // Setup file to suppress dotenv logs
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
