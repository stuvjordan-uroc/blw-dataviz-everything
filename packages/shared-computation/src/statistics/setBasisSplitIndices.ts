import type { Group, Split } from "./types";


/**
 * Takes an array of splits, along with an array of {splitIdx: number; groups: Group[]}
 * identifying the indices of the basis splits within the array of splits along with
 * the Group array of each of those basis splits.
 * 
 * Uses the passed allBasisSplits to set the basisSplitIndices property of
 * each Split in the passed array of splits.
 * 
 * Assumes that the allBasisSplits array correctly depicts which indices in the splits
 * array hold the basis splits, and correctly depicts the groups array for each of those
 * basis splits.  If you pass invalid data you will get back seemingly valid but actually
 * invalid nonsense.
 * 
 * MUTATES THE PASSED ARRAY OF SPLITS.
 * 
 * @param splits 
 * @param allBasisSplits 
 * @returns mutated splits array
 */
export function setBasisSplitIndices(
  splits: Split[],
  allBasisSplits: { splitIdx: number; groups: Group[]; }[]
): Split[] {
  let splitIdx = -1;
  for (const split of splits) {
    splitIdx++;

    //check whether the current split is a basis split.
    //if so, set the basisSplitIndices and continue to the next split.
    if (allBasisSplits.map((bs) => bs.splitIdx).includes(splitIdx)) {
      split.basisSplitIndices = [splitIdx];
      continue;
    }

    //the current split is not a basis split
    //construct the basis split indices by iterating
    //through the current split's groups, eliminating
    //basis splits that do not belong from the allBasisSplits array as we go.
    split.basisSplitIndices = split.groups
      .reduce(
        (remainingBasisSplits, currGroup, currGroupIdx) => {
          if (currGroup.responseGroup === null) {
            //this question does not eliminate any candidate basis splits
            //so move to the next group with the basis splits
            //established so far unchanged
            return remainingBasisSplits
          }
          //the current question is not null
          //so any remaining basis splits that do not match
          //the response group on the current question should be
          //eliminated
          return remainingBasisSplits.filter((basisSplit) => (
            basisSplit.groups[currGroupIdx].responseGroup?.label === currGroup.responseGroup?.label
          ))
        },
        allBasisSplits
      )
      //map to the indices
      .map((basisSplit) => basisSplit.splitIdx)
  }
  return splits;
}