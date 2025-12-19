/**
 * Core types shared across the BLW DataViz monorepo.
 * This package contains base types with no dependencies to prevent circular dependencies.
 */

/**
 * Question type for uniquely identifying a question in code.
 * Corresponds to the composite primary key in the questions.questions table.
 */
export interface Question {
  varName: string;
  batteryName: string;
  // subBattery is required (empty string '' for questions without a sub-battery)
  // This matches the database constraint where subBattery is part of the primary key
  subBattery: string;
}
