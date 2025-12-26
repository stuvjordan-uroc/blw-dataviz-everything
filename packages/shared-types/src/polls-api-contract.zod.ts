/**
 * Zod schemas for API contract validation
 * 
 * These schemas provide runtime validation for data exchanged between
 * clients and servers, particularly for SSE events and HTTP responses.
 */

import { z } from 'zod';

/**
 * Schema for Point type (referenced in visualization types)
 */
const PointSchema = z.object({
  respondentId: z.number(),
  responseValue: z.number(),
});

/**
 * Schema for RectBounds type
 */
const RectBoundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

/**
 * Schema for PointPosition type
 */
const PointPositionSchema = z.object({
  point: PointSchema,
  x: z.number(),
  y: z.number(),
});

/**
 * Schema for ResponseGroup type
 */
const ResponseGroupSchema = z.object({
  label: z.string(),
  values: z.array(z.number()),
});

/**
 * Schema for ResponseGroupWithStatsAndSegment type
 */
const ResponseGroupWithStatsAndSegmentSchema = z.object({
  label: z.string(),
  values: z.array(z.number()),
  totalCount: z.number(),
  totalWeight: z.number(),
  proportion: z.number(),
  bounds: RectBoundsSchema,
  pointPositions: z.array(PointPositionSchema),
});

/**
 * Schema for SplitWithSegmentGroup type
 */
const SplitWithSegmentGroupSchema = z.object({
  basisSplitIndices: z.array(z.number()),
  groups: z.array(z.object({
    question: z.any(), // Question type is complex, using z.any() for now
    responseGroup: ResponseGroupSchema.nullable(),
  })),
  totalWeight: z.number(),
  totalCount: z.number(),
  segmentGroupBounds: RectBoundsSchema,
  points: z.array(z.array(PointSchema)),
  responseGroups: z.object({
    collapsed: z.array(ResponseGroupWithStatsAndSegmentSchema),
    expanded: z.array(ResponseGroupWithStatsAndSegmentSchema),
  }),
});

/**
 * Schema for SplitWithSegmentGroupDiff type
 */
const SplitWithSegmentGroupDiffSchema = z.object({
  stats: z.object({
    totalCount: z.number(),
    totalWeight: z.number(),
    responseGroups: z.object({
      collapsed: z.array(z.object({
        label: z.string(),
        values: z.array(z.number()),
        totalCount: z.number(),
        totalWeight: z.number(),
        proportion: z.number(),
      })),
      expanded: z.array(z.object({
        label: z.string(),
        values: z.array(z.number()),
        totalCount: z.number(),
        totalWeight: z.number(),
        proportion: z.number(),
      })),
    }),
  }),
  points: z.object({
    added: z.array(z.array(PointSchema)),
    removed: z.array(z.array(PointSchema)),
  }),
  segments: z.object({
    collapsed: z.array(RectBoundsSchema),
    expanded: z.array(RectBoundsSchema),
  }),
  pointPositions: z.object({
    expanded: z.array(z.array(z.object({
      point: PointSchema,
      x: z.number(),
      y: z.number(),
    }).nullable())),
    collapsed: z.array(z.array(z.object({
      point: PointSchema,
      x: z.number(),
      y: z.number(),
    }).nullable())),
  }),
});

/**
 * Schema for ViewMaps type
 */
const ViewMapsSchema = z.record(z.string(), z.array(z.number()));

/**
 * Schema for SegmentVizConfig type
 */
const SegmentVizConfigSchema = z.object({
  responseQuestion: z.any(), // Complex type, using z.any() for now
  groupingQuestions: z.any(), // Complex type, using z.any() for now
  scaling: z.any(), // Complex type, using z.any() for now
  layout: z.any(), // Complex type, using z.any() for now
});

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
  viewMaps: ViewMapsSchema, vizWidth: z.number(),
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
