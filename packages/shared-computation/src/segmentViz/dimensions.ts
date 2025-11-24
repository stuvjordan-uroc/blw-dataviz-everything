import type { SessionConfig, Question } from 'shared-schemas';
import type { VizConfigSegments } from './types';
import { getQuestionKey } from '../utils';

/**
 * Calculate the total width of the visualization.
 * Based on the view where ALL horizontal grouping questions are active
 * with EXPANDED response groups.
 * 
 * Formula: (# horizontal grouping questions) × segmentGroupWidth × (3 × # expanded response groups - 3) 
 *          + (# horizontal grouping questions - 1) × groupGapHorizontal
 * 
 * All values in point radii units.
 */
export function calculateVizWidth(
  sessionConfig: SessionConfig,
  vizConfigSegments: VizConfigSegments
): number {
  const numHorizontalQuestions = vizConfigSegments.groupingQuestionsHorizontal.length;

  // Handle case of no horizontal grouping questions
  if (numHorizontalQuestions === 0) {
    // Find maximum number of expanded response groups across all response questions
    const maxExpandedGroups = Math.max(
      ...sessionConfig.responseQuestions.map(rq => rq.responseGroups.expanded.length),
      1 // At least 1 to avoid division by zero
    );

    // Single segment group width calculation
    const numResponseGaps = Math.max(0, maxExpandedGroups - 1);
    return vizConfigSegments.segmentGroupWidth * (3 * numResponseGaps);
  }

  // Find maximum number of expanded response groups
  const maxExpandedGroups = Math.max(
    ...sessionConfig.responseQuestions.map(rq => rq.responseGroups.expanded.length)
  );

  const numResponseGaps = maxExpandedGroups - 1;
  const segmentGroupWidth = vizConfigSegments.segmentGroupWidth * (3 * numResponseGaps);
  const totalSegmentGroupWidth = numHorizontalQuestions * segmentGroupWidth;
  const totalGroupGaps = (numHorizontalQuestions - 1) * vizConfigSegments.groupGapHorizontal;

  return totalSegmentGroupWidth + totalGroupGaps;
}

/**
 * Calculate the total height of the visualization.
 * Based on the view where ALL vertical grouping questions are active
 * with EXPANDED response groups.
 * 
 * Formula: (# vertical segment groups) × segmentGroupHeight 
 *          + (# vertical segment groups - 1) × groupGapVertical
 * 
 * All values in point radii units.
 */
export function calculateVizHeight(
  sessionConfig: SessionConfig,
  vizConfigSegments: VizConfigSegments
): number {
  const verticalQuestions = vizConfigSegments.groupingQuestionsVertical;

  // Handle case of no vertical grouping questions
  if (verticalQuestions.length === 0) {
    return vizConfigSegments.segmentGroupHeight;
  }

  // Calculate number of vertical segment groups (product of response groups)
  const numVerticalGroups = verticalQuestions.reduce((product, gq) => {
    const question = sessionConfig.groupingQuestions.find(
      q => getQuestionKey(q) === getQuestionKey(gq)
    );
    const count = question?.responseGroups.length ?? 1;
    return product * count;
  }, 1);

  const totalSegmentGroupHeight = numVerticalGroups * vizConfigSegments.segmentGroupHeight;
  const totalGroupGaps = (numVerticalGroups - 1) * vizConfigSegments.groupGapVertical;

  return totalSegmentGroupHeight + totalGroupGaps;
}

/**
 * Calculate the width of each segment group for a specific view.
 * 
 * The total vizWidth is fixed (based on all questions active, expanded).
 * This width is distributed among the active horizontal segment groups.
 */
export function calculateSegmentGroupWidth(
  activeHorizontal: Question[],
  vizWidth: number,
  vizConfigSegments: VizConfigSegments
): number {
  const numActiveGroups = activeHorizontal.length || 1; // At least 1 group

  if (numActiveGroups === 1) {
    return vizWidth;
  }

  // Subtract total group gaps
  const totalGroupGaps = (numActiveGroups - 1) * vizConfigSegments.groupGapHorizontal;
  const availableWidth = vizWidth - totalGroupGaps;

  // Distribute equally among active groups
  return availableWidth / numActiveGroups;
}

/**
 * Calculate the height of each segment group for a specific view.
 * 
 * The total vizHeight is fixed (based on all vertical questions active).
 * This height is distributed among the active vertical segment groups.
 */
export function calculateSegmentGroupHeight(
  activeVertical: Question[],
  vizHeight: number,
  vizConfigSegments: VizConfigSegments
): number {
  const numActiveGroups = activeVertical.length || 1; // At least 1 group

  if (numActiveGroups === 1) {
    return vizHeight;
  }

  // Subtract total group gaps
  const totalGroupGaps = (numActiveGroups - 1) * vizConfigSegments.groupGapVertical;
  const availableHeight = vizHeight - totalGroupGaps;

  // Distribute equally among active groups
  return availableHeight / numActiveGroups;
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
