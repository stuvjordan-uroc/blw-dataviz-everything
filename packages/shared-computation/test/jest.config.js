module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test file patterns
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts'
  ],

  // Module resolution
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/../src/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    '../src/**/*.ts',
    '!../src/**/*.module.ts',
    '!../src/main.ts',
    '!../src/**/*.interface.ts',
    '!../src/**/*.dto.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Coverage thresholds (adjust as needed)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/../tsconfig.json',

    }],
  },

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Timeout for tests
  testTimeout: 10000,

  // Verbose output
  verbose: true,
};
