/**
 * Tests for computeTargetVisibleState function
 * 
 * This function computes the target visible state from splits, display mode, and view.
 */

import { computeTargetVisibleState } from '../../src/VizStateManager/pointDisplayComputation';
import { createMockVisualizationData, createMockSplit, createMockLoadedImages } from './fixtures';
import { MockHTMLCanvasElement } from './mocks';
import { pointKey } from '../../src/utils';
import type { CanvasData } from '../../src/VizStateManager/types';

/**
 * Helper to create a valid CanvasData mock
 */
function createCanvasData(): CanvasData {
  const mockCanvas = new MockHTMLCanvasElement();
  const mockContext = mockCanvas.getContext('2d')!;
  return {
    element: mockCanvas as any,
    context: mockContext as any,
    pixelWidth: 800,
    pixelHeight: 600
  };
}

describe('computeTargetVisibleState', () => {
  describe('error handling', () => {
    it('should throw when viewId does not exist in vizData.viewMaps', () => {
      const vizData = createMockVisualizationData({
        viewMaps: {
          'view1': [0],
          'view2': [1]
        }
      });

      const canvasData = createCanvasData();

      // Act & Assert: Try to use a viewId that doesn't exist
      expect(() => {
        computeTargetVisibleState(
          vizData.splits,
          'expanded',
          'nonexistent-view', // Invalid viewId
          { ...vizData, loadedImages: createMockLoadedImages() },
          canvasData
        );
      }).toThrow(/no such view exists/);
    });

    it('should include visualizationId in error message when viewId invalid', () => {
      const vizData = createMockVisualizationData({
        visualizationId: 'test-viz-123',
        viewMaps: {
          'view1': [0]
        }
      });

      const canvasData = createCanvasData();

      // Act & Assert: Check that error message includes visualizationId
      expect(() => {
        computeTargetVisibleState(
          vizData.splits,
          'expanded',
          'invalid-view',
          { ...vizData, loadedImages: createMockLoadedImages() },
          canvasData
        );
      }).toThrow(/test-viz-123/);
    });
  });

  describe('point collection', () => {
    it('should collect points from expanded mode when displayMode is expanded', () => {
      // Create a split with 2 points in expanded mode
      const split = createMockSplit(0, {
        responseGroups: {
          expanded: [
            {
              label: 'Option A',
              values: [0],
              totalCount: 50,
              totalWeight: 50,
              proportion: 0.5,
              bounds: { x: 50, y: 50, width: 100, height: 100 },
              pointPositions: [
                { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }, x: 10, y: 20 },
                { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 2 }, x: 30, y: 40 }
              ],
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,TEST',
                offsetToCenter: { x: 5, y: 5 }
              }
            }
          ],
          collapsed: []
        }
      });

      const vizData = createMockVisualizationData({
        viewMaps: {
          'view1': [0]
        },
        splits: [split]
      });

      const canvasData = createCanvasData();

      // Act
      const result = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        'view1',
        { ...vizData, loadedImages: createMockLoadedImages() },
        canvasData
      );

      // Assert: Verify exact set of keys
      const expectedKeys = new Set([
        pointKey({ splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }),
        pointKey({ splitIdx: 0, expandedResponseGroupIdx: 0, id: 2 })
      ]);
      const actualKeys = new Set(result.keys());
      expect(actualKeys).toEqual(expectedKeys);
    });

    it('should collect points from collapsed mode when displayMode is collapsed', () => {
      // Create a split with 1 point in expanded, 3 points in collapsed
      const split = createMockSplit(0, {
        responseGroups: {
          expanded: [
            {
              label: 'Option A',
              values: [0],
              totalCount: 50,
              totalWeight: 50,
              proportion: 0.5,
              bounds: { x: 50, y: 50, width: 100, height: 100 },
              pointPositions: [
                { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }, x: 10, y: 20 }
              ],
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,TEST',
                offsetToCenter: { x: 5, y: 5 }
              }
            }
          ],
          collapsed: [
            {
              label: 'All Options',
              values: [0],
              totalCount: 100,
              totalWeight: 100,
              proportion: 1.0,
              bounds: { x: 50, y: 50, width: 200, height: 200 },
              pointPositions: [
                { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }, x: 10, y: 20 },
                { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 2 }, x: 30, y: 40 },
                { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 3 }, x: 50, y: 60 }
              ],
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,TEST',
                offsetToCenter: { x: 5, y: 5 }
              }
            }
          ]
        }
      });

      const vizData = createMockVisualizationData({
        viewMaps: {
          'view1': [0]
        },
        splits: [split]
      });

      const canvasData = createCanvasData();

      // Act
      const result = computeTargetVisibleState(
        vizData.splits,
        'collapsed',
        'view1',
        { ...vizData, loadedImages: createMockLoadedImages() },
        canvasData
      );

      // Assert: Verify exact set of keys
      const expectedKeys = new Set([
        pointKey({ splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }),
        pointKey({ splitIdx: 0, expandedResponseGroupIdx: 0, id: 2 }),
        pointKey({ splitIdx: 0, expandedResponseGroupIdx: 0, id: 3 })
      ]);
      const actualKeys = new Set(result.keys());
      expect(actualKeys).toEqual(expectedKeys);
    });

    it('should combine points from multiple splits when view maps to multiple splits', () => {
      // Create two splits with different points
      const split1 = createMockSplit(0, {
        responseGroups: {
          expanded: [
            {
              label: 'Option A',
              values: [0],
              totalCount: 50,
              totalWeight: 50,
              proportion: 0.5,
              bounds: { x: 50, y: 50, width: 100, height: 100 },
              pointPositions: [
                { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }, x: 10, y: 20 }
              ],
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,TEST',
                offsetToCenter: { x: 5, y: 5 }
              }
            }
          ],
          collapsed: []
        }
      });

      const split2 = createMockSplit(1, {
        responseGroups: {
          expanded: [
            {
              label: 'Option B',
              values: [0],
              totalCount: 50,
              totalWeight: 50,
              proportion: 0.5,
              bounds: { x: 150, y: 50, width: 100, height: 100 },
              pointPositions: [
                { point: { splitIdx: 1, expandedResponseGroupIdx: 0, id: 2 }, x: 30, y: 40 },
                { point: { splitIdx: 1, expandedResponseGroupIdx: 0, id: 3 }, x: 50, y: 60 }
              ],
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,TEST2',
                offsetToCenter: { x: 5, y: 5 }
              }
            }
          ],
          collapsed: []
        }
      });

      const vizData = createMockVisualizationData({
        viewMaps: {
          'view1': [0, 1] // View maps to both splits
        },
        splits: [split1, split2]
      });

      const canvasData = createCanvasData();

      // Act
      const result = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        'view1',
        { ...vizData, loadedImages: createMockLoadedImages() },
        canvasData
      );

      // Assert: Should have all 3 unique points from both splits (exact set)
      const expectedKeys = new Set([
        pointKey({ splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }),
        pointKey({ splitIdx: 1, expandedResponseGroupIdx: 0, id: 2 }),
        pointKey({ splitIdx: 1, expandedResponseGroupIdx: 0, id: 3 })
      ]);
      const actualKeys = new Set(result.keys());
      expect(actualKeys).toEqual(expectedKeys);
    });

    it('should handle duplicate points across splits (last one wins)', () => {
      // Create two splits with the same point (different positions)
      const split1 = createMockSplit(0, {
        responseGroups: {
          expanded: [
            {
              label: 'Option A',
              values: [0],
              totalCount: 50,
              totalWeight: 50,
              proportion: 0.5,
              bounds: { x: 50, y: 50, width: 100, height: 100 },
              pointPositions: [
                { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }, x: 10, y: 20 }
              ],
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,TEST',
                offsetToCenter: { x: 5, y: 5 }
              }
            }
          ],
          collapsed: []
        }
      });

      const split2 = createMockSplit(1, {
        responseGroups: {
          expanded: [
            {
              label: 'Option B',
              values: [0],
              totalCount: 50,
              totalWeight: 50,
              proportion: 0.5,
              bounds: { x: 150, y: 50, width: 100, height: 100 },
              pointPositions: [
                { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }, x: 30, y: 40 } // Same point, different position
              ],
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,TEST2',
                offsetToCenter: { x: 5, y: 5 }
              }
            }
          ],
          collapsed: []
        }
      });

      const vizData = createMockVisualizationData({
        viewMaps: {
          'view1': [0, 1]
        },
        splits: [split1, split2]
      });

      const canvasData = createCanvasData();

      // Act
      const result = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        'view1',
        { ...vizData, loadedImages: createMockLoadedImages() },
        canvasData
      );

      // Assert: Should have only 1 unique point (exact set)
      const expectedKeys = new Set([
        pointKey({ splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 })
      ]);
      const actualKeys = new Set(result.keys());
      expect(actualKeys).toEqual(expectedKeys);
    });

    it('should return empty map when view has no points', () => {
      // Create a split with no points
      const split = createMockSplit(0, {
        responseGroups: {
          expanded: [
            {
              label: 'Option A',
              values: [0],
              totalCount: 0,
              totalWeight: 0,
              proportion: 0,
              bounds: { x: 50, y: 50, width: 100, height: 100 },
              pointPositions: [], // No points
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,TEST',
                offsetToCenter: { x: 5, y: 5 }
              }
            }
          ],
          collapsed: []
        }
      });

      const vizData = createMockVisualizationData({
        viewMaps: {
          'view1': [0]
        },
        splits: [split]
      });

      const canvasData = createCanvasData();

      // Act
      const result = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        'view1',
        { ...vizData, loadedImages: createMockLoadedImages() },
        canvasData
      );

      // Assert: Should return empty map
      expect(result.size).toBe(0);
    });
  });

  describe('position computation', () => {
    it('should correctly translate and scale point positions', () => {
      // Setup: Create a split with known bounds and point positions
      // segmentGroupBounds: x=10, y=20
      // response group bounds: x=5, y=8
      // point position: x=3, y=4
      // Expected abstract position: (10+5+3, 20+8+4) = (18, 32)
      const split = createMockSplit(0, {
        segmentGroupBounds: { x: 10, y: 20, width: 100, height: 100 },
        responseGroups: {
          expanded: [
            {
              label: 'Option A',
              values: [0],
              totalCount: 1,
              totalWeight: 1,
              proportion: 1.0,
              bounds: { x: 5, y: 8, width: 50, height: 50 },
              pointPositions: [
                { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }, x: 3, y: 4 }
              ],
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,TEST',
                offsetToCenter: { x: 5, y: 5 }
              }
            }
          ],
          collapsed: []
        }
      });

      const vizData = createMockVisualizationData({
        viewMaps: { 'view1': [0] },
        splits: [split],
        vizWidth: 200,  // Abstract canvas width
        vizHeight: 150  // Abstract canvas height
      });

      const canvasData = createCanvasData();
      // canvasData has pixelWidth: 800, pixelHeight: 600

      // Act
      const result = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        'view1',
        { ...vizData, loadedImages: createMockLoadedImages() },
        canvasData
      );

      // Assert: Verify position calculation
      // Abstract position: (18, 32)
      // Scale to canvas: x = round((18 / 200) * 800) = round(72) = 72
      //                  y = round((32 / 150) * 600) = round(128) = 128
      const key = pointKey({ splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 });
      const pointDisplay = result.get(key);
      expect(pointDisplay).toBeDefined();
      expect(pointDisplay!.position).toEqual({ x: 72, y: 128 });
    });

    it('should handle multiple response groups with different bounds', () => {
      // Create a split with 2 response groups with different bounds
      const split = createMockSplit(0, {
        segmentGroupBounds: { x: 0, y: 0, width: 200, height: 200 },
        responseGroups: {
          expanded: [
            {
              label: 'Group 1',
              values: [0],
              totalCount: 1,
              totalWeight: 1,
              proportion: 0.5,
              bounds: { x: 10, y: 10, width: 80, height: 80 }, // First group at (10, 10)
              pointPositions: [
                { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }, x: 5, y: 5 }
              ],
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,TEST1',
                offsetToCenter: { x: 5, y: 5 }
              }
            },
            {
              label: 'Group 2',
              values: [1],
              totalCount: 1,
              totalWeight: 1,
              proportion: 0.5,
              bounds: { x: 100, y: 100, width: 80, height: 80 }, // Second group at (100, 100)
              pointPositions: [
                { point: { splitIdx: 0, expandedResponseGroupIdx: 1, id: 2 }, x: 8, y: 12 }
              ],
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,TEST2',
                offsetToCenter: { x: 5, y: 5 }
              }
            }
          ],
          collapsed: []
        }
      });

      const vizData = createMockVisualizationData({
        viewMaps: { 'view1': [0] },
        splits: [split],
        vizWidth: 400,
        vizHeight: 400
      });

      const canvasData = createCanvasData();
      // canvasData: 800x600

      // Act
      const result = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        'view1',
        { ...vizData, loadedImages: createMockLoadedImages() },
        canvasData
      );

      // Assert: Group 1 point
      // Abstract: (0 + 10 + 5, 0 + 10 + 5) = (15, 15)
      // Scaled: x = round((15/400)*800) = round(30) = 30
      //         y = round((15/400)*600) = round(22.5) = 23
      const key1 = pointKey({ splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 });
      expect(result.get(key1)!.position).toEqual({ x: 30, y: 23 });

      // Assert: Group 2 point
      // Abstract: (0 + 100 + 8, 0 + 100 + 12) = (108, 112)
      // Scaled: x = round((108/400)*800) = round(216) = 216
      //         y = round((112/400)*600) = round(168) = 168
      const key2 = pointKey({ splitIdx: 0, expandedResponseGroupIdx: 1, id: 2 });
      expect(result.get(key2)!.position).toEqual({ x: 216, y: 168 });
    });

    it('should apply segment group offset for multiple splits', () => {
      // Create two splits with different segment group bounds
      const split1 = createMockSplit(0, {
        segmentGroupBounds: { x: 0, y: 0, width: 100, height: 100 },
        responseGroups: {
          expanded: [
            {
              label: 'Split 1 Group',
              values: [0],
              totalCount: 1,
              totalWeight: 1,
              proportion: 1.0,
              bounds: { x: 20, y: 30, width: 60, height: 60 },
              pointPositions: [
                { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }, x: 10, y: 15 }
              ],
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,TEST',
                offsetToCenter: { x: 5, y: 5 }
              }
            }
          ],
          collapsed: []
        }
      });

      const split2 = createMockSplit(1, {
        segmentGroupBounds: { x: 150, y: 200, width: 100, height: 100 }, // Different offset
        responseGroups: {
          expanded: [
            {
              label: 'Split 2 Group',
              values: [0],
              totalCount: 1,
              totalWeight: 1,
              proportion: 1.0,
              bounds: { x: 25, y: 35, width: 60, height: 60 },
              pointPositions: [
                { point: { splitIdx: 1, expandedResponseGroupIdx: 0, id: 2 }, x: 12, y: 18 }
              ],
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,TEST2',
                offsetToCenter: { x: 5, y: 5 }
              }
            }
          ],
          collapsed: []
        }
      });

      const vizData = createMockVisualizationData({
        viewMaps: { 'view1': [0, 1] },
        splits: [split1, split2],
        vizWidth: 500,
        vizHeight: 500
      });

      const canvasData = createCanvasData();

      // Act
      const result = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        'view1',
        { ...vizData, loadedImages: createMockLoadedImages() },
        canvasData
      );

      // Assert: Split 1 point
      // Abstract: (0 + 20 + 10, 0 + 30 + 15) = (30, 45)
      // Scaled: x = round((30/500)*800) = round(48) = 48
      //         y = round((45/500)*600) = round(54) = 54
      const key1 = pointKey({ splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 });
      expect(result.get(key1)!.position).toEqual({ x: 48, y: 54 });

      // Assert: Split 2 point
      // Abstract: (150 + 25 + 12, 200 + 35 + 18) = (187, 253)
      // Scaled: x = round((187/500)*800) = round(299.2) = 299
      //         y = round((253/500)*600) = round(303.6) = 304
      const key2 = pointKey({ splitIdx: 1, expandedResponseGroupIdx: 0, id: 2 });
      expect(result.get(key2)!.position).toEqual({ x: 299, y: 304 });
    });

    it('should handle position at origin (0,0)', () => {
      const split = createMockSplit(0, {
        segmentGroupBounds: { x: 0, y: 0, width: 100, height: 100 },
        responseGroups: {
          expanded: [
            {
              label: 'Group',
              values: [0],
              totalCount: 1,
              totalWeight: 1,
              proportion: 1.0,
              bounds: { x: 0, y: 0, width: 100, height: 100 },
              pointPositions: [
                { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }, x: 0, y: 0 }
              ],
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,TEST',
                offsetToCenter: { x: 5, y: 5 }
              }
            }
          ],
          collapsed: []
        }
      });

      const vizData = createMockVisualizationData({
        viewMaps: { 'view1': [0] },
        splits: [split],
        vizWidth: 100,
        vizHeight: 100
      });

      const canvasData = createCanvasData();

      // Act
      const result = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        'view1',
        { ...vizData, loadedImages: createMockLoadedImages() },
        canvasData
      );

      // Assert: Position should be (0, 0) in canvas coordinates
      const key = pointKey({ splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 });
      expect(result.get(key)!.position).toEqual({ x: 0, y: 0 });
    });

    it('should round fractional canvas coordinates correctly', () => {
      // Setup values that will produce fractional coordinates
      const split = createMockSplit(0, {
        segmentGroupBounds: { x: 0, y: 0, width: 100, height: 100 },
        responseGroups: {
          expanded: [
            {
              label: 'Group',
              values: [0],
              totalCount: 1,
              totalWeight: 1,
              proportion: 1.0,
              bounds: { x: 0, y: 0, width: 100, height: 100 },
              pointPositions: [
                { point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 }, x: 7, y: 11 }
              ],
              pointImage: {
                svgDataURL: 'data:image/svg+xml;base64,TEST',
                offsetToCenter: { x: 5, y: 5 }
              }
            }
          ],
          collapsed: []
        }
      });

      const vizData = createMockVisualizationData({
        viewMaps: { 'view1': [0] },
        splits: [split],
        vizWidth: 300,  // Will create fractional results
        vizHeight: 300
      });

      const canvasData = createCanvasData();
      // 800x600 canvas

      // Act
      const result = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        'view1',
        { ...vizData, loadedImages: createMockLoadedImages() },
        canvasData
      );

      // Assert: Verify proper rounding
      // Abstract: (7, 11)
      // Scaled: x = round((7/300)*800) = round(18.666...) = 19
      //         y = round((11/300)*600) = round(22) = 22
      const key = pointKey({ splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 });
      expect(result.get(key)!.position).toEqual({ x: 19, y: 22 });
    });
  });
});
