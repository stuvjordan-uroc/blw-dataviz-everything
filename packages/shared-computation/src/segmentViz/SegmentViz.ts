/*
 * SegmentViz - Visualization data generator for poll/survey responses
 *
 * Main class that orchestrates view generation, point management, and segment updates.
 */

import type { SessionConfig, Question } from "shared-schemas";
import { Statistics } from '../statistics';
import type { RespondentData } from '../types';
import type { VizConfigSegments, ResponseQuestionVisualization } from './types';
import { validateVizConfigSegments } from './validation';
import { appendNewPointsFromDeltas, regenerateSyntheticPoints } from './points';
import { generateAllViews } from './viewGeneration';
import { layoutSegmentGroupsVertically } from './layout/verticalLayout';
import { layoutSegmentGroupsHorizontally } from './layout/horizontalLayout';
import { updateAllViewSegments } from './segments';
import { getQuestionKey } from '../utils';
import { calculateVizWidth, calculateVizHeight } from './dimensions';

export class SegmentViz {

  private statistics: Statistics;
  private responseQuestionVisualizations: ResponseQuestionVisualization[] = [];
  private syntheticSampleSize?: number;
  private isSyntheticMode: boolean;
  private sessionConfig: SessionConfig;
  private vizConfigSegments: VizConfigSegments;
  private vizWidth: number;
  private vizHeight: number;

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
    this.vizConfigSegments = vizConfigSegments;
    this.syntheticSampleSize = vizConfigSegments.syntheticSampleSize;
    this.isSyntheticMode = this.syntheticSampleSize !== undefined;

    // Validate viz and session configs are mutually consistent
    validateVizConfigSegments(sessionConfig, vizConfigSegments);

    // Calculate fixed viz dimensions (based on all questions active, expanded)
    this.vizWidth = calculateVizWidth(sessionConfig, vizConfigSegments);
    this.vizHeight = calculateVizHeight(sessionConfig, vizConfigSegments);

    // Create Statistics instance empty (we'll add data below)
    this.statistics = new Statistics(
      sessionConfig,
      [], // Start empty
      weightQuestion
    );

    // Initialize visualization for each response question.
    // Note: This step lays out the segment groups for each view,
    // Not the segments themselves.  (via layoutSegmentGroupsVertically
    // and layoutSegmentGroupsHorizontally) Segment group layouts
    // only depend on the configs...they do not require data!
    // So no data is passed to the generateAllViews function!
    for (const responseQuestion of sessionConfig.responseQuestions) {
      const viz: ResponseQuestionVisualization = {
        responseQuestion,
        responseQuestionKey: getQuestionKey(responseQuestion),
        points: [],
        views: generateAllViews(
          responseQuestion,
          sessionConfig,
          vizConfigSegments,
          this.vizWidth,
          this.vizHeight,
          layoutSegmentGroupsVertically,  //(grid: SegmentGroupGrid, activeVertical: Question[], vizHeight: number, config: VizConfigSegments) => void,
          layoutSegmentGroupsHorizontally //(grid: SegmentGroupGrid, activeHorizontal: Question[], vizWidth: number, config: VizConfigSegments) => void
        )
      };
      this.responseQuestionVisualizations.push(viz);
    }

    // Populate points and segments if data provided
    if (respondentsData && respondentsData.length > 0) {
      const result = this.statistics.updateSplits(respondentsData);

      if (this.isSyntheticMode) {
        regenerateSyntheticPoints(
          this.responseQuestionVisualizations,
          this.sessionConfig,
          this.statistics.getSplits(),
          this.syntheticSampleSize!
        );
      } else {
        appendNewPointsFromDeltas(this.responseQuestionVisualizations, result.deltas);
      }

      updateAllViewSegments(
        this.responseQuestionVisualizations,
        this.sessionConfig,
        this.statistics.getSplits(),
        this.vizConfigSegments
      );
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
  public getSplits() {
    return this.statistics.getSplits();
  }

  /**
   * Get the bounding box of the visualization in point radii units.
   * These are the fixed outer dimensions calculated from the maximum view
   * (all grouping questions active with expanded response groups).
   * 
   * The frontend should multiply these values by the chosen pixels-per-point-radius
   * to get pixel dimensions.
   * 
   * @returns Object with width and height in point radii units
   */
  public getBoundingBox(): { width: number; height: number } {
    return {
      width: this.vizWidth,
      height: this.vizHeight
    };
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
      regenerateSyntheticPoints(
        this.responseQuestionVisualizations,
        this.sessionConfig,
        this.statistics.getSplits(),
        this.syntheticSampleSize!
      );
    } else {
      // Append only NEW points using deltas (incremental update)
      appendNewPointsFromDeltas(this.responseQuestionVisualizations, result.deltas);
    }

    updateAllViewSegments(
      this.responseQuestionVisualizations,
      this.sessionConfig,
      this.statistics.getSplits(),
      this.vizConfigSegments
    );
  }
}
