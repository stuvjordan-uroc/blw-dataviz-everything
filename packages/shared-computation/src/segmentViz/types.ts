import type { ResponseGroupWithStats, Split, SplitDiff } from "../statistics/types";
import type {
  SegmentVizConfig,
  RectBounds,
  Point,
  PointPosition,
  ResponseGroupWithStatsAndSegment,
  SplitWithSegmentGroup,
  SplitWithSegmentGroupDiff,
} from 'shared-types';

// Re-export types that are imported from shared-types for backwards compatibility
export type {
  SegmentVizConfig,
  RectBounds,
  Point,
  PointPosition,
  ResponseGroupWithStatsAndSegment,
  SplitWithSegmentGroup,
  SplitWithSegmentGroupDiff,
};