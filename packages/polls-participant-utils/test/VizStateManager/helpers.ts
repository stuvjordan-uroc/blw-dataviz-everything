/**
 * Test helper functions for VizStateManager tests
 * 
 * Provides setup utilities to create VizStateManager instances
 * with mocked dependencies and test fixtures.
 */

import { VizStateManager } from '../../src/VizStateManager/VizStateManager';
import { MockHTMLCanvasElement, MockCanvasRenderingContext2D } from './mocks';
import { defaultFixtures, createMockVisualizationData, createMockVizRenderConfig, createMockLoadedImages } from './fixtures';
import type { VisualizationData } from 'shared-types';
import type { VizRenderConfig, PointLoadedImage } from '../../src/types';

/**
 * Test context returned by setup helpers
 * 
 * Contains the VizStateManager instance and references to all mocks
 * for assertion and configuration in tests.
 */
export interface VizStateManagerTestContext {
  // The VizStateManager instance under test
  vizStateManager: VizStateManager;

  // Mock canvas and context for assertions
  mockCanvas: MockHTMLCanvasElement;
  mockContext: MockCanvasRenderingContext2D;

  // Mock animation controller for assertions
  mockAnimationController: {
    startAnimation: jest.Mock;
    cancel: jest.Mock;
  };

  // Mocked computation functions for assertions
  mockComputeTargetVisibleState: jest.Mock;
  mockRescaleVisibleState: jest.Mock;

  // Test data used to create the instance
  testData: {
    visualizationData: VisualizationData;
    vizRenderConfig: VizRenderConfig;
    loadedImages: Map<string, PointLoadedImage>;
  };
}

/**
 * Create a VizStateManager instance with all dependencies mocked
 * 
 * This is the main setup function for VizStateManager tests.
 * 
 * @param options - Optional overrides for visualization data, config, and images
 * @returns Test context with VizStateManager instance and mock references
 * 
 * @example
 * ```typescript
 * const { vizStateManager, mockAnimationController } = createVizStateManager();
 * 
 * vizStateManager.setClientViewId('new-view');
 * 
 * expect(mockAnimationController.startAnimation).toHaveBeenCalled();
 * ```
 */
export function createVizStateManager(options?: {
  visualizationData?: Partial<VisualizationData>;
  vizRenderConfig?: Partial<VizRenderConfig>;
  loadedImages?: Map<string, PointLoadedImage>;
}): VizStateManagerTestContext {
  // Create test data (merge with defaults)
  const visualizationData = options?.visualizationData
    ? createMockVisualizationData(options.visualizationData)
    : defaultFixtures.visualizationData;

  const vizRenderConfig = options?.vizRenderConfig
    ? createMockVizRenderConfig(options.vizRenderConfig)
    : defaultFixtures.vizRenderConfig;

  const loadedImages = options?.loadedImages ?? defaultFixtures.loadedImages;

  // Create mock canvas
  const mockCanvas = new MockHTMLCanvasElement();
  const mockContext = mockCanvas.getContext('2d') as MockCanvasRenderingContext2D;

  // Get references to mocked modules
  const { VizAnimationController } = require('../../src/VizAnimationController');
  const { computeTargetVisibleState, rescaleVisibleState } = require('../../src/VizStateManager/pointDisplayComputation');

  // Create VizStateManager instance
  // This will call the mocked VizAnimationController constructor
  const vizStateManager = new VizStateManager(
    visualizationData,
    mockCanvas as any as HTMLCanvasElement,
    loadedImages,
    vizRenderConfig
  );

  // Get the mock animation controller instance that was created
  const mockAnimationControllerInstance = (VizAnimationController as jest.MockedClass<any>).mock.results[
    (VizAnimationController as jest.MockedClass<any>).mock.results.length - 1
  ].value;

  return {
    vizStateManager,
    mockCanvas,
    mockContext,
    mockAnimationController: mockAnimationControllerInstance,
    mockComputeTargetVisibleState: computeTargetVisibleState,
    mockRescaleVisibleState: rescaleVisibleState,
    testData: {
      visualizationData,
      vizRenderConfig,
      loadedImages
    }
  };
}

/**
 * Clear all mocks between tests
 * 
 * Call this in beforeEach to ensure clean state
 */
export function clearAllMocks() {
  jest.clearAllMocks();
}

/**
 * Reset module mocks to default behavior
 * 
 * Use this if you need to reconfigure mocks mid-test
 */
export function resetModuleMocks() {
  const { computeTargetVisibleState, rescaleVisibleState } = require('../../src/VizStateManager/pointDisplayComputation');

  // Reset to default mock implementations
  computeTargetVisibleState.mockReturnValue(new Map());
  rescaleVisibleState.mockImplementation((state: any) => state);
}
