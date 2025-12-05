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
  ResponseGroup,
  ResponseQuestion,
  GroupingQuestion,
  Split,
  Question,
  ResponseQuestionWithStats,
  Group,
  ResponseGroupWithStats,
  RespondentData
} from "./types";

export type {
  StatsConfig,
  StatisticsResult,
  StatisticsUpdateResult
} from "./statistics";


