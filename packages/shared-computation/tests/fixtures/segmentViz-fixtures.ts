/**
 * Test fixtures for SegmentViz testing (initialization without data).
 *
 * These fixtures are designed for easy hand-calculation of geometry:
 * - Round numbers for all dimensions (100, 10)
 * - Zero responseGap for simpler arithmetic
 * - baseSegmentWidth of 10 for round numbers
 * - Simple response group counts (2 or 4)
 */

import type {
  ResponseQuestion,
  GroupingQuestion,
  Question,
} from "../../src/types";

/**
 * Question definitions for basic SegmentViz tests
 */

export const ageQuestion: Question = {
  varName: "age",
  batteryName: "demographics",
  subBattery: "",
};

export const genderQuestion: Question = {
  varName: "gender",
  batteryName: "demographics",
  subBattery: "",
};

export const favorabilityQuestion: Question = {
  varName: "favorability",
  batteryName: "survey",
  subBattery: "",
};

/**
 * Partisanship question that serves BOTH as a grouping question
 * and a response question (for testing response question exclusion)
 */
export const partisanshipQuestion: Question = {
  varName: "partisanship",
  batteryName: "survey",
  subBattery: "",
};

/**
 * Grouping questions with response groups
 */

export const ageGroupingQuestion: GroupingQuestion = {
  ...ageQuestion,
  responseGroups: [
    { label: "young", values: [1] },
    { label: "old", values: [2] },
  ],
};

export const genderGroupingQuestion: GroupingQuestion = {
  ...genderQuestion,
  responseGroups: [
    { label: "male", values: [1] },
    { label: "female", values: [2] },
  ],
};

export const partisanshipGroupingQuestion: GroupingQuestion = {
  ...partisanshipQuestion,
  responseGroups: [
    { label: "democrat", values: [1] },
    { label: "republican", values: [2] },
  ],
};

/**
 * Response questions with expanded and collapsed groups
 *
 * Favorability uses 4 expanded groups (for more complex testing)
 * Partisanship uses 2 expanded groups (for simplicity)
 */

export const favorabilityResponseQuestion: ResponseQuestion = {
  ...favorabilityQuestion,
  responseGroups: {
    expanded: [
      { label: "strongly_favorable", values: [1] },
      { label: "favorable", values: [2] },
      { label: "unfavorable", values: [3] },
      { label: "strongly_unfavorable", values: [4] },
    ],
    collapsed: [
      { label: "all_favorable", values: [1, 2] },
      { label: "all_unfavorable", values: [3, 4] },
    ],
  },
};

export const partisanshipResponseQuestion: ResponseQuestion = {
  ...partisanshipQuestion,
  responseGroups: {
    expanded: [
      { label: "democrat", values: [1] },
      { label: "republican", values: [2] },
    ],
    collapsed: [{ label: "all_partisanship", values: [1, 2] }],
  },
};
