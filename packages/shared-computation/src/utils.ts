import type { Question } from 'shared-schemas';
import type { RespondentData } from './types';

/**
 * Creates a unique string key for a question based on its identifying fields.
 * This key can be used for Map lookups and comparisons.
 * 
 * @param question - The question to create a key for
 * @returns A unique string key in the format "varName|batteryName|subBattery"
 */
export function getQuestionKey(question: Question): string {
  return `${question.varName}|${question.batteryName}|${question.subBattery}`;
}

/**
 * Creates a Map of question keys to response values for a respondent.
 * This provides O(1) lookup time when checking if a respondent answered a specific question.
 * 
 * @param respondentData - The respondent's data containing all their responses
 * @returns A Map where keys are question identifiers and values are the response values (or null)
 */
export function createResponseMap(respondentData: RespondentData): Map<string, number | null> {
  const responseMap = new Map<string, number | null>();

  for (const response of respondentData.responses) {
    const key = `${response.varName}|${response.batteryName}|${response.subBattery}`;
    responseMap.set(key, response.response);
  }

  return responseMap;
}
