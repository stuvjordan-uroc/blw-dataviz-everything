import { type SessionConfig, type Split, type ResponseGroup, type Question } from 'shared-schemas';
import type { RespondentData } from './types';
import { getQuestionKey, createResponseMap } from './utils';

/**
 * Result returned by static computeStatistics method.
 * Contains computed splits and processing metadata.
 */
export interface StatisticsResult {
  /** Array of splits with computed statistics */
  splits: Split[];
  /** Number of valid respondents included in statistics */
  validCount: number;
  /** Number of invalid respondents excluded from statistics */
  invalidCount: number;
  /** Total number of respondents processed (valid + invalid) */
  totalProcessed: number;
}

/**
 * Statistics class for computing poll statistics from session configuration and response data.
 * 
 * This class processes respondent data to compute statistics for poll questions, organizing
 * results into "splits" based on grouping questions. Each split represents a subset of respondents
 * filtered by their answers to grouping questions, with computed proportions for response questions.
 * 
 * ## Features
 * 
 * - **Flexible initialization**: Create an empty instance (all statistics at 0) or initialize with data
 * - **Incremental updates**: Add new respondent data as it arrives using `updateSplits()`
 * - **Automatic validation**: Invalid respondents are filtered out and tracked separately
 * - **Weighting support**: Optional weight question for weighted statistics
 * - **Progress tracking**: Track counts of valid, invalid, and total respondents processed
 * 
 * ## Usage
 * 
 * ```typescript
 * // Create empty instance
 * const stats = new Statistics(sessionConfig);
 * 
 * // Or initialize with data
 * const stats = new Statistics(sessionConfig, initialRespondents, weightQuestion);
 * 
 * // Update with new data as it arrives
 * stats.updateSplits(newBatch);
 * 
 * // Access results
 * const splits = stats.getSplits();
 * const validCount = stats.getValidRespondentsCount();
 * ```
 * 
 * ## Validation
 * 
 * Respondents are validated before being included in statistics. A respondent is valid only if:
 * 1. Has answered ALL grouping questions with values in their respective response groups
 * 2. If weightQuestion is defined, has answered it with a non-null numeric value
 * 3. Has answered at least one response question with a value in an expanded response group
 * 
 * Invalid respondents are counted but excluded from statistics.
 * 
 * ## Error Handling
 * 
 * **Throws Error** if corrupted weight data is detected (weight <= 0) during processing.
 * This indicates a data integrity issue that should be resolved by validating/cleaning
 * weight data before it reaches this class.
 * 
 * ## Thread Safety
 * 
 * **This class is NOT thread-safe.** Do not call `updateSplits()` concurrently from multiple
 * async contexts. Each `updateSplits()` call should complete before the next one begins.
 * The methods are synchronous and safe in single-threaded JavaScript environments, but
 * concurrent calls could lead to race conditions and corrupted statistics.
 * 
 * @example
 * ```typescript
 * // Typical usage for a live poll
 * const stats = new Statistics(sessionConfig, [], weightQuestion);
 * 
 * // As data streams in...
 * pollStream.on('data', (batch) => {
 *   try {
 *     stats.updateSplits(batch);
 *     console.log(`Processed ${stats.getTotalRespondentsProcessed()} respondents`);
 *     console.log(`Valid: ${stats.getValidRespondentsCount()}, Invalid: ${stats.getInvalidRespondentsCount()}`);
 *   } catch (error) {
 *     console.error('Corrupted weight data detected:', error);
 *   }
 * });
 * ```
 */
export class Statistics {
  private readonly sessionConfig: SessionConfig;
  private readonly splits: Split[];
  private readonly weightQuestion?: Question;
  private validRespondentsCount: number = 0;
  private invalidRespondentsCount: number = 0;

  /**
   * Create a new Statistics instance.
   * 
   * @param sessionConfig - The session configuration defining response and grouping questions
   * @param respondentsData - Optional array of respondent data to compute statistics from
   * @param weightQuestion - Optional question to use for weighting respondents
   */
  constructor(sessionConfig: SessionConfig, respondentsData?: RespondentData[], weightQuestion?: Question) {
    this.sessionConfig = sessionConfig;
    this.splits = this.initializeSplits(sessionConfig);
    if (weightQuestion) {
      this.weightQuestion = weightQuestion;
    }

    // If respondent data was provided, process it to populate statistics
    if (respondentsData && respondentsData.length > 0) {
      // Process each respondent's data
      for (const respondentData of respondentsData) {
        // Transform the respondent data into a map for efficient lookup
        const responseMap = createResponseMap(respondentData);

        // Validate that this respondent's data meets all requirements
        const isValid = this.validateRespondentData(responseMap);

        // Only update statistics if the respondent data is valid
        if (isValid) {
          this.updateFromSingleRespondent(responseMap);
          this.validRespondentsCount++;
        } else {
          // Track invalid respondents
          this.invalidRespondentsCount++;
        }
      }
    }
  }

