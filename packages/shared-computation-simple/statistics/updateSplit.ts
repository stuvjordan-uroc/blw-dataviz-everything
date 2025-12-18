import { ResponseGroupWithStats, Split, SplitDiff } from "./types";

/**
 * Pass a split and an array of responses known to belong to the split,
 * with each response in the array having an expanded response group index
 * and a weight.
 * 
 * Returns a deep copy of the split with updated weights, counts and proportions.
 * Also returns a diff of the split that gives the changes to the weights, counts
 * and proportions.
 * 
 * DOES NOT MUTATE THE PASSED SPLIT.
 * 
 * 
 * @param split 
 * @param responses 
 * @returns updated deep copy of split and a diff of the split
 */
export function updateSplitFromResponses(
  split: Split,
  responses: { expandedResponseGroupIndex: number, weight: number }[]
): [Split, SplitDiff] {
  //initialize new totalWeights
  let newTotalCount = split.totalCount
  let newTotalWeight = split.totalWeight

  //initialize new response groups
  const newResponseGroups = structuredClone(split.responseGroups);

  //initialize the diff object
  const diff = {
    totalCount: 0,
    totalWeight: 0,
    responseGroups: {
      collapsed: newResponseGroups.collapsed.map((crg) => ({
        ...crg,
        totalCount: 0,
        totalWeight: 0,
        proportion: 0
      })),
      expanded: newResponseGroups.expanded.map((erg) => ({
        ...erg,
        totalCount: 0,
        totalWeight: 0,
        proportion: 0
      }))
    }
  }


  //update the totalWeights and totalCounts from each response
  for (const response of responses) {

    //get the expanded response group for the current response
    const erg = newResponseGroups.expanded[response.expandedResponseGroupIndex];

    //get the collapsed response group and index for the current response
    let [crg, crgIdx]: [ResponseGroupWithStats | null, number] = [null, -1];
    for (const candidateCrg of newResponseGroups.collapsed) {
      crgIdx++;
      if (erg.values.every((value) => candidateCrg.values.includes(value))) {
        crg = candidateCrg;
        break;
      }
    }

    //update the response groups, newTotalWeight, and newTotalCount 
    //if the expanded and collapsed response groups are identified.
    //note that if the erg and crg are not found, the current response is
    //silently skipped
    if (erg && crg) {

      //total count
      newTotalCount++;
      diff.totalCount++;

      //total weight
      newTotalWeight += response.weight;
      diff.totalWeight += response.weight;

      //expanded response group count and weight
      erg.totalCount++;
      erg.totalWeight += response.weight;
      diff.responseGroups.expanded[response.expandedResponseGroupIndex].totalCount++;
      diff.responseGroups.expanded[response.expandedResponseGroupIndex].totalWeight += response.weight;

      //collapsed response group count and weight
      crg.totalCount++;
      crg.totalWeight += response.weight;
      diff.responseGroups.collapsed[crgIdx].totalCount++;
      diff.responseGroups.expanded[crgIdx].totalWeight += response.weight;
    }

  }

  //update the response group proportions and diffs

  //expanded response groups
  let ergIdx = -1;
  for (const erg of newResponseGroups.expanded) {
    ergIdx++;
    const newProportion = erg.totalWeight / newTotalWeight;
    diff.responseGroups.expanded[ergIdx].proportion = newProportion - erg.proportion;
    erg.proportion = newProportion;
  }
  //collapsed response groups
  let crgIdx = -1;
  for (const crg of newResponseGroups.collapsed) {
    crgIdx++;
    const newProportion = crg.totalWeight / newTotalWeight;
    diff.responseGroups.collapsed[crgIdx].proportion = newProportion - crg.proportion;
    crg.proportion = newProportion;
  }

  return [
    {
      ...split,
      totalWeight: newTotalWeight,
      totalCount: newTotalCount,
      responseGroups: newResponseGroups
    },
    diff
  ]







}

/**
 * Given a split and an array of splits ASSUMED to be ALL the basis splits for 
 * the passed splits, uses the data in the basis splits to re-compute the
 * counts, weights, and proportions of the split.
 * 
 * Returns a deep copy of the split with updated stats.
 * 
 * DOES NOT MUTATE THE PASSED SPLIT.
 * 
 * 
 * @param split 
 * @param basisSplits 
 * @returns updated deep copy of split and a diff of the split
 */
export function updateSplitFromBasisSplits(split: Split, basisSplits: Split[]): [Split, SplitDiff] {
  //initialize new totalWeights
  let newTotalCount = basisSplits.reduce((acc, curr) => acc + curr.totalCount, 0)
  let newTotalWeight = basisSplits.reduce((acc, curr) => acc + curr.totalWeight, 0)

  //initialize new response groups
  const newResponseGroups = structuredClone(split.responseGroups);

  //compute new response group weights, counts, proportions

  newResponseGroups.collapsed = newResponseGroups.collapsed.map((crg, crgIdx) => ({
    ...crg,
    totalCount: basisSplits.reduce(
      (acc, curr) => acc + curr.responseGroups.collapsed[crgIdx].totalCount,
      0
    ),
    totalWeight: basisSplits.reduce(
      (acc, curr) => acc + curr.responseGroups.collapsed[crgIdx].totalWeight,
      0
    ),
    proportion: basisSplits.reduce(
      (acc, curr) => acc + (curr.totalWeight / newTotalWeight) * curr.responseGroups.collapsed[crgIdx].proportion,
      0
    )
  }))

  newResponseGroups.expanded = newResponseGroups.expanded.map((crg, crgIdx) => ({
    ...crg,
    totalCount: basisSplits.reduce(
      (acc, curr) => acc + curr.responseGroups.expanded[crgIdx].totalCount,
      0
    ),
    totalWeight: basisSplits.reduce(
      (acc, curr) => acc + curr.responseGroups.expanded[crgIdx].totalWeight,
      0
    ),
    proportion: basisSplits.reduce(
      (acc, curr) => acc + (curr.totalWeight / newTotalWeight) * curr.responseGroups.expanded[crgIdx].proportion,
      0
    )
  }))

  //compute the diff object
  const diff = {
    totalCount: newTotalCount - split.totalCount,
    totalWeight: newTotalWeight - split.totalWeight,
    responseGroups: {
      collapsed: newResponseGroups.collapsed.map((crg, crgIdx) => ({
        ...crg,
        totalCount: crg.totalCount - split.responseGroups.collapsed[crgIdx].totalCount,
        totalWeight: crg.totalWeight - split.responseGroups.collapsed[crgIdx].totalWeight,
        proportion: crg.proportion - split.responseGroups.collapsed[crgIdx].proportion
      })),
      expanded: newResponseGroups.expanded.map((erg, ergIdx) => ({
        ...erg,
        totalCount: erg.totalCount - split.responseGroups.expanded[ergIdx].totalCount,
        totalWeight: erg.totalWeight - split.responseGroups.expanded[ergIdx].totalWeight,
        proportion: erg.proportion - split.responseGroups.expanded[ergIdx].proportion
      }))
    }
  }

  return [
    {
      ...split,
      totalCount: newTotalCount,
      totalWeight: newTotalWeight,
      responseGroups: newResponseGroups
    },
    diff
  ]
}

