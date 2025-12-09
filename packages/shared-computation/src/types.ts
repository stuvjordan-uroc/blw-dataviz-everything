/**
 * Question type for uniquely identifying a question.
 * Matches the database schema constraint where subBattery is part of the primary key.
 */
export interface Question {
  varName: string;
  batteryName: string;
  subBattery: string; // Required (empty string '' for questions without a sub-battery)
}

export interface ResponseGroup {
  label: string;
  values: number[]; //must be indices of responses column of questions.questions
}

export type ResponseQuestion = Question & {
  responseGroups: {
    expanded: ResponseGroup[];
    collapsed: ResponseGroup[];
  };
};

export type GroupingQuestion = Question & {
  responseGroups: ResponseGroup[];
};

export interface Split {
  groups: Group[];
  responseQuestions: ResponseQuestionWithStats[];
}

// Response question with computed statistics (used in Split)
export interface ResponseQuestionWithStats extends Question {
  responseGroups: {
    expanded: ResponseGroupWithStats[];
    collapsed: ResponseGroupWithStats[];
  };
  totalWeight: number; //total weight at question (summed across all response groups)
  totalCount: number; //total number of respondents responding to this question within split
}

// Grouping criterion for a split (question + selected response group or null for "all")
export interface Group {
  question: Question;
  responseGroup: ResponseGroup | null;
}

// Response group with computed proportion statistic
export interface ResponseGroupWithStats extends ResponseGroup {
  proportion: number;
  totalWeight: number; //total weight within response group
  totalCount: number; //total number of respondents within response group within split
}

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
