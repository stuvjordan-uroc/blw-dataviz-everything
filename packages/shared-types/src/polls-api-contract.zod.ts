/**
 * Zod schemas for API contract validation
 * 
 * These schemas provide runtime validation for data exchanged between
 * clients and servers. Organized to match the structure of polls-api-contract.ts.
 */

import { z } from 'zod';
import {
  SplitWithSegmentGroupSchema,
  SplitWithSegmentGroupDiffSchema,
  ViewMapsSchema,
  SegmentVizConfigSchema,
  QuestionSchema,
} from './visualization.zod';

/**
 * ===============================
 * SHARED SESSION TYPES
 * ===============================
 */

/**
 * Schema for SessionConfig
 */
export const SessionConfigSchema = z.object({
  questionOrder: z.array(QuestionSchema),
  visualizations: z.array(
    SegmentVizConfigSchema.extend({
      id: z.string(),
    })
  ),
});

/**
 * Schema for VisualizationLookupMaps
 */
export const VisualizationLookupMapsSchema = z.object({
  responseIndexToGroupIndex: z.record(z.number()),
  profileToSplitIndex: z.record(z.number()),
});

/**
 * Schema for Session
 */
export const SessionSchema = z.object({
  id: z.number(),
  slug: z.string(),
  isOpen: z.boolean(),
  description: z.string().nullable(),
  createdAt: z.union([z.string(), z.date()]),
  sessionConfig: SessionConfigSchema.nullable(),
});

/**
 * ===============================
 * ADMIN SESSION ENDPOINTS
 * ===============================
 */

/**
 * Schema for CreateSessionDto (POST /sessions)
 */
export const CreateSessionDtoSchema = z.object({
  description: z.string().nullable(),
  sessionConfig: z.object({
    questionOrder: z.array(QuestionSchema),
    visualizations: z.array(SegmentVizConfigSchema),
  }),
  slug: z.string().optional(),
});

/**
 * Schema for GetAllSessionsResponse (GET /sessions)
 */
export const GetAllSessionsResponseSchema = z.object({
  sessions: z.array(SessionSchema),
});

/**
 * Schema for ToggleSessionStatusDto (PATCH /sessions/:id/toggle)
 */
export const ToggleSessionStatusDtoSchema = z.object({
  isOpen: z.boolean(),
});

/**
 * ========================================
 * PUBLIC SESSION ENDPOINTS
 * ========================================
 */

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
 * Schema for SessionResponse (GET /sessions/:slug)
 */
export const SessionResponseSchema = z.object({
  id: z.number(),
  slug: z.string(),
  isOpen: z.boolean(),
  description: z.string().nullable(),
  createdAt: z.union([z.string(), z.date()]),
  config: SessionConfigSchema,
  visualizations: z.array(VisualizationDataSchema),
  endpoints: z.object({
    submitResponse: z.string(),
    visualizationStream: z.string(),
  }),
});

/**
 * ======================================
 * VISUALIZATION STREAM SERVICE
 * ======================================
 */

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
 * =============================================
 * PUBLIC RESPONSES ENDPOINTS
 * =============================================
 */

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
 * Schema for SubmitResponsesDto (POST /sessions/:slug/responses)
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
