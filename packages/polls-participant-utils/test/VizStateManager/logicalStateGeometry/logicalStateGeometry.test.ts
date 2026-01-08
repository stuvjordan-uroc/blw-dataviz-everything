/**
 * Geometric validation tests for VizStateManager
 * 
 * Validates that segment groups, segments, and points maintain correct
 * spatial relationships after state mutations and canvas resizing.
 */

import { computeSegmentDisplay } from '../../../src/VizStateManager/segmentDisplayComputation';
import { computeTargetVisibleState } from '../../../src/VizStateManager/pointDisplayComputation';
import { validateGeometry } from './helpers';
import { createSimpleFixture, createComplexFixture } from './fixtures';
import type { VizData } from '../../../src/VizStateManager/types';

describe('Geometric Validation - Simple Fixture', () => {
  describe('Initial state (expanded mode)', () => {
    it('should have all geometric properties valid', () => {
      const { vizData, canvasData, loadedImages } = createSimpleFixture();
      const vizDataWithImages: VizData = { ...vizData, loadedImages };

      const segmentDisplay = computeSegmentDisplay(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        canvasData
      );

      const targetVisibleState = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        canvasData
      );

      validateGeometry(
        segmentDisplay,
        targetVisibleState,
        canvasData.pixelWidth,
        canvasData.pixelHeight,
        vizData.viewMaps[''],
        'expanded'
      );
    });
  });

  describe('Collapsed mode', () => {
    it('should have all geometric properties valid', () => {
      const { vizData, canvasData, loadedImages } = createSimpleFixture();
      const vizDataWithImages: VizData = { ...vizData, loadedImages };

      const segmentDisplay = computeSegmentDisplay(
        vizData.splits,
        'collapsed',
        '',
        vizDataWithImages,
        canvasData
      );

      const targetVisibleState = computeTargetVisibleState(
        vizData.splits,
        'collapsed',
        '',
        vizDataWithImages,
        canvasData
      );

      validateGeometry(
        segmentDisplay,
        targetVisibleState,
        canvasData.pixelWidth,
        canvasData.pixelHeight,
        vizData.viewMaps[''],
        'collapsed'
      );
    });
  });

  describe('After canvas resize (scale up)', () => {
    it('should maintain geometric properties at larger canvas size', () => {
      const { vizData, canvasData, loadedImages } = createSimpleFixture();
      const vizDataWithImages: VizData = { ...vizData, loadedImages };

      const scaledCanvasData = {
        ...canvasData,
        pixelWidth: 1600,
        pixelHeight: 1200
      };

      const segmentDisplay = computeSegmentDisplay(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        scaledCanvasData
      );

      const targetVisibleState = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        scaledCanvasData
      );

      validateGeometry(
        segmentDisplay,
        targetVisibleState,
        scaledCanvasData.pixelWidth,
        scaledCanvasData.pixelHeight,
        vizData.viewMaps[''],
        'expanded'
      );
    });
  });

  describe('After canvas resize (scale down)', () => {
    it('should maintain geometric properties at smaller canvas size', () => {
      const { vizData, canvasData, loadedImages } = createSimpleFixture();
      const vizDataWithImages: VizData = { ...vizData, loadedImages };

      const scaledCanvasData = {
        ...canvasData,
        pixelWidth: 400,
        pixelHeight: 300
      };

      const segmentDisplay = computeSegmentDisplay(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        scaledCanvasData
      );

      const targetVisibleState = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        scaledCanvasData
      );

      validateGeometry(
        segmentDisplay,
        targetVisibleState,
        scaledCanvasData.pixelWidth,
        scaledCanvasData.pixelHeight,
        vizData.viewMaps[''],
        'expanded'
      );
    });
  });
});

