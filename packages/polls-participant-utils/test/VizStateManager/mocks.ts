/**
 * Mock classes and setup for VizStateManager tests
 * 
 * Provides mocks for browser APIs and external dependencies that VizStateManager
 * requires but cannot be run in a Node.js test environment.
 */

/**
 * Mock CanvasRenderingContext2D
 * 
 * Provides jest.fn() mocks for all canvas drawing methods used by VizStateManager
 */
export class MockCanvasRenderingContext2D {
  clearRect = jest.fn();
  drawImage = jest.fn();
  globalAlpha = 1.0;
}

/**
 * Mock HTMLCanvasElement
 * 
 * Minimal implementation with width, height, and getContext
 */
export class MockHTMLCanvasElement {
  width = 0;
  height = 0;
  private context: MockCanvasRenderingContext2D;

  constructor() {
    this.context = new MockCanvasRenderingContext2D();
  }

  getContext(contextType: string): MockCanvasRenderingContext2D | null {
    if (contextType === '2d') {
      return this.context;
    }
    return null;
  }
}

/**
 * Mock HTMLImageElement
 * 
 * Simple object with src, width, height properties
 */
export class MockImage {
  src = '';
  width = 10;
  height = 10;
}

/**
 * Setup module mocks for external dependencies
 * 
 * Call this at the top level of test files (outside describe blocks)
 */
export function setupModuleMocks() {
  // Mock VizAnimationController
  jest.mock('../../src/VizAnimationController', () => {
    return {
      VizAnimationController: jest.fn().mockImplementation(() => ({
        startAnimation: jest.fn(),
        cancel: jest.fn()
      }))
    };
  });

  // Mock pointDisplayComputation functions
  jest.mock('../../src/VizStateManager/pointDisplayComputation', () => ({
    computeTargetVisibleState: jest.fn(() => new Map()),
    rescaleVisibleState: jest.fn(state => state)
  }));
}

/**
 * Get references to mocked modules
 * 
 * Use this in test files to access and configure module mocks
 */
export function getMockedModules() {
  const { VizAnimationController } = require('../../src/VizAnimationController');
  const {
    computeTargetVisibleState,
    rescaleVisibleState
  } = require('../../src/VizStateManager/pointDisplayComputation');

  return {
    MockedVizAnimationController: VizAnimationController as jest.MockedClass<any>,
    mockedComputeTargetVisibleState: computeTargetVisibleState as jest.MockedFunction<any>,
    mockedRescaleVisibleState: rescaleVisibleState as jest.MockedFunction<any>
  };
}
