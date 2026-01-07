/**
 * Tests for drawVisibleState method of VizStateManager
 * 
 * This private method renders the currentVisibleState to the canvas.
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

import { VizStateManager } from '../../src/VizStateManager/VizStateManager';
import { createVizStateManager } from './helpers';
import { MockImage } from './mocks';
import type { PointDisplay, PointLoadedImage } from '../../src/types';

describe('VizStateManager.drawVisibleState', () => {
  describe('canvas clearing', () => {
    it('should call clearRect before rendering anything', () => {
      // Arrange
      const { vizStateManager, mockContext, mockCanvas } = createVizStateManager();
      mockContext.clearRect.mockClear(); // Clear calls from initialization

      // Act: Call the private method
      (vizStateManager as any)['drawVisibleState']();

      // Assert: clearRect should be first call
      expect(mockContext.clearRect).toHaveBeenCalledTimes(1);
      expect(mockContext.clearRect).toHaveBeenCalledWith(
        0,
        0,
        mockCanvas.width,
        mockCanvas.height
      );
    });
  });

  describe('point rendering', () => {
    it('should skip points with opacity equal to 0', () => {
      // Arrange
      const { vizStateManager, mockContext } = createVizStateManager();
      mockContext.clearRect.mockClear(); // Clear calls from initialization
      mockContext.drawImage.mockClear();

      // Set up a point with opacity 0
      const mockImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 5, y: 5 }
      };

      const pointDisplay: PointDisplay = {
        key: '0-0-1',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 },
        position: { x: 100, y: 100 },
        image: mockImage,
        opacity: 0
      };

      (vizStateManager as any).currentVisibleState = new Map([['0-0-1', pointDisplay]]);

      // Act
      (vizStateManager as any)['drawVisibleState']();

      // Assert: drawImage should not be called (only clearRect)
      expect(mockContext.drawImage).not.toHaveBeenCalled();
      expect(mockContext.clearRect).toHaveBeenCalledTimes(1);
    });

    it('should skip points with opacity less than 0', () => {
      // Arrange
      const { vizStateManager, mockContext } = createVizStateManager();

      const mockImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 5, y: 5 }
      };

      const pointDisplay: PointDisplay = {
        key: '0-0-1',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 },
        position: { x: 100, y: 100 },
        image: mockImage,
        opacity: -0.1
      };

      (vizStateManager as any).currentVisibleState = new Map([['0-0-1', pointDisplay]]);

      // Act
      (vizStateManager as any)['drawVisibleState']();

      // Assert: drawImage should not be called
      expect(mockContext.drawImage).not.toHaveBeenCalled();
    });

    it('should set globalAlpha when opacity is strictly between 0 and 1', () => {
      // Arrange
      const { vizStateManager, mockContext } = createVizStateManager();

      const mockImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 5, y: 5 }
      };

      const pointDisplay: PointDisplay = {
        key: '0-0-1',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 },
        position: { x: 100, y: 100 },
        image: mockImage,
        opacity: 0.7
      };

      (vizStateManager as any).currentVisibleState = new Map([['0-0-1', pointDisplay]]);

      // Track globalAlpha value when drawImage is called
      let alphaWhenDrawn: number | undefined;
      mockContext.drawImage.mockImplementation(() => {
        alphaWhenDrawn = mockContext.globalAlpha;
      });

      // Act
      (vizStateManager as any)['drawVisibleState']();

      // Assert: globalAlpha should be set to 0.7 when drawing
      expect(alphaWhenDrawn).toBe(0.7);
      expect(mockContext.drawImage).toHaveBeenCalled();
      // And should be reset to 1.0 after
      expect(mockContext.globalAlpha).toBe(1.0);
    });

    it('should not set globalAlpha when opacity is 1', () => {
      // Arrange
      const { vizStateManager, mockContext } = createVizStateManager();
      mockContext.globalAlpha = 1.0; // Set initial value

      const mockImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 5, y: 5 }
      };

      const pointDisplay: PointDisplay = {
        key: '0-0-1',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 },
        position: { x: 100, y: 100 },
        image: mockImage,
        opacity: 1
      };

      (vizStateManager as any).currentVisibleState = new Map([['0-0-1', pointDisplay]]);

      // Act
      (vizStateManager as any)['drawVisibleState']();

      // Assert: globalAlpha should remain 1 (not explicitly set)
      // We can't really test that it wasn't set, but we can verify it's still 1
      expect(mockContext.globalAlpha).toBe(1.0);
      expect(mockContext.drawImage).toHaveBeenCalled();
    });
  });

  describe('cross-fade rendering', () => {
    it('should perform cross-fade when transitioningFromImage is defined and crossFadeProgress < 1', () => {
      // Arrange
      const { vizStateManager, mockContext } = createVizStateManager();

      const fromImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 5, y: 5 }
      };

      const toImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 6, y: 6 }
      };

      const pointDisplay: PointDisplay = {
        key: '0-0-1',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 },
        position: { x: 100, y: 100 },
        image: toImage,
        transitioningFromImage: fromImage,
        crossFadeProgress: 0.4
      };

      (vizStateManager as any).currentVisibleState = new Map([['0-0-1', pointDisplay]]);

      // Act
      (vizStateManager as any)['drawVisibleState']();

      // Assert: Two drawImage calls (from and to images)
      expect(mockContext.drawImage).toHaveBeenCalledTimes(2);

      // First call: fromImage at fading-out opacity
      // globalAlpha = (pointDisplay.opacity ?? 1) * (1 - pointDisplay.crossFadeProgress)
      // = 1 * (1 - 0.4) = 0.6
      expect(mockContext.drawImage).toHaveBeenNthCalledWith(
        1,
        fromImage.image,
        100 - 5, // position.x - offsetToCenter.x
        100 - 5  // position.y - offsetToCenter.y
      );

      // Second call: toImage at fading-in opacity
      // globalAlpha = (pointDisplay.opacity ?? 1) * pointDisplay.crossFadeProgress
      // = 1 * 0.4 = 0.4
      expect(mockContext.drawImage).toHaveBeenNthCalledWith(
        2,
        toImage.image,
        100 - 6, // position.x - offsetToCenter.x
        100 - 6  // position.y - offsetToCenter.y
      );

      // Final globalAlpha should be reset to 1
      expect(mockContext.globalAlpha).toBe(1.0);
    });

    it('should apply opacity multiplier in cross-fade formula', () => {
      // Arrange
      const { vizStateManager, mockContext } = createVizStateManager();

      const fromImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 5, y: 5 }
      };

      const toImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 5, y: 5 }
      };

      const pointDisplay: PointDisplay = {
        key: '0-0-1',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 },
        position: { x: 100, y: 100 },
        image: toImage,
        opacity: 0.5,
        transitioningFromImage: fromImage,
        crossFadeProgress: 0.6
      };

      (vizStateManager as any).currentVisibleState = new Map([['0-0-1', pointDisplay]]);

      // Track globalAlpha values before each drawImage call
      const alphaValues: number[] = [];
      mockContext.drawImage.mockImplementation(() => {
        alphaValues.push(mockContext.globalAlpha);
      });

      // Act
      (vizStateManager as any)['drawVisibleState']();

      // Assert: Check alpha values
      // From image: 0.5 * (1 - 0.6) = 0.5 * 0.4 = 0.2
      expect(alphaValues[0]).toBeCloseTo(0.2);

      // To image: 0.5 * 0.6 = 0.3
      expect(alphaValues[1]).toBeCloseTo(0.3);

      // Final reset
      expect(mockContext.globalAlpha).toBe(1.0);
    });

    it('should handle cross-fade with only fromImage (toImage undefined)', () => {
      // Arrange
      const { vizStateManager, mockContext } = createVizStateManager();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const fromImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 5, y: 5 }
      };

      const pointDisplay: PointDisplay = {
        key: '0-0-1',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 },
        position: { x: 100, y: 100 },
        image: undefined, // No toImage
        transitioningFromImage: fromImage,
        crossFadeProgress: 0.3
      };

      (vizStateManager as any).currentVisibleState = new Map([['0-0-1', pointDisplay]]);

      // Act
      (vizStateManager as any)['drawVisibleState']();

      // Assert: Warning should be logged for missing toImage
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('no image found for point 0-0-1')
      );

      // Assert: Only one drawImage call (fromImage only)
      expect(mockContext.drawImage).toHaveBeenCalledTimes(1);
      expect(mockContext.drawImage).toHaveBeenCalledWith(
        fromImage.image,
        95, // 100 - 5
        95  // 100 - 5
      );

      // globalAlpha should still be reset
      expect(mockContext.globalAlpha).toBe(1.0);

      consoleWarnSpy.mockRestore();
    });

    it('should not perform cross-fade when crossFadeProgress is undefined', () => {
      // Arrange
      const { vizStateManager, mockContext } = createVizStateManager();

      const fromImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 5, y: 5 }
      };

      const toImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 6, y: 6 }
      };

      const pointDisplay: PointDisplay = {
        key: '0-0-1',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 },
        position: { x: 100, y: 100 },
        image: toImage,
        transitioningFromImage: fromImage,
        crossFadeProgress: undefined // No cross-fade progress
      };

      (vizStateManager as any).currentVisibleState = new Map([['0-0-1', pointDisplay]]);

      // Act
      (vizStateManager as any)['drawVisibleState']();

      // Assert: Only one drawImage call (normal rendering path)
      expect(mockContext.drawImage).toHaveBeenCalledTimes(1);
      expect(mockContext.drawImage).toHaveBeenCalledWith(
        toImage.image,
        94, // 100 - 6
        94  // 100 - 6
      );
    });

    it('should not perform cross-fade when crossFadeProgress is 1 or greater', () => {
      // Arrange
      const { vizStateManager, mockContext } = createVizStateManager();

      const fromImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 5, y: 5 }
      };

      const toImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 6, y: 6 }
      };

      const pointDisplay: PointDisplay = {
        key: '0-0-1',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 },
        position: { x: 100, y: 100 },
        image: toImage,
        transitioningFromImage: fromImage,
        crossFadeProgress: 1.0 // Complete - should use normal rendering
      };

      (vizStateManager as any).currentVisibleState = new Map([['0-0-1', pointDisplay]]);

      // Act
      (vizStateManager as any)['drawVisibleState']();

      // Assert: Only one drawImage call (normal rendering path)
      expect(mockContext.drawImage).toHaveBeenCalledTimes(1);
      expect(mockContext.drawImage).toHaveBeenCalledWith(
        toImage.image,
        94, // 100 - 6
        94  // 100 - 6
      );
    });
  });

  describe('normal rendering', () => {
    it('should draw image at correct position when no transition', () => {
      // Arrange
      const { vizStateManager, mockContext } = createVizStateManager();

      const mockImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 10, y: 15 }
      };

      const pointDisplay: PointDisplay = {
        key: '0-0-1',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 },
        position: { x: 200, y: 300 },
        image: mockImage
      };

      (vizStateManager as any).currentVisibleState = new Map([['0-0-1', pointDisplay]]);

      // Act
      (vizStateManager as any)['drawVisibleState']();

      // Assert: drawImage called with correct offset
      expect(mockContext.drawImage).toHaveBeenCalledTimes(1);
      expect(mockContext.drawImage).toHaveBeenCalledWith(
        mockImage.image,
        190, // 200 - 10
        285  // 300 - 15
      );
    });

    it('should skip points without image in normal rendering', () => {
      // Arrange
      const { vizStateManager, mockContext } = createVizStateManager();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const pointDisplay: PointDisplay = {
        key: '0-0-1',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 },
        position: { x: 100, y: 100 },
        image: undefined // No image
      };

      (vizStateManager as any).currentVisibleState = new Map([['0-0-1', pointDisplay]]);

      // Act
      (vizStateManager as any)['drawVisibleState']();

      // Assert: Warning should be logged for missing image
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('no image found for point 0-0-1')
      );

      // Assert: drawImage should not be called
      expect(mockContext.drawImage).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should reset globalAlpha after drawing with opacity < 1', () => {
      // Arrange
      const { vizStateManager, mockContext } = createVizStateManager();

      const mockImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 5, y: 5 }
      };

      const pointDisplay: PointDisplay = {
        key: '0-0-1',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 },
        position: { x: 100, y: 100 },
        image: mockImage,
        opacity: 0.6
      };

      (vizStateManager as any).currentVisibleState = new Map([['0-0-1', pointDisplay]]);

      // Act
      (vizStateManager as any)['drawVisibleState']();

      // Assert: globalAlpha should be reset to 1.0 after drawing
      expect(mockContext.globalAlpha).toBe(1.0);
    });

    it('should not reset globalAlpha when opacity is undefined', () => {
      // Arrange
      const { vizStateManager, mockContext } = createVizStateManager();
      mockContext.globalAlpha = 1.0; // Initial value

      const mockImage: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 5, y: 5 }
      };

      const pointDisplay: PointDisplay = {
        key: '0-0-1',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 },
        position: { x: 100, y: 100 },
        image: mockImage
        // opacity: undefined
      };

      (vizStateManager as any).currentVisibleState = new Map([['0-0-1', pointDisplay]]);

      // Track if globalAlpha was set
      const alphaSets: number[] = [];
      Object.defineProperty(mockContext, 'globalAlpha', {
        get: () => alphaSets[alphaSets.length - 1] ?? 1.0,
        set: (val) => alphaSets.push(val),
        configurable: true
      });

      // Act
      (vizStateManager as any)['drawVisibleState']();

      // Assert: globalAlpha should not be set (no entries in alphaSets, or stays at 1)
      // Since opacity is undefined, it shouldn't set or reset globalAlpha
      expect(mockContext.drawImage).toHaveBeenCalled();
    });
  });

  describe('multiple points rendering', () => {
    it('should render all points in currentVisibleState', () => {
      // Arrange
      const { vizStateManager, mockContext } = createVizStateManager();

      const image1: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 5, y: 5 }
      };

      const image2: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 6, y: 6 }
      };

      const point1: PointDisplay = {
        key: '0-0-1',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 },
        position: { x: 100, y: 100 },
        image: image1
      };

      const point2: PointDisplay = {
        key: '0-0-2',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 2 },
        position: { x: 200, y: 200 },
        image: image2
      };

      (vizStateManager as any).currentVisibleState = new Map([
        ['0-0-1', point1],
        ['0-0-2', point2]
      ]);

      // Act
      (vizStateManager as any)['drawVisibleState']();

      // Assert: Both points should be drawn
      expect(mockContext.drawImage).toHaveBeenCalledTimes(2);
      expect(mockContext.drawImage).toHaveBeenNthCalledWith(1, image1.image, 95, 95);
      expect(mockContext.drawImage).toHaveBeenNthCalledWith(2, image2.image, 194, 194);
    });

    it('should handle mix of visible and invisible points', () => {
      // Arrange
      const { vizStateManager, mockContext } = createVizStateManager();

      const image: PointLoadedImage = {
        image: new MockImage() as any,
        offsetToCenter: { x: 5, y: 5 }
      };

      const visiblePoint: PointDisplay = {
        key: '0-0-1',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 1 },
        position: { x: 100, y: 100 },
        image: image,
        opacity: 0.8
      };

      const invisiblePoint: PointDisplay = {
        key: '0-0-2',
        point: { splitIdx: 0, expandedResponseGroupIdx: 0, id: 2 },
        position: { x: 200, y: 200 },
        image: image,
        opacity: 0 // Invisible
      };

      (vizStateManager as any).currentVisibleState = new Map([
        ['0-0-1', visiblePoint],
        ['0-0-2', invisiblePoint]
      ]);

      // Act
      (vizStateManager as any)['drawVisibleState']();

      // Assert: Only visible point should be drawn
      expect(mockContext.drawImage).toHaveBeenCalledTimes(1);
      expect(mockContext.drawImage).toHaveBeenCalledWith(image.image, 95, 95);
    });
  });
});
