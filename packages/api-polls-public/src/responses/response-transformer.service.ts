import { Injectable, Logger } from "@nestjs/common";
import type {
  Question,
  SegmentVizConfig,
  SplitWithSegmentGroup,
  RespondentAnswer,
  VisualizationLookupMaps,
} from "shared-types";

/**
 * All answers from a single respondent
 */
export interface RespondentResponses {
  respondentId: number;
  answers: RespondentAnswer[];
}

/**
 * Transformed response ready for visualization computation
 */
export interface TransformedResponse {
  basisSplitIndex: number;
  expandedResponseGroupIndex: number;
  weight: number;
}

/**
 * ResponseTransformer converts respondent answers into the format
 * required by updateAllSplitsWithSegmentsFromResponses.
 * 
 * Key logic:
 * 1. Find which basis split the respondent belongs to based on grouping question answers
 * 2. Find which expanded response group their response question answer belongs to
 * 3. Generate entry with weight=1
 */
@Injectable()
export class ResponseTransformer {
  private readonly logger = new Logger(ResponseTransformer.name);

  /**
   * Transform a batch of respondent responses for a specific visualization
   * 
   * @param responses - Array of respondent responses
   * @param viz - The visualization configuration
   * @param splits - Current splits for the visualization
   * @param basisSplitIndices - Indices of basis splits
   * @param lookupMaps - Pre-computed lookup maps for O(1) optimizations
   * @returns Array of transformed responses ready for computation
   */
  transformResponsesForVisualization(
    responses: RespondentResponses[],
    viz: SegmentVizConfig,
    splits: SplitWithSegmentGroup[],
    basisSplitIndices: number[],
    lookupMaps: VisualizationLookupMaps
  ): TransformedResponse[] {
    const transformed: TransformedResponse[] = [];

    for (const respondent of responses) {
      try {
        const entry = this.transformSingleRespondent(
          respondent,
          viz,
          splits,
          basisSplitIndices,
          lookupMaps
        );

        if (entry) {
          transformed.push(entry);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to transform response for respondent ${respondent.respondentId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return transformed;
  }

  /**
   * Transform a single respondent's responses
   * 
   * @param respondent - The respondent's answers
   * @param viz - The visualization configuration
   * @param splits - Current splits
   * @param basisSplitIndices - Indices of basis splits
   * @param lookupMaps - Pre-computed lookup maps
   * @returns Transformed response or null if cannot be matched
   */
  private transformSingleRespondent(
    respondent: RespondentResponses,
    viz: SegmentVizConfig,
    splits: SplitWithSegmentGroup[],
    basisSplitIndices: number[],
    lookupMaps: VisualizationLookupMaps
  ): TransformedResponse | null {
    // Optimization #2: Build answer map for O(1) question lookups
    const answerMap = this.buildAnswerMap(respondent.answers);

    // 1. Find the respondent's answer to the response question
    const responseAnswer = this.findAnswerInMap(
      answerMap,
      viz.responseQuestion.question
    );

    if (responseAnswer === null) {
      this.logger.warn(
        `Respondent ${respondent.respondentId} did not answer response question`
      );
      return null;
    }

    // 2. Find which expanded response group this answer belongs to (O(1) with lookup map)
    const expandedResponseGroupIndex = lookupMaps.responseIndexToGroupIndex[responseAnswer.responseIndex];

    if (expandedResponseGroupIndex === undefined) {
      this.logger.warn(
        `Could not match response index ${responseAnswer.responseIndex} to any response group`
      );
      return null;
    }

    // 3. Collect all grouping questions (x and y axis)
    const allGroupingQuestions = [
      ...viz.groupingQuestions.x,
      ...viz.groupingQuestions.y,
    ];

    // 4. Build the respondent's group profile
    const respondentGroups = allGroupingQuestions.map((gq) => {
      const answer = this.findAnswerInMap(answerMap, gq.question);

      if (answer === null) {
        return null; // Respondent didn't answer this grouping question
      }

      // Find which response group this answer belongs to
      const responseGroup = gq.responseGroups.find((rg) =>
        rg.values.includes(answer.responseIndex)
      );

      return responseGroup || null;
    });

    // 5. Build profile key and lookup basis split (O(1) with lookup map)
    const profileKey = this.buildProfileKey(respondentGroups, allGroupingQuestions);
    const basisSplitIndex = lookupMaps.profileToSplitIndex[profileKey];

    if (basisSplitIndex === undefined) {
      this.logger.warn(
        `Could not find matching basis split for respondent ${respondent.respondentId} with profile ${profileKey}`
      );
      return null;
    }

    return {
      basisSplitIndex,
      expandedResponseGroupIndex,
      weight: 1, // Default weight
    };
  }

  /**
   * Build a map from question key to answer for O(1) lookups.
   * 
   * Key format: "varName:batteryName:subBattery"
   * 
   * @param answers - All answers from the respondent
   * @returns Map from question key to answer
   */
  private buildAnswerMap(answers: RespondentAnswer[]): Map<string, RespondentAnswer> {
    const map = new Map<string, RespondentAnswer>();
    for (const answer of answers) {
      const key = `${answer.varName}:${answer.batteryName}:${answer.subBattery}`;
      map.set(key, answer);
    }
    return map;
  }

  /**
   * Find a respondent's answer to a specific question using pre-built answer map.
   * 
   * @param answerMap - Map from question key to answer
   * @param question - The question to find
   * @returns The answer or null if not found
   */
  private findAnswerInMap(
    answerMap: Map<string, RespondentAnswer>,
    question: Question
  ): RespondentAnswer | null {
    const key = `${question.varName}:${question.batteryName}:${question.subBattery}`;
    return answerMap.get(key) || null;
  }

  /**
   * Find a respondent's answer to a specific question
   * 
   * @param answers - All answers from the respondent
   * @param question - The question to find
   * @returns The answer or null if not found
   */
  private findAnswer(
    answers: RespondentAnswer[],
    question: Question
  ): RespondentAnswer | null {
    return (
      answers.find(
        (a) =>
          a.varName === question.varName &&
          a.batteryName === question.batteryName &&
          a.subBattery === question.subBattery
      ) || null
    );
  }

  /**
   * Build a profile key from respondent's group assignments.
   * 
   * @param respondentGroups - Array of response groups (or null)
   * @param groupingQuestions - All grouping questions
   * @returns Profile key string (e.g., "0:1:null:2")
   */
  private buildProfileKey(
    respondentGroups: (unknown | null)[],
    groupingQuestions: Array<{ question: Question; responseGroups: Array<{ values: number[] }> }>
  ): string {
    const profileParts: string[] = [];

    for (let i = 0; i < respondentGroups.length; i++) {
      const respondentGroup = respondentGroups[i];
      const gq = groupingQuestions[i];

      if (respondentGroup === null || !this.isResponseGroup(respondentGroup)) {
        profileParts.push("null");
      } else {
        // Find which response group index this is
        const responseGroupIdx = gq.responseGroups.findIndex(
          (rg) =>
            rg.values.length === respondentGroup.values.length &&
            rg.values.every((v) => respondentGroup.values.includes(v))
        );
        profileParts.push(responseGroupIdx >= 0 ? responseGroupIdx.toString() : "null");
      }
    }

    return profileParts.join(":");
  }

  /**
   * Type guard to check if an object is a response group
   */
  private isResponseGroup(obj: unknown): obj is { values: number[] } {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'values' in obj &&
      Array.isArray((obj as { values: unknown }).values)
    );
  }
}
