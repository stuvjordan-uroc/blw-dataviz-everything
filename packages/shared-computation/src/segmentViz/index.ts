//===========================
// TODO
//===========================
/*
+ Draft update logic for hydration of segment groups
+ Test initializtion and hydration logic induced by the constructor
+ Test update logic
*/


import { SplitDelta, Statistics, StatisticsSubscription, StatisticsUpdateResult } from "../statistics";
import { initialize } from "./initialize";
import { validateConfig } from "./validate";
import { getVizHeight, getVizWidth } from "./widthHeight";
import type { GroupingQuestion } from "../types";
import type { PointSet, SegmentGroup, SegmentVizConfig } from "./types";
import { getQuestionKey } from '../utils';
import { populatePoints } from "./pointGeneration";

/**
 * Class holding a segment-based visualization of grouped
 * proportions on a set of response variables
 */
export class SegmentViz {
  //===========================================
  // FIELDS
  //===========================================
  //ref to the statistics instance holding the data that this
  //viz visualizes
  private statsInstanceRef: Statistics;
  //config for this viz
  private segmentVizConfig: SegmentVizConfig;
  //vizWidth
  private vizWidth: number;
  //vizHeight
  private vizHeight: number;
  //vizMap
  private vizMap: Map<
    string,
    {
      groupingQuestions: {
        x: GroupingQuestion[];
        y: GroupingQuestion[];
        excludedQuestionKeys: string[];
      },
      fullySpecifiedSplitIndices: number[];
      segmentGroups: SegmentGroup[],
      points: PointSet[];  // Array of point sets, one per (split, expanded response group) combination
    }
  >
  //subscription to stats instance ref
  private statsSubscription: StatisticsSubscription;


  //=========================================
  // CONSTRUCTOR
  //=========================================
  /**
   * Pass a config and ref to a Statistics instance.
   * Validates that the response questions and grouping questions
   * in the config are specified in the config for the Statistics instance
   * and that all lengths in the config are positive.
   * 
   * If validation checks pass, computes common width and height
   * for all response questions.
   * 
   * Then populates a map from each response question to a vizualization.
   * 
   * A visualization consists of an array of points to be mapped, along
   * with an array of "splits" on the grouping variables,
   * each of which is identified with a "segment group", consisting
   * of segments into which the points are mapped.
   * 
   * Note that if statistics haven't yet been computed for
   * a given split, the array of segments for the segment group
   * depicting that split is set to null
   * 
   * @param statsInstanceRef 
   * @param segmentVizConfig 
   */
  constructor(statsInstanceRef: Statistics, segmentVizConfig: SegmentVizConfig) {
    //validate config
    validateConfig(statsInstanceRef, segmentVizConfig);
    //set the stats instance and config fields
    this.statsInstanceRef = statsInstanceRef;
    this.segmentVizConfig = segmentVizConfig;
    //set vizWidth and vizHeight
    this.vizWidth = getVizWidth(this.statsInstanceRef, this.segmentVizConfig);
    this.vizHeight = getVizHeight(this.statsInstanceRef, this.segmentVizConfig);
    //initialize the viz -- for each response question...
    //(1) constructs the arrays of x- and y-axis grouping questions for the response question, and the question keys of the questions excluded from the viz
    //(2) uses the stats instance to compute the points to be used in the visualization (see pointGeneration.ts)
    //(3) uses the viz config and splits from the stats instance to compute the segment group bounds for each split
    //(4) uses the points computed in step (2) along with the splits to compute the bounds of the segments in each segment group and the positions for the points in each segment. 
    this.vizMap = initialize(this.statsInstanceRef, this.segmentVizConfig, this.vizWidth, this.vizHeight)
    //subscribe to statistics updates
    this.statsSubscription = this.statsInstanceRef.subscribe((updateResult) => {
      this.handleStatisticsUpdate(updateResult);
    })
  }

  //========================================================
  // PRIVATE METHODS
  //========================================================

  /**
   * Handle updates from the Statistics instance.
   * Called automatically when the Statistics instance processes new data.
   * 
   * @param updateResult - The result from Statistics.updateSplits()
   */
  private handleStatisticsUpdate(updateResult: StatisticsUpdateResult): void {
    // Process the deltas and update the visualization
    const vizDiffs = this.updateFromDeltas(updateResult.deltas);

    // Could emit events here if SegmentViz itself is observable
    // this.notifyObservers(vizDiffs);
  }

  /**
   * Update visualization based on statistics deltas.
   * 
   * @param deltas - Array of response group statistics deltas
   * @returns Array of visualization diffs describing the changes
   */
  private updateFromDeltas(deltas: SplitDelta[]): SegmentVizDiff[] {
    //diffMap will take each response question to a diff of its viz.
    const diffMap = new Map();

    for (const responseQuestion of this.statsInstanceRef.getStatsConfig().responseQuestions) {
      const viz = this.vizMap.get(getQuestionKey(responseQuestion))
      if (viz) {
        // ============================
        //  UPDATE THE POINT SETS
        //=============================
        const newPointSets = populatePoints({
          prevPointSets: viz.points,
          allSplits: this.statsInstanceRef.getSplits(),
          fullySpecifiedSplitIndices: viz.fullySpecifiedSplitIndices,
          responseQuestion: responseQuestion
        })
        viz.points = newPointSets;
        //to do...this needs to be added to the diffMap at the current response question
        // ============================
        //  UPDATE THE SEGMENTS BOUNDS AND POINT POSITIONS WITHIN EACH SEGMENT GROUP
        //=============================
      }
    }
  }


  //==============================================================
  // PUBLIC METHODS
  //==============================================================

  /**
   * Clean up resources when the visualization is no longer needed.
   * Unsubscribes from the Statistics instance to prevent memory leaks.
   */
  public dispose(): void {
    this.statsSubscription.unsubscribe();
  }



  /**
   * Get the current visualization state for a response question.
   * 
   * @param responseQuestionKey - The key of the response question
   * @returns The segment groups and points for that question, or undefined if not found
   */
  public getVisualization(responseQuestionKey: string) {
    return this.vizMap.get(responseQuestionKey);
  }
}