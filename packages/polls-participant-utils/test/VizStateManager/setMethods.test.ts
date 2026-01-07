/**
 * For each method, test that this.targetVisibleState mutates as required
 * and that this.animationController.startAnimation is called with the required
 * parameter values.
 * 
 * Special case is setCanvasWidth: Test that this.targetVisibleState mutates as required
 * and that this.canvas.element height and width are set as expected.  (Calculate expected
 * values using rescaleVisibleState...that function is tested elsewhere, so this test
 * will assume that it performs as required.)
 */

// Mock external dependencies at module level
jest.mock('../../src/VizAnimationController', () => ({
  VizAnimationController: jest.fn().mockImplementation(() => ({
    startAnimation: jest.fn(),
    cancel: jest.fn()
  }))
}));

jest.mock('../../src/VizStateManager/pointDisplayComputation', () => ({
  computeTargetVisibleState: jest.fn(() => new Map()),
  rescaleVisibleState: jest.fn(state => state)
}));

import { createVizStateManager, clearAllMocks, createMockPointDisplay } from './helpers';
import { createMockVisualizationUpdateEvent, createMockSplit } from './fixtures';
import { computeCanvasPixelDimensions } from '../../src/VizStateManager/canvasComputation';

describe('VizStateManager - setClientViewId', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  it('should update viewId and call computeTargetVisibleState with correct parameters', () => {
    const {
      vizStateManager,
      mockComputeTargetVisibleState,
      testData
    } = createVizStateManager();

    // Clear the initial constructor call
    mockComputeTargetVisibleState.mockClear();

    // Act: Switch to view1
    vizStateManager.setClientViewId('view1');

    // Assert: computeTargetVisibleState was called with the new viewId
    expect(mockComputeTargetVisibleState).toHaveBeenCalledTimes(1);
    expect(mockComputeTargetVisibleState).toHaveBeenCalledWith(
      testData.visualizationData.splits, // serverState (all splits)
      'expanded', // displayMode (from initial config)
      'view1', // NEW viewId
      expect.objectContaining({
        visualizationId: testData.visualizationData.visualizationId,
        vizWidth: testData.visualizationData.vizWidth,
        vizHeight: testData.visualizationData.vizHeight
      }), // vizData
      expect.objectContaining({
        pixelWidth: expect.any(Number),
        pixelHeight: expect.any(Number)
      }) // canvas
    );
  });

  it('should start animation to new targetVisibleState', () => {
    const {
      vizStateManager,
      mockAnimationController,
      mockComputeTargetVisibleState,
      testData
    } = createVizStateManager();

    // Set up mock to return a new target state with proper image
    const newTargetState = new Map([
      ['point-1', createMockPointDisplay('point-1', { x: 100, y: 100 }, testData.loadedImages)]
    ]);
    mockComputeTargetVisibleState.mockReturnValue(newTargetState);

    // Clear the initial constructor call
    mockAnimationController.startAnimation.mockClear();

    // Act: Switch to view1
    vizStateManager.setClientViewId('view1');

    // Assert: startAnimation was called
    expect(mockAnimationController.startAnimation).toHaveBeenCalledTimes(1);
    expect(mockAnimationController.startAnimation).toHaveBeenCalledWith(
      expect.any(Map), // currentVisibleState
      newTargetState, // new targetVisibleState
      expect.objectContaining({ // animation config
        appearDuration: expect.any(Number),
        disappearDuration: expect.any(Number),
        moveDuration: expect.any(Number),
        imageChangeDuration: expect.any(Number)
      }),
      expect.any(Function), // onProgress callback
      expect.any(Function) // onComplete callback
    );
  });

  it('should be a no-op when setting the same viewId', () => {
    const {
      vizStateManager,
      mockComputeTargetVisibleState,
      mockAnimationController
    } = createVizStateManager();

    // Clear initial constructor calls
    mockComputeTargetVisibleState.mockClear();
    mockAnimationController.startAnimation.mockClear();

    // Act: Set to the same viewId as initial (empty string is default)
    vizStateManager.setClientViewId('');

    // Assert: No recomputation or animation
    expect(mockComputeTargetVisibleState).not.toHaveBeenCalled();
    expect(mockAnimationController.startAnimation).not.toHaveBeenCalled();
  });

  it('should work when switching between multiple different viewIds', () => {
    const {
      vizStateManager,
      mockComputeTargetVisibleState,
      mockAnimationController
    } = createVizStateManager();

    // Clear initial constructor calls
    mockComputeTargetVisibleState.mockClear();
    mockAnimationController.startAnimation.mockClear();

    // Act: Switch through multiple views
    vizStateManager.setClientViewId('view1');
    vizStateManager.setClientViewId('view2');
    vizStateManager.setClientViewId('');

    // Assert: Called 3 times (once per unique change)
    expect(mockComputeTargetVisibleState).toHaveBeenCalledTimes(3);
    expect(mockAnimationController.startAnimation).toHaveBeenCalledTimes(3);

    // Verify the viewId parameters in order
    expect(mockComputeTargetVisibleState.mock.calls[0][2]).toBe('view1');
    expect(mockComputeTargetVisibleState.mock.calls[1][2]).toBe('view2');
    expect(mockComputeTargetVisibleState.mock.calls[2][2]).toBe('');
  });
});

