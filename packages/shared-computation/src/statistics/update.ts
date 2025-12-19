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
 * Note the split is assumed to be a basis split, and thus
 * can be updated without reference to the statistics in any other split.
 * This is not validated.  If you pass a non-basis split, you will get back
 * seemingly valid but actually invalid nonsense.
 * 
 * 
 * @param split 
 * @param responses 
 * @returns updated deep copy of split and a diff of the split
 */
export function updateBasisSplitFromResponses(
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
 * Does not validated whether the basis splits passed are the correct
 * basis splits for the split passed.  If you pass the wrong basis splits
 * you will get seemingly valid but actually invalid nonsense.
 * 
 * 
 * @param split 
 * @param basisSplits 
 * @returns updated deep copy of split and a diff of the split
 */
export function updateSplitFromUpdatedBasisSplits(split: Split, updatedBasisSplits: Split[]): [Split, SplitDiff] {
  //initialize new totalWeights
  let newTotalCount = updatedBasisSplits.reduce((acc, curr) => acc + curr.totalCount, 0)
  let newTotalWeight = updatedBasisSplits.reduce((acc, curr) => acc + curr.totalWeight, 0)

  //initialize new response groups
  const newResponseGroups = structuredClone(split.responseGroups);

  //compute new response group weights, counts, proportions

  newResponseGroups.collapsed = newResponseGroups.collapsed.map((crg, crgIdx) => ({
    ...crg,
    totalCount: updatedBasisSplits.reduce(
      (acc, curr) => acc + curr.responseGroups.collapsed[crgIdx].totalCount,
      0
    ),
    totalWeight: updatedBasisSplits.reduce(
      (acc, curr) => acc + curr.responseGroups.collapsed[crgIdx].totalWeight,
      0
    ),
    proportion: updatedBasisSplits.reduce(
      (acc, curr) => acc + (curr.totalWeight / newTotalWeight) * curr.responseGroups.collapsed[crgIdx].proportion,
      0
    )
  }))

  newResponseGroups.expanded = newResponseGroups.expanded.map((crg, crgIdx) => ({
    ...crg,
    totalCount: updatedBasisSplits.reduce(
      (acc, curr) => acc + curr.responseGroups.expanded[crgIdx].totalCount,
      0
    ),
    totalWeight: updatedBasisSplits.reduce(
      (acc, curr) => acc + curr.responseGroups.expanded[crgIdx].totalWeight,
      0
    ),
    proportion: updatedBasisSplits.reduce(
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

export function generateNoChangeDiff(split: Split): SplitDiff {
  return {
    totalCount: 0,
    totalWeight: 0,
    responseGroups: {
      collapsed: split.responseGroups.collapsed.map((rg) => ({
        ...rg,
        totalCount: 0,
        totalWeight: 0,
        proportion: 0
      })),
      expanded: split.responseGroups.expanded.map((rg) => ({
        ...rg,
        totalCount: 0,
        totalWeight: 0,
        proportion: 0
      }))
    }
  }
}


/**
 * Take an array of Split, an array of indicies assumed to be the indices of basis splits in the passed
 * array of splits, and an array of responses.  Generates and returns new array of splits with statistics
 * updated in light of the passed responses, without mutating that passed splits array.
 * 
 * Assumes the allSplits array is complete,
 * the passed basisSplitIndices is correct, and the responses are correctly matched to basis splits.
 * If you pass invalid data, you will get back seemingly valid but actually invalid nonsense.
 * 
 * DOES NOT MUTATE THE PASSED allSplits ARRAY!
 * 
 * 
 * @param allSplits 
 * @param basisSplitIndices 
 * @param responses 
 * @returns new array of Split with stats updated given the passed responses.
 */
export function updateAllSplitsFromResponses(
  allSplits: Split[],
  basisSplitIndices: number[],
  responses: { basisSplitIndex: number, expandedResponseGroupIndex: number, weight: number }[]
): [Split, SplitDiff][] {
  //build a map that takes basis split indices to responses
  const responseMap: Map<number, { expandedResponseGroupIndex: number, weight: number }[]> = new Map()
  for (const response of responses) {
    const responsesAtIndex = responseMap.get(response.basisSplitIndex)
    if (responsesAtIndex) {
      responsesAtIndex.push(response)
    } else {
      responseMap.set(response.basisSplitIndex, [response])
    }
  }
  //generate the updated basis splits
  const updatedBasisSplitMap: Map<number, [Split, SplitDiff]> = new Map();
  for (const basisSplitIndex of basisSplitIndices) {
    const responsesForSplit = responseMap.get(basisSplitIndex);
    if (responsesForSplit) {
      updatedBasisSplitMap.set(
        basisSplitIndex,
        updateBasisSplitFromResponses(
          allSplits[basisSplitIndex],
          responsesForSplit
        )
      )
    } else {
      updatedBasisSplitMap.set(
        basisSplitIndex,
        [allSplits[basisSplitIndex], generateNoChangeDiff(allSplits[basisSplitIndex])]
      )
    }
  }
  //update all the splits using the now-updated basis splits
  const updatedSplits: [Split, SplitDiff][] = [];
  allSplits.forEach((split, splitIdx) => {
    const isOwnBasisSplit = updatedBasisSplitMap.get(splitIdx);
    if (isOwnBasisSplit) {
      updatedSplits.push(isOwnBasisSplit)
    } else {
      const basisSplitUpdatesForSplit = Array
        .from(updatedBasisSplitMap.entries())
        .filter(([basisSplitIndex,]) => split.basisSplitIndices.includes(basisSplitIndex))
        .map(([_, basisSplitUpdate]) => basisSplitUpdate)
      updatedSplits.push(
        updateSplitFromUpdatedBasisSplits(
          split,
          basisSplitUpdatesForSplit.map(([updatedBasisSplit]) => updatedBasisSplit)
        )
      )
    }
  })
  return updatedSplits
}