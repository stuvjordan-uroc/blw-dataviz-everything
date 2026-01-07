/**
 * Tests for computeCanvasPixelDimensions pure function
 * 
 * This function computes canvas pixel dimensions while maintaining aspect ratio
 * and ensuring both width and height are >= 1.
 */

import { computeCanvasPixelDimensions } from '../../src/VizStateManager/canvasComputation';

describe('computeCanvasPixelDimensions', () => {
  describe('normal cases - no shimming required', () => {
    it('should compute correct dimensions for standard aspect ratio', () => {
      // Aspect ratio 0.75 (800x600 viz)
      const result = computeCanvasPixelDimensions(400, 0.75);

      expect(result.shimmedPixelWidth).toBe(400);
      expect(result.shimmedPixelHeight).toBe(300); // 400 * 0.75
    });

    it('should compute correct dimensions for 1:1 aspect ratio', () => {
      const result = computeCanvasPixelDimensions(500, 1.0);

      expect(result.shimmedPixelWidth).toBe(500);
      expect(result.shimmedPixelHeight).toBe(500);
    });

    it('should compute correct dimensions for tall aspect ratio', () => {
      // Aspect ratio 2.0 (height is 2x width)
      const result = computeCanvasPixelDimensions(300, 2.0);

      expect(result.shimmedPixelWidth).toBe(300);
      expect(result.shimmedPixelHeight).toBe(600); // 300 * 2.0
    });

    it('should compute correct dimensions for wide aspect ratio', () => {
      // Aspect ratio 0.5 (height is 0.5x width)
      const result = computeCanvasPixelDimensions(800, 0.5);

      expect(result.shimmedPixelWidth).toBe(800);
      expect(result.shimmedPixelHeight).toBe(400); // 800 * 0.5
    });
  });

  describe('shimming cases - ensuring minimum dimension of 1', () => {
    it('should shim very narrow width to ensure height >= 1', () => {
      // With aspect ratio 0.75, we need width >= 1/0.75 = 1.333 to get height >= 1
      const result = computeCanvasPixelDimensions(1, 0.75);

      // Should shim to at least 2 (ceil(1.333))
      expect(result.shimmedPixelWidth).toBeGreaterThanOrEqual(2);
      expect(result.shimmedPixelHeight).toBeGreaterThanOrEqual(1);
    });

    it('should shim very narrow width with tall aspect ratio', () => {
      // With aspect ratio 10, we need width >= 1/10 = 0.1
      // But we also need width >= 1
      const result = computeCanvasPixelDimensions(0.5, 10);

      expect(result.shimmedPixelWidth).toBeGreaterThanOrEqual(1);
      expect(result.shimmedPixelHeight).toBeGreaterThanOrEqual(1);
    });

    it('should handle very small aspect ratio (wide viz)', () => {
      // Aspect ratio 0.1 (very wide viz)
      // Need width >= 1/0.1 = 10 to ensure height >= 1
      const result = computeCanvasPixelDimensions(5, 0.1);

      expect(result.shimmedPixelWidth).toBeGreaterThanOrEqual(10);
      expect(result.shimmedPixelHeight).toBeGreaterThanOrEqual(1);
    });
  });

  describe('rounding behavior', () => {
    it('should round requested width to nearest integer', () => {
      const result = computeCanvasPixelDimensions(400.7, 0.75);

      expect(result.shimmedPixelWidth).toBe(401); // Math.round(400.7)
      expect(result.shimmedPixelHeight).toBe(301); // Math.round(401 * 0.75)
    });

    it('should round computed height to nearest integer', () => {
      // Choose values where height doesn't land on integer
      const result = computeCanvasPixelDimensions(100, 0.333);

      expect(result.shimmedPixelWidth).toBe(100);
      expect(result.shimmedPixelHeight).toBe(33); // Math.round(100 * 0.333)
    });
  });

  describe('edge cases', () => {
    it('should handle zero requested width by shimming to minimum', () => {
      const result = computeCanvasPixelDimensions(0, 0.75);

      // Should shim to minimum value that ensures both dimensions >= 1
      expect(result.shimmedPixelWidth).toBeGreaterThanOrEqual(1);
      expect(result.shimmedPixelHeight).toBeGreaterThanOrEqual(1);
    });

    it('should handle negative requested width by shimming to minimum', () => {
      const result = computeCanvasPixelDimensions(-100, 0.75);

      // Should shim to minimum value that ensures both dimensions >= 1
      expect(result.shimmedPixelWidth).toBeGreaterThanOrEqual(1);
      expect(result.shimmedPixelHeight).toBeGreaterThanOrEqual(1);
    });

    it('should handle very large requested width', () => {
      const result = computeCanvasPixelDimensions(10000, 0.75);

      expect(result.shimmedPixelWidth).toBe(10000);
      expect(result.shimmedPixelHeight).toBe(7500);
    });
  });

  describe('consistent with original implementation', () => {
    it('should maintain invariant: both dimensions are always >= 1', () => {
      // Test several aspect ratios and widths
      const testCases = [
        { width: 1, aspectRatio: 0.75 },
        { width: 5, aspectRatio: 0.1 },
        { width: 100, aspectRatio: 2.0 },
        { width: 0.5, aspectRatio: 1.0 },
        { width: 0, aspectRatio: 0.5 },
        { width: -10, aspectRatio: 1.5 }
      ];

      testCases.forEach(({ width, aspectRatio }) => {
        const result = computeCanvasPixelDimensions(width, aspectRatio);

        // Always ensure both dimensions >= 1
        expect(result.shimmedPixelWidth).toBeGreaterThanOrEqual(1);
        expect(result.shimmedPixelHeight).toBeGreaterThanOrEqual(1);

        // Verify the computed height matches the width * aspectRatio (rounded)
        expect(result.shimmedPixelHeight).toBe(Math.round(result.shimmedPixelWidth * aspectRatio));
      });
    });
  });
});
