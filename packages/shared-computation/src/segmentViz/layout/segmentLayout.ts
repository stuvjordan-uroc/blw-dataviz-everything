import type { Split, ResponseGroup, Question, ResponseGroupWithStats } from 'shared-schemas';
import type { SegmentWithPositions, VizConfigSegments } from '../types';
import { getQuestionKey } from '../../utils';

/**
 * Create a unique key for a response group based on its label and values.
 */
function getResponseGroupKey(rg: ResponseGroup): string {
  return `${rg.label}|${rg.values.join(',')}`;
}

/**
 * Layout segments vertically within their groups.
 * Simple operation: segments that share the same activeGroupings already have
 * y and height set from their segment group (via flattenGridToSegments).
 * This function is a no-op but exists for symmetry with horizontal layout.
 */
export function layoutSegmentsVertically(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  segments: SegmentWithPositions[]
): void {
  // No-op: vertical positioning already set by row during grid flattening
  // All segments in the same group (same activeGroupings) share the same y and height
}

/**
 * Layout segments horizontally within their groups.
 * 
 * Width allocation strategy:
 * 1. Each segment gets minimum width of 2 point radii
 * 2. Remaining width (after gaps and minimums) is distributed proportionally
 * 3. Final width = minimumWidth + (proportion × availableWidth)
 * 
 * All dimensions in point radii units.
 * 
 * Segments are grouped by their activeGroupings (segments with same activeGroupings
 * belong to the same segment group). Within each group, segments are laid out
 * left-to-right in the order they appear in responseGroups array.
 */
export function layoutSegmentsHorizontally(
  segments: SegmentWithPositions[],
  responseGroups: ResponseGroup[],
  responseQuestion: Question,
  splits: Split[],
  vizConfigSegments: VizConfigSegments
): void {
  const numResponseGroups = responseGroups.length;
  const responseGap = vizConfigSegments.responseGap;
  const minSegmentWidth = 2; // Minimum width in point radii units

  // Group segments by their activeGroupings (identifies which segment group they belong to)
  const segmentGroups = new Map<string, SegmentWithPositions[]>();

  for (const segment of segments) {
    const groupKey = segment.activeGroupings
      .map(rg => getResponseGroupKey(rg))
      .join('|');

    if (!segmentGroups.has(groupKey)) {
      segmentGroups.set(groupKey, []);
    }
    segmentGroups.get(groupKey)!.push(segment);
  }

  // Layout each segment group
  for (const groupSegments of segmentGroups.values()) {
    if (groupSegments.length === 0) continue;

    // All segments in this group share the same activeGroupings and column bounds (x, width)
    const firstSegment = groupSegments[0];
    const groupX = firstSegment.bounds.x; // Left edge of the segment group
    const groupWidth = firstSegment.bounds.width; // Total width of the segment group

    // Find the split that matches this group's activeGroupings
    const split = findMatchingSplit(splits, firstSegment.activeGroupings);

    if (!split) {
      // No data for this combination - give all segments minimum width
      let currentX = groupX;
      for (const segment of groupSegments) {
        segment.bounds.x = currentX;
        segment.bounds.width = minSegmentWidth;
        currentX += minSegmentWidth + responseGap;
      }
      continue;
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
      continue;
    }

    // Determine which response groups to use (expanded or collapsed)
    const statsResponseGroups: ResponseGroupWithStats[] =
      rqStats.responseGroups.expanded.length === responseGroups.length
        ? rqStats.responseGroups.expanded
        : rqStats.responseGroups.collapsed;

    // Calculate available width for proportional distribution
    const totalGapSpace = (numResponseGroups - 1) * responseGap;
    const totalMinimumWidth = numResponseGroups * minSegmentWidth;
    const availableWidth = groupWidth - totalGapSpace - totalMinimumWidth;    // Get total count for proportions
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
