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
 * Wave 3 Test Data
 *
 * Populates previously unpopulated splits to test newly-populated split behavior.
 * This wave adds respondents to oldMales and youngFemales, which had zero respondents
 * in Waves 1 and 2.
 *
 * Use case: Testing delta computation when splits go from unpopulated (0) to populated (>0).
 */

export const wave3Data = {
  /**
   * Split: age=old (2), gender=male (1) - NEWLY POPULATED
   *
   * New respondents:
   * - id 11: strongly_favorable (1), weight 2
   * - id 12: unfavorable (3), weight 1
   *
   * After wave 3, oldMales will have:
   * - Total: count=2, weight=3
   * - strongly_favorable: count=1, weight=2, proportion=2/3
   * - favorable: count=0, weight=0, proportion=0
   * - unfavorable: count=1, weight=1, proportion=1/3
   * - strongly_unfavorable: count=0, weight=0, proportion=0
   *
   * Collapsed:
   * - all_favorable: count=1, weight=2, proportion=2/3
   * - all_unfavorable: count=1, weight=1, proportion=1/3
   *
   * Delta from Wave 2 (unpopulated → populated):
   * - This split did not exist before (no before values)
   * - After values should appear in delta
   */
  oldMales: [
    { id: 11, age: 2, gender: 1, favorability: 1, weight: 2 },
    { id: 12, age: 2, gender: 1, favorability: 3, weight: 1 },
  ] as TabularRespondent[],

  /**
   * Split: age=young (1), gender=female (2) - NEWLY POPULATED
   *
   * New respondents:
   * - id 13: favorable (2), weight 1
   * - id 14: strongly_unfavorable (4), weight 3
   *
   * After wave 3, youngFemales will have:
   * - Total: count=2, weight=4
   * - strongly_favorable: count=0, weight=0, proportion=0
   * - favorable: count=1, weight=1, proportion=1/4
   * - unfavorable: count=0, weight=0, proportion=0
   * - strongly_unfavorable: count=1, weight=3, proportion=3/4
   *
   * Collapsed:
   * - all_favorable: count=1, weight=1, proportion=1/4
   * - all_unfavorable: count=1, weight=3, proportion=3/4
   *
   * Delta from Wave 2 (unpopulated → populated):
   * - This split did not exist before (no before values)
   * - After values should appear in delta
   */
  youngFemales: [
    { id: 13, age: 1, gender: 2, favorability: 2, weight: 1 },
    { id: 14, age: 1, gender: 2, favorability: 4, weight: 3 },
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

/**
 * Expected statistics after Wave 3 (cumulative: Wave 1 + Wave 2 + Wave 3)
 *
 * Wave 3 adds two NEW splits (oldMales, youngFemales) while leaving existing
 * splits (youngMales, oldFemales) unchanged.
 */

export const expectedWave3Stats = {
  // Existing splits remain unchanged from Wave 2
  youngMales: expectedWave2Stats.youngMales,
  oldFemales: expectedWave2Stats.oldFemales,

  // Newly populated splits
  oldMales: {
    favorability: {
      totalCount: 2,
      totalWeight: 3,
      expanded: {
        strongly_favorable: { count: 1, weight: 2, proportion: 2 / 3 },
        favorable: { count: 0, weight: 0, proportion: 0 },
        unfavorable: { count: 1, weight: 1, proportion: 1 / 3 },
        strongly_unfavorable: { count: 0, weight: 0, proportion: 0 },
      },
      collapsed: {
        all_favorable: { count: 1, weight: 2, proportion: 2 / 3 },
        all_unfavorable: { count: 1, weight: 1, proportion: 1 / 3 },
      },
    },
  },
  youngFemales: {
    favorability: {
      totalCount: 2,
      totalWeight: 4,
      expanded: {
        strongly_favorable: { count: 0, weight: 0, proportion: 0 },
        favorable: { count: 1, weight: 1, proportion: 1 / 4 },
        unfavorable: { count: 0, weight: 0, proportion: 0 },
        strongly_unfavorable: { count: 1, weight: 3, proportion: 3 / 4 },
      },
      collapsed: {
        all_favorable: { count: 1, weight: 1, proportion: 1 / 4 },
        all_unfavorable: { count: 1, weight: 3, proportion: 3 / 4 },
      },
    },
  },
  // Aggregated split now includes all 4 fully-specified splits
  allRespondents: {
    favorability: {
      totalCount: 14,
      totalWeight: 23,
      expanded: {
        strongly_favorable: { count: 3, weight: 7, proportion: 7 / 23 },
        favorable: { count: 4, weight: 6, proportion: 6 / 23 },
        unfavorable: { count: 5, weight: 5, proportion: 5 / 23 },
        strongly_unfavorable: { count: 2, weight: 5, proportion: 5 / 23 },
      },
      collapsed: {
        all_favorable: { count: 7, weight: 13, proportion: 13 / 23 },
        all_unfavorable: { count: 7, weight: 10, proportion: 10 / 23 },
      },
    },
  },
};

/**
 * Expected deltas for Wave 3 update
 *
 * Wave 3 creates NEWLY POPULATED splits. The delta computation should:
 * - Include oldMales and youngFemales (new splits)
 * - NOT include youngMales and oldFemales (unchanged)
 * - Update aggregated split (allRespondents)
 *
 * For newly populated splits, there are no "before" values since the split
 * didn't exist previously.
 */

export const expectedWave3Deltas = {
  // Newly populated split: oldMales (was unpopulated, now has 2 respondents)
  oldMales: {
    favorability: {
      totalCountBefore: 0, // Did not exist
      totalCountAfter: 2,
      totalWeightBefore: 0, // Did not exist
      totalWeightAfter: 3,
      expanded: {
        strongly_favorable: {
          countBefore: 0,
          countAfter: 1,
          weightBefore: 0,
          weightAfter: 2,
          proportionBefore: 0, // Or undefined/null, depending on implementation
          proportionAfter: 2 / 3,
        },
        favorable: {
          countBefore: 0,
          countAfter: 0,
          weightBefore: 0,
          weightAfter: 0,
          proportionBefore: 0,
          proportionAfter: 0,
        },
        unfavorable: {
          countBefore: 0,
          countAfter: 1,
          weightBefore: 0,
          weightAfter: 1,
          proportionBefore: 0,
          proportionAfter: 1 / 3,
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
          countBefore: 0,
          countAfter: 1,
          weightBefore: 0,
          weightAfter: 2,
          proportionBefore: 0,
          proportionAfter: 2 / 3,
        },
        all_unfavorable: {
          countBefore: 0,
          countAfter: 1,
          weightBefore: 0,
          weightAfter: 1,
          proportionBefore: 0,
          proportionAfter: 1 / 3,
        },
      },
    },
  },
  // Newly populated split: youngFemales (was unpopulated, now has 2 respondents)
  youngFemales: {
    favorability: {
      totalCountBefore: 0,
      totalCountAfter: 2,
      totalWeightBefore: 0,
      totalWeightAfter: 4,
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
          countBefore: 0,
          countAfter: 1,
          weightBefore: 0,
          weightAfter: 1,
          proportionBefore: 0,
          proportionAfter: 1 / 4,
        },
        unfavorable: {
          countBefore: 0,
          countAfter: 0,
          weightBefore: 0,
          weightAfter: 0,
          proportionBefore: 0,
          proportionAfter: 0,
        },
        strongly_unfavorable: {
          countBefore: 0,
          countAfter: 1,
          weightBefore: 0,
          weightAfter: 3,
          proportionBefore: 0,
          proportionAfter: 3 / 4,
        },
      },
      collapsed: {
        all_favorable: {
          countBefore: 0,
          countAfter: 1,
          weightBefore: 0,
          weightAfter: 1,
          proportionBefore: 0,
          proportionAfter: 1 / 4,
        },
        all_unfavorable: {
          countBefore: 0,
          countAfter: 1,
          weightBefore: 0,
          weightAfter: 3,
          proportionBefore: 0,
          proportionAfter: 3 / 4,
        },
      },
    },
  },
  // Aggregated split updates from Wave 2 values
  allRespondents: {
    favorability: {
      totalCountBefore: 10, // From Wave 2
      totalCountAfter: 14, // After Wave 3
      totalWeightBefore: 16,
      totalWeightAfter: 23,
      expanded: {
        strongly_favorable: {
          countBefore: 2,
          countAfter: 3,
          weightBefore: 5,
          weightAfter: 7,
          proportionBefore: 5 / 16,
          proportionAfter: 7 / 23,
        },
        favorable: {
          countBefore: 3,
          countAfter: 4,
          weightBefore: 5,
          weightAfter: 6,
          proportionBefore: 5 / 16,
          proportionAfter: 6 / 23,
        },
        unfavorable: {
          countBefore: 4,
          countAfter: 5,
          weightBefore: 4,
          weightAfter: 5,
          proportionBefore: 4 / 16,
          proportionAfter: 5 / 23,
        },
        strongly_unfavorable: {
          countBefore: 1,
          countAfter: 2,
          weightBefore: 2,
          weightAfter: 5,
          proportionBefore: 2 / 16,
          proportionAfter: 5 / 23,
        },
      },
      collapsed: {
        all_favorable: {
          countBefore: 5,
          countAfter: 7,
          weightBefore: 10,
          weightAfter: 13,
          proportionBefore: 10 / 16,
          proportionAfter: 13 / 23,
        },
        all_unfavorable: {
          countBefore: 5,
          countAfter: 7,
          weightBefore: 6,
          weightAfter: 10,
          proportionBefore: 6 / 16,
          proportionAfter: 10 / 23,
        },
      },
    },
  },
};
