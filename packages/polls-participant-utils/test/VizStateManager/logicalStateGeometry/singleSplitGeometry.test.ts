/**
 * Geometric validation tests for SingleSplitCanvas computation functions
 * 
 * Tests that computeSingleSplitSegmentDisplay and computeSingleSplitTVS produce
 * geometrically correct layouts where:
 * 1. Segment group bounds are co-extensive with canvas (x=0, y=0, width=canvasWidth, height=canvasHeight)
 * 2. Segments (response groups) lie within the segment group
 * 3. Segments are non-overlapping
 * 4. Points lie within their parent segments
 */

import { computeSingleSplitSegmentDisplay } from '../../../src/VizStateManager/SingleSplitCanvas/computeSegmentDisplay';
import { computeSingleSplitTVS } from '../../../src/VizStateManager/SingleSplitCanvas/computeTargetVisibleState';
import { createSimpleFixture, createComplexFixture } from './fixtures';
import {
  assertRectWithinParent,
  assertSegmentsNonOverlapping,
  assertPointWithinSegment
} from './helpers';
import type { CanvasData } from '../../../src/VizStateManager/types';
import type { SplitWithSegmentGroup } from 'shared-types';

const PIXEL_TOLERANCE = 1;

/**
 * Helper to assert segment group bounds match the drawable area (accounting for margins)
 */
function assertSegmentGroupCoExtensiveWithCanvas(
  segmentGroupBounds: { x: number; y: number; width: number; height: number },
  canvasData: CanvasData
) {
  expect(segmentGroupBounds.x).toBe(canvasData.margin.x);
  expect(segmentGroupBounds.y).toBe(canvasData.margin.y);
  expect(segmentGroupBounds.width).toBe(canvasData.pixelWidth - 2 * canvasData.margin.x);
  expect(segmentGroupBounds.height).toBe(canvasData.pixelHeight - 2 * canvasData.margin.y);
}

/**
 * Validate geometric properties for a single split
 */
function validateSingleSplitGeometry(
  split: SplitWithSegmentGroup,
  displayMode: 'expanded' | 'collapsed',
  canvasData: CanvasData,
  loadedImages: Map<string, any>
) {
  // Compute segment display and target visible state
  const segmentDisplay = computeSingleSplitSegmentDisplay(split, displayMode, canvasData);
  const targetVisibleState = computeSingleSplitTVS(split, displayMode, loadedImages, canvasData);

  // 1. Segment group bounds co-extensive with canvas (accounting for margins)
  assertSegmentGroupCoExtensiveWithCanvas(
    segmentDisplay.segmentGroupBounds,
    canvasData
  );

  // 2. Each segment within segment group
  segmentDisplay.responseGroups.forEach((rg, idx) => {
    assertRectWithinParent(
      rg.bounds,
      segmentDisplay.segmentGroupBounds,
      `Segment ${idx}`,
      'Segment group'
    );
  });

  // 3. Segments non-overlapping
  assertSegmentsNonOverlapping(segmentDisplay.responseGroups.map(rg => rg.bounds));

  // 4. Points within parent segments
  for (const [pointKey, pointDisplay] of targetVisibleState) {
    const { point, position } = pointDisplay;

    // Find the segment for this point
    let segment;

    if (displayMode === 'expanded') {
      segment = segmentDisplay.responseGroups[point.expandedResponseGroupIdx]?.bounds;
    } else {
      // Collapsed mode: all points in single segment at index 0
      segment = segmentDisplay.responseGroups[0]?.bounds;
    }

    if (segment) {
      assertPointWithinSegment(position, segment, `Point ${pointKey}`);
    }
  }
}

