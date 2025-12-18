import type { ResponseQuestion, GroupingQuestion, ResponseGroupWithStats, Split, SplitDiff } from "../statistics/types";

export type SegmentVizConfig = {
  responseQuestion: ResponseQuestion,
  groupingQuestions: {
    x: GroupingQuestion[],
    y: GroupingQuestion[]
  },
  //optional synthetic sample size
  syntheticSampleSize?: number;
  //lengths
  minGroupAvailableWidth: number; //width (x-axis length) of segment group when all horizontal grouping questions are active
  minGroupHeight: number; //height (y-axis length) of a segment group when all vertical grouping questions are active
  groupGapX: number; //width (x-axis length) of gap between segment groups along the horizontal axis.
  groupGapY: number; //height (y-axis length) of gap between segment groups along the vertical axis.
  responseGap: number; //x-axis gap between segments within a segment group
  baseSegmentWidth: number; //x-axis base width of all segments -- all segments will start with this width
  //and grow from there based on the proportion of the response group represented by the segment
}

export interface RectBounds {
  x: number,
  y: number,
  width: number,
  height: number
}

export interface Point {
  splitIdx: number,
  expandedResponseGroupIdx: number,
  id: number
}

export interface PointPosition {
  point: Point,
  x: number,
  y: number
}

export interface ResponseGroupWithStatsAndSegment extends ResponseGroupWithStats {
  bounds: RectBounds,
  pointPositions: PointPosition[];
}

export interface SplitWithSegmentGroup extends Split {
  segmentGroupBounds: RectBounds;
  points: Point[][];
  responseGroups: {
    collapsed: ResponseGroupWithStatsAndSegment[];
    expanded: ResponseGroupWithStatsAndSegment[];
  }
}

export interface SplitWithSegmentGroupDiff {
  stats: SplitDiff,
  points: {
    added: Point[][],
    removed: Point[][]
  },
  segments: {
    collapsed: RectBounds[];
    expanded: RectBounds[];
  },
  pointPositions: {  //add points have null, removed points do not appear, continued points have a diff
    expanded: ({
      point: Point;
      x: number;
      y: number;
    } | null)[][];
    collapsed: ({
      point: Point;
      x: number;
      y: number;
    } | null)[][];
  }
}