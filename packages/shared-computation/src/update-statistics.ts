import type {
  SessionConfig,
  Split,
  Question,
  ResponseGroup,
} from "shared-schemas";
import type { ResponseData, QuestionKey } from "./types";
import {
  createQuestionKey,
  questionsMatch,
  groupResponsesByQuestion,
  filterResponsesByGrouping,
} from "./computations";

/**
 * Gets the weight for a respondent from their responses.
 * Returns 1.0 if no weight question is specified (unweighted case).
 *
 * @param respondentId - The ID of the respondent
 * @param responses - All responses to search through
 * @param weightQuestion - Optional question key identifying which question holds weights
 * @returns The weight value, or 1.0 if no weight question or weight not found
 */
function getRespondentWeight(
  respondentId: number,
  responses: ResponseData[],
  weightQuestion?: QuestionKey
): number {
  // If no weight question specified, use weight of 1.0 (unweighted)
  if (!weightQuestion) {
    return 1.0;
  }

  // Find the weight response for this respondent
  const weightResponse = responses.find(
    (r) =>
      r.respondentId === respondentId &&
      r.varName === weightQuestion.varName &&
      r.batteryName === weightQuestion.batteryName &&
      r.subBattery === weightQuestion.subBattery
  );

  // If weight response found and is a valid number, return it
  // Otherwise return 1.0 as default
  if (weightResponse && weightResponse.response !== null) {
    return weightResponse.response;
  }

  return 1.0;
}

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
 *   new_proportion = (old_value + new_value) / new_total
 *
 * Where:
 *   old_value = old_proportion * old_total
 *   new_total = old_total + additional_value
 *
 * For unweighted: value = count of respondents
 * For weighted: value = sum of weights
 *
 * @param currentProportions - Current response groups with proportions
 * @param newResponses - New responses for this question
 * @param previousTotal - Previous total (respondent count or weight sum)
 * @param newTotal - New total after adding new data (previous + newly added)
 * @param allNewResponses - All new responses (needed to look up weights)
 * @param weightQuestion - Optional question key identifying which question holds weights
 * @returns Updated response groups with new proportions
 */
