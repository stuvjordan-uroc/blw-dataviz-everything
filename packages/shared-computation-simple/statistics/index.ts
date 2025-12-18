import { generateCartesian } from "./generateCartesian";
import { generateBasisSplits } from "./generateBasisSplits";
import type { ResponseQuestion, GroupingQuestion, Split, Group } from "./types";

export interface InitializeSplitsProps {
  responseQuestion: ResponseQuestion;
  groupingQuestions: GroupingQuestion[];
  skipValidation?: boolean;
  weightQuestionKey?: string;
}
export function initializeSplits({
  responseQuestion,
  groupingQuestions,
  skipValidation,
  weightQuestionKey
}: InitializeSplitsProps): Split[] {
  //==================================
  // VALIDATE PROPS
  //==================================

  if (!skipValidation) {

    // every grouping question has at least 1 response group

    // collapsed response groups cover expanded response groups 

  }

  //=====================================
  // EARLY RETURN IF THERE ARE NO GROUPING QUESTIONS
  //====================================

  if (groupingQuestions.length === 0) {
    return ([{
      basisSplitIndices: [],
      groups: [],
      totalCount: 0,
      totalWeight: 0,
      responseGroups: {
        collapsed: responseQuestion.responseGroups.collapsed.map((rg) => ({
          ...rg,
          totalCount: 0,
          totalWeight: 0,
          proportion: 0
        })),
        expanded: responseQuestion.responseGroups.expanded.map((rg) => ({
          ...rg,
          totalCount: 0,
          totalWeight: 0,
          proportion: 0
        }))
      }
    }])
  }

  //================================
  // GENERATE BASIS SPLITS
  //================================

  const basisSplits = generateBasisSplits(responseQuestion, groupingQuestions);


  //===============================
  // GENERATE PARTIAL SPLITS
  //===============================




  /**
   * 
   * basisSplits are the fully-specified splits,
   * such as ["male", "young", "black"].
   * 
   * from these basisSplits, we want to construct
   * the array of all "partial splits".  A partial
   * split is the aggregation along one or more dimensions
   * of multiple basis splits including ALL POSSIBLE VALUES
   * on the aggregated dimensions.
   * 
   * For instance, suppose that one of the grouping question is
   * "age", and it's full list of response group is [["young"], ["old"]],
   * and that the other two grouping questions are "sex" and "race".
   * Then one partial split is:
   * 
   * ["male", "young or old", "black"]
   * 
   * Critically, we do NOT want any splits that are "partially aggregated"
   * along one or more dimensions.  For instance, if the total list of 
   * response groups on race is [["black"],["white"],["other"]],
   * 
   * ["male", "young or old", "black or white"]
   * 
   * is NOT a partial split, because it does not include ALL
   * response groups on the "race" dimension.
   * 
   * We want to represent any such partial split using the indices
   * of the basis splits in the basisSplits array that must be assembled to
   * form the partial split.
   * 
   * For instance, suppose that...
   * 
   * basis split ["male", "young", "black"] is at index 42
   * 
   * basis split ["male", "young", "white"] is at index 86
   * 
   * basis split ["male", "young", "other"] is at index 97
   * 
   * and "black", "white", "other" are all of the response groups on the "race" question.
   * Then we want to represent the partial split
   * 
   * ["male", "young", "black or white or other"]
   * 
   * as the array
   * 
   * [42, 86, 97]
   * 
   * 
   * 
   * We want to construct the full list of partial splits represented in this way
   * efficiently.  Here's the idea:
   * 
   * Start with the first basis split in the basisSplits array.  Suppose it's 
   * 
   * ["male", "young", "black"]
   * 
   * Notice that in this example, the dimensions are in the order "sex", "age", "race"
   * 
   * Starting with this basis split, we want to construct partial splits by 
   * varying the dimensions one-at-a-time from the left to the right.  So first we construct
   * all partial splits with sex fixed to "male".  Then we construct all partial splits
   * with sex fixed to "female".  Then we construct all partial splits with sex aggregated.
   * 
   * Obviously, there's some sort of recursive reduced-based process we can use for this.
   * 
   * Critically, we want to use knowledge of the order in which the generateBasisSplits()
   * function that generated basisSplits returns basis splits. By using that information
   * we do not have to do costly searching through the basis splits array to find all the 
   * possible values on any one dimension.
   *
   *    
   * */




}