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
  GroupColorOverride,
  VisualizationImageConfig,
  SegmentVizConfig,
  RectBounds,
  Point,
  PointPosition,
  ResponseGroupWithStatsAndSegment,
  SplitWithSegmentGroup,
  SplitWithSegmentGroupDiff,
  ViewMaps,
  PointImage
} from './visualization';

/**
 * Polls API contract types
 * Re-exported from polls-api-contract.ts for convenience
 */
export type {
  // Shared session types
  SessionConfig,
  Session,
  VisualizationLookupMaps,
  // Admin session endpoints
  CreateSessionDto,
  GetAllSessionsResponse,
  ToggleSessionStatusDto,
  // Public session endpoints
  SessionResponse,
  VisualizationData,
  // Visualization stream events
  VisualizationSnapshotEvent,
  VisualizationUpdateEvent,
  SessionStatusChangedEvent,
  // Response endpoints
  RespondentAnswer,
  SubmitResponsesDto,
  SubmitResponsesResponse,
} from './polls-api-contract';

/**
 * Zod schemas for visualization types
 * Re-exported from visualization.zod.ts for runtime validation
 */
export {
  QuestionSchema,
  ResponseGroupSchema,
  ResponseQuestionSchema,
  GroupingQuestionSchema,
  GroupColorOverrideSchema,
  VisualizationImageConfigSchema,
  SegmentVizConfigSchema,
  RectBoundsSchema,
  PointSchema,
  PointPositionSchema,
  PointImageSchema,
  ResponseGroupWithStatsAndSegmentSchema,
  SplitWithSegmentGroupSchema,
  SplitWithSegmentGroupDiffSchema,
  ViewMapsSchema,
} from './visualization.zod';

/**
 * Zod schemas for API contract validation
 * Re-exported from polls-api-contract.zod.ts for runtime validation
 */
export {
  // Shared session schemas
  SessionConfigSchema,
  SessionSchema,
  VisualizationLookupMapsSchema,
  // Admin session endpoint schemas
  CreateSessionDtoSchema,
  GetAllSessionsResponseSchema,
  ToggleSessionStatusDtoSchema,
  // Public session endpoint schemas
  SessionResponseSchema,
  VisualizationDataSchema,
  // Visualization stream event schemas
  VisualizationSnapshotEventSchema,
  VisualizationUpdateEventSchema,
  SessionStatusChangedEventSchema,
  // Response endpoint schemas
  RespondentAnswerSchema,
  SubmitResponsesDtoSchema,
  SubmitResponsesResponseSchema,
} from './polls-api-contract.zod';
