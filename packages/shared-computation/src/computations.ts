import type {
  SessionConfig,
  Split,
  Question,
  ResponseGroup,
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
 * Converts flat ResponseData array into structured RespondentRecord array,
 * filtering out invalid respondents during the build process.
 * Each RespondentRecord contains one respondent's responses to ALL questions
 * (grouping, response, and weight), organized by question key.
 *
 * A respondent is only included if they answered ALL questions (both grouping and response)
 * with values that belong to at least one response group for that question.
 *
 * @param responses - Flat array of response data from database
 * @param sessionConfig - Session configuration with all questions
 * @param weightQuestion - Optional question key identifying the weight question
 * @returns Array of valid RespondentRecord objects only
 */
function buildRespondentRecords(
  responses: ResponseData[],
  sessionConfig: SessionConfig,
  weightQuestion?: QuestionKey
): RespondentRecord[] {
  // Build lookup maps for quick validation of response values
  // Map: questionKey -> Set of valid response values (union of all response group values)
  // Note: Weight questions will have an empty Set (any non-null value is valid)
  const validResponsesByQuestion = new Map<string, Set<number>>();

  // Build valid response sets for grouping questions
  for (const q of sessionConfig.groupingQuestions) {
    const questionKey = createQuestionKey(q);
    const validValues = new Set<number>();
    for (const group of q.responseGroups) {
      for (const value of group.values) {
        validValues.add(value);
      }
    }
    validResponsesByQuestion.set(questionKey, validValues);
  }

  // Build valid response sets for response questions
  // Include both expanded and collapsed response groups
  for (const q of sessionConfig.responseQuestions) {
    const questionKey = createQuestionKey(q);
    const validValues = new Set<number>();
    for (const group of q.responseGroups.expanded) {
      for (const value of group.values) {
        validValues.add(value);
      }
    }
    for (const group of q.responseGroups.collapsed) {
      for (const value of group.values) {
        validValues.add(value);
      }
    }
    validResponsesByQuestion.set(questionKey, validValues);
  }

  // If weightQuestion is defined, add it to the validation map with an empty Set
  // (indicates that any non-null numeric value is valid for the weight)
  if (weightQuestion) {
    const weightKey = createQuestionKey(weightQuestion);
    validResponsesByQuestion.set(weightKey, new Set<number>());
  }

  // Build a set of all questions we need to track
  // This includes all grouping questions, response questions, and weight question (if defined)
  const allQuestions = new Set<string>(validResponsesByQuestion.keys());

  // Track which respondents are invalid (so we can skip their subsequent responses)
  const invalidRespondents = new Set<number>();

  // Group responses by respondent, validating as we go
  const responsesByRespondent = new Map<number, ResponseData[]>();

  for (const response of responses) {
    const respondentId = response.respondentId;

    // Skip if we've already determined this respondent is invalid
    if (invalidRespondents.has(respondentId)) {
      continue;
    }

    // Build the question key for this response
    const questionKey = createQuestionKey({
      varName: response.varName,
      batteryName: response.batteryName,
      subBattery: response.subBattery,
    });

    // Get the valid values for this question (if it's tracked)
    const validValues = validResponsesByQuestion.get(questionKey);

    // Validate the response
    // If response is null/undefined, invalidate the respondent
    if (response.response === null || response.response === undefined) {
      // Mark this respondent as invalid and skip all their future responses
      invalidRespondents.add(respondentId);
      // Remove any responses we've already collected for this respondent
      responsesByRespondent.delete(respondentId);
      continue;
    }

    // If this is a tracked question (grouping, response, or weight), validate the value
    if (validValues !== undefined) {
      // For weight questions, validValues will be an empty Set (any non-null value is valid)
      // For other questions, the value must belong to at least one response group
      if (validValues.size > 0 && !validValues.has(response.response)) {
        // Response doesn't belong to any valid response group, invalidate respondent
        invalidRespondents.add(respondentId);
        // Remove any responses we've already collected for this respondent
        responsesByRespondent.delete(respondentId);
        continue;
      }
    }

    // This response is valid and respondent has not been invalidated, add it to the respondent's response list
    let existing = responsesByRespondent.get(respondentId);
    if (!existing) {
      existing = [];
      responsesByRespondent.set(respondentId, existing);
    }
    existing.push(response);
  }

  // Build records for each valid respondent
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

    // Final validation: ensure respondent answered ALL required questions
    // Check that all questions have non-null responses
    let hasAllResponses = true;
    for (const questionKey of allQuestions) {
      if (responseMap.get(questionKey) === null) {
        hasAllResponses = false;
        break;
      }
    }

    // Only add respondent to records if they answered all questions
    if (hasAllResponses) {
      records.push({
        respondentId,
        responses: responseMap,
        weight,
      });
    }
  }

  return records;
}

