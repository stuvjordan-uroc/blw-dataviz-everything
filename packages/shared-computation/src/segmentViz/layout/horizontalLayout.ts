import type { Question } from "shared-schemas";
import type { SegmentGroupGrid, VizConfigSegments } from '../types';
import { calculateSegmentGroupWidth } from '../dimensions';

/**
 * Layout segment group grid horizontally.
 * Assigns x position and width to each column based on horizontal groupings.
 *
 * Segment group width varies by view depending on number of active horizontal questions.
 * Total vizWidth is fixed; it's distributed among active segment groups.
 *
 * Visual layout from left to right:
 * - columns[0] gets x = 0 (left)
 * - columns[1] gets x = width + gap
 * - columns[2] gets x = 2(width + gap)
 * - etc.
 *
 * All dimensions in point radii units.
 */
export function layoutSegmentGroupsHorizontally(
  grid: SegmentGroupGrid,
  activeHorizontal: Question[],
  vizWidth: number,
  vizConfigSegments: VizConfigSegments
): void {
  const numColumns = grid.columns.length;

  // Calculate segment group width for this view
  const segmentGroupWidth = calculateSegmentGroupWidth(
    activeHorizontal,
    vizWidth,
    vizConfigSegments
  );

  // Special case: Only one column
  if (numColumns <= 1) {
    if (numColumns === 1) {
      grid.columns[0].x = 0;
      grid.columns[0].width = segmentGroupWidth;
    }
    return;
  }

  // Assign x and width to each column (left to right)
  let currentX = 0;
  for (let col = 0; col < numColumns; col++) {
    grid.columns[col].x = currentX;
    grid.columns[col].width = segmentGroupWidth;
    currentX += segmentGroupWidth + vizConfigSegments.groupGapHorizontal;
  }
}
