// Test setup file
import { config } from '../src/config/index.js';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set test configuration
config.port = 0; // Use random port for testing
config.logging.level = 'error'; // Only log errors during tests
