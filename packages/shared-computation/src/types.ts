import type {
  SessionConfig,
  Split,
  Question,
  ResponseGroup,
} from "shared-schemas";

/**
 * ResponseData represents a single response from a respondent to a question.
 * This is the flattened data structure used for computation, typically fetched
 * from joining polls.responses with polls.questions and polls.respondents tables.
 */
export interface ResponseData {
  /** The ID of the respondent who gave this response */
  respondentId: number;

  /** The ID of the question in the context of the session (polls.questions.id) */
  questionSessionId: number;

  /** The variable name of the question (from questions schema) */
  varName: string;

  /** The battery name of the question (from questions schema) */
  batteryName: string;

  /** The sub-battery of the question (from questions schema, '' if no sub-battery) */
  subBattery: string;

  /**
   * The response value - an index into the responses array in questions.questions table.
   * null if the respondent gave a response that doesn't map to a valid index, or gave no response
   */
  response: number | null;
}

/**
 * QuestionKey uniquely identifies a question.
 * Used as a map key for grouping responses by question.
 */
export interface QuestionKey {
  varName: string;
  batteryName: string;
  subBattery: string;
}

/**
 * ResponseCounts tracks the count of responses for each response option
 * within a question or group. Used for intermediate calculations.
 */
export interface ResponseCounts {
  /** Map from response index to count of respondents who selected that response */
  counts: Map<number, number>;

  /** Total number of respondents who answered (denominator for proportions) */
  totalRespondents: number;
}

/**
 * GroupedResponses organizes responses by their grouping criteria.
 * Used when computing splits based on grouping questions.
 */
export interface GroupedResponses {
  /** Unique identifier for the group */
  groupKey: string;

  /** The grouping question and response group that define this split */
  groupingQuestion: Question;
  responseGroup: ResponseGroup;

  /** All responses from respondents who fall into this group */
  responses: ResponseData[];

  /** Number of unique respondents in this group */
  respondentCount: number;
}

/**
 * RespondentRecord represents all of one respondent's responses in a structured format.
 * This is the primary data structure used for computations, making it easy to access
 * a respondent's responses to grouping questions, response questions, and weight.
 */
export interface RespondentRecord {
  /** The unique ID of this respondent */
  respondentId: number;

  /**
   * Map from question key to response value for all questions this respondent answered.
   * Key format: "varName|batteryName|subBattery"
   * Value: response index (number) or null if no valid response
   */
  responses: Map<string, number | null>;

  /**
   * The weight for this respondent (if weighted analysis is being performed).
   * Defaults to 1.0 if no weight question is specified or respondent didn't answer it.
   */
  weight: number;
}

// Re-export types from shared-schemas that are needed by computation functions
export type { SessionConfig, Split, Question, ResponseGroup };
