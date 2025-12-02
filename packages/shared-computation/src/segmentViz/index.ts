//===========================
// TODO
//===========================
/*
+ Initialization logic is drafted but not tested
+ Need to add...
--> subscriber logic so that statistics updates propagate automatically.
--> getting functions for callers to get vizMap
--> subscription logic so that callers can get diffs when viz is updated.
*/


import { SplitDelta, Statistics, StatisticsSubscription, StatisticsUpdateResult } from "../statistics";
import { initialize } from "./initialize";
import { validateConfig } from "./validate";
import { getVizHeight, getVizWidth } from "./widthHeight";
import type { GroupingQuestion } from "../types";
import type { SegmentGroup, SegmentVizConfig, VizPoint } from "./types";
import { getQuestionKey } from '../utils';
import { point } from "drizzle-orm/pg-core";

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
      points: VizPoint[]
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
        //  UPDATE THE POINTS ARRAY
        //=============================

        //TODO -- Split at the top based on whether a synthetic sample is requested
        //The strategies for the two cases are totally different.
        const pointsDiff = {
          added: [] as VizPoint[],
          removed: [] as VizPoint[]
        }
        //loop through all the fully specified splits
        let splitIdx = -1;
        for (const split of this.statsInstanceRef.getSplits()) {
          splitIdx++;
          //only changes to fully specified splits can affect the points array 
          if (!viz.fullySpecifiedSplitIndices.includes(splitIdx)) {
            continue;
          }

          const matchingSplitDelta = deltas.find((splitDelta) => splitDelta.splitIndex === splitIdx);
          //no changes to make unless there is a delta for this split
          if (matchingSplitDelta) {

            //find the response question delta for this viz
            const rqDelta = matchingSplitDelta.responseQuestionChanges.find((rqc) => rqc.responseQuestionKey === getQuestionKey(responseQuestion));

            //no change to make unless there is a change to the response question for this viz
            if (rqDelta) {
              //now the logic depends on whether we're working with a synthetic sample
              if (this.segmentVizConfig.syntheticSampleSize) {
                //changes to the points depend on all expanded response groups
                rqDelta.expandedGroupChanges.forEach((egc) => { egc.})
                //TODO
              } else {
                //we can change points one-expanded-response-group-at-a-time
                for (const responseGroupChanges of rqDelta.expandedGroupChanges) {
                  const countChange = responseGroupChanges.countAfter - responseGroupChanges.countBefore;
                  if (countChange > 0) {
                    //add points here

                    //get the highest id for the points in the current split and changed expanded response group.
                    const highestId = Math.max(
                      -1,
                      ...viz.points
                        .filter((point) => (
                          point.expandedResponseGroup.label === responseGroupChanges.responseGroupLabel &&
                          point.fullySpecifiedSplitIndex === splitIdx
                        ))
                        .map((point) => point.id)
                    )

                    //get the full response group
                    const fullResponseGroup = responseQuestion.responseGroups.expanded
                      .find((rg) => rg.label === responseGroupChanges.responseGroupLabel)

                    if (fullResponseGroup) {
                      //add the points
                      const newPoints = Array(countChange).map((_, newPointIdx) => ({
                        id: highestId + 1 + newPointIdx,
                        splitGroups: split.groups.filter((group) => (
                          viz.groupingQuestions.x.map((gqX) => getQuestionKey(gqX)).includes(getQuestionKey(group.question)) ||
                          viz.groupingQuestions.y.map((gqY) => getQuestionKey(gqY)).includes(getQuestionKey(group.question))
                        )),
                        fullySpecifiedSplitIndex: splitIdx,
                        expandedResponseGroup: fullResponseGroup
                      }))
                      viz.points.push(
                        ...newPoints
                      )
                      pointsDiff.added.push(...newPoints)
                    }
                  }
                  if (countChange < 0) {
                    //get the full response group
                    const fullResponseGroup = responseQuestion.responseGroups.expanded
                      .find((rg) => rg.label === responseGroupChanges.responseGroupLabel)
                    if (fullResponseGroup) {
                      //remove points here
                      const pointsKept: VizPoint[] = [];
                      const pointsRemoved: VizPoint[] = [];
                      let currentPointIdx = -1;
                      for (const currentPoint of viz.points) {
                        currentPointIdx++;
                        if (pointsRemoved.length >= -countChange) {
                          pointsKept.push(...viz.points.slice(currentPointIdx))
                          break;
                        }
                        if (
                          currentPoint.expandedResponseGroup.label === fullResponseGroup.label &&
                          currentPoint.fullySpecifiedSplitIndex === splitIdx
                        ) {
                          pointsRemoved.push(currentPoint)
                        } else {
                          pointsKept.push(currentPoint)
                        }
                      }
                      viz.points = pointsKept;
                      pointsDiff.removed.push(...pointsRemoved)
                    }
                  }
                }
              }
            }
          }
        }
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