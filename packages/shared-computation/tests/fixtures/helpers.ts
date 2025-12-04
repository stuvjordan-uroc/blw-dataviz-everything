/**
 * Helper functions for transforming test fixtures into formats
 * expected by Statistics and SegmentViz classes.
 */

import type { RespondentData } from "../../src/types";
import type { TabularRespondent } from "./test-data";
import {
  ageQuestion,
  genderQuestion,
  favorabilityQuestion,
  weightQuestion,
} from "./test-data";

/**
 * Transforms a single tabular respondent into RespondentData format.
 *
 * @param tabular - Simple object representation of a respondent
 * @returns RespondentData with properly formatted responses array
 */
export function tabularToRespondentData(
  tabular: TabularRespondent
): RespondentData {
  return {
    respondentId: tabular.id,
    responses: [
      {
        varName: ageQuestion.varName,
        batteryName: ageQuestion.batteryName,
        subBattery: ageQuestion.subBattery,
        response: tabular.age,
      },
      {
        varName: genderQuestion.varName,
        batteryName: genderQuestion.batteryName,
        subBattery: genderQuestion.subBattery,
        response: tabular.gender,
      },
      {
        varName: favorabilityQuestion.varName,
        batteryName: favorabilityQuestion.batteryName,
        subBattery: favorabilityQuestion.subBattery,
        response: tabular.favorability,
      },
      {
        varName: weightQuestion.varName,
        batteryName: weightQuestion.batteryName,
        subBattery: weightQuestion.subBattery,
        response: tabular.weight,
      },
    ],
  };
}

/**
 * Transforms an array of tabular respondents into RespondentData format.
 *
 * @param tabulars - Array of simple respondent objects
 * @returns Array of RespondentData objects
 */
export function tabularArrayToRespondentData(
  tabulars: TabularRespondent[]
): RespondentData[] {
  return tabulars.map(tabularToRespondentData);
}

/**
 * Flattens split-organized wave data into a single RespondentData array.
 *
 * This is useful for feeding data to Statistics, which doesn't care about
 * split organization (it computes splits internally).
 *
 * @param waveData - Object with arrays of tabular respondents organized by split
 * @returns Flattened array of all respondents in RespondentData format
 *
 * @example
 * ```typescript
 * const wave1Respondents = flattenWaveData(wave1Data);
 * const stats = new Statistics(config, wave1Respondents, weightQuestion);
 * ```
 */
export function flattenWaveData(
  waveData: Record<string, TabularRespondent[]>
): RespondentData[] {
  const allRespondents: TabularRespondent[] = [];

  for (const splitData of Object.values(waveData)) {
    allRespondents.push(...splitData);
  }

  return tabularArrayToRespondentData(allRespondents);
}

/**
 * Combines multiple waves of split-organized data into a single flattened array.
 *
 * Useful for testing cumulative statistics across multiple waves.
 *
 * @param waves - Multiple wave objects to combine
 * @returns Single flattened array with all respondents from all waves
 *
 * @example
 * ```typescript
 * const allWaves = combineWaves(wave1Data, wave2Data);
 * const stats = new Statistics(config, allWaves, weightQuestion);
 * ```
 */
export function combineWaves(
  ...waves: Record<string, TabularRespondent[]>[]
): RespondentData[] {
  const allRespondents: TabularRespondent[] = [];

  for (const wave of waves) {
    for (const splitData of Object.values(wave)) {
      allRespondents.push(...splitData);
    }
  }

  return tabularArrayToRespondentData(allRespondents);
}
