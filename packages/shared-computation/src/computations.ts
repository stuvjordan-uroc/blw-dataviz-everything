import type {
  SessionConfig,
  Split,
  Question,
  ResponseGroup,
} from "shared-schemas";
import type { ResponseData, GroupedResponses, QuestionKey } from "./types";

/**
 * Creates a unique string key for a Question object.
 * Used to group responses by question across different data structures.
 *
 * @param question - The question to create a key for
 * @returns A string in format "varName|batteryName|subBattery"
 */
export function createQuestionKey(question: Question): string {
  return `${question.varName}|${question.batteryName}|${question.subBattery}`;
}

/**
 * Parses a question key string back into a Question object.
 *
 * @param key - The question key string created by createQuestionKey
 * @returns A Question object with varName, batteryName, and subBattery
 */
export function parseQuestionKey(key: string): Question {
  const [varName, batteryName, subBattery] = key.split("|");
  return { varName, batteryName, subBattery };
}

/**
 * Checks if two Question objects refer to the same question.
 *
 * @param q1 - First question to compare
 * @param q2 - Second question to compare
 * @returns true if questions match on all three key fields
 */
export function questionsMatch(q1: Question, q2: Question): boolean {
  return (
    q1.varName === q2.varName &&
    q1.batteryName === q2.batteryName &&
    q1.subBattery === q2.subBattery
  );
}

/**
 * Groups an array of responses by respondent ID.
 * Useful for ensuring each respondent's responses are processed together.
 *
 * @param responses - Array of response data to group
 * @returns Map from respondentId to array of that respondent's responses
 */
export function groupResponsesByRespondent(
  responses: ResponseData[]
): Map<number, ResponseData[]> {
  const grouped = new Map<number, ResponseData[]>();

  for (const response of responses) {
    const existing = grouped.get(response.respondentId) || [];
    existing.push(response);
    grouped.set(response.respondentId, existing);
  }

  return grouped;
}

/**
 * Groups an array of responses by question.
 * This allows processing all responses to a particular question together.
 *
 * @param responses - Array of response data to group
 * @returns Map from question key string to array of responses for that question
 */
export function groupResponsesByQuestion(
  responses: ResponseData[]
): Map<string, ResponseData[]> {
  const grouped = new Map<string, ResponseData[]>();

  for (const response of responses) {
    const key = createQuestionKey({
      varName: response.varName,
      batteryName: response.batteryName,
      subBattery: response.subBattery,
    });

    const existing = grouped.get(key) || [];
    existing.push(response);
    grouped.set(key, existing);
  }

  return grouped;
}

/**
 * Filters responses to include only those from respondents who selected
 * one of the specified response values for a particular grouping question.
 *
 * This is the core logic for creating "splits" in the data - for example,
 * filtering to only respondents who answered "Democrat" or "Republican"
 * to a party affiliation question.
 *
 * @param responses - All responses to filter
 * @param groupingQuestion - The question used to filter respondents
 * @param responseGroup - The response group defining which responses to include
 * @returns Object containing filtered responses and respondent count
 */
export function filterResponsesByGrouping(
  responses: ResponseData[],
  groupingQuestion: Question,
  responseGroup: ResponseGroup
): GroupedResponses {
  // First, find all respondents who gave a matching response to the grouping question
  const matchingRespondentIds = new Set<number>();

  for (const response of responses) {
    // Check if this response is for the grouping question
    const isGroupingQuestion =
      response.varName === groupingQuestion.varName &&
      response.batteryName === groupingQuestion.batteryName &&
      response.subBattery === groupingQuestion.subBattery;

    if (!isGroupingQuestion) continue;

    // Check if this response value is in the response group
    if (
      response.response !== null &&
      responseGroup.values.includes(response.response)
    ) {
      matchingRespondentIds.add(response.respondentId);
    }
  }

  // Now filter all responses to include only those from matching respondents
  const filteredResponses = responses.filter((r) =>
    matchingRespondentIds.has(r.respondentId)
  );

  return {
    groupKey: `${createQuestionKey(groupingQuestion)}:${responseGroup.label}`,
    groupingQuestion,
    responseGroup,
    responses: filteredResponses,
    respondentCount: matchingRespondentIds.size,
  };
}

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
 * Computes proportions for each response group for a single question.
 *
 * This function:
 * 1. Counts how many respondents selected each response in the group (or sums weights)
 * 2. Divides by total respondents (or total weight) to get proportions
 * 3. Returns both expanded and collapsed response groups with proportions
 *
 * @param responses - All responses for this question
 * @param responseQuestionConfig - Configuration for this response question from SessionConfig
 * @param totalRespondents - Total number of unique respondents (or total weight sum for weighted case)
 * @param allResponses - All responses in the split (needed to look up weights)
 * @param weightQuestion - Optional question key identifying which question holds weights
 * @returns Response groups (expanded and collapsed) with computed proportions
 */
