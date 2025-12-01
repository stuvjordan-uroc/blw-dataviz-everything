import { GroupingQuestion, ResponseQuestion, Split, ResponseGroupWithStats } from "../types";
import { VizPoint } from "./types";
import { getQuestionKey } from '../utils';

/**
 * Allocate synthetic counts to response groups using a greedy algorithm
 * that respects proportions while ensuring counts sum to totalCount.
 * 
 * Uses largest remainder method: floor all proportional allocations,
 * then distribute remaining count to groups with largest fractional parts.
 * 
 * @param responseGroupsWithStats - Response groups with computed proportions
 * @param totalCount - Total count to distribute across response groups
 * @returns Response groups with added syntheticCount property
 */
export function addSyntheticCounts(
  responseGroupsWithStats: ResponseGroupWithStats[],
  totalCount: number
): (ResponseGroupWithStats & { syntheticCount: number })[] {
  if (typeof totalCount !== 'number' || Number.isNaN(totalCount) || !Number.isFinite(totalCount)) {
    throw new Error('totalCount must be a finite number');
  }

  const totalCountFloor = Math.floor(totalCount);

  // If floor is not strictly positive, set syntheticCount = 0 for every element
  if (totalCountFloor <= 0) {
    return responseGroupsWithStats.map((rg) => ({ ...rg, syntheticCount: 0 }));
  }

  const n = responseGroupsWithStats.length;
  if (n === 0) return [];

  // Compute raw targets and floor them
  const rawTargets = responseGroupsWithStats.map((rg) => {
    const p = (typeof rg.proportion === 'number' && isFinite(rg.proportion) && rg.proportion >= 0) ? rg.proportion : 0;
    return p * totalCountFloor;
  });

  const floored = rawTargets.map((t) => Math.floor(t));
  let allocatedSum = floored.reduce((a, b) => a + b, 0);

  // If allocatedSum already equals target, return
  const remainder = totalCountFloor - allocatedSum;
  if (remainder === 0) {
    return responseGroupsWithStats.map((rg, i) => ({ ...rg, syntheticCount: floored[i] }));
  }

  // Compute fractional errors and sort by largest fractional part (descending).
  const fracInfo = rawTargets.map((t, i) => ({ i, frac: t - Math.floor(t), prop: responseGroupsWithStats[i].proportion || 0 }));
  // Sort by fractional part desc, tie-break by proportion desc, then index asc
  fracInfo.sort((a, b) => {
    if (b.frac !== a.frac) return b.frac - a.frac;
    if (b.prop !== a.prop) return b.prop - a.prop;
    return a.i - b.i;
  });

  // Distribute the remaining 1-by-1 to the items with largest fractional parts
  const resultCounts = floored.slice();
  for (let k = 0; k < remainder; k++) {
    const idx = fracInfo[k].i;
    resultCounts[idx] = resultCounts[idx] + 1;
  }

  return responseGroupsWithStats.map((rg, i) => ({ ...rg, syntheticCount: resultCounts[i] }));
}

/**
 * Parameters for generating points from split data.
 */
export interface GeneratePointsParams {
  /** The response question to generate points for */
  responseQuestion: ResponseQuestion;
  /** All splits from the statistics instance */
  allSplits: Split[];
  /** Question keys excluded from the visualization */
  groupingQuestionsExcludedKeys: string[];
  /** Grouping questions mapped to X axis */
  groupingQuestionsX: GroupingQuestion[];
  /** Grouping questions mapped to Y axis */
  groupingQuestionsY: GroupingQuestion[];
  /** Optional synthetic sample size for generating fixed number of points */
  syntheticSampleSize?: number;
}

/**
 * Generate VizPoints from split data for a response question.
 * 
 * Creates point objects that represent individual responses (or synthetic responses
 * if syntheticSampleSize is specified). Each point is associated with its response
 * group and the fully-specified split it belongs to.
 * 
 * Only creates points for splits that:
 * - Are null on all excluded grouping questions
 * - Are fully specified (non-null) on all included grouping questions
 * - Have computed statistics (positive totalCount)
 * 
 * @param params - Parameters for point generation
 * @returns Array of VizPoints ready to be positioned in segments
 */
