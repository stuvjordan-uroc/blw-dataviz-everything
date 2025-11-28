import { GroupingQuestion } from "shared-schemas";
import { Statistics } from "../statistics";
import { getQuestionKey } from '../utils';
import { VizConfigSegments } from "./types";
import { validateConfig } from "./validation";

export class SegmentViz {
  // ============================================================================
  // FIELDS
  // ============================================================================
  private viz: Map<
    string,
    {
      vizWidth: number,
      vizHeight: number,
      stats: Statistics,
      segments: unknown[]
    }
  >


  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================
  constructor(
    vizConfigSegments: VizConfigSegments
  ) {
    // ============================================================================
    // VALIDATE CONFIG
    // ============================================================================
    validateConfig(vizConfigSegments)
    // ============================================================================
    // initialize viz map
    // ============================================================================
    this.viz = new Map()
    for (const responseQuestion of vizConfigSegments.responseQuestions) {
      const rQKey = getQuestionKey(responseQuestion)
      const stats = new Statistics(
        {
          responseQuestions: [responseQuestion],
          //note: we're allowing response questions to be included in the grouping questions arrays.
          //but for the viz for a given response question, we filter out that response question as a grouping question on that viz
          groupingQuestions: [
            ...vizConfigSegments.groupingQuestions.x.filter((gq) => getQuestionKey(gq) !== rQKey),
            ...vizConfigSegments.groupingQuestions.y.filter((gq) => getQuestionKey(gq) !== rQKey),
          ]
        },
        [],
        vizConfigSegments.weightQuestion
      )
      //compute the vizWidth
      //compute the vizHeight
      this.viz.set(
        rQKey,
        {
          vizWidth: 0,
          vizHeight: 0,
          stats: stats,
          segments: []
        }
      )
    }
    //loop through the viz map.
    //for each viz, loop through the splits in the statistics object
    //at each split, add the segment group position and dimensions
    //and add the segments.
    for (const [rQKey, stats] of this.viz) {
      const splits = stats.getSplits()
      splits.map((split) => {
        const activeQuestionsX: GroupingQuestion[] = []
        const activeQuestionsY: GroupingQuestion[] = []
        const activeQuestionKeys = split.groups
          .filter((group) => group.responseGroup !== null)
          .map((group) => getQuestionKey(group.question))
        for (const gq of vizConfigSegments.groupingQuestions.x) {
          if (activeQuestionKeys.includes(getQuestionKey(gq))) {
            activeQuestionsX.push(gq)
          }
        }
        for (const gq of vizConfigSegments.groupingQuestions.y) {
          if (activeQuestionKeys.includes(getQuestionKey(gq))) {
            activeQuestionsY.push(gq)
          }
        }
        //compute the number of horizontal segment groups at current split
        const numSegmentGroupsX = activeQuestionsX
          .map((aq) => aq.responseGroups.length)
          .reduce((acc, curr) => acc + curr, 0)
        //compute the number of vertical segment groups at current split
        const numSegmentGroupsY = activeQuestionsY
          .map((aq) => aq.responseGroups.length)
          .reduce((acc, curr) => acc + curr, 0)
      })
    }
  }
}