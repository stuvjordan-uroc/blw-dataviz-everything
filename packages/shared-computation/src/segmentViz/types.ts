import { GroupingQuestion } from "../types";

export interface SegmentVizConfig {
  //questions
  responseQuestionKeys: string[];
  groupingQuestionKeys: {
    x: string[];
    y: string[];
  };
  //optional synthetic sample size
  syntheticSampleSize?: number;
  //lengths
  minGroupAvailableWidth: number; //width (x-axis length) of segment group when all horizontal grouping questions are active
  minGroupHeight: number; //height (y-axis length) of a segment group when all vertical grouping questions are active
  groupGapX: number; //width (x-axis length) of gap between segment groups along the horizontal axis.
  groupGapY: number; //height (y-axis length) of gap between segment groups along the vertical axis.
  responseGap: number; //x-axis gap between segments within a segment group
}

export interface PointSet {
  fullySpecifiedSplitIndex: number;
  responseGroupIndex: {
    expanded: number;
    collapsed: number;
  };
  currentIds: string[]; // Composite IDs: "${splitIdx}-${ergIdx}-${localId}"
  addedIds: string[]; // Composite IDs of points added in this update
  removedIds: string[]; // Composite IDs of points removed in this update
}

export interface PointPosition {
  id: string;
  x: number;
  y: number;
}

export interface Segments {
  collapsed: {
    pointPositions: PointPosition[];
    x: number;
    y: number;
    width: number;
    height: number;
    responseGroupIndex: number;
  }[];
  expanded: {
    pointPositions: PointPosition[];
    x: number;
    y: number;
    width: number;
    height: number;
    responseGroupIndex: number;
  }[];
}

export interface SegmentGroup {
  splitIndex: number;
  basisSplitIndices: number[];
  segmentGroup: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  segments: null | Segments;
}

export interface SegmentBoundsDelta {
  responseGroupIndex: number;
  xBefore: number;
  xAfter: number;
  widthBefore: number;
  widthAfter: number;
}

export interface SegmentPointsDelta {
  responseGroupIndex: number;
  addedPoints: PointPosition[];
  removedPoints: PointPosition[];
  movedPoints: {
    id: string;
    xBefore: number;
    yBefore: number;
    xAfter: number;
    yAfter: number;
  }[];
}

export interface SegmentGroupSegmentsDelta {
  collapsed: {
    boundsDelta: SegmentBoundsDelta[];
    pointsDelta: SegmentPointsDelta[];
  };
  expanded: {
    boundsDelta: SegmentBoundsDelta[];
    pointsDelta: SegmentPointsDelta[];
  };
}

export interface Viz {
  groupingQuestions: {
    x: GroupingQuestion[];
    y: GroupingQuestion[];
    excludedQuestionKeys: string[];
  };
  fullySpecifiedSplitIndices: number[];
  segmentGroups: SegmentGroup[];
  points: PointSet[];
}

export type SegmentsDiffMap = Map<
  string,
  Array<{ splitIndex: number; segmentsDelta: SegmentGroupSegmentsDelta }>
>;
