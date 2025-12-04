/**
 * Test fixtures for Statistics and SegmentViz testing.
 *
 * This file contains test data organized by split membership to make
 * hand-calculation of expected statistics trivial.
 *
 * Structure:
 * - Two grouping questions (age, gender) each with 2 response groups
 * - This creates 4 fully-specified splits, but we populate only 2 for testing
 * - One response question (favorability) with expanded and collapsed groups
 * - Two waves of data to test incremental updates
 */

import type {
  ResponseQuestion,
  GroupingQuestion,
  Question,
} from "../../src/types";

/**
 * Simple tabular representation of a respondent.
 * Makes test data human-readable and easy to verify.
 */
export interface TabularRespondent {
  id: number;
  age: number; // 1 = young, 2 = old
  gender: number; // 1 = male, 2 = female
  favorability: number | null; // 1 = strongly favorable, 2 = favorable, 3 = unfavorable, 4 = strongly unfavorable
  weight: number; // integer weights for easy calculation
}

/**
 * Question definitions
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

export const weightQuestion: Question = {
  varName: "weight",
  batteryName: "metadata",
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

/**
 * Response question with expanded and collapsed groups
 *
 * Expanded groups: [strongly favorable], [favorable], [unfavorable], [strongly unfavorable]
 * Collapsed groups: [favorable (1+2)], [unfavorable (3+4)]
 *
 * This structure satisfies:
 * - Expanded groups are mutually exclusive
 * - Collapsed groups are mutually exclusive
 * - Union of collapsed values equals union of expanded values
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

/**
 * Wave 1 Test Data
 *
 * Populates 2 fully-specified splits:
 * 1. Young males: 3 respondents
 * 2. Old females: 4 respondents
 *
 * Expected statistics are hand-calculable from the data below.
 */

export const wave1Data = {
  /**
   * Split: age=young (1), gender=male (1)
   *
   * Respondents:
   * - id 1: strongly_favorable (1), weight 2
   * - id 2: favorable (2), weight 2
   * - id 3: unfavorable (3), weight 1
   *
   * Expected expanded group stats:
   * - strongly_favorable: count=1, weight=2, proportion=2/5
   * - favorable: count=1, weight=2, proportion=2/5
   * - unfavorable: count=1, weight=1, proportion=1/5
   * - strongly_unfavorable: count=0, weight=0, proportion=0
   *
   * Expected collapsed group stats:
   * - all_favorable (1+2): count=2, weight=4, proportion=4/5
   * - all_unfavorable (3+4): count=1, weight=1, proportion=1/5
   *
   * Question totals: count=3, weight=5
   */
  youngMales: [
    { id: 1, age: 1, gender: 1, favorability: 1, weight: 2 },
    { id: 2, age: 1, gender: 1, favorability: 2, weight: 2 },
    { id: 3, age: 1, gender: 1, favorability: 3, weight: 1 },
  ] as TabularRespondent[],

  /**
   * Split: age=old (2), gender=female (2)
   *
   * Respondents:
   * - id 4: favorable (2), weight 1
   * - id 5: unfavorable (3), weight 1
   * - id 6: unfavorable (3), weight 1
   * - id 7: strongly_unfavorable (4), weight 2
   *
   * Expected expanded group stats:
   * - strongly_favorable: count=0, weight=0, proportion=0
   * - favorable: count=1, weight=1, proportion=1/5
   * - unfavorable: count=2, weight=2, proportion=2/5
   * - strongly_unfavorable: count=1, weight=2, proportion=2/5
   *
   * Expected collapsed group stats:
   * - all_favorable (1+2): count=1, weight=1, proportion=1/5
   * - all_unfavorable (3+4): count=3, weight=4, proportion=4/5
   *
   * Question totals: count=4, weight=5
   */
  oldFemales: [
    { id: 4, age: 2, gender: 2, favorability: 2, weight: 1 },
    { id: 5, age: 2, gender: 2, favorability: 3, weight: 1 },
    { id: 6, age: 2, gender: 2, favorability: 3, weight: 1 },
    { id: 7, age: 2, gender: 2, favorability: 4, weight: 2 },
  ] as TabularRespondent[],
};

/**
 * Wave 2 Test Data
 *
 * Adds new respondents to both splits to test incremental updates.
 * Proportions will shift from wave 1 values.
 */

