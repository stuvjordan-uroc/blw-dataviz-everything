/**
 * Utility for grouping questions hierarchically by battery and sub-battery.
 * 
 * Groups consecutive questions that share the same battery/sub-battery context
 * to avoid repeating prefixes unnecessarily. Even single isolated questions
 * are wrapped in group structures so they can display their contextual prefixes.
 */

import type { QuestionWithDetails } from "shared-types";

/**
 * Sub-battery group containing one or more consecutive questions
 * that share the same battery and sub-battery.
 */
export interface SubBatteryGroup {
  // Sub-battery prefix (null when question has no sub-battery prefix)
  subBatteryPrefix: string | null;
  // Questions belonging to this sub-battery group
  questions: QuestionWithDetails[];
}

/**
 * Battery group containing one or more consecutive questions
 * that share the same battery, organized into sub-battery groups.
 */
export interface BatteryGroup {
  // Battery prefix (null when battery has no prefix)
  batteryPrefix: string | null;
  // Sub-battery groups within this battery
  subBatteryGroups: SubBatteryGroup[];
}

/**
 * Groups questions hierarchically by battery and sub-battery.
 * 
 * Creates visual groupings based on consecutive questions with matching
 * battery/sub-battery values. This allows prefixes to be shown once per
 * group rather than repeated for every question.
 * 
 * Algorithm:
 * 1. Iterate through questions sequentially
 * 2. When batteryName changes, start a new battery group
 * 3. Within each battery, when subBattery or subBatteryPrefix changes,
 *    start a new sub-battery group
 * 4. Even single questions are wrapped in groups to display their context
 * 
 * Example input (3 questions):
 * [
 *   { batteryName: "A", subBattery: "x", subBatteryPrefix: "Nurses" },
 *   { batteryName: "A", subBattery: "x", subBatteryPrefix: "Nurses" },
 *   { batteryName: "B", subBattery: "", subBatteryPrefix: null },
 * ]
 * 
 * Example output:
 * [
 *   BatteryGroup {
 *     batteryPrefix: "...",
 *     subBatteryGroups: [
 *       SubBatteryGroup {
 *         subBatteryPrefix: "Nurses",
 *         questions: [Q1, Q2]  // Two questions grouped together
 *       }
 *     ]
 *   },
 *   BatteryGroup {
 *     batteryPrefix: "...",
 *     subBatteryGroups: [
 *       SubBatteryGroup {
 *         subBatteryPrefix: null,
 *         questions: [Q3]  // Single question still gets a group
 *       }
 *     ]
 *   }
 * ]
 * 
 * @param questions - Questions in display order (from session config)
 * @returns Hierarchical grouping structure
 */
export function groupQuestionsByHierarchy(
  questions: QuestionWithDetails[]
): BatteryGroup[] {
  if (questions.length === 0) {
    return [];
  }

  const batteryGroups: BatteryGroup[] = [];
  let currentBattery: BatteryGroup | null = null;
  let currentSubBattery: SubBatteryGroup | null = null;

  for (const question of questions) {
    // Check if we need to start a new battery group
    const needNewBattery =
      !currentBattery ||
      currentBattery.batteryPrefix !== question.batteryPrefix ||
      // Also start new battery if internal batteryName changes
      // (handles edge case of different batteries with same prefix)
      (currentBattery.subBatteryGroups.length > 0 &&
        currentBattery.subBatteryGroups[0].questions[0].batteryName !== question.batteryName);

    if (needNewBattery) {
      // Save previous battery group if it exists
      if (currentBattery) {
        batteryGroups.push(currentBattery);
      }

      // Start new battery group
      currentBattery = {
        batteryPrefix: question.batteryPrefix,
        subBatteryGroups: [],
      };
      currentSubBattery = null; // Reset sub-battery when battery changes
    }

    // Check if we need to start a new sub-battery group
    const needNewSubBattery =
      !currentSubBattery ||
      currentSubBattery.subBatteryPrefix !== question.subBatteryPrefix ||
      // Also start new sub-battery if internal subBattery changes
      // (handles edge case of different sub-batteries with same prefix)
      (currentSubBattery.questions.length > 0 &&
        currentSubBattery.questions[0].subBattery !== question.subBattery);

    if (needNewSubBattery) {
      // Save previous sub-battery group if it exists
      if (currentSubBattery) {
        currentBattery!.subBatteryGroups.push(currentSubBattery);
      }

      // Start new sub-battery group
      currentSubBattery = {
        subBatteryPrefix: question.subBatteryPrefix,
        questions: [],
      };
    }

    // Add question to current sub-battery group
    if (currentSubBattery) {
      currentSubBattery.questions.push(question);
    }
  }

  // Don't forget to save the final groups
  if (currentSubBattery) {
    currentBattery!.subBatteryGroups.push(currentSubBattery);
  }
  if (currentBattery) {
    batteryGroups.push(currentBattery);
  }

  return batteryGroups;
}
