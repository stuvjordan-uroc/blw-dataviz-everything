module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test file patterns
  roots: ['<rootDir>/test'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts'
  ],

  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^api-polls-client$': '<rootDir>/test/__mocks__/api-polls-client.ts',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
    }],
  },

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],

  // Allow transformation of api-polls-client package
  transformIgnorePatterns: [
    'node_modules/(?!(api-polls-client)/)',
  ],
};