export const wave2Data = {
  /**
   * Split: age=young (1), gender=male (1)
   *
   * New respondents:
   * - id 8: strongly_favorable (1), weight 3
   *
   * After wave 2, youngMales will have:
   * - Total: count=4, weight=8
   * - strongly_favorable: count=2, weight=5, proportion=5/8
   * - favorable: count=1, weight=2, proportion=2/8
   * - unfavorable: count=1, weight=1, proportion=1/8
   * - strongly_unfavorable: count=0, weight=0, proportion=0
   *
   * Collapsed:
   * - all_favorable: count=3, weight=7, proportion=7/8
   * - all_unfavorable: count=1, weight=1, proportion=1/8
   *
   * Delta from wave 1:
   * - strongly_favorable: 2/5 → 5/8
   * - all_favorable: 4/5 → 7/8
   */
  youngMales: [
    { id: 8, age: 1, gender: 1, favorability: 1, weight: 3 },
  ] as TabularRespondent[],

  /**
   * Split: age=old (2), gender=female (2)
   *
   * New respondents:
   * - id 9: favorable (2), weight 2
   * - id 10: unfavorable (3), weight 1
   *
   * After wave 2, oldFemales will have:
   * - Total: count=6, weight=8
   * - strongly_favorable: count=0, weight=0, proportion=0
   * - favorable: count=2, weight=3, proportion=3/8
   * - unfavorable: count=3, weight=3, proportion=3/8
   * - strongly_unfavorable: count=1, weight=2, proportion=2/8
   *
   * Collapsed:
   * - all_favorable: count=2, weight=3, proportion=3/8
   * - all_unfavorable: count=4, weight=5, proportion=5/8
   *
   * Delta from wave 1:
   * - favorable: 1/5 → 3/8
   * - all_favorable: 1/5 → 3/8
   */
  oldFemales: [
    { id: 9, age: 2, gender: 2, favorability: 2, weight: 2 },
    { id: 10, age: 2, gender: 2, favorability: 3, weight: 1 },
  ] as TabularRespondent[],
};

/**
 * Expected statistics after Wave 1
 *
 * These values are hand-calculated from wave1Data above.
 * Tests should verify that Statistics produces these exact values.
 */

export const expectedWave1Stats = {
  youngMales: {
    favorability: {
      totalCount: 3,
      totalWeight: 5,
      expanded: {
        strongly_favorable: { count: 1, weight: 2, proportion: 2 / 5 },
        favorable: { count: 1, weight: 2, proportion: 2 / 5 },
        unfavorable: { count: 1, weight: 1, proportion: 1 / 5 },
        strongly_unfavorable: { count: 0, weight: 0, proportion: 0 },
      },
      collapsed: {
        all_favorable: { count: 2, weight: 4, proportion: 4 / 5 },
        all_unfavorable: { count: 1, weight: 1, proportion: 1 / 5 },
      },
    },
  },
  oldFemales: {
    favorability: {
      totalCount: 4,
      totalWeight: 5,
      expanded: {
        strongly_favorable: { count: 0, weight: 0, proportion: 0 },
        favorable: { count: 1, weight: 1, proportion: 1 / 5 },
        unfavorable: { count: 2, weight: 2, proportion: 2 / 5 },
        strongly_unfavorable: { count: 1, weight: 2, proportion: 2 / 5 },
      },
      collapsed: {
        all_favorable: { count: 1, weight: 1, proportion: 1 / 5 },
        all_unfavorable: { count: 3, weight: 4, proportion: 4 / 5 },
      },
    },
  },
  // Aggregated split: age=null, gender=null (all respondents)
  allRespondents: {
    favorability: {
      totalCount: 7,
      totalWeight: 10,
      expanded: {
        strongly_favorable: { count: 1, weight: 2, proportion: 2 / 10 },
        favorable: { count: 2, weight: 3, proportion: 3 / 10 },
        unfavorable: { count: 3, weight: 3, proportion: 3 / 10 },
        strongly_unfavorable: { count: 1, weight: 2, proportion: 2 / 10 },
      },
      collapsed: {
        all_favorable: { count: 3, weight: 5, proportion: 5 / 10 },
        all_unfavorable: { count: 4, weight: 5, proportion: 5 / 10 },
      },
    },
  },
};

/**
 * Expected statistics after Wave 2 (cumulative)
 */

