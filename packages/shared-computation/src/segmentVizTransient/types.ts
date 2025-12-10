import { Group, GroupingQuestion, ResponseGroupWithStats, ResponseQuestion, } from "../types"

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

export interface Rectangle {
  x: number,
  y: number,
  width: number,
  height: number
}



export interface PointPosition {
  id: string,
  x: number,
  y: number
}

export interface ResponseGroupWithStatsAndSegment extends ResponseGroupWithStats {
  segmentBounds: Rectangle;
  pointPositions: PointPosition[];
}

export interface SplitWithSegmentGroup {
  basisSplitIndices: number[];
  groups: Group[];
  totalWeight: number; //total weight at split
  totalCount: number; //total number of respondents in split
  responseGroups: {
    expanded: ResponseGroupWithStatsAndSegment[];
    collapsed: ResponseGroupWithStatsAndSegment[];
  }
  pointIds?: string[];
  segmentGroupBounds: Rectangle;
}