function computeResponseGroupProportions(
  responses: ResponseData[],
  responseQuestionConfig: SessionConfig["responseQuestions"][0],
  totalRespondents: number,
  allResponses: ResponseData[],
  weightQuestion?: QuestionKey
): {
  expanded: (ResponseGroup & { proportion: number })[];
  collapsed: (ResponseGroup & { proportion: number })[];
} {
  /**
   * Helper function to compute proportions for a set of response groups.
   * For each response group, counts how many respondents selected any of the
   * response values in that group (or sums their weights in the weighted case).
   */
  const computeProportionsForGroups = (
    responseGroups: ResponseGroup[]
  ): (ResponseGroup & { proportion: number })[] => {
    return responseGroups.map((group) => {
      // Track respondents and their contribution (count or weight)
      const respondentContributions = new Map<number, number>();

      for (const response of responses) {
        if (
          response.response !== null &&
          group.values.includes(response.response)
        ) {
          // Get this respondent's weight (1.0 if unweighted)
          const weight = getRespondentWeight(
            response.respondentId,
            allResponses,
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
      const totalContribution = Array.from(
        respondentContributions.values()
      ).reduce((sum, contrib) => sum + contrib, 0);

      // Calculate proportion: (sum of weights/counts in group) / (total weight/count)
      const proportion =
        totalRespondents > 0 ? totalContribution / totalRespondents : 0;

      return {
        ...group,
        proportion,
      };
    });
  };

  return {
    expanded: computeProportionsForGroups(
      responseQuestionConfig.responseGroups.expanded
    ),
    collapsed: computeProportionsForGroups(
      responseQuestionConfig.responseGroups.collapsed
    ),
  };
}

/**
 * Computes statistics for a single split (data filtered by one set of grouping criteria).
 *
 * A split represents a subset of the data - for example, all responses from
 * Democrats, or all responses from people aged 18-34. This function computes
 * proportions for all response questions within that split.
 *
 * @param splitResponses - All responses in this split
 * @param sessionConfig - Full session configuration
 * @param groupingCriteria - The grouping questions/response groups that define this split
 * @param weightQuestion - Optional question key identifying which question holds weights
 * @returns A Split object with computed proportions for all response questions
 */
function computeSingleSplit(
  splitResponses: ResponseData[],
  sessionConfig: SessionConfig,
  groupingCriteria: {
    question: Question;
    responseGroup: ResponseGroup | null;
  }[],
  weightQuestion?: QuestionKey
): Split {
  // Calculate total: unique respondent count (unweighted) or sum of weights (weighted)
  let totalRespondents: number;

  if (weightQuestion) {
    // Weighted case: sum of weights for unique respondents
    const uniqueRespondents = new Set(
      splitResponses.map((r) => r.respondentId)
    );
    totalRespondents = Array.from(uniqueRespondents)
      .map((respondentId) =>
        getRespondentWeight(respondentId, splitResponses, weightQuestion)
      )
      .reduce((sum, weight) => sum + weight, 0);
  } else {
    // Unweighted case: count unique respondents
    totalRespondents = new Set(splitResponses.map((r) => r.respondentId)).size;
  }

  // Group responses by question for efficient lookup
  const responsesByQuestion = groupResponsesByQuestion(splitResponses);

  // Compute proportions for each response question
  const responseQuestions = sessionConfig.responseQuestions.map(
    (responseQuestionConfig) => {
      const questionKey = createQuestionKey(responseQuestionConfig);
      const questionResponses = responsesByQuestion.get(questionKey) || [];

      const responseGroups = computeResponseGroupProportions(
        questionResponses,
        responseQuestionConfig,
        totalRespondents,
        splitResponses,
        weightQuestion
      );

      return {
        ...responseQuestionConfig,
        responseGroups,
      };
    }
  );

  return {
    groups: groupingCriteria,
    responseQuestions,
  };
}

/**
 * Generates all possible combinations of grouping criteria.
 *
 * For example, if there are two grouping questions (party affiliation and age),
 * this generates all combinations:
 * - [Democrat, 18-34]
 * - [Democrat, 35-54]
 * - [Republican, 18-34]
 * - [Republican, 35-54]
 * - etc.
 *
 * This also includes splits with just one grouping criterion, and the overall
 * split with no grouping (all respondents).
 *
 * @param sessionConfig - Session configuration with grouping questions
 * @returns Array of all possible grouping criterion combinations
 */
function generateGroupingCombinations(
  sessionConfig: SessionConfig
): { question: Question; responseGroup: ResponseGroup | null }[][] {
  const combinations: {
    question: Question;
    responseGroup: ResponseGroup | null;
  }[][] = [];

  // Add the "overall" split with no grouping criteria
  combinations.push([]);

  // Add splits with a single grouping question
  for (const groupingQuestion of sessionConfig.groupingQuestions) {
    for (const responseGroup of groupingQuestion.responseGroups) {
      combinations.push([
        {
          question: groupingQuestion,
          responseGroup,
        },
      ]);
    }
  }

  // Add splits with multiple grouping questions (cross-tabulations)
  // This uses a recursive approach to generate all combinations
  if (sessionConfig.groupingQuestions.length > 1) {
    const recursiveCombine = (
      index: number,
      current: { question: Question; responseGroup: ResponseGroup }[]
    ) => {
      if (index === sessionConfig.groupingQuestions.length) {
        if (current.length > 1) {
          // Only add combinations with 2+ grouping criteria
          combinations.push([...current]);
        }
        return;
      }

      const groupingQuestion = sessionConfig.groupingQuestions[index];

      // Include this grouping question with each of its response groups
      for (const responseGroup of groupingQuestion.responseGroups) {
        recursiveCombine(index + 1, [
          ...current,
          { question: groupingQuestion, responseGroup },
        ]);
      }

      // Skip this grouping question (for partial combinations)
      if (current.length > 0) {
        recursiveCombine(index + 1, current);
      }
    };

    recursiveCombine(0, []);
  }

  return combinations;
}

/**
 * Computes complete split statistics for a session from scratch.
 *
 * This is the main entry point for full computation. It:
 * 1. Generates all possible grouping combinations (splits)
 * 2. For each split, filters responses to that group
 * 3. Computes proportions for all response questions within each split
 *
 * Proportions can be computed as weighted or unweighted:
 * - Unweighted (default): proportion = respondents_in_group / total_respondents
 * - Weighted: proportion = sum_of_weights_in_group / sum_of_total_weights
 *
 * Use this function for:
 * - Initial statistics computation when no statistics exist
 * - Full recomputation after session config changes
 * - Admin-triggered recalculation
 *
 * For incremental updates (new responses only), use updateSplitStatistics instead.
 *
 * @param responses - All responses in the session
 * @param sessionConfig - Session configuration with questions and groupings
 * @param weightQuestion - Optional question key identifying which question holds weights
 * @returns Array of Split objects, one for each grouping combination
 */
export function computeSplitStatistics(
  responses: ResponseData[],
  sessionConfig: SessionConfig,
  weightQuestion?: QuestionKey
): Split[] {
  // Handle empty case
  if (responses.length === 0) {
    return [];
  }

  // Generate all possible grouping combinations
  const groupingCombinations = generateGroupingCombinations(sessionConfig);

  // Compute statistics for each split
  const splits: Split[] = [];

  for (const groupingCriteria of groupingCombinations) {
    // Start with all responses
    let splitResponses = responses;

    // Apply each grouping filter in sequence
    for (const criterion of groupingCriteria) {
      if (criterion.responseGroup) {
        const filtered = filterResponsesByGrouping(
          splitResponses,
          criterion.question,
          criterion.responseGroup
        );
        splitResponses = filtered.responses;
      }
    }

    // Compute statistics for this split
    const split = computeSingleSplit(
      splitResponses,
      sessionConfig,
      groupingCriteria,
      weightQuestion
    );

    splits.push(split);
  }

  return splits;
}

/**
 * Creates an empty Split array structure based on session configuration.
 * Used when initializing statistics for a session with no responses yet.
 *
 * @param sessionConfig - Session configuration
 * @param weightQuestion - Optional question key identifying which question holds weights
 * @returns Empty Split array with zero proportions for all response groups
 */
export function createEmptyStatistics(
  sessionConfig: SessionConfig,
  weightQuestion?: QuestionKey
): Split[] {
  // Create empty splits with all proportions set to 0
  return computeSplitStatistics([], sessionConfig, weightQuestion);
}
