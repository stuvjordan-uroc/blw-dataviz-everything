import { Question } from "shared-schemas";
import { RespondentData } from "./statistics/types";
import { Split } from "./statistics/types";
import { ResponseQuestion } from "shared-computation";
import { getQuestionKey } from './utils';

/**
 * Take a respondentData.  Extract from it...
 * + the expanded response group on the response question to which it belongs,
 * + the basisSplit to which it belongs
 * + the respondent's weight
 * return null if any of these cannot be identified
 */
export function transformRespondentData(
  respondentData: RespondentData,
  basisSplitIndices: number[],
  splitsWithSegments: Split[],
  responseQuestion: ResponseQuestion,
  weightQuestion?: Question
): {
  expandedResponseGroupIdx: number,
  basisSplitIdx: number,
  weight: number
} | null {
  //set the return values for weight and response question
  let respondentWeight: number | null = weightQuestion ? null : 1;
  let respondentExpandedResponseGroupIdx: number | null = null;
  const groupingResponses = [];
  //iterate through the responses
  for (const response of respondentData.responses) {

    //is this the weight question?
    if (
      weightQuestion && //is a weight question specified?
      getQuestionKey(weightQuestion) === getQuestionKey(response) //is this the weight question
    ) {
      //early return null if the weight question is answered with a non-number
      if (typeof response.response !== "number") {
        return null;
      }
      respondentWeight = response.response;
      continue;
    }

    //is this the response question?
    if (
      getQuestionKey(response.response) === getQuestionKey(responseQuestion) //this is the response question
    ) {
      //early return null if the response question is not answered
      if (typeof response.response !== "number") {
        return null
      }
      const ergIdx = responseQuestion.responseGroups.expanded.findIndex((erg) => erg.values.includes(response.response as number))
      //early return if lookup failed
      if (typeof ergIdx !== "number") {
        return null
      }
      respondentExpandedResponseGroupIdx = ergIdx as number;
      continue;
    }
    //this is a grouping question
    groupingResponses.push(response)
  }

  //if we get to this point, we should have found the responseQuestion and if the weight question is defined, the weightquestion
  if (respondentExpandedResponseGroupIdx === null || (weightQuestion && respondentWeight === null)) {
    return null;
  }

  //so if we get to this point, 
  // respondentExpandedResponseGroupIdx !== null &&
  // !weightQuestion || (weightQuestion && respondentWeight !== null)

  //groupingResponses contain all of the questions to be used to determine which basis split this belongs to
  const matchingBasisSplits = groupingResponses.reduce(
    (acc, curr) => {
      const matches = acc.filter((basisSplitIdx) => {
        const matchingGroup = splitsWithSegments[basisSplitIdx].groups.find((group) => getQuestionKey(group.question) === getQuestionKey(curr))
        return (matchingGroup && curr.response && matchingGroup.responseGroup?.values.includes(curr.response))
      })
      return matches
    },
    basisSplitIndices
  )

  if (matchingBasisSplits.length === 0 || matchingBasisSplits.length > 1) {
    return null;
  }



  return ({
    expandedResponseGroupIdx: respondentExpandedResponseGroupIdx,
    weight: respondentWeight!,
    basisSplitIdx: matchingBasisSplits[0]
  })
}

