/**
 * from statistics
 * 
 * 
 */

import { initializeSplits } from "./statistics/initializeSplits";
import { updateAllSplitsFromResponses } from "./statistics/update";

/**
 * from segmentViz
 */

import { initializeSplitsWithSegments } from "./segmentViz/initializeSplitsWithSegments";
import { updateAllSplitsWithSegmentsFromResponses } from "./segmentViz/update";
import { buildSegmentVizViewId, parseSegmentVizViewId } from "./segmentViz/buildSegmentVizViewId";

/**
 * from imageGeneration
 */

import { generateCircleImage } from "./imageGeneration";
import type { CircleImageOptions } from "./imageGeneration";

export {
  initializeSplits,
  updateAllSplitsFromResponses,
  initializeSplitsWithSegments,
  updateAllSplitsWithSegmentsFromResponses,
  buildSegmentVizViewId,
  parseSegmentVizViewId,
  generateCircleImage,
}

export type {
  CircleImageOptions,
}

// Re-export types that are now defined in shared-types for backwards compatibility
export type {
  ResponseQuestion,
  GroupingQuestion,
  ResponseGroup,
  SegmentVizConfig,
  SplitWithSegmentGroup,
  SplitWithSegmentGroupDiff,
  Point,
  PointPosition,
  ViewMaps,
  RectBounds,
  ResponseGroupWithStatsAndSegment,
} from 'shared-types';

// Export types that are still defined in this package
export type {
  Split,
} from './statistics/types';