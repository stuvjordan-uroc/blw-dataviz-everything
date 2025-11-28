import type { ResponseQuestion, GroupingQuestion, Question } from "shared-schemas"

export type { GroupingQuestion }

//config passed to constructor
export interface VizConfigSegments {
  //questions and response groups
  responseQuestions: ResponseQuestion[];
  groupingQuestions: {
    y: GroupingQuestion[];
    x: GroupingQuestion[];
  }
  //statistics options
  syntheticSampleSize?: number;
  weightQuestion?: Question;
  //lengths
  minGroupAvailableWidth: number; //width (x-axis length) of segment group when all horizontal grouping questions are active
  minGroupHeight: number; //height (y-axis length) of a segment group when all vertical grouping questions are active
  groupGapX: number; //width (x-axis length) of gap between segment groups along the horizontal axis.
  groupGapY: number; //height (y-axis length) of gap between segment groups along the vertical axis. 
  responseGap: number; //x-axis gap between segments within a segment group
}

//holds data for the viz for a single response question
export interface Viz {

}

//maps response question keys to their viz
export type VizMap = Map<string, Viz>