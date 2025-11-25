import type { SessionConfig } from "shared-schemas";
import { getQuestionKey } from '../utils';
import type { VizConfigSegments } from './types';

/**
 * Validate that vizConfigSegments is consistent with sessionConfig.
 * Throws error if validation fails.
 */
export function validateVizConfigSegments(
  sessionConfig: SessionConfig,
  vizConfigSegments: VizConfigSegments,
): void {
  // Validate numeric parameters
  if (vizConfigSegments.minGroupAvailableWidth <= 0) {
    throw new Error('minGroupAvailableWidth must be positive');
  }
  if (vizConfigSegments.minGroupHeight <= 0) {
    throw new Error('minGroupHeight must be positive');
  }
  if (vizConfigSegments.responseGap <= 0) {
    throw new Error('responseGap must be positive');
  }
  if (vizConfigSegments.groupGapHorizontal < 0) {
    throw new Error('groupGapHorizontal must be non-negative');
  }
  if (vizConfigSegments.groupGapVertical < 0) {
    throw new Error('groupGapVertical must be non-negative');
  }

  // Validate that vizConfigSegments grouping questions are valid (compare by key)
  const qKeysHorizontal = new Set(
    vizConfigSegments.groupingQuestionsHorizontal.map(getQuestionKey)
  );
  const qKeysVertical = new Set(
    vizConfigSegments.groupingQuestionsVertical.map(getQuestionKey)
  );

  // Check disjointness by iterating the smaller set
  const [smallerSet, largerSet] =
    qKeysHorizontal.size <= qKeysVertical.size
      ? [qKeysHorizontal, qKeysVertical]
      : [qKeysVertical, qKeysHorizontal];

  let groupingQuestionsDisjoint = true;
  for (const k of smallerSet) {
    if (largerSet.has(k)) {
      groupingQuestionsDisjoint = false;
      break;
    }
  }
  if (!groupingQuestionsDisjoint) {
    throw new Error('horizontal and vertical grouping questions must be disjoint');
  }

  // Validate that vizConfigSegments groupingQuestions are covered in sessionConfig
  const sessionGroupingKeys = new Set(
    sessionConfig.groupingQuestions.map(getQuestionKey)
  );

  const unionKeys = new Set([...qKeysHorizontal, ...qKeysVertical]);
  let groupingQuestionsCovered = true;
  for (const gq of unionKeys) {
    if (!sessionGroupingKeys.has(gq)) {
      groupingQuestionsCovered = false;
      break;
    }
  }
  if (!groupingQuestionsCovered) {
    throw new Error('vizConfigSegments grouping questions not present in sessionConfig');
  }

  //Validate that each horizontal grouping question has 2 or more response groups in the sessionConfig
  //Throw an error if any horizontal grouping question has fewer than 2 response groups.

  for (const gqh of vizConfigSegments.groupingQuestionsHorizontal) {
    const key = getQuestionKey(gqh);
    const matching = sessionConfig.groupingQuestions.find(gq => getQuestionKey(gq) === key);
    if (!matching) {
      throw new Error(`horizontal grouping question ${key} not found in sessionConfig`);
    }
    if (!Array.isArray(matching.responseGroups) || matching.responseGroups.length < 2) {
      throw new Error(`horizontal grouping question ${key} must have at least 2 response groups`);
    }
  }

  //Validate that each vertical grouping question has 2 or more response groups in the sessionConfig
  //Throw an error if any vertical grouping question has fewer than 2 response groups.

  for (const gqv of vizConfigSegments.groupingQuestionsVertical) {
    const key = getQuestionKey(gqv);
    const matching = sessionConfig.groupingQuestions.find(gq => getQuestionKey(gq) === key);
    if (!matching) {
      throw new Error(`vertical grouping question ${key} not found in sessionConfig`);
    }
    if (!Array.isArray(matching.responseGroups) || matching.responseGroups.length < 2) {
      throw new Error(`vertical grouping question ${key} must have at least 2 response groups`);
    }
  }

}