  /**
   * Compute statistics from respondent data without creating a persistent instance.
   * 
   * This static method is ideal for scenarios where you don't need to maintain state in memory:
   * - **Batch processing**: Compute statistics once from a complete dataset
   * - **External storage**: Load splits from database, update with new data, save back
   * - **Stateless services**: Process requests without maintaining instance state
   * 
   * The method can either compute statistics from scratch or update existing splits that
   * were previously computed and stored externally (e.g., in a database or on disk).
   * 
   * @param sessionConfig - The session configuration defining response and grouping questions
   * @param respondentsData - Array of respondent data to process
   * @param weightQuestion - Optional question to use for weighting respondents
   * @param existingSplits - Optional pre-existing splits to update (if omitted, starts from scratch)
   * @returns Object containing computed splits and processing statistics
   * @throws Error if weight data is corrupted (weight <= 0)
   * 
   * @example
   * ```typescript
   * // Compute from scratch (batch processing)
   * const result = Statistics.computeStatistics(
   *   sessionConfig,
   *   allRespondents,
   *   weightQuestion
   * );
   * console.log(`Processed ${result.totalProcessed} respondents`);
   * console.log(`Valid: ${result.validCount}, Invalid: ${result.invalidCount}`);
   * ```
   * 
   * @example
   * ```typescript
   * // Update existing splits from database
   * const existingSplits = await loadSplitsFromDB(sessionId);
   * const result = Statistics.computeStatistics(
   *   sessionConfig,
   *   newRespondents,
   *   weightQuestion,
   *   existingSplits
   * );
   * await saveSplitsToDB(sessionId, result.splits);
   * ```
   */
  static computeStatistics(
    sessionConfig: SessionConfig,
    respondentsData: RespondentData[],
    weightQuestion?: Question,
    existingSplits?: Split[]
  ): StatisticsResult {
    // Create a temporary instance for computation
    // If existingSplits provided, start with empty data (we'll replace splits below)
    // Otherwise, let constructor initialize splits from scratch
    const temp = new Statistics(
      sessionConfig,
      existingSplits ? [] : [],
      weightQuestion
    );

    // If existing splits were provided, replace the initialized splits
    // This allows updating splits that were previously computed and stored
    if (existingSplits) {
      // Replace the contents of the splits array while maintaining the reference
      const splitsArray = temp['splits'] as Split[];
      splitsArray.splice(0, splitsArray.length, ...existingSplits);
    }

    // Process the respondent data
    // This will update the splits and increment the counters
    if (respondentsData.length > 0) {
      temp.updateSplits(respondentsData);
    }

    // Extract results and return
    // The temporary instance will be garbage collected after this
    return {
      splits: temp.getSplits(),
      validCount: temp.getValidRespondentsCount(),
      invalidCount: temp.getInvalidRespondentsCount(),
      totalProcessed: temp.getTotalRespondentsProcessed()
    };
  }

