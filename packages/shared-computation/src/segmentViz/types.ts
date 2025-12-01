import type { Group, ResponseGroup } from "shared-schemas";
export interface SegmentVizConfig {
  //questions
  responseQuestionKeys: string[];
  groupingQuestionKeys: {
    x: string[];
    y: string[];
  }
  //optional synthetic sample size
  syntheticSampleSize?: number;
  //lengths
  minGroupAvailableWidth: number; //width (x-axis length) of segment group when all horizontal grouping questions are active
  minGroupHeight: number; //height (y-axis length) of a segment group when all vertical grouping questions are active
  groupGapX: number; //width (x-axis length) of gap between segment groups along the horizontal axis.
  groupGapY: number; //height (y-axis length) of gap between segment groups along the vertical axis. 
  responseGap: number; //x-axis gap between segments within a segment group
}

export interface VizPoint {
  id: number,
  splitGroups: Group[],
  expandedResponseGroup: ResponseGroup,
  fullySpecifiedSplitIndex: number
}

export interface PointPosition {
  id: number;
  x: number;
  y: number;
}

export interface SegmentGroup {
  splitIndex: number,
  segmentGroup: {
    x: number,
    y: number,
    width: number,
    height: number
  },
  segments: null | {
    collapsed: {
      pointPositions: PointPosition[];
      x: number;
      y: number;
      width: number;
      height: number;
      responseGroupIndex: number;
    }[],
    expanded: {
      pointPositions: PointPosition[];
      x: number;
      y: number;
      width: number;
      height: number;
      responseGroupIndex: number;
    }[]
  }
}