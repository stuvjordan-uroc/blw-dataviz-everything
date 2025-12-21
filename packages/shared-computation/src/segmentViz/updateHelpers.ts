import { SegmentVizConfig, SplitWithSegmentGroup, SplitWithSegmentGroupDiff, Point } from './types';

/**
 * Creates a map from expanded response group indices to collapsed response group indices.
 * 
 * An expanded response group maps to a collapsed response group if all of the expanded
 * response group's values are contained within the collapsed response group's values.
 * 
 * Returns -1 if an expanded response group does not map to any collapsed response group.
 * This should not happen in valid configurations, but validation is the caller's responsibility.
 * 
 * @param config - The segment visualization configuration
 * @returns Map<expandedRGIndex, collapsedRGIndex | -1>
 */
export function createExpandedToCollapsedResponseGroupMap(
  config: SegmentVizConfig
): Map<number, number> {
  const rgMap = new Map<number, number>();

  for (let ergIdx = 0; ergIdx < config.responseQuestion.responseGroups.expanded.length; ergIdx++) {
    const collapsedIdx = config.responseQuestion.responseGroups.collapsed.findIndex((crg) =>
      config.responseQuestion.responseGroups.expanded[ergIdx].values.every((ev) =>
        crg.values.includes(ev)
      )
    );
    rgMap.set(ergIdx, collapsedIdx);
  }

  return rgMap;
}

/**
 * Merges point arrays from multiple basis splits into a single unified point set.
 * 
 * The visualization represents data as a SINGLE set of points that can be arranged
 * in different ways (by different grouping questions, collapsed/expanded response groups).
 * This single set is the union of all points across basis splits.
 * 
 * Each basis split has a set of points for each expanded response group. This function
 * merges those sets so that all points for a given expanded response group (across all
 * basis splits) are grouped together.
 * 
 * @param basisSplits - Array of basis splits to merge points from
 * @returns Array of point arrays, indexed by expanded response group index
 */
export function mergePointsFromBasisSplits(
  basisSplits: SplitWithSegmentGroup[]
): Point[][] {
  const mergedPoints: Point[][] = [];

  for (const basisSplit of basisSplits) {
    basisSplit.points.forEach((pointSet, pointSetIdx) => {
      if (!mergedPoints[pointSetIdx]) {
        mergedPoints[pointSetIdx] = [];
      }
      mergedPoints[pointSetIdx].push(...pointSet);
    });
  }

  return mergedPoints;
}

/**
 * Aggregates added and removed points from multiple basis split diffs for specified
 * response group indices.
 * 
 * When updating an aggregated segment (collapsed response group, or view with inactive
 * grouping questions), we need to collect all point changes across multiple expanded
 * response groups and/or multiple basis splits.
 * 
 * @param diffs - Array of basis split diffs to aggregate from
 * @param rgIndices - Response group indices to include in aggregation
 * @returns Object with arrays of added and removed points
 */
export function aggregatePointChangesFromDiffs(
  diffs: SplitWithSegmentGroupDiff[],
  rgIndices: number[]
): { added: Point[], removed: Point[] } {
  const addedPoints: Point[] = [];
  const removedPoints: Point[] = [];

  for (const rgIdx of rgIndices) {
    for (const diff of diffs) {
      if (diff.points.added[rgIdx]) {
        addedPoints.push(...diff.points.added[rgIdx]);
      }
      if (diff.points.removed[rgIdx]) {
        removedPoints.push(...diff.points.removed[rgIdx]);
      }
    }
  }

  return { added: addedPoints, removed: removedPoints };
}