export function generatePoints(
  {
    responseQuestion,
    allSplits,
    groupingQuestionsExcludedKeys,
    groupingQuestionsX,
    groupingQuestionsY,
    syntheticSampleSize
  }: GeneratePointsParams
): VizPoint[] {
  const points: VizPoint[] = [];
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

    //This split is needed for initializing the points array only if it is not null
    //on every grouping question included in this viz

    if (
      groupingQuestionsX.some((gqX) => nullKeys.includes(getQuestionKey(gqX))) ||
      groupingQuestionsY.some((gqY) => nullKeys.includes(getQuestionKey(gqY)))
    ) {
      continue;
    }

    //We now know that this split should be used in populating the points array

    //here we need to branch depending on whether a synthetic sample has been requested
    if (syntheticSampleSize) {
      //find the responseQuestion in the split
      const splitRQ = split.responseQuestions.find((rq) => getQuestionKey(rq) === getQuestionKey(responseQuestion))
      if (splitRQ && splitRQ.totalCount > 0) {
        //in this case, we know the synthetic sample size, and we have the data required to allocate points 
        // across response groups

        //compute the synthetic counts for the response groups
        const responseGroupsWithSyntheticCounts = addSyntheticCounts(splitRQ.responseGroups.expanded, syntheticSampleSize)

        //add points to the points array for each expanded response group, using the synthetic counts
        let lastId = points.length > 0 ? points[points.length - 1].id : 0;
        responseGroupsWithSyntheticCounts.forEach((rg) => {
          points.push(
            ...(Array(rg.syntheticCount)).fill(0).map((_, idx) => ({
              id: lastId + 1 + idx,
              expandedResponseGroup: rg,
              splitGroups: split.groups.filter((group) => (
                groupingQuestionsX.map((gqX) => getQuestionKey(gqX)).includes(getQuestionKey(group.question)) ||
                groupingQuestionsY.map((gqY) => getQuestionKey(gqY)).includes(getQuestionKey(group.question))
              )),
              fullySpecifiedSplitIndex: splitIdx
            }))
          )
          lastId = lastId + rg.syntheticCount;
        })
      }

      //Note...if we cannot identify splitRQ or if the totalCount is not positive
      //There is no data to inform how to allocate points across response groups on the response
      //question, so we do not allocate any points for this split.
    } else {
      //here, there is no synthetic sample requested.
      //so the points will represent actual responses from the data.

      //find the responseQuestion in the split
      const splitRQ = split.responseQuestions.find((rq) => getQuestionKey(rq) === getQuestionKey(responseQuestion))

      if (splitRQ && splitRQ.totalCount > 0) {

        //this is the only case where we have data that will allow us to allocate points.


        //get the id number of the last assigned point
        let lastId = points.length > 0 ? points[points.length - 1].id : 0;
        //loop through the expanded responses of the response group
        splitRQ.responseGroups.expanded.forEach((rg) => {
          points.push(
            ...(Array(rg.totalCount)).fill(0).map((_, idx) => ({
              id: lastId + 1 + idx,
              expandedResponseGroup: rg,
              splitGroups: split.groups.filter((group) => (
                groupingQuestionsX.map((gqX) => getQuestionKey(gqX)).includes(getQuestionKey(group.question)) ||
                groupingQuestionsY.map((gqY) => getQuestionKey(gqY)).includes(getQuestionKey(group.question))
              )),
              fullySpecifiedSplitIndex: splitIdx
            }))
          )
          lastId = lastId + rg.totalCount;
        })
      }

      //Note...if we cannot identify splitRQ or if the totalCount is not positive
      //There is no data to inform how to allocate points across response groups on the response
      //question, so we do not allocate any points for this split.
    }
  }
  return points;
}