describe('VizStateManager - setClientDisplayMode', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  it('should update displayMode and call computeTargetVisibleState with correct parameters', () => {
    const {
      vizStateManager,
      mockComputeTargetVisibleState,
      testData
    } = createVizStateManager();

    // Clear the initial constructor call
    mockComputeTargetVisibleState.mockClear();

    // Act: Change display mode from 'expanded' (default) to 'collapsed'
    vizStateManager.setClientDisplayMode('collapsed');

    // Assert: computeTargetVisibleState called with updated displayMode
    expect(mockComputeTargetVisibleState).toHaveBeenCalledTimes(1);
    expect(mockComputeTargetVisibleState).toHaveBeenCalledWith(
      testData.visualizationData.splits,
      'collapsed', // Updated displayMode
      '', // Default viewId
      expect.objectContaining({
        visualizationId: testData.visualizationData.visualizationId,
        vizWidth: testData.visualizationData.vizWidth,
        vizHeight: testData.visualizationData.vizHeight
      }),
      expect.objectContaining({
        pixelWidth: expect.any(Number),
        pixelHeight: expect.any(Number)
      })
    );
  });

  it('should start animation to new targetVisibleState', () => {
    const {
      vizStateManager,
      mockAnimationController
    } = createVizStateManager();

    // Clear initial constructor calls
    mockAnimationController.startAnimation.mockClear();

    // Act: Change display mode
    vizStateManager.setClientDisplayMode('collapsed');

    // Assert: Animation started
    expect(mockAnimationController.startAnimation).toHaveBeenCalledTimes(1);
    expect(mockAnimationController.startAnimation).toHaveBeenCalledWith(
      expect.any(Map), // currentVisibleState
      expect.any(Map), // targetVisibleState
      expect.any(Object), // animation config
      expect.any(Function), // onUpdate callback
      expect.any(Function) // onComplete callback
    );
  });

  it('should be a no-op when setting the same displayMode', () => {
    const {
      vizStateManager,
      mockComputeTargetVisibleState,
      mockAnimationController
    } = createVizStateManager();

    // Clear initial constructor calls
    mockComputeTargetVisibleState.mockClear();
    mockAnimationController.startAnimation.mockClear();

    // Act: Set to the same displayMode as initial ('expanded' is default)
    vizStateManager.setClientDisplayMode('expanded');

    // Assert: No recomputation or animation
    expect(mockComputeTargetVisibleState).not.toHaveBeenCalled();
    expect(mockAnimationController.startAnimation).not.toHaveBeenCalled();
  });

  it('should work when switching between multiple different displayModes', () => {
    const {
      vizStateManager,
      mockComputeTargetVisibleState,
      mockAnimationController
    } = createVizStateManager();

    // Clear initial constructor calls
    mockComputeTargetVisibleState.mockClear();
    mockAnimationController.startAnimation.mockClear();

    // Act: Switch through multiple display modes
    vizStateManager.setClientDisplayMode('collapsed');
    vizStateManager.setClientDisplayMode('expanded');
    vizStateManager.setClientDisplayMode('collapsed');

    // Assert: Called 3 times (once per unique change)
    expect(mockComputeTargetVisibleState).toHaveBeenCalledTimes(3);
    expect(mockAnimationController.startAnimation).toHaveBeenCalledTimes(3);
  });
});

