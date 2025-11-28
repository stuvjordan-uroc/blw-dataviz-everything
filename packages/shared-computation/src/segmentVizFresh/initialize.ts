import { getQuestionKey } from '../utils';
import { Statistics } from "../statistics";
import type { GroupingQuestion, VizConfigSegments, VizMap } from "./types";
import { Split } from "shared-schemas";

/**
 * Compute the total width of each visualization given the lengths in the config 
 * @param config 
 * @returns number
 */
function computeVizWidth(config: VizConfigSegments): number {
  const numSegmentGroupsX = config.groupingQuestions.x
    .map((q) => q.responseGroups.length)
    .reduce((acc, curr) => acc * Math.min(curr, 1), 1)
  const maxSegmentsWithinSegmentGroup = Math.max(
    ...config.responseQuestions.map((rq) => rq.responseGroups.expanded.length),
    1
  )
  return (
    (numSegmentGroupsX - 1) * config.groupGapX //gaps between split groups
    + numSegmentGroupsX * (
      (maxSegmentsWithinSegmentGroup - 1) * config.responseGap + //gaps between response groups
      maxSegmentsWithinSegmentGroup * config.minGroupAvailableWidth  //available width for each split group
    )
  )
}

/**
 * Compute the total height of each visualization given the lengths in the config 
 * @param config 
 * @returns number
 */
function computeVizHeight(config: VizConfigSegments): number {
  const numSegmentGroupsY = config.groupingQuestions.y
    .map((q) => q.responseGroups.length)
    .reduce((acc, curr) => acc * Math.min(curr, 1), 1)
  return (
    (numSegmentGroupsY - 1) * config.groupGapY //gaps between segment groups
    + numSegmentGroupsY * config.minGroupHeight //heights of segment groups
  )
}

/**
 * given an object with arrays of active grouping questions on the x and y axis,
 * returns the numbers of segment groups on each axis.
 * @param groupingQuestions 
 * @returns object with properties x -- number of segment groups on x axis -- and y -- number of segment groups on y axis.
 */
function getNumberSegmentGroups(groupingQuestions: { x: GroupingQuestion[], y: GroupingQuestion[] }): { x: number, y: number } {
  return ({
    x: groupingQuestions.x
      .map((gq) => gq.responseGroups.length)
      .reduce((acc, curr) => acc * Math.max(1, curr), 1),
    y: groupingQuestions.y
      .map((gq) => gq.responseGroups.length)
      .reduce((acc, curr) => acc * Math.max(1, curr), 1)
  })
}



function getActiveQuestionsInSplit(
  split: Split,
  groupingQuestionsX: GroupingQuestion[],
  groupingQuestionsY: GroupingQuestion[]
): { x: (GroupingQuestion & { rgIdx: number })[]; y: (GroupingQuestion & { rgIdx: number })[] } {
  const activeQuestionsX: (GroupingQuestion & { rgIdx: number })[] = [];
  gqLoop: for (const gq of groupingQuestionsX) {
    //search through the questions in the split to find a match...
    for (const group of split.groups) {
      if (
        getQuestionKey(group.question) === getQuestionKey(gq) &&
        group.responseGroup !== null
      ) {
        //found an active question that is a match!
        let rgIdx = 0;
        //search through the response groups on the current question
        for (const rg of gq.responseGroups) {
          if (rg.label === group.responseGroup.label) {
            //gq is an active question, and we've identified it's response group in the split
            //add the question to the active questions array, along with the response group index for the current split
            activeQuestionsX.push({
              ...gq,
              rgIdx: rgIdx
            })
            //now break to the next grouping question
            break gqLoop;
          }
          rgIdx++;
        }
      }
    }
  }
  const activeQuestionsY: (GroupingQuestion & { rgIdx: number })[] = [];
  gqLoop: for (const gq of groupingQuestionsY) {
    //search through the questions in the split to find a match...
    for (const group of split.groups) {
      if (
        getQuestionKey(group.question) === getQuestionKey(gq) &&
        group.responseGroup !== null
      ) {
        //found an active question that is a match!
        let rgIdx = 0;
        //search through the response groups on the current question
        for (const rg of gq.responseGroups) {
          if (rg.label === group.responseGroup.label) {
            //gq is an active question, and we've identified it's response group in the split
            //add the question to the active questions array, along with the response group index for the current split
            activeQuestionsY.push({
              ...gq,
              rgIdx: rgIdx
            })
            //now break to the next grouping question
            break gqLoop;
          }
          rgIdx++;
        }
      }
    }
  }
  return ({
    x: activeQuestionsX,
    y: activeQuestionsY
  })
}

/**
 * Computes the zero-based column and row indices for a cell in the segment group grid.
 * 
 * The grid is defined by the cartesian product of response groups along each axis.
 * Questions earlier in the array vary more slowly (outer dimensions),
 * while questions later in the array vary faster (inner dimensions).
 * 
 * @param activeQuestions - Active grouping questions on x and y axes with their response group indices
 * @returns Object with xIdx (column index) and yIdx (row index)
 */
function getIndices(activeQuestions: { x: (GroupingQuestion & { rgIdx: number })[]; y: (GroupingQuestion & { rgIdx: number })[] }): { xIdx: number, yIdx: number } {
  // Compute x index (column)
  let xIdx = 0;
  for (const q of activeQuestions.x) {
    xIdx = xIdx * q.responseGroups.length + q.rgIdx;
  }

  // Compute y index (row)
  let yIdx = 0;
  for (const q of activeQuestions.y) {
    yIdx = yIdx * q.responseGroups.length + q.rgIdx;
  }

  return { xIdx, yIdx };
}

export function initialize(config: VizConfigSegments) {
  //compute the vizWidth and vizHeight
  const vizWidth = computeVizWidth(config)
  const vizHeight = computeVizHeight(config)
  // create the viz map
  const vizMap: VizMap = new Map();
  for (const responseQuestion of config.responseQuestions) {
    const rQKey = getQuestionKey(responseQuestion)
    //note: we're allowing response questions to be included in the grouping questions arrays.
    //but for the viz for a given response question, we filter out that response question as a grouping question on that viz
    const groupingQuestionsX = config.groupingQuestions.x.filter((gq) => getQuestionKey(gq) !== rQKey)
    const groupingQuestionsY = config.groupingQuestions.y.filter((gq) => getQuestionKey(gq) !== rQKey)
    const stats = new Statistics(
      {
        responseQuestions: [responseQuestion],

        groupingQuestions: [
          ...groupingQuestionsX,
          ...groupingQuestionsY
        ]
      },
      [],
      config.weightQuestion
    )
    const splits = stats.getSplits();
    //loop through the splits.
    //at each one, set the segment group bounds
    //and initialize the segments
    for (const split of splits) {
      //get the active grouping questions on each axis
      const activeQuestions = getActiveQuestionsInSplit(split, groupingQuestionsX, groupingQuestionsY);
      //compute the number of segment groups on each axis
      const numSegmentGroups = getNumberSegmentGroups(activeQuestions);
      //compute the x and y indices of this split.
      const splitIndices = getIndices(activeQuestions)
      //TODO
      //...
    }
  }
}