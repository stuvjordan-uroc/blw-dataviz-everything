/**
 * Shared helpers and fixtures for SegmentViz update tests
 */

import type { StatsConfig } from "../../src/statistics";
import {
  ageGroupingQuestion,
  genderGroupingQuestion,
  favorabilityResponseQuestion,
  weightQuestion,
  wave1Data,
  wave2Data,
  wave3Data,
} from "../fixtures/test-data";
import { flattenWaveData, combineWaves } from "../fixtures/helpers";
import { getQuestionKey } from "../../src/utils";

/**
 * Helper function to randomly sample N items from an array
 */
export function randomSample<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Helper function to find a point's position by ID in a visualization's segments
 * Returns { x, y } or null if not found
 */
export function findPointPosition(
  viz: any,
  splitIndex: number,
  pointId: string,
  view: "expanded" | "collapsed"
): { x: number; y: number } | null {
  const segmentGroup = viz.segmentGroups.find(
    (sg: any) => sg.splitIndex === splitIndex
  );

  if (!segmentGroup || !segmentGroup.segments) {
    return null;
  }

  for (const segment of segmentGroup.segments[view]) {
    const pointPos = segment.pointPositions.find((pp: any) => pp.id === pointId);
    if (pointPos) {
      return { x: pointPos.x, y: pointPos.y };
    }
  }

  return null;
}

/**
 * Helper function to get segment bounds by response group index
 */
export function getSegmentBounds(
  viz: any,
  splitIndex: number,
  responseGroupIndex: number,
  view: "expanded" | "collapsed"
): { x: number; y: number; width: number; height: number } | null {
  const segmentGroup = viz.segmentGroups.find(
    (sg: any) => sg.splitIndex === splitIndex
  );

  if (!segmentGroup || !segmentGroup.segments) {
    return null;
  }

  const segment = segmentGroup.segments[view].find(
    (s: any) => s.responseGroupIndex === responseGroupIndex
  );

  return segment
    ? { x: segment.x, y: segment.y, width: segment.width, height: segment.height }
    : null;
}

/**
 * Helper to find split index by age and gender labels
 */
export function findSplitIndex(
  splits: any[],
  ageLabel: string,
  genderLabel: string
): number {
  return splits.findIndex((split) => {
    const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
    const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
    return ageGroup?.responseGroup?.label === ageLabel && genderGroup?.responseGroup?.label === genderLabel;
  });
}

// ============================================================================
// Wave Data
// ============================================================================

export const wave1Respondents = flattenWaveData(wave1Data);
export const wave2Respondents = flattenWaveData(wave2Data);
export const wave3Respondents = flattenWaveData(wave3Data);

// Wave 1+2 combined (state before Wave 3 update)
export const wave1And2Combined = combineWaves(wave1Data, wave2Data);

// ============================================================================
// Shared Configuration
// ============================================================================

export const statsConfig: StatsConfig = {
  responseQuestions: [favorabilityResponseQuestion],
  groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
};

export const baseVizConfig = {
  responseQuestionKeys: [getQuestionKey(favorabilityResponseQuestion)],
  groupingQuestionKeys: {
    x: [getQuestionKey(ageGroupingQuestion)],
    y: [getQuestionKey(genderGroupingQuestion)],
  },
  minGroupAvailableWidth: 100,
  minGroupHeight: 100,
  groupGapX: 10,
  groupGapY: 10,
  responseGap: 0,
  baseSegmentWidth: 10,
};

// ============================================================================
// Exported test data references
// ============================================================================

export {
  ageGroupingQuestion,
  genderGroupingQuestion,
  favorabilityResponseQuestion,
  weightQuestion,
};

export { getQuestionKey };
