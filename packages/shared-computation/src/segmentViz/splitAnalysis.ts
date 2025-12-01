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

/**
 * Find indices of all fully-specified "basis" splits that are contained within a parent split.
 * 
 * A basis split is one that:
 * 1. Has no null response groups (is fully specified) for all relevant grouping questions
 * 2. Matches the parent split's response groups where the parent is specified
 * 3. Can have any response group value where the parent is null (unspecified)
 * 
 * @param split - The parent split to find basis splits for
 * @param allSplits - All splits from the statistics instance
 * @param excludedQuestionKeys - Question keys to ignore (not part of this visualization)
 * @returns Array of indices into allSplits that are basis splits for the parent
 */
export function getIndicesOfBasisSplits(split: Split, allSplits: Split[], excludedQuestionKeys: string[]): number[] {
  // Build a map of the split's groups for quick lookup by question key
  const parentGroupMap: Map<string, Group> = new Map();
  for (const g of split.groups) {
    parentGroupMap.set(getQuestionKey(g.question), g);
  }

  // Relevant keys are those present on the split that are NOT excluded
  const relevantKeys = Array.from(parentGroupMap.keys()).filter((k) => !excludedQuestionKeys.includes(k));

  const indices: number[] = [];

  allSplits.forEach((candidateSplit, idx) => {
    // Build a map for the candidate split
    const candMap: Map<string, Group> = new Map();
    for (const g of candidateSplit.groups) {
      candMap.set(getQuestionKey(g.question), g);
    }

    // Candidate must be fully specified (no nulls) for every relevant key
    let isBasis = true;
    for (const key of relevantKeys) {
      const parentG = parentGroupMap.get(key);
      const candG = candMap.get(key);

      // Candidate must have this grouping question
      if (!candG) {
        isBasis = false;
        break;
      }

      // Candidate must be fully specified for this question
      if (candG.responseGroup === null) {
        isBasis = false;
        break;
      }

      // If the parent split specifies a particular responseGroup (not null),
      // the candidate must match that same responseGroup label to be contained.
      if (parentG && parentG.responseGroup !== null) {
        if (parentG.responseGroup.label !== candG.responseGroup!.label) {
          isBasis = false;
          break;
        }
      }
      // If parentG.responseGroup is null, candidate can be any response (already
      // ensured it's specified), so that key is fine.
    }

    if (isBasis) indices.push(idx);
  });

  return indices;
}
