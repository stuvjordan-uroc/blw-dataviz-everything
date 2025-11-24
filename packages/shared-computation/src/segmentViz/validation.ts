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
  if (vizConfigSegments.segmentGroupWidth <= 0) {
    throw new Error('segmentGroupWidth must be positive');
  }
  if (vizConfigSegments.segmentGroupHeight <= 0) {
    throw new Error('segmentGroupHeight must be positive');
  }
  if (vizConfigSegments.responseGap < 0) {
    throw new Error('responseGap must be non-negative');
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
}
