import { ResponseQuestion, Split, ResponseGroupWithStats, ResponseQuestionWithStats } from "../types";
import { getQuestionKey } from '../utils';
import { PointSet } from "./types";

/**
 * Asserts that the expanded response group values are contained within
 * at least one collapsed response group. This invariant is guaranteed by
 * the Statistics class validation, so failure indicates a programming error.
 */
function assertExpandedInCollapsed(
  expandedValues: number[],
  collapsedGroups: ResponseGroupWithStats[],
  context: string
): void {
  const found = collapsedGroups.some(rg =>
    expandedValues.every(val => rg.values.includes(val))
  );
  if (!found) {
    throw new Error(
      `Invariant violation at ${context}: expanded values [${expandedValues}] not found in any collapsed group. ` +
      `This should be prevented by Statistics validation.`
    );
  }
}

export interface GetSyntheticCountsProps {
  responseGroups: ResponseGroupWithStats[];
  syntheticSampleSize: number;
}
export function getSyntheticCounts({
  responseGroups,
  syntheticSampleSize
}: GetSyntheticCountsProps): number[] {
  const counts = responseGroups.map((rg) => {
    const float = rg.proportion * syntheticSampleSize;
    return ({
      float: float,
      whole: Math.floor(float)
    })
  })
  function sumCounts(counts: { float: number, whole: number }[]): number {
    return counts
      .map(count => count.whole)
      .reduce((acc, curr) => acc + curr, 0)
  }
  while (sumCounts(counts) < syntheticSampleSize) {
    const mostOff = counts.reduce(
      (acc, curr) => (acc.float - acc.whole) > (curr.float - curr.whole) ? acc : curr,
      counts[0]
    )
    mostOff.whole++;
  }
  return counts.map(count => count.whole);
}

interface GetCurrentCountsAtResponseQuestion {
  responseQuestion: ResponseQuestionWithStats,
  syntheticSampleSize?: number
}
export function getCurrentCountsAtResponseQuestion({
  responseQuestion,
  syntheticSampleSize
}: GetCurrentCountsAtResponseQuestion): number[] {
  if (responseQuestion.totalCount <= 0) {
    //no data for this question
    return Array(responseQuestion.responseGroups.expanded.length).fill(0)
  }
  if (!syntheticSampleSize) {
    //easy!
    return responseQuestion.responseGroups.expanded.map((erg) => erg.totalCount)
  }
  //hard case -- synthetic sample
  return getSyntheticCounts({
    responseGroups: responseQuestion.responseGroups.expanded,
    syntheticSampleSize: syntheticSampleSize
  })
}


export interface PopulatePointsParams {
  /** The previous point sets -- used to create diffs */
  prevPointSets: PointSet[];
  /** The response question to generate points for */
  responseQuestion: ResponseQuestion;
  /** All splits from the statistics instance */
  allSplits: Split[];
  /** Fully specified split indices for this response question*/
  fullySpecifiedSplitIndices: number[];
  /** Optional synthetic sample size for generating fixed number of points */
  syntheticSampleSize?: number;
}
export function populatePoints({
  prevPointSets,
  responseQuestion,
  allSplits,
  fullySpecifiedSplitIndices,
  syntheticSampleSize
}: PopulatePointsParams): PointSet[] {

  const newPointSets: PointSet[] = [];

  //loop through all the splits
  let splitIdx = -1;
  for (const split of allSplits) {
    splitIdx++;

    //skip if this is not a fully-specified split index
    //because only fully-specified split indices are used
    //to populate points
    if (!fullySpecifiedSplitIndices.includes(splitIdx)) {
      continue;
    }

    //find the matching response question
    const matchingRQ = split.responseQuestions.find((rq) => getQuestionKey(rq) === getQuestionKey(responseQuestion))

    //obviously, we can only proceed if we have the response question required on this split!
    if (!matchingRQ) {
      continue;
    }

    //get the array of updated counts
    const currentCounts = getCurrentCountsAtResponseQuestion({
      responseQuestion: matchingRQ,
      syntheticSampleSize: syntheticSampleSize
    })

    //loop through the counts (which are in the same order and have the same
    //length as the current response question's expanded response groups)
    let ergIdx = -1;
    for (const currentCount of currentCounts) {
      ergIdx++;

      //get the expanded response groups values
      const ergValues = matchingRQ.responseGroups.expanded[ergIdx].values;

      //validate the invariant guaranteed by Statistics class
      assertExpandedInCollapsed(
        ergValues,
        matchingRQ.responseGroups.collapsed,
        `populatePoints split ${splitIdx}, expanded group ${ergIdx}`
      );

      //get the collapsed response group index
      const crgIndex = matchingRQ.responseGroups.collapsed
        .map((rgCollapsed, rgCollapsedIdx) => ({
          ...rgCollapsed,
          idx: rgCollapsedIdx
        }))
        .find((rgCollapsed) => ergValues.every((val) => rgCollapsed.values.includes(val)))!
        .idx;



      //find the matching entry in prevPointsSets
      const prevPointSet = prevPointSets.find((pointSet) => (
        pointSet.fullySpecifiedSplitIndex === splitIdx &&
        pointSet.responseGroupIndex.expanded === ergIdx
      ));

      //get the previous point ids (composite string IDs)
      const prevPointIds = (prevPointSet) ? prevPointSet.currentIds : [];

      //generate new composite IDs if we're adding points
      //composite ID format: "${splitIdx}-${ergIdx}-${localId}"
      //localId starts from the current length of prevPointIds
      const newAddedIds = currentCount > prevPointIds.length
        ? Array.from(
          { length: currentCount - prevPointIds.length },
          (_, i) => `${splitIdx}-${ergIdx}-${prevPointIds.length + i}`
        )
        : [];

      //current IDs are either a subset of previous IDs (if count decreased)
      //or previous IDs plus newly added IDs (if count increased)
      const newCurrentIds = currentCount <= prevPointIds.length
        ? prevPointIds.slice(0, currentCount)
        : [...prevPointIds, ...newAddedIds];

      //removed IDs are the ones that were in previous but not in current
      const newRemovedIds = currentCount < prevPointIds.length
        ? prevPointIds.slice(currentCount)
        : [];

      //created the updated point set
      newPointSets.push({
        fullySpecifiedSplitIndex: splitIdx,
        responseGroupIndex: {
          expanded: ergIdx,
          collapsed: crgIndex
        },
        currentIds: newCurrentIds,
        addedIds: newAddedIds,
        removedIds: newRemovedIds
      })
    }
  }
  return newPointSets;
}


