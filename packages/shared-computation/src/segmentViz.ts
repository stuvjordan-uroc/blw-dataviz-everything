/*
 * SegmentViz - Visualization data generator for poll/survey responses
 *
 * TODO - Implementation Status:
 * 
 * ✅ COMPLETED:
 *   - Point initialization and updating functions (both real and synthetic modes)
 *     - appendNewPointsFromDeltas() for incremental real point updates
 *     - regenerateSyntheticPoints() for synthetic sampling mode
 *     - allocateSyntheticPoints() for proportional allocation with fair rounding
 * 
 * ⏳ PENDING:
 *   - Draft population/updating functions for segments
 *     - initializeViewsForResponseQuestion() - currently stub
 *     - updateAllViewSegments() - currently stub
 *   - Unit test point initialization and updating functions
 *   - Unit test segment population/updating functions
 */

import { SessionConfig, Split, Question, Group, ResponseGroup, type ResponseGroupWithStats } from "shared-schemas";
import { getQuestionKey } from './utils';
import { Statistics, type ResponseGroupStatsDelta } from './statistics';
import type { RespondentData } from './types';

export interface VizConfigSegments {
  vizWidth: number;
  vizHeight: number;
  pointRadius: number;
  responseGap: number;
  groupGapHorizontal: number;
  groupGapVertical: number;
  labelGap: number;
  orientation: "vertical" | "horizontal";
  groupingQuestionsHorizontal: Question[];
  groupingQuestionsVertical: Question[];
  syntheticSampleSize?: number;
}

export interface Point {
  id: number;
  groups: Group[];
}

export interface PointPosition {
  id: number;
  x: number,
  y: number
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

export class SegmentViz {

