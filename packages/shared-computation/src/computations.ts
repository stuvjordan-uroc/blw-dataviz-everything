import type {
  SessionConfig,
  Split,
  Question,
} from "shared-schemas";
import type { ResponseData, QuestionKey, RespondentRecord } from "./types";

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
 * Converts flat ResponseData array into structured RespondentRecord array.
 * Each RespondentRecord contains one respondent's responses to ALL questions
 * (grouping, response, and weight), organized by question key.
 *
 * @param responses - Flat array of response data from database
 * @param sessionConfig - Session configuration with all questions
 * @param weightQuestion - Optional question key identifying the weight question
 * @returns Array of RespondentRecord objects, one per unique respondent
 */
function buildRespondentRecords(
  responses: ResponseData[],
  sessionConfig: SessionConfig,
  weightQuestion?: QuestionKey
): RespondentRecord[] {
  // Group responses by respondent
  const responsesByRespondent = new Map<number, ResponseData[]>();
  for (const response of responses) {
    const existing = responsesByRespondent.get(response.respondentId) || [];
    existing.push(response);
    responsesByRespondent.set(response.respondentId, existing);
  }

  // Build a set of all questions we need to track
  const allQuestions = new Set<string>();
  
  for (const q of sessionConfig.groupingQuestions) {
    allQuestions.add(createQuestionKey(q));
  }
  
  for (const q of sessionConfig.responseQuestions) {
    allQuestions.add(createQuestionKey(q));
  }
  
  if (weightQuestion) {
    allQuestions.add(createQuestionKey(weightQuestion));
  }

  // Build records for each respondent
  const records: RespondentRecord[] = [];

  for (const [respondentId, respondentResponses] of responsesByRespondent) {
    const responseMap = new Map<string, number | null>();
    let weight = 1.0; // Default weight

    // First, populate all questions with null
    for (const questionKey of allQuestions) {
      responseMap.set(questionKey, null);
    }

    // Then, fill in actual responses
    for (const response of respondentResponses) {
      const questionKey = createQuestionKey({
        varName: response.varName,
        batteryName: response.batteryName,
        subBattery: response.subBattery,
      });

      responseMap.set(questionKey, response.response);

      // Check if this is the weight question
      if (
        weightQuestion &&
        response.varName === weightQuestion.varName &&
        response.batteryName === weightQuestion.batteryName &&
        response.subBattery === weightQuestion.subBattery
      ) {
        // Weight is stored as a response value; treat it as a number
        weight = response.response !== null ? response.response : 1.0;
      }
    }

    records.push({
      respondentId,
      responses: responseMap,
      weight,
    });
  }

  return records;
}

/**
 * Computes complete split statistics for a session from scratch.
 *
 * This is the main entry point for full computation. It:
 * 1. Converts flat ResponseData array into structured RespondentRecord array
 * 2. Filters to only include valid respondents (those who answered all questions with valid values)
 * 3. Generates all possible grouping combinations (splits)
 * 4. For each split, filters respondents to that group and computes proportions
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
 * @param responses - All responses in the session (flat array from database)
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

  // Step 1: Convert flat responses to structured respondent records
  // Each record contains all of one respondent's responses (including nulls for unanswered questions)
  const allRespondents = buildRespondentRecords(
    responses,
    sessionConfig,
    weightQuestion
  );

  // TODO: Step 2: Filter to only include valid respondents
  // A valid respondent has answered ALL questions (both grouping and response)
  // with values that belong to at least one response group for that question

  // TODO: Step 3: Generate all possible grouping combinations (splits)
  // This creates the Cartesian product of [responseGroup1, responseGroup2, ..., null]
  // for each grouping question

  // TODO: Step 4: For each split, filter respondents and compute proportions
  // - Apply grouping filters to get the respondents in this split
  // - For each response question, compute proportions across response groups
  // - Return Split objects with computed statistics

  return [];
}
