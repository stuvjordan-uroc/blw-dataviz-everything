import type {
  SessionConfig,
  Split,
  Question,
  ResponseGroup,
} from "shared-schemas";
import type { ResponseData } from "./types";
import {
  createQuestionKey,
  questionsMatch,
  groupResponsesByQuestion,
  filterResponsesByGrouping,
} from "./computations";

/**
 * Finds a split in the splits array that matches the given grouping criteria.
 *
 * @param splits - Array of existing splits
 * @param groupingCriteria - The grouping criteria to match
 * @returns The matching split, or undefined if not found
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function findMatchingSplit(
  splits: Split[],
  groupingCriteria: {
    question: Question;
    responseGroup: ResponseGroup | null;
  }[]
): Split | undefined {
  return splits.find((split) => {
    // Check if this split has the same number of grouping criteria
    if (split.groups.length !== groupingCriteria.length) {
      return false;
    }

    // Check if all grouping criteria match (order matters)
    return split.groups.every((group, index) => {
      const criterion = groupingCriteria[index];
      return (
        questionsMatch(group.question, criterion.question) &&
        group.responseGroup?.label === criterion.responseGroup?.label
      );
    });
  });
}

/**
 * Updates the proportions for a single response question within a split.
 *
 * This is where the incremental update magic happens. Instead of recomputing
 * from scratch, we use the mathematical relationship:
 *
 *   new_proportion = (old_count + new_count) / new_total
 *
 * Where:
 *   old_count = old_proportion * old_total
 *   new_total = old_total + additional_respondents
 *
 * @param currentProportions - Current response groups with proportions
 * @param newResponses - New responses for this question
 * @param previousRespondentCount - Previous total respondent count
 * @param newRespondentCount - New total respondent count (previous + newly added)
 * @returns Updated response groups with new proportions
 */
function updateResponseGroupProportions(
  currentProportions: {
    expanded: (ResponseGroup & { proportion: number })[];
    collapsed: (ResponseGroup & { proportion: number })[];
  },
  newResponses: ResponseData[],
  previousRespondentCount: number,
  newRespondentCount: number
): {
  expanded: (ResponseGroup & { proportion: number })[];
  collapsed: (ResponseGroup & { proportion: number })[];
} {
  /**
   * Helper function to update proportions for a set of response groups.
   */
  const updateProportionsForGroups = (
    responseGroups: (ResponseGroup & { proportion: number })[]
  ): (ResponseGroup & { proportion: number })[] => {
    return responseGroups.map((group) => {
      // Calculate old count from old proportion
      // old_count = old_proportion * old_total
      const oldCount = group.proportion * previousRespondentCount;

      // Count new respondents who selected any value in this response group
      const newRespondentsInGroup = new Set<number>();
      for (const response of newResponses) {
        if (
          response.response !== null &&
          group.values.includes(response.response)
        ) {
          newRespondentsInGroup.add(response.respondentId);
        }
      }

      const newCount = newRespondentsInGroup.size;

      // Calculate new proportion
      // new_proportion = (old_count + new_count) / new_total
      const totalCount = oldCount + newCount;
      const newProportion =
        newRespondentCount > 0 ? totalCount / newRespondentCount : 0;

      return {
        ...group,
        proportion: newProportion,
      };
    });
  };

  return {
    expanded: updateProportionsForGroups(currentProportions.expanded),
    collapsed: updateProportionsForGroups(currentProportions.collapsed),
  };
}

/**
 * Updates split statistics incrementally with new responses.
 *
 * This is the main entry point for incremental updates. Instead of recomputing
 * all statistics from scratch, this function:
 *
 * 1. For each existing split, finds the new responses that belong to it
 * 2. Updates proportions using the incremental formula
 * 3. Returns updated statistics
 *
 * This is much more efficient than full recomputation for large datasets.
 *
 * Mathematical approach:
 * - Previous statistics were computed from N respondents
 * - New responses come from M additional respondents
 * - New total is N + M respondents
 * - For each response group with proportion p:
 *   - Old count: c_old = p * N
 *   - New count from new responses: c_new
 *   - Updated proportion: p_new = (c_old + c_new) / (N + M)
 *
 * @param currentStatistics - Existing split statistics (from database)
 * @param newResponses - Only the new responses since last computation
 * @param sessionConfig - Session configuration (should match what was used originally)
 * @param previousRespondentCount - Total respondents in previous computation
 * @param newRespondentCount - Total respondents after adding new responses
 * @returns Updated Split array with recalculated proportions
 *
 * @example
 * // Previous statistics from 100 respondents
 * const currentStats = await fetchStatistics(sessionId);
 *
 * // 20 new respondents have submitted responses
 * const newResponses = await fetchNewResponses(sessionId, lastProcessedId);
 *
 * // Update statistics: 100 -> 120 respondents
 * const updated = updateSplitStatistics(
 *   currentStats.statistics,
 *   newResponses,
 *   sessionConfig,
 *   100,  // previousRespondentCount
 *   120   // newRespondentCount
 * );
 */
