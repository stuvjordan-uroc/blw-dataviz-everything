import type { Question, ResponseGroup } from "shared-schemas";

/**
 * Configuration for segment visualization layout.
 * 
 * All lengths are specified in abstract units relative to point radius.
 * Point radius is normalized to 1 unit, so all other dimensions are
 * multiples of the point radius.
 * 
 * The frontend decides how many pixels to use for the point radius,
 * and all coordinates scale accordingly.
 */
export interface VizConfigSegments {
  groupingQuestionsHorizontal: Question[];
  groupingQuestionsVertical: Question[];
  syntheticSampleSize?: number;
  responseGap: number;              // Gap between segments (in point radii)
  minGroupAvailableWidth: number;   // Width of segment group, net of response gaps, in view where all horizontal questions are active, and response question response groups are expanded
  groupGapHorizontal: number;       // Gap between horizontal segment groups (in point radii)
  groupGapVertical: number;         // Gap between vertical segment groups (in point radii)
  minGroupHeight: number;           // Height of segment group in view where all vertical grouping questions are active.
}

export interface Point {
  id: number;
  groups: Array<{
    question: Question;
    responseGroup: ResponseGroup | null;
  }>;
}

export interface PointPosition {
  id: number;
  x: number;
  y: number;
}

export type ResponseGroupDisplay = 'expanded' | 'collapsed';

export interface SegmentWithPositions {
  // Which response group on responseQuestion this segment shows
  responseGroup: ResponseGroup;

  // Which response groups on active grouping questions define this segment
  // Array order matches activeGroupingQuestions order
  activeGroupings: ResponseGroup[];

  // Visual bounds
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // Point positions within this segment
  pointPositions: PointPosition[];
}

export interface SegmentVizView {
  // Which grouping questions are active (non-null) in this view
  activeGroupingQuestions: Question[];

  // Whether to show expanded or collapsed response groups
  responseGroupDisplay: ResponseGroupDisplay;

  // All segments in this view
  // Length = (# of response groups) × (product of # response groups in each active grouping question)
  segments: SegmentWithPositions[];
}

export interface ResponseQuestionVisualization {
  // The response question this visualization is for
  responseQuestion: Question;
  responseQuestionKey: string;

  // Points specific to this response question
  // (respondents who gave valid response to THIS question)
  points: Point[];

  // Views for this response question
  views: SegmentVizView[];
}

/**
 * Internal representation of a segment group (a cell in the grid).
 * Represents all segments for one specific combination of vertical and horizontal groupings.
 */
export interface SegmentGroup {
  // The actual segments within this group
  // One segment per response group on the response question
  segments: SegmentWithPositions[];
}

/**
 * A row in the segment group grid.
 * All cells in a row share the same vertical grouping and thus the same y position and height.
 */
export interface SegmentGroupRow {
  // The vertical grouping that defines this row
  verticalGroupings: ResponseGroup[]; // Order matches activeVertical questions

  // Y position and height (same for all cells in this row)
  // Set by vertical layout
  y: number;
  height: number;

  // All segment groups in this row (one per column)
  // cells[0] = left-most cell in this row
  // cells[n-1] = right-most cell in this row
  cells: SegmentGroup[];
}

/**
 * A column in the segment group grid.
 * All cells in a column share the same horizontal grouping and thus the same x position and width.
 */
export interface SegmentGroupColumn {
  // The horizontal grouping that defines this column
  horizontalGroupings: ResponseGroup[]; // Order matches activeHorizontal questions

  // X position and width (same for all cells in this column)
  // Set by horizontal layout
  x: number;
  width: number;
}

/**
 * 2D grid of segment groups.
 * Explicitly represents the visual layout structure:
 * - Each row corresponds to a unique vertical grouping combination
 * - Each column corresponds to a unique horizontal grouping combination
 * - rows[0] = top-most visual row
 * - rows[n-1] = bottom-most visual row
 * - columns[0] = left-most visual column
 * - columns[n-1] = right-most visual column
 * - Cell at (row i, column j) is accessed via rows[i].cells[j]
 */
export interface SegmentGroupGrid {
  // All rows, ordered top to bottom
  rows: SegmentGroupRow[];

  // All columns, ordered left to right
  columns: SegmentGroupColumn[];
}