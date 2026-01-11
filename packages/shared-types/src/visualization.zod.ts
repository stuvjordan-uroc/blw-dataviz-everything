/**
 * Zod schemas for visualization type validation
 * 
 * Provides runtime validation for all visualization-related types.
 * These schemas match the TypeScript interfaces in visualization.ts exactly.
 */

import { z } from 'zod';

/**
 * Schema for Question type
 */
export const QuestionSchema = z.object({
  varName: z.string(),
  batteryName: z.string(),
  subBattery: z.string(),
});

/**
 * Schema for ResponseGroup type
 */
export const ResponseGroupSchema = z.object({
  label: z.string(),
  values: z.array(z.number()),
});

/**
 * Schema for ResponseQuestion type
 */
export const ResponseQuestionSchema = z.object({
  question: QuestionSchema,
  responseGroups: z.object({
    expanded: z.array(ResponseGroupSchema),
    collapsed: z.array(ResponseGroupSchema),
  }),
});

/**
 * Schema for GroupingQuestion type
 */
export const GroupingQuestionSchema = z.object({
  question: QuestionSchema,
  responseGroups: z.array(ResponseGroupSchema),
  questionDisplayLabel: z.string(),
});

/**
 * Schema for GroupColorOverride type
 */
export const GroupColorOverrideSchema = z.object({
  question: GroupingQuestionSchema,
  colorRanges: z.array(z.tuple([z.string(), z.string()])),
});

/**
 * Schema for VisualizationImageConfig type
 */
export const VisualizationImageConfigSchema = z.object({
  circleRadius: z.number().positive(),
  baseColorRange: z.tuple([z.string(), z.string()]),
  groupColorOverrides: z.array(GroupColorOverrideSchema),
});

/**
 * Schema for SegmentVizConfig type
 */
export const SegmentVizConfigSchema = z.object({
  responseQuestion: ResponseQuestionSchema,
  groupingQuestions: z.object({
    x: z.array(GroupingQuestionSchema),
    y: z.array(GroupingQuestionSchema),
  }),
  syntheticSampleSize: z.number().optional(),
  minGroupAvailableWidth: z.number(),
  minGroupHeight: z.number(),
  groupGapX: z.number(),
  groupGapY: z.number(),
  responseGap: z.number(),
  baseSegmentWidth: z.number(),
  images: VisualizationImageConfigSchema,
});

/**
 * Schema for RectBounds type
 */
export const RectBoundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

/**
 * Schema for Point type
 * 
 * CORRECTED: Previous schema was wrong (had respondentId/responseValue)
 */
export const PointSchema = z.object({
  splitIdx: z.number(),
  expandedResponseGroupIdx: z.number(),
  id: z.number(),
});

/**
 * Schema for PointPosition type
 */
export const PointPositionSchema = z.object({
  point: PointSchema,
  x: z.number(),
  y: z.number(),
});

/**
 * Schema for PointImage type
 */
export const PointImageSchema = z.object({
  svgDataURL: z.string(),
  offsetToCenter: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

/**
 * Schema for ResponseGroupWithStatsAndSegment type
 */
export const ResponseGroupWithStatsAndSegmentSchema = z.object({
  label: z.string(),
  values: z.array(z.number()),
  totalCount: z.number(),
  totalWeight: z.number(),
  proportion: z.number(),
  bounds: RectBoundsSchema,
  pointPositions: z.array(PointPositionSchema),
  pointImage: PointImageSchema,
});

/**
 * Schema for SplitWithSegmentGroup type
 */
export const SplitWithSegmentGroupSchema = z.object({
  basisSplitIndices: z.array(z.number()),
  groups: z.array(z.object({
    question: QuestionSchema,
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
export const SplitWithSegmentGroupDiffSchema = z.object({
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
    expanded: z.array(z.array(PointPositionSchema.nullable())),
    collapsed: z.array(z.array(PointPositionSchema.nullable())),
  }),
});

/**
 * Schema for ViewMaps type
 */
export const ViewMapsSchema = z.record(z.string(), z.array(z.number()));
