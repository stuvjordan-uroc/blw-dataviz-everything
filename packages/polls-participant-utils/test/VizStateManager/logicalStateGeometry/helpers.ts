/**
 * Validation helper functions for geometric correctness tests
 */

import type { SegmentGroupDisplay } from '../../../src/VizStateManager/types';
import type { PointDisplay } from '../../../src/types';
import type { GridLabelsDisplay } from 'shared-types';

// Tolerance for rounding errors (±1 pixel)
const PIXEL_TOLERANCE = 1;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Check if a rectangle lies within canvas bounds (with tolerance)
 */
export function assertRectWithinCanvas(rect: Rect, canvasWidth: number, canvasHeight: number, label: string) {
  expect(rect.x).toBeGreaterThanOrEqual(-PIXEL_TOLERANCE);
  expect(rect.y).toBeGreaterThanOrEqual(-PIXEL_TOLERANCE);
  expect(rect.x + rect.width).toBeLessThanOrEqual(canvasWidth + PIXEL_TOLERANCE);
  expect(rect.y + rect.height).toBeLessThanOrEqual(canvasHeight + PIXEL_TOLERANCE);
}

/**
 * Check if two rectangles overlap (accounting for tolerance)
 * Returns true if they overlap by more than the tolerance
 */
export function rectanglesOverlap(rect1: Rect, rect2: Rect): boolean {
  const tolerance = PIXEL_TOLERANCE;

  // Check if rectangles are separated (no overlap)
  const separated =
    rect1.x + rect1.width < rect2.x - tolerance ||  // rect1 is left of rect2
    rect2.x + rect2.width < rect1.x - tolerance ||  // rect2 is left of rect1
    rect1.y + rect1.height < rect2.y - tolerance || // rect1 is above rect2
    rect2.y + rect2.height < rect1.y - tolerance;   // rect2 is above rect1

  return !separated;
}

/**
 * Assert that segment groups are non-overlapping
 */
export function assertSegmentGroupsNonOverlapping(segmentGroups: SegmentGroupDisplay[]) {
  for (let i = 0; i < segmentGroups.length; i++) {
    for (let j = i + 1; j < segmentGroups.length; j++) {
      const overlap = rectanglesOverlap(
        segmentGroups[i].segmentGroupBounds,
        segmentGroups[j].segmentGroupBounds
      );
      expect(overlap).toBe(false);
    }
  }
}

/**
 * Check if child rectangle is contained within parent (with tolerance)
 * Note: Due to rounding, we allow child to exceed parent by tolerance
 */
export function assertRectWithinParent(child: Rect, parent: Rect, childLabel: string, parentLabel: string) {
  expect(child.x).toBeGreaterThanOrEqual(parent.x - PIXEL_TOLERANCE);
  expect(child.y).toBeGreaterThanOrEqual(parent.y - PIXEL_TOLERANCE);
  expect(child.x + child.width).toBeLessThanOrEqual(parent.x + parent.width + PIXEL_TOLERANCE);
  expect(child.y + child.height).toBeLessThanOrEqual(parent.y + parent.height + PIXEL_TOLERANCE);
}

/**
 * Assert that segments are non-overlapping within their group
 */
export function assertSegmentsNonOverlapping(segments: Rect[]) {
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const overlap = rectanglesOverlap(segments[i], segments[j]);
      expect(overlap).toBe(false);
    }
  }
}

/**
 * Assert that a point lies within its parent segment (with tolerance)
 */
export function assertPointWithinSegment(
  point: { x: number; y: number },
  segment: Rect,
  pointLabel: string
) {
  expect(point.x).toBeGreaterThanOrEqual(segment.x - PIXEL_TOLERANCE);
  expect(point.y).toBeGreaterThanOrEqual(segment.y - PIXEL_TOLERANCE);
  expect(point.x).toBeLessThanOrEqual(segment.x + segment.width + PIXEL_TOLERANCE);
  expect(point.y).toBeLessThanOrEqual(segment.y + segment.height + PIXEL_TOLERANCE);
}

