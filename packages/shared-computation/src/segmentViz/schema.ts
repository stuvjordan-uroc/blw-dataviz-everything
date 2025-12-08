import { z } from 'zod';

/**
 * Zod schema for SegmentVizConfig validation
 * Colocated with the TypeScript type definition to ensure they stay in sync
 */
export const segmentVizConfigSchema = z.object({
  responseQuestionKeys: z.array(z.string()).min(1, "Must have at least one response question"),
  groupingQuestionKeys: z.object({
    x: z.array(z.string()),
    y: z.array(z.string()),
  }),
  syntheticSampleSize: z.number().positive("Must be > 0").optional(),
  minGroupAvailableWidth: z.number().positive("Must be > 0"),
  minGroupHeight: z.number().positive("Must be > 0"),
  groupGapX: z.number().positive("Must be > 0"),
  groupGapY: z.number().positive("Must be > 0"),
  responseGap: z.number().nonnegative("Must be ≥ 0"),
  baseSegmentWidth: z.number().positive("Must be > 0"),
});
