import type { Split, ResponseGroup, Question, ResponseGroupWithStats } from 'shared-schemas';
import type { SegmentGroupGrid, SegmentGroup, VizConfigSegments } from '../types';
import { getQuestionKey } from '../../utils';

/**
 * Create a unique key for a response group based on its label and values.
 */
function getResponseGroupKey(rg: ResponseGroup): string {
  return `${rg.label}|${rg.values.join(',')}`;
}

/**
 * Layout segments vertically within the grid.
 * Simple operation: segments already have y and height set from their row
 * (via the grid initialization in createView).
 * This function is a no-op but exists for symmetry with horizontal layout.
 */
export function layoutSegmentsVertically(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  grid: SegmentGroupGrid
): void {
  // No-op: vertical positioning already set by row during grid creation
  // All segments in the same row share the same y and height
}

/**
 * Layout segments horizontally within each cell of the grid.
 * 
 * Width allocation strategy:
 * 1. Each segment gets minimum width of 2 point radii
 * 2. Remaining width (after gaps and minimums) is distributed proportionally
 * 3. Final width = minimumWidth + (proportion × availableWidth)
 * 
 * All dimensions in point radii units.
 * 
 * Iterates over each cell (SegmentGroup) in the grid and lays out its segments
 * left-to-right in the order they appear in responseGroups array.
 */
export function layoutSegmentsHorizontally(
  grid: SegmentGroupGrid,
  responseGroups: ResponseGroup[],
  responseQuestion: Question,
  splits: Split[],
  vizConfigSegments: VizConfigSegments
): void {
  const numResponseGroups = responseGroups.length;
  const responseGap = vizConfigSegments.responseGap;
  const minSegmentWidth = 2; // Minimum width in point radii units

  // Iterate over each cell in the grid
  for (const row of grid.rows) {
    for (let colIndex = 0; colIndex < row.cells.length; colIndex++) {
      const cell = row.cells[colIndex];
      const column = grid.columns[colIndex];

      layoutSegmentGroupHorizontally(
        cell,
        column.x,
        column.width,
        responseGroups,
        numResponseGroups,
        responseGap,
        minSegmentWidth,
        responseQuestion,
        splits
      );
    }
  }
}

/**
 * Layout segments horizontally within a single segment group (cell).
 */
function layoutSegmentGroupHorizontally(
  cell: SegmentGroup,
  groupX: number,
  groupWidth: number,
  responseGroups: ResponseGroup[],
  numResponseGroups: number,
  responseGap: number,
  minSegmentWidth: number,
  responseQuestion: Question,
  splits: Split[]
): void {
  const groupSegments = cell.segments;
  if (groupSegments.length === 0) return;

  // Get activeGroupings from the first segment (all segments in this cell share them)
  const firstSegment = groupSegments[0];
  const activeGroupings = firstSegment.activeGroupings;

  // Find the split that matches this cell's activeGroupings
  const split = findMatchingSplit(splits, activeGroupings);

  if (!split) {
    // No data for this combination - give all segments minimum width
    let currentX = groupX;
    for (const segment of groupSegments) {
      segment.bounds.x = currentX;
      segment.bounds.width = minSegmentWidth;
      currentX += minSegmentWidth + responseGap;
    }
    return;
  }

  // Find the response question stats in the split
  const rqStats = split.responseQuestions.find(
    rq => getQuestionKey(rq) === getQuestionKey(responseQuestion)
  );

  if (!rqStats) {
    // No stats for this response question - give all segments minimum width
    let currentX = groupX;
    for (const segment of groupSegments) {
      segment.bounds.x = currentX;
      segment.bounds.width = minSegmentWidth;
      currentX += minSegmentWidth + responseGap;
    }
    return;
  }

  // Determine which response groups to use (expanded or collapsed)
  const statsResponseGroups: ResponseGroupWithStats[] =
    rqStats.responseGroups.expanded.length === responseGroups.length
      ? rqStats.responseGroups.expanded
      : rqStats.responseGroups.collapsed;

  // Calculate available width for proportional distribution
  const totalGapSpace = (numResponseGroups - 1) * responseGap;
  const totalMinimumWidth = numResponseGroups * minSegmentWidth;
  const availableWidth = groupWidth - totalGapSpace - totalMinimumWidth;

  // Get total count for proportions
  const totalCount = statsResponseGroups.reduce((sum: number, rg) => sum + rg.totalCount, 0);

  // Layout each segment left-to-right in responseGroups order
  let currentX = groupX;

  for (const responseGroup of responseGroups) {
    // Find the segment for this response group
    const segment = groupSegments.find(
      seg => getResponseGroupKey(seg.responseGroup) === getResponseGroupKey(responseGroup)
    );

    if (!segment) continue;

    // Find this response group in the stats
    const splitRG = statsResponseGroups.find(
      rg => getResponseGroupKey(rg) === getResponseGroupKey(responseGroup)
    );

    // Calculate segment width: minimum + proportional share of available width
    let segmentWidth: number;
    if (!splitRG || totalCount === 0 || availableWidth <= 0) {
      // No data or no available width - just use minimum
      segmentWidth = minSegmentWidth;
    } else {
      const proportion = splitRG.totalCount / totalCount;
      segmentWidth = minSegmentWidth + (proportion * availableWidth);
    }

    // Assign position
    segment.bounds.x = currentX;
    segment.bounds.width = segmentWidth;

    // Move to next position
    currentX += segmentWidth + responseGap;
  }
}

/**
 * Find the split that matches the given active grouping combination.
 * Returns undefined if no matching split exists.
 */
function findMatchingSplit(
  splits: Split[],
  activeGroupings: ResponseGroup[]
): Split | undefined {
  return splits.find(split => {
    // Check if all active groupings match this split's groups
    if (split.groups.length !== activeGroupings.length) {
      return false;
    }

    return activeGroupings.every((rg, index) => {
      const splitGroup = split.groups[index];
      // splitGroup.responseGroup can be null (means "all" for that grouping question)
      // We only match if it's not null and matches the active grouping
      if (splitGroup.responseGroup === null) {
        return false;
      }
      return getResponseGroupKey(splitGroup.responseGroup) === getResponseGroupKey(rg);
    });
  });
}