/**
 * Validate all geometric properties for a given state
 */
export function validateGeometry(
  segmentDisplay: SegmentGroupDisplay[],
  targetVisibleState: Map<string, PointDisplay>,
  gridLabelsDisplay: GridLabelsDisplay,
  canvasWidth: number,
  canvasHeight: number,
  viewSplitIndices: number[],
  displayMode: 'expanded' | 'collapsed'
) {
  // 1. Segment groups within canvas
  segmentDisplay.forEach((sg, idx) => {
    assertRectWithinCanvas(
      sg.segmentGroupBounds,
      canvasWidth,
      canvasHeight,
      `Segment group ${idx}`
    );
  });

  // 2. Segment groups non-overlapping
  assertSegmentGroupsNonOverlapping(segmentDisplay);

  // 3. Grid label columns within canvas
  gridLabelsDisplay.columns.forEach((col, idx) => {
    assertRectWithinCanvas(
      { x: col.x, y: 0, width: col.width, height: canvasHeight },
      canvasWidth,
      canvasHeight,
      `Grid column ${idx}`
    );
  });

  // 4. Grid label rows within canvas
  gridLabelsDisplay.rows.forEach((row, idx) => {
    assertRectWithinCanvas(
      { x: 0, y: row.y, width: canvasWidth, height: row.height },
      canvasWidth,
      canvasHeight,
      `Grid row ${idx}`
    );
  });

  // 5 & 6. For each segment group, validate its segments
  segmentDisplay.forEach((sg, sgIdx) => {
    const segments = sg.responseGroups.map(rg => rg.bounds);

    // 5. Each segment within parent segment group
    segments.forEach((seg, segIdx) => {
      assertRectWithinParent(
        seg,
        sg.segmentGroupBounds,
        `Segment ${segIdx} in group ${sgIdx}`,
        `Segment group ${sgIdx}`
      );
    });

    // 6. Segments non-overlapping within group
    assertSegmentsNonOverlapping(segments);
  });

  // 7. Points within parent segments
  for (const [pointKey, pointDisplay] of targetVisibleState) {
    const { point, position } = pointDisplay;

    // Find which segmentDisplay index corresponds to this point's split
    const segmentDisplayIdx = viewSplitIndices.indexOf(point.splitIdx);

    if (segmentDisplayIdx === -1) {
      // Point's split is not in current view, skip
      continue;
    }

    const segmentGroup = segmentDisplay[segmentDisplayIdx];

    // Find the segment for this point
    let segment: Rect | undefined;

    if (displayMode === 'expanded') {
      // Direct lookup: point.expandedResponseGroupIdx maps directly to segment index
      segment = segmentGroup.responseGroups[point.expandedResponseGroupIdx]?.bounds;
    } else {
      // Collapsed mode: all expanded groups collapse to index 0 in our fixtures
      segment = segmentGroup.responseGroups[0]?.bounds;
    }

    if (segment) {
      assertPointWithinSegment(
        position,
        segment,
        `Point ${pointKey}`
      );
    }
  }

  // 8. Grid column labels align with their segment group columns
  // For each segment group, verify its x/width matches one of the grid columns
  segmentDisplay.forEach((sg, sgIdx) => {
    const matchingColumn = gridLabelsDisplay.columns.find(col =>
      Math.abs(col.x - sg.segmentGroupBounds.x) <= PIXEL_TOLERANCE &&
      Math.abs(col.width - sg.segmentGroupBounds.width) <= PIXEL_TOLERANCE
    );

    expect(matchingColumn).toBeDefined();
  });

  // 9. Grid row labels align with their segment group rows
  // For each segment group, verify its y/height matches one of the grid rows
  segmentDisplay.forEach((sg, sgIdx) => {
    const matchingRow = gridLabelsDisplay.rows.find(row =>
      Math.abs(row.y - sg.segmentGroupBounds.y) <= PIXEL_TOLERANCE &&
      Math.abs(row.height - sg.segmentGroupBounds.height) <= PIXEL_TOLERANCE
    );

    expect(matchingRow).toBeDefined();
  });
}
