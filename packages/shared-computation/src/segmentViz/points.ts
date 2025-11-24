import type { SessionConfig, ResponseGroup, ResponseGroupWithStats } from "shared-schemas";
import { getQuestionKey } from '../utils';
import type { ResponseGroupStatsDelta } from '../statistics';
import type { Point, ResponseQuestionVisualization } from './types';

interface SplitForSyntheticPoints {
  groups: Array<{ question: { varName: string; batteryName: string; subBattery: string }; responseGroup: ResponseGroup | null }>;
  responseQuestions: Array<{
    varName: string;
    batteryName: string;
    subBattery: string;
    responseGroups: {
      expanded: ResponseGroupWithStats[];
      collapsed: ResponseGroupWithStats[];
    };
  }>;
}

/**
 * Append new points based on deltas from Statistics update.
 * Uses deltas to create only the necessary new points.
 */
export function appendNewPointsFromDeltas(
  responseQuestionVisualizations: ResponseQuestionVisualization[],
  deltas: ResponseGroupStatsDelta[]
): void {
  // Group deltas by response question
  const deltasByQuestion = new Map<string, ResponseGroupStatsDelta[]>();

  for (const delta of deltas) {
    const key = getQuestionKey(delta.responseQuestion);
    if (!deltasByQuestion.has(key)) {
      deltasByQuestion.set(key, []);
    }
    deltasByQuestion.get(key)!.push(delta);
  }

  // For each response question visualization
  for (const viz of responseQuestionVisualizations) {
    const questionDeltas = deltasByQuestion.get(viz.responseQuestionKey) || [];

    // Get starting point ID
    let nextPointId = viz.points.length > 0
      ? viz.points[viz.points.length - 1].id + 1
      : 0;

    // Create points directly from deltas
    for (const delta of questionDeltas) {
      // Create 'delta.delta' number of points for this response group
      for (let i = 0; i < delta.delta; i++) {
        const point: Point = {
          id: nextPointId++,
          groups: [
            // Response group for this response question
            {
              question: delta.responseQuestion,
              responseGroup: delta.responseGroup
            },
            // All grouping question groups from this split
            ...delta.groupingCombination
          ]
        };
        viz.points.push(point);
      }
    }
  }
}

/**
 * Regenerate all synthetic points from current statistics.
 * Used in synthetic mode to create a fixed-size sample matching current proportions.
 */
export function regenerateSyntheticPoints(
  responseQuestionVisualizations: ResponseQuestionVisualization[],
  sessionConfig: SessionConfig,
  splits: SplitForSyntheticPoints[],
  syntheticSampleSize: number
): void {
  for (const viz of responseQuestionVisualizations) {
    viz.points = []; // Clear existing points
    let pointId = 0;

    // For each fully-specified split (one with all grouping questions specified)
    for (const split of splits) {
      if (split.groups.length !== sessionConfig.groupingQuestions.length) {
        continue; // Skip non-fully-specified splits
      }

      // Find this response question's stats in the split
      const rqStats = split.responseQuestions.find(
        (rq: { varName: string; batteryName: string; subBattery: string }) => getQuestionKey(rq) === viz.responseQuestionKey
      );

      if (!rqStats) continue;

      // Generate synthetic points for both expanded and collapsed response groups
      // We'll use expanded groups for point generation
      const allocations = allocateSyntheticPoints(
        rqStats.responseGroups.expanded,
        syntheticSampleSize
      );

      // Generate points for each response group allocation
      for (const { responseGroup, count } of allocations) {
        for (let i = 0; i < count; i++) {
          viz.points.push({
            id: pointId++,
            groups: [
              { question: viz.responseQuestion, responseGroup: responseGroup },
              ...split.groups
            ]
          });
        }
      }
    }
  }
}

/**
 * Allocate synthetic sample points across response groups using pre-computed proportions.
 * Uses largest remainder method for fair rounding to whole numbers.
 * 
 * @param responseGroups - Response groups with pre-computed proportions from Statistics
 * @param targetSize - Total number of synthetic points to allocate
 * @returns Allocations of counts to response groups
 */
export function allocateSyntheticPoints(
  responseGroups: ResponseGroupWithStats[],
  targetSize: number
): Array<{ responseGroup: ResponseGroup; count: number }> {
  // Compute raw counts from proportions (ResponseGroupWithStats extends ResponseGroup)
  const allocations = responseGroups.map(rg => ({
    responseGroup: rg as ResponseGroup,
    rawCount: rg.proportion * targetSize,
    count: 0 // Will be set below
  }));

  // Use largest remainder method for fair rounding
  let allocated = 0;
  const withRemainders = allocations.map(a => ({
    ...a,
    floor: Math.floor(a.rawCount),
    remainder: a.rawCount - Math.floor(a.rawCount)
  }));

  // Allocate floors first
  withRemainders.forEach(a => {
    a.count = a.floor;
    allocated += a.floor;
  });

  // Distribute remaining points by largest remainder
  const remaining = targetSize - allocated;
  withRemainders
    .sort((a, b) => b.remainder - a.remainder)
    .slice(0, remaining)
    .forEach(a => a.count++);

  return withRemainders.map(({ responseGroup, count }) => ({
    responseGroup,
    count
  }));
}