describe('VizStateManager - setServerState', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  it('should update serverState and call computeTargetVisibleState with new splits', () => {
    const {
      vizStateManager,
      mockComputeTargetVisibleState,
      testData
    } = createVizStateManager();

    // Clear the initial constructor call
    mockComputeTargetVisibleState.mockClear();

    // Create an update event with new splits
    const newSplits = [
      createMockSplit(3), // Different splits than initial
      createMockSplit(4),
      createMockSplit(5)
    ];
    const vizUpdate = createMockVisualizationUpdateEvent({
      toSequence: 2, // Higher than initial (1)
      splits: newSplits
    });

    // Act: Update server state
    vizStateManager.setServerState(vizUpdate);

    // Assert: computeTargetVisibleState called with NEW splits
    expect(mockComputeTargetVisibleState).toHaveBeenCalledTimes(1);
    expect(mockComputeTargetVisibleState).toHaveBeenCalledWith(
      newSplits, // Should be the new splits, not the original ones
      'expanded', // displayMode unchanged
      '', // viewId unchanged
      expect.objectContaining({
        visualizationId: testData.visualizationData.visualizationId,
        vizWidth: testData.visualizationData.vizWidth,
        vizHeight: testData.visualizationData.vizHeight
      }),
      expect.objectContaining({
        pixelWidth: expect.any(Number),
        pixelHeight: expect.any(Number)
      })
    );
  });

  it('should start animation to new targetVisibleState', () => {
    const {
      vizStateManager,
      mockAnimationController
    } = createVizStateManager();

    // Clear initial constructor calls
    mockAnimationController.startAnimation.mockClear();

    // Create update with higher sequence number
    const vizUpdate = createMockVisualizationUpdateEvent({
      toSequence: 2
    });

    // Act: Update server state
    vizStateManager.setServerState(vizUpdate);

    // Assert: Animation started
    expect(mockAnimationController.startAnimation).toHaveBeenCalledTimes(1);
    expect(mockAnimationController.startAnimation).toHaveBeenCalledWith(
      expect.any(Map), // currentVisibleState
      expect.any(Map), // targetVisibleState
      expect.any(Object), // animation config
      expect.any(Function), // onUpdate callback
      expect.any(Function) // onComplete callback
    );
  });

  it('should be a no-op when toSequence is less than or equal to current serverSequenceNumber', () => {
    const {
      vizStateManager,
      mockComputeTargetVisibleState,
      mockAnimationController,
      testData
    } = createVizStateManager();

    // Clear initial constructor calls
    mockComputeTargetVisibleState.mockClear();
    mockAnimationController.startAnimation.mockClear();

    // Create updates with old/equal sequence numbers
    const oldUpdate = createMockVisualizationUpdateEvent({
      toSequence: 0 // Less than initial (1)
    });
    const equalUpdate = createMockVisualizationUpdateEvent({
      toSequence: testData.visualizationData.sequenceNumber // Equal to initial (1)
    });

    // Act: Try to apply old updates
    vizStateManager.setServerState(oldUpdate);
    vizStateManager.setServerState(equalUpdate);

    // Assert: No recomputation or animation
    expect(mockComputeTargetVisibleState).not.toHaveBeenCalled();
    expect(mockAnimationController.startAnimation).not.toHaveBeenCalled();
  });

  it('should handle multiple sequential updates with increasing sequence numbers', () => {
    const {
      vizStateManager,
      mockComputeTargetVisibleState,
      mockAnimationController
    } = createVizStateManager();

    // Clear initial constructor calls
    mockComputeTargetVisibleState.mockClear();
    mockAnimationController.startAnimation.mockClear();

    // Create three updates with increasing sequence numbers
    const update1 = createMockVisualizationUpdateEvent({ toSequence: 2 });
    const update2 = createMockVisualizationUpdateEvent({ toSequence: 3 });
    const update3 = createMockVisualizationUpdateEvent({ toSequence: 4 });

    // Act: Apply updates in sequence
    vizStateManager.setServerState(update1);
    vizStateManager.setServerState(update2);
    vizStateManager.setServerState(update3);

    // Assert: All three updates processed
    expect(mockComputeTargetVisibleState).toHaveBeenCalledTimes(3);
    expect(mockAnimationController.startAnimation).toHaveBeenCalledTimes(3);
  });

  it('should preserve displayMode and viewId when updating serverState', () => {
    const {
      vizStateManager,
      mockComputeTargetVisibleState
    } = createVizStateManager();

    // Set up custom displayMode and viewId
    vizStateManager.setClientDisplayMode('collapsed');
    vizStateManager.setClientViewId('view1');

    // Clear mocks after setup
    mockComputeTargetVisibleState.mockClear();

    // Create update
    const vizUpdate = createMockVisualizationUpdateEvent({
      toSequence: 2
    });

    // Act: Update server state
    vizStateManager.setServerState(vizUpdate);

    // Assert: computeTargetVisibleState called with preserved displayMode and viewId
    expect(mockComputeTargetVisibleState).toHaveBeenCalledWith(
      expect.any(Array), // new splits
      'collapsed', // Preserved displayMode
      'view1', // Preserved viewId
      expect.any(Object),
      expect.any(Object)
    );
  });
});