  private statistics: Statistics;
  private responseQuestionVisualizations: ResponseQuestionVisualization[] = [];
  private syntheticSampleSize?: number;
  private isSyntheticMode: boolean;
  private sessionConfig: SessionConfig;

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor(
    sessionConfig: SessionConfig,
    vizConfigSegments: VizConfigSegments,
    respondentsData?: RespondentData[],
    weightQuestion?: Question
  ) {
    // Store config and synthetic mode settings
    this.sessionConfig = sessionConfig;
    this.syntheticSampleSize = vizConfigSegments.syntheticSampleSize;
    this.isSyntheticMode = this.syntheticSampleSize !== undefined;

    // Validate viz and session configs are mutually consistent.
    this.validateVizConfigSegments(sessionConfig, vizConfigSegments);

    // Create Statistics instance empty (we'll add data below)
    this.statistics = new Statistics(
      sessionConfig,
      [], // Start empty
      weightQuestion
    );

    // Initialize visualization for each response question
    for (const responseQuestion of sessionConfig.responseQuestions) {
      const viz: ResponseQuestionVisualization = {
        responseQuestion,
        responseQuestionKey: getQuestionKey(responseQuestion),
        points: [],
        views: this.initializeViewsForResponseQuestion(
          responseQuestion,
          sessionConfig,
          vizConfigSegments
        )
      };
      this.responseQuestionVisualizations.push(viz);
    }

    // Populate points and segments if data provided
    if (respondentsData && respondentsData.length > 0) {
      const result = this.statistics.updateSplits(respondentsData);

      if (this.isSyntheticMode) {
        this.regenerateSyntheticPoints();
      } else {
        this.appendNewPointsFromDeltas(result.deltas);
      }

      this.updateAllViewSegments();
    }
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  /**
   * Get visualization for a specific response question.
   * 
   * @param responseQuestion - The response question to get visualization for
   * @returns Visualization data for the question, or undefined if not found
   */
  public getVisualizationForQuestion(responseQuestion: Question): ResponseQuestionVisualization | undefined {
    const key = getQuestionKey(responseQuestion);
    return this.responseQuestionVisualizations.find(
      viz => viz.responseQuestionKey === key
    );
  }

  /**
   * Get all response question visualizations.
   * 
   * @returns Array of all visualizations
   */
  public getAllVisualizations(): ResponseQuestionVisualization[] {
    return this.responseQuestionVisualizations;
  }

  /**
   * Get the underlying Statistics instance.
   * 
   * @returns The Statistics instance
   */
  public getStatistics(): Statistics {
    return this.statistics;
  }

  /**
   * Get computed splits (proxy to Statistics).
   * 
   * @returns Array of splits with computed statistics
   */
  public getSplits(): Split[] {
    return this.statistics.getSplits();
  }

  // ============================================================================
  // UPDATERS
  // ============================================================================

  /**
   * Update with new respondent data (streaming updates).
   * 
   * @param respondentsData - Array of new respondent data to process
   */
  public updateWithNewResponses(respondentsData: RespondentData[]): void {
    // Update statistics (validates and updates splits)
    const result = this.statistics.updateSplits(respondentsData);

    if (this.isSyntheticMode) {
      // Regenerate entire synthetic sample from updated proportions
      this.regenerateSyntheticPoints();
    } else {
      // Append only NEW points using deltas (incremental update)
      this.appendNewPointsFromDeltas(result.deltas);
    }

    this.updateAllViewSegments();
  }

  /**
   * Append new points based on deltas from Statistics update.
   * Uses deltas to create only the necessary new points.
   */
  private appendNewPointsFromDeltas(deltas: ResponseGroupStatsDelta[]): void {
    // Group deltas by response question
    const deltasByQuestion = new Map<string, ResponseGroupStatsDelta[]>();

    for (const delta of deltas) {
      const key = getQuestionKey(delta.responseQuestion);
      if (!deltasByQuestion.has(key)) {
        deltasByQuestion.set(key, []);
      }
      deltasByQuestion.get(key)!.push(delta);
    }

    // For each response question visualization
    for (const viz of this.responseQuestionVisualizations) {
      const questionDeltas = deltasByQuestion.get(viz.responseQuestionKey) || [];

      // Get starting point ID
      let nextPointId = viz.points.length > 0
        ? viz.points[viz.points.length - 1].id + 1
        : 0;

      // Create points directly from deltas
      for (const delta of questionDeltas) {
        // Create 'delta.delta' number of points for this response group
        for (let i = 0; i < delta.delta; i++) {
          const point: Point = {
            id: nextPointId++,
            groups: [
              // Response group for this response question
              {
                question: delta.responseQuestion,
                responseGroup: delta.responseGroup
              },
              // All grouping question groups from this split
              ...delta.groupingCombination
            ]
          };
          viz.points.push(point);
        }
      }
    }
  }

  /**
   * Update segments for all views across all response questions.
   */
  private updateAllViewSegments(): void {
    // TODO: Implement segment updates
    // This will populate segment positions based on current points
  }

  /**
   * Regenerate all synthetic points from current statistics.
   * Used in synthetic mode to create a fixed-size sample matching current proportions.
   */
  private regenerateSyntheticPoints(): void {
    if (!this.isSyntheticMode || !this.syntheticSampleSize) {
      return;
    }

    const splits = this.statistics.getSplits();

    for (const viz of this.responseQuestionVisualizations) {
      viz.points = []; // Clear existing points
      let pointId = 0;

      // For each fully-specified split (one with all grouping questions specified)
      for (const split of splits) {
        if (split.groups.length !== this.sessionConfig.groupingQuestions.length) {
          continue; // Skip non-fully-specified splits
        }

        // Find this response question's stats in the split
        const rqStats = split.responseQuestions.find(
          rq => getQuestionKey(rq) === viz.responseQuestionKey
        );

        if (!rqStats) continue;

        // Generate synthetic points for both expanded and collapsed response groups
        // We'll use expanded groups for point generation
        const allocations = this.allocateSyntheticPoints(
          rqStats.responseGroups.expanded,
          this.syntheticSampleSize
        );

        // Generate points for each response group allocation
        for (const { responseGroup, count } of allocations) {
          for (let i = 0; i < count; i++) {
            viz.points.push({
              id: pointId++,
              groups: [
                { question: viz.responseQuestion, responseGroup: responseGroup },
                ...split.groups
              ]
            });
          }
        }
      }
    }
  }

  /**
   * Allocate synthetic sample points across response groups using pre-computed proportions.
   * Uses largest remainder method for fair rounding to whole numbers.
   * 
   * @param responseGroups - Response groups with pre-computed proportions from Statistics
   * @param targetSize - Total number of synthetic points to allocate
   * @returns Allocations of counts to response groups
   */
  private allocateSyntheticPoints(
    responseGroups: ResponseGroupWithStats[],
    targetSize: number
  ): Array<{ responseGroup: ResponseGroup; count: number }> {
    // Compute raw counts from proportions (ResponseGroupWithStats extends ResponseGroup)
    const allocations = responseGroups.map(rg => ({
      responseGroup: rg as ResponseGroup,
      rawCount: rg.proportion * targetSize,
      count: 0 // Will be set below
    }));

    // Use largest remainder method for fair rounding
    let allocated = 0;
    const withRemainders = allocations.map(a => ({
      ...a,
      floor: Math.floor(a.rawCount),
      remainder: a.rawCount - Math.floor(a.rawCount)
    }));

    // Allocate floors first
    withRemainders.forEach(a => {
      a.count = a.floor;
      allocated += a.floor;
    });

    // Distribute remaining points by largest remainder
    const remaining = targetSize - allocated;
    withRemainders
      .sort((a, b) => b.remainder - a.remainder)
      .slice(0, remaining)
      .forEach(a => a.count++);

    return withRemainders.map(({ responseGroup, count }) => ({
      responseGroup,
      count
    }));
  }

  // ============================================================================
  // INITIALIZERS
  // ============================================================================

  /**
   * Initialize views for a specific response question.
   */
  private initializeViewsForResponseQuestion(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    responseQuestion: Question,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sessionConfig: SessionConfig,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    vizConfigSegments: VizConfigSegments
  ): SegmentVizView[] {
    // TODO: Implement view initialization
    // This will generate all combinations of active grouping questions
    // and create empty segment structures for each
    return [];
  }

  // ============================================================================
  // VALIDATORS
  // ============================================================================

  private validateVizConfigSegments(
    sessionConfig: SessionConfig,
    vizConfigSegments: VizConfigSegments,
  ): void {
    // Validate that vizConfigSegments grouping questions are valid (compare by key)
    const qKeysHorizontal = new Set(
      vizConfigSegments.groupingQuestionsHorizontal.map(getQuestionKey)
    );
    const qKeysVertical = new Set(
      vizConfigSegments.groupingQuestionsVertical.map(getQuestionKey)
    );

    // Check disjointness by iterating the smaller set
    const [smallerSet, largerSet] =
      qKeysHorizontal.size <= qKeysVertical.size
        ? [qKeysHorizontal, qKeysVertical]
        : [qKeysVertical, qKeysHorizontal];

    let groupingQuestionsDisjoint = true;
    for (const k of smallerSet) {
      if (largerSet.has(k)) {
        groupingQuestionsDisjoint = false;
        break;
      }
    }
    if (!groupingQuestionsDisjoint) {
      throw new Error('horizontal and vertical grouping questions must be disjoint');
    }

    // Validate that vizConfigSegments groupingQuestions are covered in sessionConfig
    const sessionGroupingKeys = new Set(
      sessionConfig.groupingQuestions.map(getQuestionKey)
    );

    const unionKeys = new Set([...qKeysHorizontal, ...qKeysVertical]);
    let groupingQuestionsCovered = true;
    for (const gq of unionKeys) {
      if (!sessionGroupingKeys.has(gq)) {
        groupingQuestionsCovered = false;
        break;
      }
    }
    if (!groupingQuestionsCovered) {
      throw new Error('vizConfigSegments grouping questions not present in sessionConfig');
    }
  }
}