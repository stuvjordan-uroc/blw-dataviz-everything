// Jest setup file - runs before each test file

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/testdb';

// Global test utilities can be added here
global.createMockDatabase = () => {
  return {
    execute: jest.fn(),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    transaction: jest.fn(),
  };
};

global.createMockSSEResponse = () => {
  return {
    write: jest.fn(),
    on: jest.fn((event, handler) => {
      if (event === 'close') {
        // Store cleanup handler for testing
        this._closeHandler = handler;
      }
    }),
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    _closeHandler: null,
  };
};

// Suppress console output during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