  /**
   * Generates all possible grouping combinations (splits) from the grouping questions.
   * and sets all proportions and totalWeights to 0.
   * 
   * To construct the splits: For each grouping question, we create combinations with:
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
  private initializeSplits(sessionConfig: SessionConfig): Split[] {
    // If there are no grouping questions, return a single split with no grouping filters
    if (sessionConfig.groupingQuestions.length === 0) {
      return [
        {
          groups: [],
          responseQuestions: []
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
      // responseQuestions and totalWeight will be populated in Step 4 with computed proportions
      splits.push({
        groups: groups,
        responseQuestions: sessionConfig.responseQuestions.map((responseQuestion) => ({
          varName: responseQuestion.varName,
          batteryName: responseQuestion.batteryName,
          subBattery: responseQuestion.subBattery,
          responseGroups: {
            expanded: responseQuestion.responseGroups.expanded.map((rg) => ({
              ...rg,
              proportion: 0,
              totalWeight: 0
            })),
            collapsed: responseQuestion.responseGroups.collapsed.map((rg) => ({
              ...rg,
              proportion: 0,
              totalWeight: 0
            })),
          },
          totalWeight: 0
        })),
      });
    }

    return splits;
  }

  /**
   * Validates whether a respondent's data is valid for inclusion in statistics computation.
   * 
   * A respondent is considered valid if ALL of the following conditions are met:
   * 1. Has answered ALL grouping questions (i.e., there is a response in the responses array for each grouping question)
   * 2. If weightQuestion is defined, has answered the weightQuestion with a non-null value
   * 3. Has answered each grouping question with a response that is included in one of that grouping question's response groups (from sessionConfig)
   * 4. Has answered at least one of the response questions specified in the session config
   * 5. For at least one response question that the respondent answered, has given an answer that belongs to one of that response question's expanded response groups
   * 
   * @param responseMap - Map of question keys to response values for the respondent
   * @returns true if the respondent data is valid for computation, false otherwise
   */
  private validateRespondentData(responseMap: Map<string, number | null>): boolean {
    // Conditions 1 and 3: Check that ALL grouping questions have been answered AND
    // that each response is included in one of that question's response groups
    for (const groupingQuestion of this.sessionConfig.groupingQuestions) {
      const key = getQuestionKey(groupingQuestion);

      // Condition 1: Check the question was answered
      if (!responseMap.has(key)) {
        return false; // Missing a grouping question response
      }

      const response = responseMap.get(key);

      // Condition 3: Check if this response value appears in any of the question's response groups
      // Note: If response is null/undefined, includes() will return false, so we don't need an explicit check
      const isInResponseGroup = groupingQuestion.responseGroups.some(rg =>
        rg.values.includes(response as number)
      );

      if (!isInResponseGroup) {
        return false; // Response not in any valid response group (or response was null/undefined)
      }
    }

    // Condition 2: If weightQuestion is defined, check that it has been answered with a non-null value
    if (this.weightQuestion) {
      const key = getQuestionKey(this.weightQuestion);
      const weightResponse = responseMap.get(key);
      if (!responseMap.has(key) || weightResponse === null || weightResponse === undefined) {
        return false; // Missing or invalid weight question response
      }
    }

    // Condition 4 & 5: Check that at least one response question has been answered
    // AND that at least one of those answers belongs to an expanded response group
    let hasValidResponseQuestion = false;

    for (const responseQuestion of this.sessionConfig.responseQuestions) {
      const key = getQuestionKey(responseQuestion);
      const response = responseMap.get(key);

      // Skip if this response question wasn't answered
      if (response === null || response === undefined) {
        continue;
      }

      // Check if the response belongs to any expanded response group
      const isInExpandedGroup = responseQuestion.responseGroups.expanded.some(rg =>
        rg.values.includes(response)
      );

      if (isInExpandedGroup) {
        hasValidResponseQuestion = true;
        break; // We only need at least one valid response question
      }
    }

    if (!hasValidResponseQuestion) {
      return false; // No valid response questions answered
    }

    // All conditions met
    return true;
  }

