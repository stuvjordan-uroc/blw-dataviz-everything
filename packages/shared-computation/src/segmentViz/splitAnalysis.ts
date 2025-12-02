import { GroupingQuestion, Split, Group } from "../types";
import { getQuestionKey } from '../utils';

/**
 * Identify which grouping questions are active (non-null) in a split
 * and determine the response group index for each.
 * 
 * @param split - The split to analyze
 * @param groupingQuestionsX - Grouping questions mapped to the X axis
 * @param groupingQuestionsY - Grouping questions mapped to the Y axis
 * @returns Object with arrays of active questions (with their response group indices) for each axis
 */
export function getActiveQuestionsInSplit(
  split: Split,
  groupingQuestionsX: GroupingQuestion[],
  groupingQuestionsY: GroupingQuestion[]
): { x: (GroupingQuestion & { rgIdx: number })[]; y: (GroupingQuestion & { rgIdx: number })[] } {
  const activeQuestionsX = [];
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
            //gq is an active question, and we've identified its response group in the split
            //add the question to the active questions array
            activeQuestionsX.push({
              ...gq,
              rgIdx: rgIdx
            })
            //now break to the next grouping question
            continue gqLoop;
          }
          //the current response group is not a match, so increment the index
          //because we're going to the next response group
          rgIdx++;
        }
      }
    }
  }
  const activeQuestionsY = [];
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
            //gq is an active question, and we've identified its response group in the split
            //add the question to the active questions array
            activeQuestionsY.push({
              ...gq,
              rgIdx: rgIdx
            })
            //now break to the next grouping question
            continue gqLoop;
          }
          //the current response group is not a match, so increment the index
          //because we're going to the next response group
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
 * Calculate the total number of segment groups along each axis.
 * 
 * This is the Cartesian product size of all response groups across
 * the grouping questions for each axis.
 * 
 * @param groupingQuestions - Grouping questions for x and y axes
 * @returns Object with number of segment groups along x and y axes
 */
export function getNumberSegmentGroups(groupingQuestions: { x: GroupingQuestion[], y: GroupingQuestion[] }): { x: number, y: number } {
  return ({
    x: groupingQuestions.x
      .map((gq) => gq.responseGroups.length)
      .reduce((acc, curr) => acc * Math.max(1, curr), 1),
    y: groupingQuestions.y
      .map((gq) => gq.responseGroups.length)
      .reduce((acc, curr) => acc * Math.max(1, curr), 1)
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
export function getIndices(activeQuestions: { x: (GroupingQuestion & { rgIdx: number })[]; y: (GroupingQuestion & { rgIdx: number })[] }): { x: number, y: number } {
  // Compute x index (column)
  let x = 0;
  for (const q of activeQuestions.x) {
    x = x * q.responseGroups.length + q.rgIdx;
  }

  // Compute y index (row)
  let y = 0;
  for (const q of activeQuestions.y) {
    y = y * q.responseGroups.length + q.rgIdx;
  }

  return { x, y };
}

interface GetBasisSplitIndicesProps {
  split: Split;
  allBasisSplitIndices: number[];
  allSplits: Split[];
}
export function getBasisSplitIndices({
  split,
  allBasisSplitIndices,
  allSplits
}: GetBasisSplitIndicesProps): number[] {

  // array to hold the indices
  const indices: number[] = [];

  // non-null groups of provided split
  const nonNullGroups = split.groups.filter((group) => group.responseGroup !== null)

  if (nonNullGroups.length === 0) {
    return allBasisSplitIndices;
  }

  // loop through all the splits
  let currentSplitIdx = -1;
  for (const currentSplit of allSplits) {

    currentSplitIdx++;

    //must be a basis split for SOME splits
    if (!(allBasisSplitIndices.includes(currentSplitIdx))) {
      continue;
    }

    //we now know this is a basis split

    //It is a basis split for the split passed to this function
    //if it matches the split on all its non-null groups.

    const currentSplitIsBasis = nonNullGroups
      .every((group) => {
        const matchingGroup = currentSplit.groups.find((matchGroup) => getQuestionKey(matchGroup.question) === getQuestionKey(group.question));
        return (
          matchingGroup &&
          matchingGroup.responseGroup &&
          matchingGroup.responseGroup.label === group.responseGroup?.label
        )
      }) //test whether every non-null group matches every group in the current split

    if (currentSplitIsBasis) {
      indices.push(currentSplitIdx)
    }

  }
  return indices;
}



interface GetFullySpecifiedSplitIndicesProps {
  allSplits: Split[],
  groupingQuestionsExcludedKeys: string[],
  groupingQuestionsX: GroupingQuestion[],
  groupingQuestionsY: GroupingQuestion[]
}
/**
 * Given arrays of included and excluded grouping questions,
 * a fully specified split is null on all the excluded questions,
 * and not null on all the included questions.
 * 
 * This function loops through the array of splits provided
 * and returns the indices of the splits that are fully specified
 * for the included and excluded grouping questions passed.
 * 
 * @param GetFullySpecifiedSplitIndicesProps
 * @returns number[]
 */
export function getFullySpecifiedSplitIndices({
  allSplits,
  groupingQuestionsExcludedKeys,
  groupingQuestionsX,
  groupingQuestionsY
}: GetFullySpecifiedSplitIndicesProps): number[] {
  const indices: number[] = [];
  let splitIdx = -1;
  for (const split of allSplits) {
    splitIdx++;
    //get the grouping question keys that are null at this split
    const nullKeys = split.groups
      .filter((group) => group.responseGroup === null)
      .map((group) => getQuestionKey(group.question))
    //if any of the excluded grouping questions are NOT in the list of null questions on this split,
    //move on to the next split.
    if (groupingQuestionsExcludedKeys.some((gqKey) => !nullKeys.includes(gqKey))) {
      continue;
    }
    //this split is fully specified only if it is not null
    //on all the included grouping questions
    if (
      groupingQuestionsX.some((gqX) => nullKeys.includes(getQuestionKey(gqX))) ||
      groupingQuestionsY.some((gqY) => nullKeys.includes(getQuestionKey(gqY)))
    ) {
      continue;
    }
    //we now know that this split is fully specified
    indices.push(splitIdx)
  }
  return indices
}
