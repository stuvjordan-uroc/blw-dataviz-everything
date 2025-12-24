/**
 * Core types shared across the BLW DataViz monorepo.
 * This package contains base types with no dependencies to prevent circular dependencies.
 */

/**
 * Question type for uniquely identifying a question in code.
 * Corresponds to the composite primary key in the questions.questions table.
 */
export interface Question {
  varName: string;
  batteryName: string;
  // subBattery is required (empty string '' for questions without a sub-battery)
  // This matches the database constraint where subBattery is part of the primary key
  subBattery: string;
}

/**
 * Visualization types
 * Re-exported from visualization.ts for convenience
 */
export type {
  ResponseQuestion,
  GroupingQuestion,
  ResponseGroup,
  SegmentVizConfig,
  RectBounds,
  Point,
  PointPosition,
  ResponseGroupWithStatsAndSegment,
  SplitWithSegmentGroup,
  SplitWithSegmentGroupDiff,
  ViewMaps,
} from './visualization';

/**
 * Polls API contract types
 * Re-exported from polls-api-contract.ts for convenience
 */
export type {
  SessionResponse,
  VisualizationData,
  VisualizationSnapshotEvent,
  VisualizationUpdateEvent,
  SessionStatusChangedEvent,
  RespondentAnswer,
  SubmitResponsesDto,
  SubmitResponsesResponse,
} from './polls-api-contract';

/**
 * Zod schemas for API contract validation
 * Re-exported from polls-api-contract.zod.ts for runtime validation
 */
export {
  SessionResponseSchema,
  VisualizationDataSchema,
  VisualizationSnapshotEventSchema,
  VisualizationUpdateEventSchema,
  SessionStatusChangedEventSchema,
  RespondentAnswerSchema,
  SubmitResponsesDtoSchema,
  SubmitResponsesResponseSchema,
} from './polls-api-contract.zod';