describe('SingleSplitCanvas Geometric Validation', () => {
  describe('Simple Fixture (1 split, 2 segments)', () => {
    const fixture = createSimpleFixture();
    const split = fixture.vizData.splits[0];

    it('should have correct geometry in expanded mode at initial canvas size (800x600)', () => {
      validateSingleSplitGeometry(
        split,
        'expanded',
        fixture.canvasData,
        fixture.loadedImages
      );
    });

    it('should have correct geometry in collapsed mode at initial canvas size (800x600)', () => {
      validateSingleSplitGeometry(
        split,
        'collapsed',
        fixture.canvasData,
        fixture.loadedImages
      );
    });

    it('should have correct geometry in expanded mode after scaling up to 2000x1500', () => {
      const largeCanvas: CanvasData = {
        ...fixture.canvasData,
        pixelWidth: 2000,
        pixelHeight: 1500
      };
      validateSingleSplitGeometry(
        split,
        'expanded',
        largeCanvas,
        fixture.loadedImages
      );
    });

    it('should have correct geometry in collapsed mode after scaling up to 2000x1500', () => {
      const largeCanvas: CanvasData = {
        ...fixture.canvasData,
        pixelWidth: 2000,
        pixelHeight: 1500
      };
      validateSingleSplitGeometry(
        split,
        'collapsed',
        largeCanvas,
        fixture.loadedImages
      );
    });

    it('should have correct geometry in expanded mode after scaling down to 300x225', () => {
      const smallCanvas: CanvasData = {
        ...fixture.canvasData,
        pixelWidth: 300,
        pixelHeight: 225
      };
      validateSingleSplitGeometry(
        split,
        'expanded',
        smallCanvas,
        fixture.loadedImages
      );
    });

    it('should have correct geometry in collapsed mode after scaling down to 300x225', () => {
      const smallCanvas: CanvasData = {
        ...fixture.canvasData,
        pixelWidth: 300,
        pixelHeight: 225
      };
      validateSingleSplitGeometry(
        split,
        'collapsed',
        smallCanvas,
        fixture.loadedImages
      );
    });
  });

  describe('Complex Fixture - First split (2x2 grid, top-left)', () => {
    const fixture = createComplexFixture();
    const split = fixture.vizData.splits[0]; // Top-left split

    it('should have correct geometry in expanded mode at initial canvas size', () => {
      validateSingleSplitGeometry(
        split,
        'expanded',
        fixture.canvasData,
        fixture.loadedImages
      );
    });

    it('should have correct geometry in collapsed mode at initial canvas size', () => {
      validateSingleSplitGeometry(
        split,
        'collapsed',
        fixture.canvasData,
        fixture.loadedImages
      );
    });

    it('should have correct geometry after scaling up to 4000x3000', () => {
      const largeCanvas: CanvasData = {
        ...fixture.canvasData,
        pixelWidth: 4000,
        pixelHeight: 3000
      };
      validateSingleSplitGeometry(
        split,
        'expanded',
        largeCanvas,
        fixture.loadedImages
      );
    });

    it('should have correct geometry after scaling down to 400x300', () => {
      const smallCanvas: CanvasData = {
        ...fixture.canvasData,
        pixelWidth: 400,
        pixelHeight: 300
      };
      validateSingleSplitGeometry(
        split,
        'expanded',
        smallCanvas,
        fixture.loadedImages
      );
    });
  });

  describe('Complex Fixture - Second split (2x2 grid, top-right)', () => {
    const fixture = createComplexFixture();
    const split = fixture.vizData.splits[1]; // Top-right split

    it('should have correct geometry in expanded mode at initial canvas size', () => {
      validateSingleSplitGeometry(
        split,
        'expanded',
        fixture.canvasData,
        fixture.loadedImages
      );
    });

    it('should have correct geometry in collapsed mode at initial canvas size', () => {
      validateSingleSplitGeometry(
        split,
        'collapsed',
        fixture.canvasData,
        fixture.loadedImages
      );
    });
  });

  describe('Complex Fixture - Third split (2x2 grid, bottom-left)', () => {
    const fixture = createComplexFixture();
    const split = fixture.vizData.splits[2]; // Bottom-left split

    it('should have correct geometry in expanded mode at initial canvas size', () => {
      validateSingleSplitGeometry(
        split,
        'expanded',
        fixture.canvasData,
        fixture.loadedImages
      );
    });

    it('should have correct geometry in collapsed mode at initial canvas size', () => {
      validateSingleSplitGeometry(
        split,
        'collapsed',
        fixture.canvasData,
        fixture.loadedImages
      );
    });
  });

  describe('Complex Fixture - Fourth split (2x2 grid, bottom-right)', () => {
    const fixture = createComplexFixture();
    const split = fixture.vizData.splits[3]; // Bottom-right split

    it('should have correct geometry in expanded mode at initial canvas size', () => {
      validateSingleSplitGeometry(
        split,
        'expanded',
        fixture.canvasData,
        fixture.loadedImages
      );
    });

    it('should have correct geometry in collapsed mode at initial canvas size', () => {
      validateSingleSplitGeometry(
        split,
        'collapsed',
        fixture.canvasData,
        fixture.loadedImages
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large canvas (4000x3000) without geometry violations', () => {
      const fixture = createComplexFixture();
      const split = fixture.vizData.splits[0];
      const largeCanvas: CanvasData = {
        ...fixture.canvasData,
        pixelWidth: 4000,
        pixelHeight: 3000
      };

      validateSingleSplitGeometry(
        split,
        'expanded',
        largeCanvas,
        fixture.loadedImages
      );
    });

    it('should handle small canvas (300x225) without geometry violations', () => {
      const fixture = createSimpleFixture();
      const split = fixture.vizData.splits[0];
      const smallCanvas: CanvasData = {
        ...fixture.canvasData,
        pixelWidth: 300,
        pixelHeight: 225
      };

      validateSingleSplitGeometry(
        split,
        'expanded',
        smallCanvas,
        fixture.loadedImages
      );
    });
  });

  describe('Margin Tests', () => {
    it('should render within margins with 20px horizontal and 15px vertical margins', () => {
      const fixture = createSimpleFixture();
      const split = fixture.vizData.splits[0];
      const canvasWithMargin: CanvasData = {
        ...fixture.canvasData,
        margin: { x: 20, y: 15 }
      };

      validateSingleSplitGeometry(
        split,
        'expanded',
        canvasWithMargin,
        fixture.loadedImages
      );
    });

    it('should handle large margins (50px each side)', () => {
      const fixture = createComplexFixture();
      const split = fixture.vizData.splits[0];
      const canvasWithLargeMargin: CanvasData = {
        ...fixture.canvasData,
        margin: { x: 50, y: 50 }
      };

      validateSingleSplitGeometry(
        split,
        'expanded',
        canvasWithLargeMargin,
        fixture.loadedImages
      );
    });

    it('should handle asymmetric margins (10px horizontal, 30px vertical)', () => {
      const fixture = createSimpleFixture();
      const split = fixture.vizData.splits[0];
      const canvasWithAsymmetricMargin: CanvasData = {
        ...fixture.canvasData,
        margin: { x: 10, y: 30 }
      };

      validateSingleSplitGeometry(
        split,
        'collapsed',
        canvasWithAsymmetricMargin,
        fixture.loadedImages
      );
    });

    it('should maintain geometry with margins when scaled up', () => {
      const fixture = createComplexFixture();
      const split = fixture.vizData.splits[1];
      const largeCanvasWithMargin: CanvasData = {
        ...fixture.canvasData,
        pixelWidth: 3000,
        pixelHeight: 2250,
        margin: { x: 40, y: 30 }
      };

      validateSingleSplitGeometry(
        split,
        'expanded',
        largeCanvasWithMargin,
        fixture.loadedImages
      );
    });

    it('should maintain geometry with margins when scaled down', () => {
      const fixture = createSimpleFixture();
      const split = fixture.vizData.splits[0];
      const smallCanvasWithMargin: CanvasData = {
        ...fixture.canvasData,
        pixelWidth: 400,
        pixelHeight: 300,
        margin: { x: 15, y: 10 }
      };

      validateSingleSplitGeometry(
        split,
        'expanded',
        smallCanvasWithMargin,
        fixture.loadedImages
      );
    });
  });
});
