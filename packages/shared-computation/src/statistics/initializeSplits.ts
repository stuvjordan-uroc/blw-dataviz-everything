import { GroupingQuestion, ResponseQuestion, Group, Split } from "./types";
import { generateCartesian } from "./generateCartesian";
import { setBasisSplitIndices } from "./setBasisSplitIndices";

export function initializeSplits(
  responseQuestion: ResponseQuestion,
  groupingQuestions: GroupingQuestion[]
): { basisSplitIndices: number[], splits: Split[] } {
  //create the array to hold the splits we produce
  const splits: Split[] = [];
  let splitIdx = -1;

  //create the array to hold all the basis splits
  const allBasisSplits: { splitIdx: number, groups: Group[] }[] = [];

  /**
   * generate the "views"
   * 
   * A view sets each grouping question to either "active" or "not active".
   *
   */
  const views = generateCartesian<{ question: GroupingQuestion, active: boolean }>(
    groupingQuestions.map((gq) => ([
      {
        question: gq,
        active: true
      },
      {
        question: gq,
        active: false
      }
    ]))
  )

  //loop through the views, generating all the splits that belong to each view
  for (const view of views) {
    //construct the splits at the current view
    const splitsAtView = generateCartesian<Group>(
      (view.map((gq) => {
        if (!gq.active) {
          return ([{
            question: gq.question.question,
            responseGroup: null
          }])
        }
        return (gq.question.responseGroups.map((rg) => ({
          question: gq.question.question,
          responseGroup: rg
        })))
      }))
    )

    //iterate through the new splits in the current view
    for (const newSplit of splitsAtView) {
      //here we are!
      //this is a new split!

      //increment the split index
      splitIdx++;

      //check if this is a basis split.
      //if so, push it to the allBasisSplits array
      if (newSplit.every((group) => group.responseGroup !== null)) {
        allBasisSplits.push(({
          splitIdx: splitIdx,
          groups: newSplit
        }))
      }

      //push the split, with all stats initialized to 0
      splits.push(({
        basisSplitIndices: [], //initialized empty.  Populated in second pass below.
        groups: newSplit,
        totalWeight: 0,
        totalCount: 0,
        responseGroups: {
          collapsed: responseQuestion.responseGroups.collapsed.map((rg) => ({
            ...rg,
            totalWeight: 0,
            totalCount: 0,
            proportion: 0
          })),
          expanded: responseQuestion.responseGroups.expanded.map((rg) => ({
            ...rg,
            totalWeight: 0,
            totalCount: 0,
            proportion: 0
          }))
        }
      }))
    }
  }

  //pass through the full splits array to set the basis split indices for each split

  setBasisSplitIndices(splits, allBasisSplits)

  //done!  return!
  return {
    basisSplitIndices: allBasisSplits.map(bs => bs.splitIdx),
    splits: splits
  }

}