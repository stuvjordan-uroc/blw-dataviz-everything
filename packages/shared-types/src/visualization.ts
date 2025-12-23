/**
 * Visualization type definitions
 * 
 * These types define the data structures for polling session visualizations.
 * They are used across multiple packages:
 * - shared-schemas: Database schema definitions
 * - api-polls-admin: Creating and initializing sessions
 * - api-polls-public: Serving visualization data and updates
 * - api-polls-client: Type-safe API consumption
 * - polls-participant-utils: Client-side state management
 * 
 * Types are separated from computation logic in shared-computation to:
 * - Avoid circular dependencies
 * - Enable clean API contracts
 * - Support independent versioning of data structures vs algorithms
 */

import type { Question } from './index';

/**
 * Base types for questions used in visualizations
 */

export interface ResponseQuestion {
  question: Question;
  responseGroups: {
    expanded: ResponseGroup[];
    collapsed: ResponseGroup[];
  };
}

export interface GroupingQuestion {
  question: Question;
  responseGroups: ResponseGroup[];
}

export interface ResponseGroup {
  label: string;
  values: number[];
}

/**
 * Configuration for a segment visualization
 * 
 * Defines how responses to a question should be visualized as segments,
 * including grouping questions and layout parameters.
 */
export type SegmentVizConfig = {
  responseQuestion: ResponseQuestion;
  groupingQuestions: {
    x: GroupingQuestion[];
    y: GroupingQuestion[];
  };
  // Optional synthetic sample size
  syntheticSampleSize?: number;
  // Lengths
  minGroupAvailableWidth: number; // Width (x-axis length) of segment group when all horizontal grouping questions are active
  minGroupHeight: number; // Height (y-axis length) of a segment group when all vertical grouping questions are active
  groupGapX: number; // Width (x-axis length) of gap between segment groups along the horizontal axis
  groupGapY: number; // Height (y-axis length) of gap between segment groups along the vertical axis
  responseGap: number; // X-axis gap between segments within a segment group
  baseSegmentWidth: number; // X-axis base width of all segments
};

/**
 * Rectangular bounds for a segment or group
 */
export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A unique identifier for a point in the visualization
 * 
 * Points are uniquely identified by:
 * - splitIdx: Which split (grouping) the point belongs to
 * - expandedResponseGroupIdx: Which response group (in expanded form)
 * - id: Unique ID within that response group
 */
export interface Point {
  splitIdx: number;
  expandedResponseGroupIdx: number;
  id: number;
}

/**
 * A point with its x,y position in abstract coordinate space
 */
export interface PointPosition {
  point: Point;
  x: number;
  y: number;
}

/**
 * Response group with statistics and segment visualization data
 * 
 * Extends ResponseGroupWithStats (from shared-computation) with:
 * - bounds: The rectangular area occupied by this segment
 * - pointPositions: Positions of all points within this segment
 */
export interface ResponseGroupWithStatsAndSegment {
  label: string;
  values: number[];
  totalCount: number;
  totalWeight: number;
  proportion: number;
  bounds: RectBounds;
  pointPositions: PointPosition[];
}

/**
 * A split with full segment visualization data
 * 
 * Extends Split (from shared-computation) with:
 * - segmentGroupBounds: Overall bounds of the segment group
 * - points: 2D array of points [responseGroup][pointIndex]
 * - responseGroups: Response groups with segment visualization data
 */
export interface SplitWithSegmentGroup {
  // From Split
  basisSplitIndices: number[];
  groups: Array<{
    question: Question;
    responseGroup: ResponseGroup | null;
  }>;
  totalWeight: number;
  totalCount: number;
  // Segment visualization additions
  segmentGroupBounds: RectBounds;
  points: Point[][];
  responseGroups: {
    collapsed: ResponseGroupWithStatsAndSegment[];
    expanded: ResponseGroupWithStatsAndSegment[];
  };
}

/**
 * Diff describing changes to a SplitWithSegmentGroup
 * 
 * Used for incremental updates to avoid sending full state.
 * Includes:
 * - stats: Changes to counts/weights/proportions (basic stats only, not full segment data)
 * - points: Added and removed points
 * - segments: Updated segment bounds
 * - pointPositions: Updated positions (null for added points)
 */
export interface SplitWithSegmentGroupDiff {
  stats: {
    totalCount: number;
    totalWeight: number;
    responseGroups: {
      collapsed: Array<{
        label: string;
        values: number[];
        totalCount: number;
        totalWeight: number;
        proportion: number;
      }>;
      expanded: Array<{
        label: string;
        values: number[];
        totalCount: number;
        totalWeight: number;
        proportion: number;
      }>;
    };
  };
  points: {
    added: Point[][];
    removed: Point[][];
  };
  segments: {
    collapsed: RectBounds[];
    expanded: RectBounds[];
  };
  pointPositions: {
    // Added points have null, removed points do not appear, continued points have a diff
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
  };
}

/**
 * Mapping from view ID to split indices
 * 
 * Precomputed during initialization for efficient view switching.
 * Each view represents a specific combination of active/inactive grouping questions.
 * 
 * Key format: comma-separated indices of active questions (e.g., "0,1,3" or "" for base view)
 * Value: array of split indices that belong to that view
 * 
 * Example:
 *   {
 *     "": [0],           // Base view - no grouping questions active
 *     "0": [1, 2, 3],     // Only question 0 active
 *     "1": [4, 5, 6],     // Only question 1 active
 *     "0,1": [7, 8, 9]    // Questions 0 and 1 active
 *   }
 */
export type ViewMaps = Record<string, number[]>;