  /**
   * Updates all splits with data from a single respondent.
   * 
   * Assumes the respondent data has already been validated using validateRespondentData().
   * 
   * Updates the statistics in the splits to which the respondent belongs.
   * The statistics updated in any given split are ONLY those for the response questions on which the
   * respondent gave an answer AND gave an answer that belongs to one of that response question's
   * response groups (defined in the session config).
   * 
   * This is the core building block for processing response data - it can be
   * called repeatedly for each response in a dataset.
   * 
   * @param responseMap - Map of question keys to response values for the respondent
   */
  private updateFromSingleRespondent(responseMap: Map<string, number | null>): void {
    // Step 1: Determine the respondent's weight
    // If weightQuestion is defined, use the respondent's answer; otherwise default to weight of 1
    let weight = 1;
    if (this.weightQuestion) {
      const weightResponse = responseMap.get(getQuestionKey(this.weightQuestion));
      // TypeScript doesn't know we've validated, so we need this check for type safety
      // In practice, weightResponse will always be a number here due to validation
      if (weightResponse !== null && weightResponse !== undefined) {
        weight = weightResponse;
      }
    }

    // Step 2: Iterate through all splits to determine which ones this respondent belongs to
    for (const split of this.splits) {
      // Step 2a: Check if respondent belongs to this split
      // A respondent belongs to a split if, for each grouping question:
      // - The split's responseGroup is null (meaning "all respondents"), OR
      // - The respondent's answer to that grouping question is in the split's responseGroup

      let belongsToSplit = true;

      for (const group of split.groups) {
        // If this split has no filter for this grouping question (null), respondent matches
        if (group.responseGroup === null) {
          continue; // Move to next grouping question
        }

        // Get the respondent's answer to this grouping question
        const respondentAnswer = responseMap.get(getQuestionKey(group.question));

        // Check if the respondent's answer is in this split's response group
        // The cast to number is safe because validation ensures grouping questions are answered with valid numbers
        if (!group.responseGroup.values.includes(respondentAnswer as number)) {
          belongsToSplit = false;
          break; // No need to check other grouping questions
        }
      }

      // Step 2b: If respondent doesn't belong to this split, skip to next split
      if (!belongsToSplit) {
        continue;
      }

      //if we reach this point, the respondent belongs to this split

      // Step 3: Update statistics for this split
      // For each response question in the split, check if respondent answered it
      // and if so, update the appropriate response group statistics

      for (const responseQuestion of split.responseQuestions) {
        // Get the respondent's answer to this response question
        const questionKey = getQuestionKey(responseQuestion);
        const respondentAnswer = responseMap.get(questionKey);

        // Skip if respondent didn't answer this question or answer is null
        if (respondentAnswer === null || respondentAnswer === undefined) {
          continue;
        }

        // Check if the answer belongs to at least one expanded response group
        // Validation only ensures SOME response question has a valid answer, not necessarily this one
        const isInExpandedGroup = responseQuestion.responseGroups.expanded.some(rg =>
          rg.values.includes(respondentAnswer)
        );

        // Skip this response question if the answer isn't in any expanded response group
        if (!isInExpandedGroup) {
          continue;
        }

        // Step 3a: Update expanded response groups
        for (const expandedGroup of responseQuestion.responseGroups.expanded) {
          if (expandedGroup.values.includes(respondentAnswer)) {
            expandedGroup.totalWeight += weight;
          }
        }

        // Step 3b: Update collapsed response groups
        for (const collapsedGroup of responseQuestion.responseGroups.collapsed) {
          if (collapsedGroup.values.includes(respondentAnswer)) {
            collapsedGroup.totalWeight += weight;
          }
        }

        // Step 3c: Update the total weight for this response question
        responseQuestion.totalWeight += weight;

        // Sanity check: totalWeight should be positive after adding a validated respondent
        // If not, this indicates corrupted weight data (weight <= 0)
        if (responseQuestion.totalWeight <= 0) {
          throw new Error(
            `Invalid state: totalWeight is ${responseQuestion.totalWeight} after processing respondent. ` +
            `This indicates corrupted weight data (weight was ${weight}).`
          );
        }

        // Step 3d: Recalculate proportions for all response groups
        // Proportions are totalWeight / totalWeight for the question

        // Update expanded proportions
        for (const expandedGroup of responseQuestion.responseGroups.expanded) {
          expandedGroup.proportion = responseQuestion.totalWeight > 0
            ? expandedGroup.totalWeight / responseQuestion.totalWeight
            : 0;
        }

        // Update collapsed proportions
        for (const collapsedGroup of responseQuestion.responseGroups.collapsed) {
          collapsedGroup.proportion = responseQuestion.totalWeight > 0
            ? collapsedGroup.totalWeight / responseQuestion.totalWeight
            : 0;
        }
      }
    }
  }

  /**
   * Get the computed splits with statistics.
   * 
   * @returns Array of splits with computed statistics for response questions
   */
  public getSplits(): Split[] {
    return this.splits;
  }

  /**
   * Get the count of valid respondents that were successfully processed.
   * 
   * @returns Number of respondents who passed validation and were included in statistics
   */
  public getValidRespondentsCount(): number {
    return this.validRespondentsCount;
  }

  /**
   * Get the count of invalid respondents that were rejected during validation.
   * 
   * @returns Number of respondents who failed validation and were excluded from statistics
   */
  public getInvalidRespondentsCount(): number {
    return this.invalidRespondentsCount;
  }

  /**
   * Get the total count of respondents that were processed (valid + invalid).
   * 
   * @returns Total number of respondents attempted to process
   */
  public getTotalRespondentsProcessed(): number {
    return this.validRespondentsCount + this.invalidRespondentsCount;
  }

  /**
   * Update the splits with new respondent data.
   * 
   * This method allows incremental updates to statistics as new data arrives,
   * making it suitable for long-running processes that listen to live poll data
   * or other streaming response sources.
   * 
   * @param respondentsData - Array of new respondent data to process and add to statistics
   * @throws Error if weight data is corrupted (weight <= 0)
   * 
   * @example
   * ```typescript
   * const stats = new Statistics(sessionConfig);
   * // Later, as new data arrives...
   * stats.updateSplits(newRespondents);
   * ```
   */
  public updateSplits(respondentsData: RespondentData[]): void {
    // Process each respondent's data
    for (const respondentData of respondentsData) {
      // Transform the respondent data into a map for efficient lookup
      const responseMap = createResponseMap(respondentData);

      // Validate that this respondent's data meets all requirements
      const isValid = this.validateRespondentData(responseMap);

      // Only update statistics if the respondent data is valid
      if (isValid) {
        this.updateFromSingleRespondent(responseMap);
        this.validRespondentsCount++;
      } else {
        // Track invalid respondents
        this.invalidRespondentsCount++;
      }
    }
  }

}
