/**
 * shared-computation
 *
 * Pure computation functions for statistics and data processing.
 * This package provides framework-agnostic functions that can be used
 * by multiple services throughout the monorepo.
 */

export { Statistics } from "./statistics";
export { SegmentViz } from "./segmentViz";

// Export types
export type {
  RespondentData,
  // Re-exported from shared-schemas for convenience
  SessionConfig,
  Split,
  Question,
  ResponseGroup,
} from "./types";

export type {
  StatisticsResult,
  StatisticsUpdateResult,
  ResponseGroupStatsDelta
} from "./statistics";

export type {
  VizConfigSegments,
  Point,
  PointPosition,
  ResponseGroupDisplay,
  SegmentWithPositions,
  SegmentVizView,
  ResponseQuestionVisualization
} from "./segmentViz";