export const expectedWave2Stats = {
  youngMales: {
    favorability: {
      totalCount: 4,
      totalWeight: 8,
      expanded: {
        strongly_favorable: { count: 2, weight: 5, proportion: 5 / 8 },
        favorable: { count: 1, weight: 2, proportion: 2 / 8 },
        unfavorable: { count: 1, weight: 1, proportion: 1 / 8 },
        strongly_unfavorable: { count: 0, weight: 0, proportion: 0 },
      },
      collapsed: {
        all_favorable: { count: 3, weight: 7, proportion: 7 / 8 },
        all_unfavorable: { count: 1, weight: 1, proportion: 1 / 8 },
      },
    },
  },
  oldFemales: {
    favorability: {
      totalCount: 6,
      totalWeight: 8,
      expanded: {
        strongly_favorable: { count: 0, weight: 0, proportion: 0 },
        favorable: { count: 2, weight: 3, proportion: 3 / 8 },
        unfavorable: { count: 3, weight: 3, proportion: 3 / 8 },
        strongly_unfavorable: { count: 1, weight: 2, proportion: 2 / 8 },
      },
      collapsed: {
        all_favorable: { count: 2, weight: 3, proportion: 3 / 8 },
        all_unfavorable: { count: 4, weight: 5, proportion: 5 / 8 },
      },
    },
  },
  allRespondents: {
    favorability: {
      totalCount: 10,
      totalWeight: 16,
      expanded: {
        strongly_favorable: { count: 2, weight: 5, proportion: 5 / 16 },
        favorable: { count: 3, weight: 5, proportion: 5 / 16 },
        unfavorable: { count: 4, weight: 4, proportion: 4 / 16 },
        strongly_unfavorable: { count: 1, weight: 2, proportion: 2 / 16 },
      },
      collapsed: {
        all_favorable: { count: 5, weight: 10, proportion: 10 / 16 },
        all_unfavorable: { count: 5, weight: 6, proportion: 6 / 16 },
      },
    },
  },
};

/**
 * Expected deltas for Wave 2 update
 *
 * These represent the changes from wave1 to wave2 statistics.
 */

export const expectedWave2Deltas = {
  youngMales: {
    favorability: {
      totalCountBefore: 3,
      totalCountAfter: 4,
      totalWeightBefore: 5,
      totalWeightAfter: 8,
      expanded: {
        strongly_favorable: {
          countBefore: 1,
          countAfter: 2,
          weightBefore: 2,
          weightAfter: 5,
          proportionBefore: 2 / 5,
          proportionAfter: 5 / 8,
        },
        favorable: {
          countBefore: 1,
          countAfter: 1,
          weightBefore: 2,
          weightAfter: 2,
          proportionBefore: 2 / 5,
          proportionAfter: 2 / 8,
        },
        unfavorable: {
          countBefore: 1,
          countAfter: 1,
          weightBefore: 1,
          weightAfter: 1,
          proportionBefore: 1 / 5,
          proportionAfter: 1 / 8,
        },
        strongly_unfavorable: {
          countBefore: 0,
          countAfter: 0,
          weightBefore: 0,
          weightAfter: 0,
          proportionBefore: 0,
          proportionAfter: 0,
        },
      },
      collapsed: {
        all_favorable: {
          countBefore: 2,
          countAfter: 3,
          weightBefore: 4,
          weightAfter: 7,
          proportionBefore: 4 / 5,
          proportionAfter: 7 / 8,
        },
        all_unfavorable: {
          countBefore: 1,
          countAfter: 1,
          weightBefore: 1,
          weightAfter: 1,
          proportionBefore: 1 / 5,
          proportionAfter: 1 / 8,
        },
      },
    },
  },
  oldFemales: {
    favorability: {
      totalCountBefore: 4,
      totalCountAfter: 6,
      totalWeightBefore: 5,
      totalWeightAfter: 8,
      expanded: {
        strongly_favorable: {
          countBefore: 0,
          countAfter: 0,
          weightBefore: 0,
          weightAfter: 0,
          proportionBefore: 0,
          proportionAfter: 0,
        },
        favorable: {
          countBefore: 1,
          countAfter: 2,
          weightBefore: 1,
          weightAfter: 3,
          proportionBefore: 1 / 5,
          proportionAfter: 3 / 8,
        },
        unfavorable: {
          countBefore: 2,
          countAfter: 3,
          weightBefore: 2,
          weightAfter: 3,
          proportionBefore: 2 / 5,
          proportionAfter: 3 / 8,
        },
        strongly_unfavorable: {
          countBefore: 1,
          countAfter: 1,
          weightBefore: 2,
          weightAfter: 2,
          proportionBefore: 2 / 5,
          proportionAfter: 2 / 8,
        },
      },
      collapsed: {
        all_favorable: {
          countBefore: 1,
          countAfter: 2,
          weightBefore: 1,
          weightAfter: 3,
          proportionBefore: 1 / 5,
          proportionAfter: 3 / 8,
        },
        all_unfavorable: {
          countBefore: 3,
          countAfter: 4,
          weightBefore: 4,
          weightAfter: 5,
          proportionBefore: 4 / 5,
          proportionAfter: 5 / 8,
        },
      },
    },
  },
};