function updateResponseGroupProportions(
  currentProportions: {
    expanded: (ResponseGroup & { proportion: number })[];
    collapsed: (ResponseGroup & { proportion: number })[];
  },
  newResponses: ResponseData[],
  previousTotal: number,
  newTotal: number,
  allNewResponses: ResponseData[],
  weightQuestion?: QuestionKey
): {
  expanded: (ResponseGroup & { proportion: number })[];
  collapsed: (ResponseGroup & { proportion: number })[];
} {
  /**
   * Helper function to update proportions for a set of response groups.
   * For each response group, sums the contribution (count or weight) of respondents
   * who selected any of the response values in that group.
   */
  const updateProportionsForGroups = (
    responseGroups: (ResponseGroup & { proportion: number })[]
  ): (ResponseGroup & { proportion: number })[] => {
    return responseGroups.map((group) => {
      // Calculate old value from old proportion
      // old_value = old_proportion * old_total
      const oldValue = group.proportion * previousTotal;

      // Track respondents and their contribution (count or weight)
      const respondentContributions = new Map<number, number>();

      for (const response of newResponses) {
        if (
          response.response !== null &&
          group.values.includes(response.response)
        ) {
          // Get this respondent's weight (1.0 if unweighted)
          const weight = getRespondentWeight(
            response.respondentId,
            allNewResponses,
            weightQuestion
          );

          // Only count each respondent once (use max weight if multiple responses)
          const existing =
            respondentContributions.get(response.respondentId) || 0;
          respondentContributions.set(
            response.respondentId,
            Math.max(existing, weight)
          );
        }
      }

      // Sum all contributions (weights or counts)
      const newValue = Array.from(respondentContributions.values()).reduce(
        (sum, contrib) => sum + contrib,
        0
      );

      // Calculate new proportion
      // new_proportion = (old_value + new_value) / new_total
      const totalValue = oldValue + newValue;
      const newProportion = newTotal > 0 ? totalValue / newTotal : 0;

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
 * - Previous statistics were computed from total T_old
 * - New responses add M additional to the total
 * - New total is T_new = T_old + M
 * - For each response group with proportion p:
 *   - Old value: v_old = p * T_old
 *   - New value from new responses: v_new
 *   - Updated proportion: p_new = (v_old + v_new) / T_new
 *
 * For unweighted: values are respondent counts
 * For weighted: values are sums of weights
 *
 * @param currentStatistics - Existing split statistics (from database)
 * @param newResponses - Only the new responses since last computation
 * @param sessionConfig - Session configuration (should match what was used originally)
 * @param previousTotal - Previous total (respondent count or weight sum)
 * @param newTotal - New total after adding new data (previous + newly added)
 * @param weightQuestion - Optional question key identifying which question holds weights
 * @returns Updated Split array with recalculated proportions
 *
 * @example
 * // Unweighted: Previous statistics from 100 respondents, 20 new
 * const updated = updateSplitStatistics(
 *   currentStats.statistics,
 *   newResponses,
 *   sessionConfig,
 *   100,  // previousTotal (respondent count)
 *   120   // newTotal (respondent count)
 * );
 *
 * @example
 * // Weighted: Previous weight sum was 1523.4, new responses add 287.6
 * const updatedWeighted = updateSplitStatistics(
 *   currentStats.statistics,
 *   newResponses,
 *   sessionConfig,
 *   1523.4,  // previousTotal (weight sum)
 *   1811.0,  // newTotal (weight sum)
 *   weightQuestion
 * );
 */
export function updateSplitStatistics(
  currentStatistics: Split[],
  newResponses: ResponseData[],
  sessionConfig: SessionConfig,
  previousTotal: number,
  newTotal: number,
  weightQuestion?: QuestionKey
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

    // Calculate the value added by new responses in this split
    // For unweighted: count unique respondents
    // For weighted: sum of weights for unique respondents
    let newValueAddedToSplit: number;

    if (weightQuestion) {
      // Weighted case: sum weights for unique respondents in this split
      const uniqueRespondents = new Set(
        filteredNewResponses.map((r) => r.respondentId)
      );
      newValueAddedToSplit = Array.from(uniqueRespondents)
        .map((respondentId) =>
          getRespondentWeight(respondentId, newResponses, weightQuestion)
        )
        .reduce((sum, weight) => sum + weight, 0);
    } else {
      // Unweighted case: count unique respondents
      newValueAddedToSplit = new Set(
        filteredNewResponses.map((r) => r.respondentId)
      ).size;
    }

    // Calculate the previous and new totals for this split
    // We need to back-calculate the previous total for this split
    // from the proportions (this is approximate due to rounding)
    //
    // However, for the overall split (no grouping), we know the exact totals
    const isOverallSplit = split.groups.length === 0;
    const previousSplitTotal = isOverallSplit
      ? previousTotal
      : estimatePreviousSplitTotal(split, previousTotal);

    const newSplitTotal = previousSplitTotal + newValueAddedToSplit;

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
          previousSplitTotal,
          newSplitTotal,
          filteredNewResponses,
          weightQuestion
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
 * Estimates the previous total for a split based on its proportions.
 *
 * This is necessary because we don't store per-split totals in the database.
 * We can estimate it by looking at the proportions - if we find any response group
 * with a non-zero proportion, we can back-calculate approximately what the total was.
 *
 * This estimate may be slightly off due to rounding, but it's close enough for
 * incremental updates. For exact recomputation, use computeSplitStatistics instead.
 *
 * @param split - The split to estimate total for
 * @param overallTotal - Overall total (for fallback)
 * @returns Estimated previous total for this split
 */
function estimatePreviousSplitTotal(
  split: Split,
  overallTotal: number
): number {
  // Strategy: Look through all response questions and response groups
  // to find one with a non-zero proportion, then estimate the denominator
  // that would produce that proportion

  for (const responseQuestion of split.responseQuestions) {
    // Try expanded groups first
    for (const group of responseQuestion.responseGroups.expanded) {
      if (group.proportion > 0 && group.proportion < 1) {
        // We have: proportion = value / total
        // If we assume value >= 1, then: total = value / proportion
        // Estimate value = proportion * overallTotal as first guess
        const estimatedValue = Math.round(group.proportion * overallTotal);
        const estimatedTotal = estimatedValue / group.proportion;
        return Math.round(estimatedTotal);
      }
    }
  }

  // Fallback: assume this split contains a significant portion of overall total
  // This is a rough estimate, but better than returning 0
  return Math.round(overallTotal * 0.5);
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
