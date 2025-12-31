/**
 * Zod schemas for API contract validation
 * 
 * These schemas provide runtime validation for data exchanged between
 * clients and servers, particularly for SSE events and HTTP responses.
 */

import { z } from 'zod';
import {
  PointSchema,
  RectBoundsSchema,
  PointPositionSchema,
  ResponseGroupSchema,
  ResponseGroupWithStatsAndSegmentSchema,
  SplitWithSegmentGroupSchema,
  SplitWithSegmentGroupDiffSchema,
  ViewMapsSchema,
  SegmentVizConfigSchema,
  QuestionSchema,
} from './visualization.zod';

/**
 * Schema for VisualizationData
 */
export const VisualizationDataSchema = z.object({
  visualizationId: z.string(),
  config: SegmentVizConfigSchema,
  sequenceNumber: z.number(),
  splits: z.array(SplitWithSegmentGroupSchema),
  basisSplitIndices: z.array(z.number()),
  lastUpdated: z.union([z.string(), z.date()]),
  viewMaps: ViewMapsSchema,
  vizWidth: z.number(),
  vizHeight: z.number(),
});

/**
 * Schema for SessionResponse (from GET /sessions/:slug)
 */
export const SessionResponseSchema = z.object({
  id: z.number(),
  slug: z.string(),
  isOpen: z.boolean(),
  description: z.string().nullable(),
  createdAt: z.union([z.string(), z.date()]),
  config: z.any(), // TODO: Type this properly after prototyping
  visualizations: z.array(VisualizationDataSchema),
  endpoints: z.object({
    submitResponse: z.string(),
    visualizationStream: z.string(),
  }),
});

/**
 * Schema for VisualizationSnapshotEvent (SSE event)
 */
export const VisualizationSnapshotEventSchema = z.object({
  sessionId: z.number(),
  isOpen: z.boolean(),
  visualizations: z.array(VisualizationDataSchema),
  timestamp: z.union([z.string(), z.date()]),
});

/**
 * Schema for VisualizationUpdateEvent (SSE event)
 */
export const VisualizationUpdateEventSchema = z.object({
  visualizationId: z.string(),
  fromSequence: z.number(),
  toSequence: z.number(),
  splits: z.array(SplitWithSegmentGroupSchema),
  splitDiffs: z.array(SplitWithSegmentGroupDiffSchema).optional(),
  basisSplitIndices: z.array(z.number()),
  timestamp: z.union([z.string(), z.date()]),
});

/**
 * Schema for SessionStatusChangedEvent (SSE event)
 */
export const SessionStatusChangedEventSchema = z.object({
  isOpen: z.boolean(),
  timestamp: z.union([z.string(), z.date()]),
});

/**
 * Schema for RespondentAnswer
 */
export const RespondentAnswerSchema = z.object({
  varName: z.string(),
  batteryName: z.string(),
  subBattery: z.string(),
  responseIndex: z.number(),
});

/**
 * Schema for SubmitResponsesDto
 */
export const SubmitResponsesDtoSchema = z.object({
  sessionId: z.number(),
  answers: z.array(RespondentAnswerSchema),
});

/**
 * Schema for SubmitResponsesResponse
 */
export const SubmitResponsesResponseSchema = z.object({
  respondentId: z.number(),
});
