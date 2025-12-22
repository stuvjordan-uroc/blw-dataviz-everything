import type { Question } from 'shared-types';

export interface ResponseQuestion {
  question: Question;
  responseGroups: {
    expanded: ResponseGroup[];
    collapsed: ResponseGroup[];
  };
}

export interface GroupingQuestion {
  question: Question;
  responseGroups: ResponseGroup[];
}

export interface ResponseGroup {
  label: string;
  values: number[];
}

export interface Group {
  question: Question;
  responseGroup: ResponseGroup | null;
}

export interface ResponseGroupWithStats extends ResponseGroup {
  totalCount: number;
  totalWeight: number;
  proportion: number;
}

export interface Split {
  basisSplitIndices: number[];
  groups: Group[];
  totalWeight: number;
  totalCount: number;
  responseGroups: {
    collapsed: ResponseGroupWithStats[];
    expanded: ResponseGroupWithStats[];
  }
}

export interface SplitDiff {
  totalCount: number;
  totalWeight: number;
  responseGroups: {
    collapsed: ResponseGroupWithStats[];
    expanded: ResponseGroupWithStats[];
  }
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

/**
 * Mapping from view ID to split indices.
 * 
 * Precomputed during initialization for efficient view switching.
 * Each view represents a specific combination of active/inactive grouping questions.
 * 
 * Key format: comma-separated indices of active questions (e.g., "0,1,3" or "" for base view)
 * Value: array of split indices that belong to that view
 * 
 * Example:
 *   {
 *     "": [0],           // Base view - no grouping questions active
 *     "0": [1, 2, 3],     // Only question 0 active
 *     "1": [4, 5, 6],     // Only question 1 active
 *     "0,1": [7, 8, 9]    // Questions 0 and 1 active
 *   }
 */
export type ViewMaps = Record<string, number[]>;