describe('Geometric Validation - Complex Fixture (2x2 Grid)', () => {
  describe('Initial state (all 4 segment groups, expanded mode)', () => {
    it('should have all geometric properties valid', () => {
      const { vizData, canvasData, loadedImages } = createComplexFixture();
      const vizDataWithImages: VizData = { ...vizData, loadedImages };

      const segmentDisplay = computeSegmentDisplay(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        canvasData
      );

      const targetVisibleState = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        canvasData
      );

      validateGeometry(
        segmentDisplay,
        targetVisibleState,
        canvasData.pixelWidth,
        canvasData.pixelHeight,
        vizData.viewMaps[''],
        'expanded'
      );

      expect(segmentDisplay).toHaveLength(4);
    });
  });

  describe('Collapsed mode (all 4 segment groups)', () => {
    it('should have all geometric properties valid', () => {
      const { vizData, canvasData, loadedImages } = createComplexFixture();
      const vizDataWithImages: VizData = { ...vizData, loadedImages };

      const segmentDisplay = computeSegmentDisplay(
        vizData.splits,
        'collapsed',
        '',
        vizDataWithImages,
        canvasData
      );

      const targetVisibleState = computeTargetVisibleState(
        vizData.splits,
        'collapsed',
        '',
        vizDataWithImages,
        canvasData
      );

      validateGeometry(
        segmentDisplay,
        targetVisibleState,
        canvasData.pixelWidth,
        canvasData.pixelHeight,
        vizData.viewMaps[''],
        'collapsed'
      );
    });
  });

  describe('View change (top row only)', () => {
    it('should have valid geometry with only 2 segment groups', () => {
      const { vizData, canvasData, loadedImages } = createComplexFixture();
      const vizDataWithImages: VizData = { ...vizData, loadedImages };

      const segmentDisplay = computeSegmentDisplay(
        vizData.splits,
        'expanded',
        'view1',
        vizDataWithImages,
        canvasData
      );

      const targetVisibleState = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        'view1',
        vizDataWithImages,
        canvasData
      );

      validateGeometry(
        segmentDisplay,
        targetVisibleState,
        canvasData.pixelWidth,
        canvasData.pixelHeight,
        vizData.viewMaps['view1'],
        'expanded'
      );

      expect(segmentDisplay).toHaveLength(2);
    });
  });

  describe('View change (bottom row only)', () => {
    it('should have valid geometry with only 2 segment groups', () => {
      const { vizData, canvasData, loadedImages } = createComplexFixture();
      const vizDataWithImages: VizData = { ...vizData, loadedImages };

      const segmentDisplay = computeSegmentDisplay(
        vizData.splits,
        'expanded',
        'view2',
        vizDataWithImages,
        canvasData
      );

      const targetVisibleState = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        'view2',
        vizDataWithImages,
        canvasData
      );

      validateGeometry(
        segmentDisplay,
        targetVisibleState,
        canvasData.pixelWidth,
        canvasData.pixelHeight,
        vizData.viewMaps['view2'],
        'expanded'
      );

      expect(segmentDisplay).toHaveLength(2);
    });
  });

  describe('After canvas resize (scale up)', () => {
    it('should maintain geometric properties at larger canvas size', () => {
      const { vizData, canvasData, loadedImages } = createComplexFixture();
      const vizDataWithImages: VizData = { ...vizData, loadedImages };

      const scaledCanvasData = {
        ...canvasData,
        pixelWidth: 2000,
        pixelHeight: 1600
      };

      const segmentDisplay = computeSegmentDisplay(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        scaledCanvasData
      );

      const targetVisibleState = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        scaledCanvasData
      );

      validateGeometry(
        segmentDisplay,
        targetVisibleState,
        scaledCanvasData.pixelWidth,
        scaledCanvasData.pixelHeight,
        vizData.viewMaps[''],
        'expanded'
      );
    });
  });

  describe('After canvas resize (scale down)', () => {
    it('should maintain geometric properties at smaller canvas size', () => {
      const { vizData, canvasData, loadedImages } = createComplexFixture();
      const vizDataWithImages: VizData = { ...vizData, loadedImages };

      const scaledCanvasData = {
        ...canvasData,
        pixelWidth: 500,
        pixelHeight: 400
      };

      const segmentDisplay = computeSegmentDisplay(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        scaledCanvasData
      );

      const targetVisibleState = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        scaledCanvasData
      );

      validateGeometry(
        segmentDisplay,
        targetVisibleState,
        scaledCanvasData.pixelWidth,
        scaledCanvasData.pixelHeight,
        vizData.viewMaps[''],
        'expanded'
      );
    });
  });

  describe('Combined view and mode change', () => {
    it('should maintain geometric properties with view1 and collapsed mode', () => {
      const { vizData, canvasData, loadedImages } = createComplexFixture();
      const vizDataWithImages: VizData = { ...vizData, loadedImages };

      const segmentDisplay = computeSegmentDisplay(
        vizData.splits,
        'collapsed',
        'view1',
        vizDataWithImages,
        canvasData
      );

      const targetVisibleState = computeTargetVisibleState(
        vizData.splits,
        'collapsed',
        'view1',
        vizDataWithImages,
        canvasData
      );

      validateGeometry(
        segmentDisplay,
        targetVisibleState,
        canvasData.pixelWidth,
        canvasData.pixelHeight,
        vizData.viewMaps['view1'],
        'collapsed'
      );
    });
  });
});

describe('Edge Cases', () => {
  describe('Small canvas', () => {
    it('should maintain geometric properties at small sizes', () => {
      const { vizData, canvasData, loadedImages } = createSimpleFixture();
      const vizDataWithImages: VizData = { ...vizData, loadedImages };

      const smallCanvasData = {
        ...canvasData,
        pixelWidth: 300,
        pixelHeight: 225
      };

      const segmentDisplay = computeSegmentDisplay(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        smallCanvasData
      );

      const targetVisibleState = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        smallCanvasData
      );

      validateGeometry(
        segmentDisplay,
        targetVisibleState,
        smallCanvasData.pixelWidth,
        smallCanvasData.pixelHeight,
        vizData.viewMaps[''],
        'expanded'
      );
    });
  });

  describe('Very large canvas', () => {
    it('should maintain geometric properties at very large sizes', () => {
      const { vizData, canvasData, loadedImages } = createComplexFixture();
      const vizDataWithImages: VizData = { ...vizData, loadedImages };

      const largeCanvasData = {
        ...canvasData,
        pixelWidth: 4000,
        pixelHeight: 3200
      };

      const segmentDisplay = computeSegmentDisplay(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        largeCanvasData
      );

      const targetVisibleState = computeTargetVisibleState(
        vizData.splits,
        'expanded',
        '',
        vizDataWithImages,
        largeCanvasData
      );

      validateGeometry(
        segmentDisplay,
        targetVisibleState,
        largeCanvasData.pixelWidth,
        largeCanvasData.pixelHeight,
        vizData.viewMaps[''],
        'expanded'
      );
    });
  });
});
