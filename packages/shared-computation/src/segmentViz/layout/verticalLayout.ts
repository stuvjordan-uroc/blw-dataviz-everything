import type { Question } from "shared-schemas";
import type { SegmentGroupGrid, VizConfigSegments } from '../types';
import { calculateSegmentGroupHeight } from '../dimensions';

/**
 * Layout segment group grid vertically.
 * Assigns y position and height to each row based on vertical groupings.
 *
 * Segment group height varies by view depending on number of active vertical questions.
 * Total vizHeight is fixed; it's distributed among active segment groups.
 *
 * Visual layout from top to bottom:
 * - rows[0] gets y = 0 (top)
 * - rows[1] gets y = height + gap
 * - rows[2] gets y = 2(height + gap)
 * - etc.
 *
 * All dimensions in point radii units.
 */
export function layoutSegmentGroupsVertically(
  grid: SegmentGroupGrid,
  activeVertical: Question[],
  vizHeight: number,
  vizConfigSegments: VizConfigSegments
): void {
  const numRows = grid.rows.length;

  // Calculate segment group height for this view
  const segmentGroupHeight = calculateSegmentGroupHeight(
    activeVertical,
    vizHeight,
    vizConfigSegments
  );

  // Special case: Only one row
  if (numRows <= 1) {
    if (numRows === 1) {
      grid.rows[0].y = 0;
      grid.rows[0].height = segmentGroupHeight;
    }
    return;
  }

  // Assign y and height to each row (top to bottom)
  let currentY = 0;
  for (const row of grid.rows) {
    row.y = currentY;
    row.height = segmentGroupHeight;
    currentY += segmentGroupHeight + vizConfigSegments.groupGapVertical;
  }
}
