import type {
  SessionConfig,
  Split,
  Question,
  ResponseGroup,
} from "shared-schemas";

export type { SessionConfig, Split, Question, ResponseGroup };


/*
 * RespondentData represents all of a respondent's responses to the questions
 * in a session. Each response includes the question identifier and the response value.
 * If a respondent did not answer a question, that question simply won't appear in the array.
 * This is the input format expected by the Statistics class for processing response data.
 */
export interface RespondentData {
  respondentId: number;
  responses: {
    varName: string;
    batteryName: string;
    subBattery: string;
    response: number | null;
  }[];
}