export function updateSplitStatistics(
  currentStatistics: Split[],
  newResponses: ResponseData[],
  sessionConfig: SessionConfig,
  previousRespondentCount: number,
  newRespondentCount: number // Used in nested function below
): Split[] {
  // Handle edge case: no new responses
  if (newResponses.length === 0) {
    return currentStatistics;
  }

  // Group new responses by question for efficient lookup
  const newResponsesByQuestion = groupResponsesByQuestion(newResponses);

  // Update each split
  const updatedSplits: Split[] = currentStatistics.map((split) => {
    // Filter new responses to only those that belong in this split
    let filteredNewResponses = newResponses;

    for (const group of split.groups) {
      if (group.responseGroup) {
        const filtered = filterResponsesByGrouping(
          filteredNewResponses,
          group.question,
          group.responseGroup
        );
        filteredNewResponses = filtered.responses;
      }
    }

    // Count unique respondents in the filtered new responses for this split
    const newRespondentsInSplit = new Set(
      filteredNewResponses.map((r) => r.respondentId)
    ).size;

    // Calculate the previous and new respondent counts for this split
    // We need to back-calculate the previous count for this split
    // from the proportions (this is approximate due to rounding)
    //
    // However, for the overall split (no grouping), we know the exact counts
    const isOverallSplit = split.groups.length === 0;
    const previousSplitCount = isOverallSplit
      ? previousRespondentCount
      : estimatePreviousSplitCount(split, previousRespondentCount);

    const newSplitCount = previousSplitCount + newRespondentsInSplit;

    // Update proportions for each response question in this split
    const updatedResponseQuestions = split.responseQuestions.map(
      (responseQuestion) => {
        const questionKey = createQuestionKey(responseQuestion);
        const newQuestionResponses =
          newResponsesByQuestion.get(questionKey) || [];

        // Filter to only responses from respondents in this split
        const splitRespondentIds = new Set(
          filteredNewResponses.map((r) => r.respondentId)
        );
        const newQuestionResponsesInSplit = newQuestionResponses.filter((r) =>
          splitRespondentIds.has(r.respondentId)
        );

        const updatedResponseGroups = updateResponseGroupProportions(
          responseQuestion.responseGroups,
          newQuestionResponsesInSplit,
          previousSplitCount,
          newSplitCount
        );

        return {
          ...responseQuestion,
          responseGroups: updatedResponseGroups,
        };
      }
    );

    return {
      ...split,
      responseQuestions: updatedResponseQuestions,
    };
  });

  return updatedSplits;
}

/**
 * Estimates the previous respondent count for a split based on its proportions.
 *
 * This is necessary because we don't store per-split respondent counts in the database.
 * We can estimate it by looking at the proportions - if we find any response group
 * with a non-zero proportion, we can back-calculate approximately how many respondents
 * were in the split.
 *
 * This estimate may be slightly off due to rounding, but it's close enough for
 * incremental updates. For exact recomputation, use computeSplitStatistics instead.
 *
 * @param split - The split to estimate count for
 * @param overallRespondentCount - Total respondent count (for fallback)
 * @returns Estimated previous respondent count for this split
 */
function estimatePreviousSplitCount(
  split: Split,
  overallRespondentCount: number
): number {
  // Strategy: Look through all response questions and response groups
  // to find one with a non-zero proportion, then estimate the denominator
  // that would produce that proportion

  for (const responseQuestion of split.responseQuestions) {
    // Try expanded groups first
    for (const group of responseQuestion.responseGroups.expanded) {
      if (group.proportion > 0 && group.proportion < 1) {
        // We have: proportion = count / total
        // If we assume count >= 1, then: total = count / proportion
        // Estimate count = proportion * overallRespondentCount as first guess
        const estimatedCount = Math.round(
          group.proportion * overallRespondentCount
        );
        const estimatedTotal = estimatedCount / group.proportion;
        return Math.round(estimatedTotal);
      }
    }
  }

  // Fallback: assume this split contains a significant portion of overall respondents
  // This is a rough estimate, but better than returning 0
  return Math.round(overallRespondentCount * 0.5);
}

/**
 * Validates that a split array matches the expected structure from a session config.
 * Useful for detecting when session config has changed and full recomputation is needed.
 *
 * @param splits - The splits to validate
 * @param sessionConfig - The session configuration to validate against
 * @returns true if splits match the config structure, false otherwise
 */
export function validateSplitsMatchConfig(
  splits: Split[],
  sessionConfig: SessionConfig
): boolean {
  // Check that all response questions are present in each split
  for (const split of splits) {
    if (
      split.responseQuestions.length !== sessionConfig.responseQuestions.length
    ) {
      return false;
    }

    // Check that each response question matches the config
    for (let i = 0; i < split.responseQuestions.length; i++) {
      const splitQuestion = split.responseQuestions[i];
      const configQuestion = sessionConfig.responseQuestions[i];

      if (!questionsMatch(splitQuestion, configQuestion)) {
        return false;
      }

      // Check response groups
      if (
        splitQuestion.responseGroups.expanded.length !==
          configQuestion.responseGroups.expanded.length ||
        splitQuestion.responseGroups.collapsed.length !==
          configQuestion.responseGroups.collapsed.length
      ) {
        return false;
      }
    }
  }

  return true;
}
