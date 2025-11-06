/**
 * shared-computation
 *
 * Pure computation functions for statistics and data processing.
 * This package provides framework-agnostic functions that can be used
 * by multiple services throughout the monorepo.
 */

// Export types
export type {
  ResponseData,
  QuestionKey,
  ResponseCounts,
  RespondentRecord,
  // Re-exported from shared-schemas for convenience
  SessionConfig,
  Split,
  Question,
  ResponseGroup,
} from "./types";

// Export computation functions (full recomputation)
export { computeSplitStatistics, createQuestionKey } from "./computations";

// Export update functions (incremental updates)
export {
  updateSplitStatistics,
  validateSplitsMatchConfig,
} from "./update-statistics";