/**
 * Generates all possible grouping combinations (splits) from the grouping questions.
 * 
 * For each grouping question, we create combinations with:
 * - Each of its response groups (one at a time)
 * - null (representing "no filter" or "all respondents" for that question)
 * 
 * The result is a Cartesian product across all grouping questions.
 * 
 * Example: If we have 2 grouping questions:
 *   - Question A with response groups [RG1, RG2]
 *   - Question B with response groups [RG3, RG4]
 * 
 * We generate 9 splits:
 *   1. [A:RG1, B:RG3]  - Respondents in RG1 AND RG3
 *   2. [A:RG1, B:RG4]  - Respondents in RG1 AND RG4
 *   3. [A:RG1, B:null] - Respondents in RG1 (any value for B)
 *   4. [A:RG2, B:RG3]  - Respondents in RG2 AND RG3
 *   5. [A:RG2, B:RG4]  - Respondents in RG2 AND RG4
 *   6. [A:RG2, B:null] - Respondents in RG2 (any value for B)
 *   7. [A:null, B:RG3] - Respondents in RG3 (any value for A)
 *   8. [A:null, B:RG4] - Respondents in RG4 (any value for A)
 *   9. [A:null, B:null] - All respondents (no filters)
 * 
 * @param sessionConfig - Session configuration with grouping questions
 * @returns Array of Split objects with groups populated but responseQuestions empty (to be filled in Step 4)
 */
function generateSplits(sessionConfig: SessionConfig): Split[] {
  // If there are no grouping questions, return a single split with no grouping filters
  if (sessionConfig.groupingQuestions.length === 0) {
    return [
      {
        groups: [],
        responseQuestions: [], // Will be populated in Step 4
      },
    ];
  }

  // Build an array of options for each grouping question
  // Each option is either a ResponseGroup or null
  const optionsPerQuestion: (ResponseGroup | null)[][] = [];

  for (const groupingQuestion of sessionConfig.groupingQuestions) {
    // For this question, create an array of all its response groups plus null
    const options: (ResponseGroup | null)[] = [
      ...groupingQuestion.responseGroups,
      null, // null means "don't filter by this question"
    ];
    optionsPerQuestion.push(options);
  }

  // Generate the Cartesian product of all options
  // Start with an array containing one empty combination
  let combinations: (ResponseGroup | null)[][] = [[]];

  // For each grouping question's options, expand the combinations
  for (const options of optionsPerQuestion) {
    const newCombinations: (ResponseGroup | null)[][] = [];

    // For each existing combination, create new combinations by appending each option
    for (const combination of combinations) {
      for (const option of options) {
        newCombinations.push([...combination, option]);
      }
    }

    combinations = newCombinations;
  }

  // Convert each combination into a Split object
  const splits: Split[] = [];

  for (const combination of combinations) {
    // Build the groups array for this split
    // Each element pairs a grouping question with its selected response group (or null)
    const groups: Split["groups"] = [];

    for (let i = 0; i < sessionConfig.groupingQuestions.length; i++) {
      const question = sessionConfig.groupingQuestions[i];
      const responseGroup = combination[i]; // Can be ResponseGroup or null

      groups.push({
        question: {
          varName: question.varName,
          batteryName: question.batteryName,
          subBattery: question.subBattery,
        },
        responseGroup: responseGroup,
      });
    }

    // Create the Split object
    // responseQuestions will be populated in Step 4 with computed proportions
    splits.push({
      groups: groups,
      responseQuestions: [], // Will be filled in Step 4
    });
  }

  return splits;
}

/**
 * Filters respondents to only those who match a split's grouping criteria.
 * 
 * For each grouping question in the split:
 * - If the split specifies a response group (not null), the respondent must have
 *   a response value that belongs to that response group
 * - If the split specifies null, any value is acceptable (no filter for that question)
 * 
 * @param respondents - Array of all valid respondent records
 * @param split - The split containing grouping criteria to filter by
 * @returns Array of respondents that match the split's grouping criteria
 */
function filterRespondentsForSplit(
  respondents: RespondentRecord[],
  split: Split
): RespondentRecord[] {
  const filtered: RespondentRecord[] = [];

  // Iterate through each respondent to check if they match the split's criteria
  for (const respondent of respondents) {
    let matches = true;

    // Check each grouping criterion in the split
    for (const group of split.groups) {
      // If responseGroup is null, this grouping question is not filtered (all values accepted)
      if (group.responseGroup === null) {
        continue;
      }

      // Get the respondent's response to this grouping question
      const questionKey = createQuestionKey(group.question);
      const respondentResponse = respondent.responses.get(questionKey);

      // Check if the respondent's response value belongs to the specified response group
      // Note: At this point, respondentResponse should never be null because we filtered
      // out invalid respondents in buildRespondentRecords, but we check defensively
      if (
        respondentResponse === null ||
        respondentResponse === undefined ||
        !group.responseGroup.values.includes(respondentResponse)
      ) {
        // Respondent doesn't match this grouping criterion
        matches = false;
        break;
      }
    }

    // If the respondent matches all grouping criteria, add them to the filtered list
    if (matches) {
      filtered.push(respondent);
    }
  }

  return filtered;
}

