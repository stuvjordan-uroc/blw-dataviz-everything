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


import { Statistics } from "../statistics";
import { initialize } from "./initialize";
import { validateConfig } from "./validate";
import { getVizHeight, getVizWidth } from "./widthHeight";
import type { SegmentGroup, SegmentVizConfig, VizPoint } from "./types";

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
  private vizMap: Map<string, { segmentGroups: SegmentGroup[], points: VizPoint[] }>
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
    //set the fields
    this.statsInstanceRef = statsInstanceRef;
    this.segmentVizConfig = segmentVizConfig;
    //set vizWidth and vizHeight
    this.vizWidth = getVizWidth(this.statsInstanceRef, this.segmentVizConfig);
    this.vizHeight = getVizHeight(this.statsInstanceRef, this.segmentVizConfig);
    //initialize the viz
    this.vizMap = initialize(this.statsInstanceRef, this.segmentVizConfig, this.vizWidth, this.vizHeight)
  }
}