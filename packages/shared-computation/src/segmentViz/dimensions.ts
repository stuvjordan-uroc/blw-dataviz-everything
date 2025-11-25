import type { SessionConfig, Question } from 'shared-schemas';
import type { VizConfigSegments } from './types';
import { getQuestionKey } from '../utils';

/**
 * Calculate the total width of the visualization.
 * Based on the view where ALL horizontal grouping questions are active
 * with EXPANDED response groups.
 * 
 * 
 * All values in point radii units.
 */
export function calculateVizWidth(
  sessionConfig: SessionConfig,
  vizConfigSegments: VizConfigSegments
): number {
  //get the maximum number of expanded response groups
  const maxExpandedGroups = Math.max(
    ...sessionConfig.responseQuestions.map(rq => rq.responseGroups.expanded.length),
    1  //in case there are 0 expanded response groups!
  );
  if (vizConfigSegments.groupingQuestionsHorizontal.length === 0) {
    //deal with case where there are no horizontal grouping questions.
    // here we have just one segment group on the horizontal axis
    return (maxExpandedGroups - 1) * vizConfigSegments.responseGap + vizConfigSegments.minGroupAvailableWidth
  }
  //get the number of horizontal segment groups when all horizontal questions are active
  const numHSegmentGroups = vizConfigSegments.groupingQuestionsHorizontal
    .map((gQH) => getQuestionKey(gQH))
    .map((gQHKey) => {
      const matchingGQ = sessionConfig.groupingQuestions.find((gq) => getQuestionKey(gq) === gQHKey)
      return matchingGQ ? matchingGQ.responseGroups.length : 0
    })
    .reduce((acc, curr) => acc + curr, 0)
  ///Note...validation guarantees that all horizontal and vertical grouping questions have at least 2 response groups.
  //Also, validation guarantees that all horizontal and vertical grouping questions are in the
  //session config.
  //So if the configs have been validated, numHSegmentGroups >= 2.
  return (
    (numHSegmentGroups - 1) * vizConfigSegments.groupGapHorizontal //total gaps between segment groups
    + numHSegmentGroups * (  //number of horizontal segment groups in view where all H groups are active
      (maxExpandedGroups - 1) * vizConfigSegments.responseGap //total response gap width within each group
      + vizConfigSegments.minGroupAvailableWidth //total width distributed between segments within each group
    )
  )
}

/**
 * Calculate the total height of the visualization.
 * Based on the view where ALL vertical grouping questions are active
 * 
 * 
 * All values in point radii units.
 */
export function calculateVizHeight(
  sessionConfig: SessionConfig,
  vizConfigSegments: VizConfigSegments
): number {
  //deal with the case where there are no vertical grouping questions
  if (vizConfigSegments.groupingQuestionsVertical.length === 0) {
    return vizConfigSegments.minGroupHeight
  }
  //get the number of vertical segment groups when all vertical groups are active
  const numVSegmentGroups = vizConfigSegments.groupingQuestionsVertical
    .map((gQV) => getQuestionKey(gQV))
    .map((gQVKey) => {
      const matchingQ = sessionConfig.groupingQuestions.find((gQ) => getQuestionKey(gQ) === gQVKey)
      return matchingQ ? matchingQ.responseGroups.length : 0
    })
    .reduce((acc, curr) => acc + curr, 0)
  ///Note...validation guarantees that all horizontal and vertical grouping questions have at least 2 response groups.
  //Also, validation guarantees that all horizontal and vertical grouping questions are in the
  //session config.
  //So if the configs have been validated, numVSegmentGroups >= 2.
  //calculate total height of vertical group gaps when all vertical grouping questions are active
  return (
    (numVSegmentGroups - 1) * vizConfigSegments.groupGapVertical //total height of vertical group gaps
    + numVSegmentGroups * vizConfigSegments.minGroupHeight //total height of vertical segment groups
  )
}

/**
 * Calculate the width of each segment group for a specific view.
 * 
 * The total vizWidth is fixed (based on all questions active, expanded).
 * This width is distributed among the active horizontal segment groups.
 */
export function calculateSegmentGroupWidth(
  vizWidth: number,
  numColumns: number,
  groupGapHorizontal: number
): number {
  return (
    vizWidth
    - (numColumns - 1) * groupGapHorizontal
  ) / numColumns
}

/**
 * Calculate the height of each segment group for a specific view.
 * 
 * The total vizHeight is fixed (based on all vertical questions active).
 * This height is distributed among the active vertical segment groups.
 */
export function calculateSegmentGroupHeight(
  vizHeight: number,
  numRows: number,
  groupGapVertical: number
): number {
  return (
    vizHeight
    - (numRows - 1) * groupGapVertical
  ) / numRows
}

/**
 * Get the response question from session config matching a given question.
 */
export function getResponseQuestion(
  question: Question,
  sessionConfig: SessionConfig
) {
  return sessionConfig.responseQuestions.find(
    rq => getQuestionKey(rq) === getQuestionKey(question)
  );
}
