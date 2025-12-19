import type { Question } from 'shared-types';
import { number } from 'zod';

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