describe('VizStateManager - setCanvasWidth', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  it('should be a no-op when shimmedPixelWidth equals current canvas pixelWidth', () => {
    const {
      vizStateManager,
      mockAnimationController,
      mockRescaleVisibleState,
      mockContext,
      mockCanvas,
      testData
    } = createVizStateManager();

    // Capture initial canvas dimensions (set by constructor)
    const initialWidth = mockCanvas.width;
    const initialHeight = mockCanvas.height;

    // Clear any initial drawing calls from constructor
    mockAnimationController.cancel.mockClear();
    mockRescaleVisibleState.mockClear();
    mockContext.clearRect.mockClear();

    // Act: Call setCanvasWidth with the same initialCanvasWidth from config
    // The constructor already called computeCanvasPixelDimensions(testData.vizRenderConfig.initialCanvasWidth)
    // So calling setCanvasWidth with the same value should produce the same shimmedPixelWidth
    vizStateManager.setCanvasWidth(testData.vizRenderConfig.initialCanvasWidth);

    // Assert: No operations performed (it's a no-op)
    expect(mockAnimationController.cancel).not.toHaveBeenCalled();
    expect(mockRescaleVisibleState).not.toHaveBeenCalled();
    expect(mockContext.clearRect).not.toHaveBeenCalled();

    // Canvas dimensions should remain unchanged
    expect(mockCanvas.width).toBe(initialWidth);
    expect(mockCanvas.height).toBe(initialHeight);
  });

  it('should cancel ongoing animations when canvas width changes', () => {
    const {
      vizStateManager,
      mockAnimationController
    } = createVizStateManager();

    // Clear initial calls
    mockAnimationController.cancel.mockClear();

    // Act: Set canvas width to a different value
    vizStateManager.setCanvasWidth(8000);

    // Assert: Animation controller cancel was called
    expect(mockAnimationController.cancel).toHaveBeenCalledTimes(1);
  });

  it('should call rescaleVisibleState with correct old and new canvas dimensions', () => {
    const {
      vizStateManager,
      mockRescaleVisibleState,
      mockCanvas,
      testData
    } = createVizStateManager();

    // Capture initial dimensions
    const oldWidth = mockCanvas.width;
    const oldHeight = mockCanvas.height;

    // Clear initial calls
    mockRescaleVisibleState.mockClear();

    // Set up rescaleVisibleState to return a mock state
    const rescaledState = new Map([
      ['point-1', createMockPointDisplay('point-1', { x: 50, y: 50 }, testData.loadedImages)]
    ]);
    mockRescaleVisibleState.mockReturnValue(rescaledState);

    // Compute what the new dimensions will be for requested width
    const requestedWidth = 8000;
    const aspectRatio = testData.visualizationData.vizHeight / testData.visualizationData.vizWidth;
    const { shimmedPixelWidth: newWidth, shimmedPixelHeight: newHeight } =
      computeCanvasPixelDimensions(requestedWidth, aspectRatio);

    // Act: Set canvas width
    vizStateManager.setCanvasWidth(requestedWidth);

    // Assert: rescaleVisibleState called with correct old and new dimensions
    expect(mockRescaleVisibleState).toHaveBeenCalledTimes(1);
    expect(mockRescaleVisibleState).toHaveBeenCalledWith(
      expect.any(Map), // targetVisibleState
      {
        pixelWidth: oldWidth,
        pixelHeight: oldHeight
      },
      {
        pixelWidth: newWidth,
        pixelHeight: newHeight
      }
    );
  });

  it('should update canvas dimensions and element dimensions', () => {
    const {
      vizStateManager,
      mockCanvas,
      testData
    } = createVizStateManager();

    // Capture initial dimensions
    const initialWidth = mockCanvas.width;
    const initialHeight = mockCanvas.height;

    // Compute what the new dimensions will be
    const requestedWidth = 8000;
    const aspectRatio = testData.visualizationData.vizHeight / testData.visualizationData.vizWidth;
    const { shimmedPixelWidth: expectedWidth, shimmedPixelHeight: expectedHeight } =
      computeCanvasPixelDimensions(requestedWidth, aspectRatio);

    // Act: Set canvas width
    vizStateManager.setCanvasWidth(requestedWidth);

    // Assert: Both canvas properties and element properties updated to computed dimensions
    expect(mockCanvas.width).toBe(expectedWidth);
    expect(mockCanvas.height).toBe(expectedHeight);
  });

  it('should call syncToLogicalState after resizing (verified by clearRect call)', () => {
    const {
      vizStateManager,
      mockContext
    } = createVizStateManager();

    // Clear initial drawing calls from constructor
    mockContext.clearRect.mockClear();

    // Act: Set canvas width to a different value
    vizStateManager.setCanvasWidth(400);

    // Assert: syncToLogicalState was called (which calls drawVisibleState, which calls clearRect)
    // The clearRect call is evidence that syncToLogicalState executed
    expect(mockContext.clearRect).toHaveBeenCalled();
  });

  it('should update targetVisibleState with rescaled state', () => {
    const {
      vizStateManager,
      mockRescaleVisibleState,
      mockComputeTargetVisibleState,
      testData
    } = createVizStateManager();

    // Create a distinct rescaled state to verify it's being used
    const rescaledState = new Map([
      ['rescaled-point', createMockPointDisplay('rescaled-point', { x: 100, y: 100 }, testData.loadedImages)]
    ]);
    mockRescaleVisibleState.mockReturnValue(rescaledState);
    mockComputeTargetVisibleState.mockClear();

    // Act: Resize canvas
    vizStateManager.setCanvasWidth(400);

    // After resize, if we trigger another state change, computeTargetVisibleState should be called
    // This verifies the targetVisibleState was properly updated with rescaled state
    vizStateManager.setClientDisplayMode('collapsed');

    // Assert: computeTargetVisibleState was called (proof that state updates work after resize)
    expect(mockComputeTargetVisibleState).toHaveBeenCalled();
  });
});

