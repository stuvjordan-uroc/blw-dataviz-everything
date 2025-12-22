/**
 * from statistics
 * 
 * 
 */

import { initializeSplits } from "./statistics/initializeSplits";
import { updateAllSplitsFromResponses } from "./statistics/update";
import type { ResponseQuestion, GroupingQuestion, Split } from "./statistics/types";

/**
 * from segmentViz
 */

import { initializeSplitsWithSegments } from "./segmentViz/initializeSplitsWithSegments";
import { updateAllSplitsWithSegmentsFromResponses } from "./segmentViz/update";
import type { SegmentVizConfig, SplitWithSegmentGroup, SplitWithSegmentGroupDiff, Point, PointPosition } from "./segmentViz/types";

export {
  initializeSplits,
  updateAllSplitsFromResponses,
  initializeSplitsWithSegments,
  updateAllSplitsWithSegmentsFromResponses
}

export type {
  ResponseQuestion,
  GroupingQuestion,
  Split,
  SegmentVizConfig,
  SplitWithSegmentGroup,
  SplitWithSegmentGroupDiff,
  Point,
  PointPosition
}