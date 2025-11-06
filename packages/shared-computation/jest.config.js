/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: "ts-jest",

  // Node environment
  testEnvironment: "node",

  // Where to find test files
  testMatch: ["**/tests/**/*.test.ts"],

  // Root directory for tests
  roots: ["<rootDir>/tests", "<rootDir>/src"],

  // Transform TypeScript files with ts-jest
  transform: {
    "^.+\\.ts$": "ts-jest",
  },

  // Module name mapping to resolve workspace package aliases
  moduleNameMapper: {
    "^shared-schemas$": "<rootDir>/../shared-schemas/src/index.ts",
    "^shared-schemas/(.*)$": "<rootDir>/../shared-schemas/$1",
  },

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.ts",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/dist/**",
  ],

  // Standard timeout for unit tests
  testTimeout: 5000, // 5 seconds

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output for better debugging
  verbose: true,
};