/**
 * Computes proportions for a response question from a set of filtered respondents.
 * 
 * For each response group in the question:
 * - Count how many respondents (weighted or unweighted) have a response value
 *   that belongs to that response group
 * - Divide by the total count to get the proportion
 * 
 * @param respondents - Filtered respondents for this split
 * @param responseQuestion - The response question to compute proportions for
 * @param weightQuestion - Optional question key identifying the weight question
 * @returns Object with expanded and collapsed response groups, each with proportions
 */
function computeProportionsForQuestion(
  respondents: RespondentRecord[],
  responseQuestion: SessionConfig["responseQuestions"][0],
  weightQuestion?: QuestionKey
): {
  expanded: (ResponseGroup & { proportion: number })[];
  collapsed: (ResponseGroup & { proportion: number })[];
} {
  const questionKey = createQuestionKey(responseQuestion);

  // Calculate total weight/count for denominator
  let totalWeight = 0;
  for (const respondent of respondents) {
    totalWeight += weightQuestion ? respondent.weight : 1;
  }

  // Helper function to compute proportions for a set of response groups
  const computeForGroups = (
    groups: ResponseGroup[]
  ): (ResponseGroup & { proportion: number })[] => {
    return groups.map((group) => {
      // Count respondents (weighted or unweighted) who belong to this response group
      let count = 0;

      for (const respondent of respondents) {
        const response = respondent.responses.get(questionKey);

        // Check if this respondent's response belongs to this response group
        if (response !== null && response !== undefined && group.values.includes(response)) {
          count += weightQuestion ? respondent.weight : 1;
        }
      }

      // Compute proportion (handle division by zero)
      const proportion = totalWeight > 0 ? count / totalWeight : 0;

      return {
        label: group.label,
        values: group.values,
        proportion: proportion,
      };
    });
  };

  // Compute proportions for both expanded and collapsed response groups
  return {
    expanded: computeForGroups(responseQuestion.responseGroups.expanded),
    collapsed: computeForGroups(responseQuestion.responseGroups.collapsed),
  };
}

/**
 * Populates a split with computed statistics for all response questions.
 * 
 * This function:
 * 1. Filters respondents to those who match the split's grouping criteria
 * 2. For each response question, computes proportions across its response groups
 * 3. Returns a complete Split object with all statistics populated
 * 
 * @param split - The split to populate (with groups already set)
 * @param respondents - All valid respondents
 * @param sessionConfig - Session configuration with response questions
 * @param weightQuestion - Optional question key identifying the weight question
 * @returns Complete Split object with responseQuestions populated
 */
function populateSplitStatistics(
  split: Split,
  respondents: RespondentRecord[],
  sessionConfig: SessionConfig,
  weightQuestion?: QuestionKey
): Split {
  // Step 1: Filter respondents to those who match this split's grouping criteria
  const filteredRespondents = filterRespondentsForSplit(respondents, split);

  // Step 2: Compute proportions for each response question
  const responseQuestions: Split["responseQuestions"] = [];

  for (const responseQuestion of sessionConfig.responseQuestions) {
    // Compute proportions for this question from the filtered respondents
    const proportions = computeProportionsForQuestion(
      filteredRespondents,
      responseQuestion,
      weightQuestion
    );

    // Build the response question object with proportions
    responseQuestions.push({
      varName: responseQuestion.varName,
      batteryName: responseQuestion.batteryName,
      subBattery: responseQuestion.subBattery,
      responseGroups: proportions,
    });
  }

  // Return the complete split with statistics
  return {
    groups: split.groups,
    responseQuestions: responseQuestions,
  };
}

/**
 * Computes complete split statistics for a session from scratch.
 *
 * This is the main entry point for full computation. It:
 * 1. Converts flat ResponseData array into structured RespondentRecord array
 *    (filtering out invalid respondents during the conversion process)
 * 2. Generates all possible grouping combinations (splits)
 * 3. For each split, filters respondents to that group and computes proportions
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

  // Step 1 & 2: Convert flat responses to structured respondent records and filter for validity
  // Each record contains all of one respondent's responses
  // Only valid respondents are included (those who answered ALL questions with valid values)
  const validRespondents = buildRespondentRecords(
    responses,
    sessionConfig,
    weightQuestion
  );

  // Step 3: Generate all possible grouping combinations (splits)
  // This creates the Cartesian product of [responseGroup1, responseGroup2, ..., null]
  // across the grouping questions
  const splits = generateSplits(sessionConfig);

  // Step 4: For each split, filter respondents and compute proportions
  const completedSplits = splits.map((split) =>
    populateSplitStatistics(split, validRespondents, sessionConfig, weightQuestion)
  );

  return completedSplits;
}
