/**
 * Tests for Statistics class functionality.
 *
 * These tests verify that the Statistics class correctly computes proportions,
 * weights, and counts for response groups across multiple splits, both with
 * and without weight questions, and correctly handles incremental updates.
 */

import { Statistics, type StatsConfig } from "../src/statistics";
import type { Split } from "../src/types";
import {
  wave1Data,
  wave2Data,
  ageGroupingQuestion,
  genderGroupingQuestion,
  favorabilityResponseQuestion,
  weightQuestion,
  expectedWave1Stats,
  expectedWave2Stats,
  expectedWave2Deltas,
  flattenWaveData,
} from "./fixtures";

/**
 * Helper to find a specific split by its group configuration.
 */
function findSplit(
  splits: Split[],
  ageGroupLabel: string | null,
  genderGroupLabel: string | null
): Split | undefined {
  return splits.find((split: Split) => {
    const ageMatch =
      ageGroupLabel === null
        ? split.groups[0].responseGroup === null
        : split.groups[0].responseGroup?.label === ageGroupLabel;

    const genderMatch =
      genderGroupLabel === null
        ? split.groups[1].responseGroup === null
        : split.groups[1].responseGroup?.label === genderGroupLabel;

    return ageMatch && genderMatch;
  });
}

describe("Statistics - Wave 1 Only (No Weight Question)", () => {
  let stats: Statistics;
  let splits: Split[];

  beforeAll(() => {
    const config: StatsConfig = {
      responseQuestions: [favorabilityResponseQuestion],
      groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
    };

    const wave1Respondents = flattenWaveData(wave1Data);
    stats = new Statistics(config, wave1Respondents);
    splits = stats.getSplits();
  });

  describe("Basic statistics", () => {
    it("should process all respondents as valid", () => {
      expect(stats.getValidRespondentsCount()).toBe(7);
      expect(stats.getInvalidRespondentsCount()).toBe(0);
      expect(stats.getTotalRespondentsProcessed()).toBe(7);
    });

    it("should create the correct number of splits", () => {
      // With 2 grouping questions, each with 2 groups + null option = 3 options each
      // Total splits = 3 * 3 = 9
      expect(splits.length).toBe(9);
    });
  });

  describe("Young Males split (fully-specified)", () => {
    let youngMalesSplit: Split;
    let favQuestion: any;

    beforeAll(() => {
      const split = findSplit(splits, "young", "male");
      expect(split).toBeDefined();
      youngMalesSplit = split!;
      favQuestion = youngMalesSplit.responseQuestions[0];
    });

    it("should have correct total counts and weights", () => {
      // Without weight question, each respondent has weight 1
      // Wave 1 has 3 young males
      expect(favQuestion.totalCount).toBe(
        expectedWave1Stats.youngMales.favorability.totalCount
      );
      expect(favQuestion.totalWeight).toBe(3); // Each respondent weight = 1
    });

    it("should have correct expanded group statistics", () => {
      const stronglyFav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_favorable"
      );
      const favorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "favorable"
      );
      const unfavorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "unfavorable"
      );
      const stronglyUnfav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_unfavorable"
      );

      // Wave 1 young males: id 1 (strongly_fav), id 2 (fav), id 3 (unfav)
      expect(stronglyFav.totalCount).toBe(1);
      expect(stronglyFav.totalWeight).toBe(1);
      expect(stronglyFav.proportion).toBeCloseTo(1 / 3, 10);

      expect(favorable.totalCount).toBe(1);
      expect(favorable.totalWeight).toBe(1);
      expect(favorable.proportion).toBeCloseTo(1 / 3, 10);

      expect(unfavorable.totalCount).toBe(1);
      expect(unfavorable.totalWeight).toBe(1);
      expect(unfavorable.proportion).toBeCloseTo(1 / 3, 10);

      expect(stronglyUnfav.totalCount).toBe(0);
      expect(stronglyUnfav.totalWeight).toBe(0);
      expect(stronglyUnfav.proportion).toBe(0);
    });

    it("should have correct collapsed group statistics", () => {
      const allFavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_favorable"
      );
      const allUnfavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_unfavorable"
      );

      // all_favorable includes strongly_favorable + favorable = 2 respondents
      expect(allFavorable.totalCount).toBe(2);
      expect(allFavorable.totalWeight).toBe(2);
      expect(allFavorable.proportion).toBeCloseTo(2 / 3, 10);

      // all_unfavorable includes unfavorable + strongly_unfavorable = 1 respondent
      expect(allUnfavorable.totalCount).toBe(1);
      expect(allUnfavorable.totalWeight).toBe(1);
      expect(allUnfavorable.proportion).toBeCloseTo(1 / 3, 10);
    });
  });

  describe("Old Females split (fully-specified)", () => {
    let oldFemalesSplit: Split;
    let favQuestion: any;

    beforeAll(() => {
      const split = findSplit(splits, "old", "female");
      expect(split).toBeDefined();
      oldFemalesSplit = split!;
      favQuestion = oldFemalesSplit.responseQuestions[0];
    });

    it("should have correct total counts and weights", () => {
      // Without weight question, each respondent has weight 1
      // Wave 1 has 4 old females
      expect(favQuestion.totalCount).toBe(
        expectedWave1Stats.oldFemales.favorability.totalCount
      );
      expect(favQuestion.totalWeight).toBe(4); // Each respondent weight = 1
    });

    it("should have correct expanded group statistics", () => {
      const stronglyFav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_favorable"
      );
      const favorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "favorable"
      );
      const unfavorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "unfavorable"
      );
      const stronglyUnfav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_unfavorable"
      );

      // Wave 1 old females: id 4 (fav), id 5 (unfav), id 6 (unfav), id 7 (strongly_unfav)
      expect(stronglyFav.totalCount).toBe(0);
      expect(stronglyFav.totalWeight).toBe(0);
      expect(stronglyFav.proportion).toBe(0);

      expect(favorable.totalCount).toBe(1);
      expect(favorable.totalWeight).toBe(1);
      expect(favorable.proportion).toBeCloseTo(1 / 4, 10);

      expect(unfavorable.totalCount).toBe(2);
      expect(unfavorable.totalWeight).toBe(2);
      expect(unfavorable.proportion).toBeCloseTo(2 / 4, 10);

      expect(stronglyUnfav.totalCount).toBe(1);
      expect(stronglyUnfav.totalWeight).toBe(1);
      expect(stronglyUnfav.proportion).toBeCloseTo(1 / 4, 10);
    });

    it("should have correct collapsed group statistics", () => {
      const allFavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_favorable"
      );
      const allUnfavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_unfavorable"
      );

      // all_favorable includes favorable = 1 respondent
      expect(allFavorable.totalCount).toBe(1);
      expect(allFavorable.totalWeight).toBe(1);
      expect(allFavorable.proportion).toBeCloseTo(1 / 4, 10);

      // all_unfavorable includes unfavorable + strongly_unfavorable = 3 respondents
      expect(allUnfavorable.totalCount).toBe(3);
      expect(allUnfavorable.totalWeight).toBe(3);
      expect(allUnfavorable.proportion).toBeCloseTo(3 / 4, 10);
    });
  });

  describe("All Respondents split (aggregated)", () => {
    let allRespondentsSplit: Split;
    let favQuestion: any;

    beforeAll(() => {
      const split = findSplit(splits, null, null);
      expect(split).toBeDefined();
      allRespondentsSplit = split!;
      favQuestion = allRespondentsSplit.responseQuestions[0];
    });

    it("should have correct total counts and weights", () => {
      // Without weight question, total weight = total count
      // Wave 1 has 7 respondents total
      expect(favQuestion.totalCount).toBe(7);
      expect(favQuestion.totalWeight).toBe(7);
    });

    it("should have correct expanded group statistics", () => {
      const stronglyFav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_favorable"
      );
      const favorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "favorable"
      );
      const unfavorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "unfavorable"
      );
      const stronglyUnfav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_unfavorable"
      );

      // Aggregating both splits: 1 strongly_fav, 2 fav, 3 unfav, 1 strongly_unfav
      expect(stronglyFav.totalCount).toBe(1);
      expect(stronglyFav.totalWeight).toBe(1);
      expect(stronglyFav.proportion).toBeCloseTo(1 / 7, 10);

      expect(favorable.totalCount).toBe(2);
      expect(favorable.totalWeight).toBe(2);
      expect(favorable.proportion).toBeCloseTo(2 / 7, 10);

      expect(unfavorable.totalCount).toBe(3);
      expect(unfavorable.totalWeight).toBe(3);
      expect(unfavorable.proportion).toBeCloseTo(3 / 7, 10);

      expect(stronglyUnfav.totalCount).toBe(1);
      expect(stronglyUnfav.totalWeight).toBe(1);
      expect(stronglyUnfav.proportion).toBeCloseTo(1 / 7, 10);
    });

    it("should have correct collapsed group statistics", () => {
      const allFavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_favorable"
      );
      const allUnfavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_unfavorable"
      );

      // all_favorable = 3 respondents, all_unfavorable = 4 respondents
      expect(allFavorable.totalCount).toBe(3);
      expect(allFavorable.totalWeight).toBe(3);
      expect(allFavorable.proportion).toBeCloseTo(3 / 7, 10);

      expect(allUnfavorable.totalCount).toBe(4);
      expect(allUnfavorable.totalWeight).toBe(4);
      expect(allUnfavorable.proportion).toBeCloseTo(4 / 7, 10);
    });
  });
});

describe("Statistics - Wave 1 Only (With Weight Question)", () => {
  let stats: Statistics;
  let splits: Split[];

  beforeAll(() => {
    const config: StatsConfig = {
      responseQuestions: [favorabilityResponseQuestion],
      groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
    };

    const wave1Respondents = flattenWaveData(wave1Data);
    stats = new Statistics(config, wave1Respondents, weightQuestion);
    splits = stats.getSplits();
  });

  describe("Basic statistics", () => {
    it("should process all respondents as valid", () => {
      expect(stats.getValidRespondentsCount()).toBe(7);
      expect(stats.getInvalidRespondentsCount()).toBe(0);
      expect(stats.getTotalRespondentsProcessed()).toBe(7);
    });
  });

  describe("Young Males split (fully-specified)", () => {
    let youngMalesSplit: Split;
    let favQuestion: any;

    beforeAll(() => {
      const split = findSplit(splits, "young", "male");
      expect(split).toBeDefined();
      youngMalesSplit = split!;
      favQuestion = youngMalesSplit.responseQuestions[0];
    });

    it("should have correct total counts and weights", () => {
      expect(favQuestion.totalCount).toBe(
        expectedWave1Stats.youngMales.favorability.totalCount
      );
      expect(favQuestion.totalWeight).toBe(
        expectedWave1Stats.youngMales.favorability.totalWeight
      );
    });

    it("should have correct expanded group statistics", () => {
      const stronglyFav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_favorable"
      );
      const favorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "favorable"
      );
      const unfavorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "unfavorable"
      );
      const stronglyUnfav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_unfavorable"
      );

      const expected = expectedWave1Stats.youngMales.favorability.expanded;

      expect(stronglyFav.totalCount).toBe(expected.strongly_favorable.count);
      expect(stronglyFav.totalWeight).toBe(expected.strongly_favorable.weight);
      expect(stronglyFav.proportion).toBeCloseTo(
        expected.strongly_favorable.proportion,
        10
      );

      expect(favorable.totalCount).toBe(expected.favorable.count);
      expect(favorable.totalWeight).toBe(expected.favorable.weight);
      expect(favorable.proportion).toBeCloseTo(
        expected.favorable.proportion,
        10
      );

      expect(unfavorable.totalCount).toBe(expected.unfavorable.count);
      expect(unfavorable.totalWeight).toBe(expected.unfavorable.weight);
      expect(unfavorable.proportion).toBeCloseTo(
        expected.unfavorable.proportion,
        10
      );

      expect(stronglyUnfav.totalCount).toBe(expected.strongly_unfavorable.count);
      expect(stronglyUnfav.totalWeight).toBe(
        expected.strongly_unfavorable.weight
      );
      expect(stronglyUnfav.proportion).toBeCloseTo(
        expected.strongly_unfavorable.proportion,
        10
      );
    });

    it("should have correct collapsed group statistics", () => {
      const allFavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_favorable"
      );
      const allUnfavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_unfavorable"
      );

      const expected = expectedWave1Stats.youngMales.favorability.collapsed;

      expect(allFavorable.totalCount).toBe(expected.all_favorable.count);
      expect(allFavorable.totalWeight).toBe(expected.all_favorable.weight);
      expect(allFavorable.proportion).toBeCloseTo(
        expected.all_favorable.proportion,
        10
      );

      expect(allUnfavorable.totalCount).toBe(expected.all_unfavorable.count);
      expect(allUnfavorable.totalWeight).toBe(expected.all_unfavorable.weight);
      expect(allUnfavorable.proportion).toBeCloseTo(
        expected.all_unfavorable.proportion,
        10
      );
    });
  });

  describe("Old Females split (fully-specified)", () => {
    let oldFemalesSplit: Split;
    let favQuestion: any;

    beforeAll(() => {
      const split = findSplit(splits, "old", "female");
      expect(split).toBeDefined();
      oldFemalesSplit = split!;
      favQuestion = oldFemalesSplit.responseQuestions[0];
    });

    it("should have correct total counts and weights", () => {
      expect(favQuestion.totalCount).toBe(
        expectedWave1Stats.oldFemales.favorability.totalCount
      );
      expect(favQuestion.totalWeight).toBe(
        expectedWave1Stats.oldFemales.favorability.totalWeight
      );
    });

    it("should have correct expanded group statistics", () => {
      const stronglyFav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_favorable"
      );
      const favorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "favorable"
      );
      const unfavorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "unfavorable"
      );
      const stronglyUnfav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_unfavorable"
      );

      const expected = expectedWave1Stats.oldFemales.favorability.expanded;

      expect(stronglyFav.totalCount).toBe(expected.strongly_favorable.count);
      expect(stronglyFav.totalWeight).toBe(expected.strongly_favorable.weight);
      expect(stronglyFav.proportion).toBeCloseTo(
        expected.strongly_favorable.proportion,
        10
      );

      expect(favorable.totalCount).toBe(expected.favorable.count);
      expect(favorable.totalWeight).toBe(expected.favorable.weight);
      expect(favorable.proportion).toBeCloseTo(
        expected.favorable.proportion,
        10
      );

      expect(unfavorable.totalCount).toBe(expected.unfavorable.count);
      expect(unfavorable.totalWeight).toBe(expected.unfavorable.weight);
      expect(unfavorable.proportion).toBeCloseTo(
        expected.unfavorable.proportion,
        10
      );

      expect(stronglyUnfav.totalCount).toBe(expected.strongly_unfavorable.count);
      expect(stronglyUnfav.totalWeight).toBe(
        expected.strongly_unfavorable.weight
      );
      expect(stronglyUnfav.proportion).toBeCloseTo(
        expected.strongly_unfavorable.proportion,
        10
      );
    });

    it("should have correct collapsed group statistics", () => {
      const allFavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_favorable"
      );
      const allUnfavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_unfavorable"
      );

      const expected = expectedWave1Stats.oldFemales.favorability.collapsed;

      expect(allFavorable.totalCount).toBe(expected.all_favorable.count);
      expect(allFavorable.totalWeight).toBe(expected.all_favorable.weight);
      expect(allFavorable.proportion).toBeCloseTo(
        expected.all_favorable.proportion,
        10
      );

      expect(allUnfavorable.totalCount).toBe(expected.all_unfavorable.count);
      expect(allUnfavorable.totalWeight).toBe(expected.all_unfavorable.weight);
      expect(allUnfavorable.proportion).toBeCloseTo(
        expected.all_unfavorable.proportion,
        10
      );
    });
  });

  describe("All Respondents split (aggregated)", () => {
    let allRespondentsSplit: Split;
    let favQuestion: any;

    beforeAll(() => {
      const split = findSplit(splits, null, null);
      expect(split).toBeDefined();
      allRespondentsSplit = split!;
      favQuestion = allRespondentsSplit.responseQuestions[0];
    });

    it("should have correct total counts and weights", () => {
      expect(favQuestion.totalCount).toBe(
        expectedWave1Stats.allRespondents.favorability.totalCount
      );
      expect(favQuestion.totalWeight).toBe(
        expectedWave1Stats.allRespondents.favorability.totalWeight
      );
    });

    it("should have correct expanded group statistics", () => {
      const stronglyFav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_favorable"
      );
      const favorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "favorable"
      );
      const unfavorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "unfavorable"
      );
      const stronglyUnfav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_unfavorable"
      );

      const expected = expectedWave1Stats.allRespondents.favorability.expanded;

      expect(stronglyFav.totalCount).toBe(expected.strongly_favorable.count);
      expect(stronglyFav.totalWeight).toBe(expected.strongly_favorable.weight);
      expect(stronglyFav.proportion).toBeCloseTo(
        expected.strongly_favorable.proportion,
        10
      );

      expect(favorable.totalCount).toBe(expected.favorable.count);
      expect(favorable.totalWeight).toBe(expected.favorable.weight);
      expect(favorable.proportion).toBeCloseTo(
        expected.favorable.proportion,
        10
      );

      expect(unfavorable.totalCount).toBe(expected.unfavorable.count);
      expect(unfavorable.totalWeight).toBe(expected.unfavorable.weight);
      expect(unfavorable.proportion).toBeCloseTo(
        expected.unfavorable.proportion,
        10
      );

      expect(stronglyUnfav.totalCount).toBe(expected.strongly_unfavorable.count);
      expect(stronglyUnfav.totalWeight).toBe(
        expected.strongly_unfavorable.weight
      );
      expect(stronglyUnfav.proportion).toBeCloseTo(
        expected.strongly_unfavorable.proportion,
        10
      );
    });

    it("should have correct collapsed group statistics", () => {
      const allFavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_favorable"
      );
      const allUnfavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_unfavorable"
      );

      const expected = expectedWave1Stats.allRespondents.favorability.collapsed;

      expect(allFavorable.totalCount).toBe(expected.all_favorable.count);
      expect(allFavorable.totalWeight).toBe(expected.all_favorable.weight);
      expect(allFavorable.proportion).toBeCloseTo(
        expected.all_favorable.proportion,
        10
      );

      expect(allUnfavorable.totalCount).toBe(expected.all_unfavorable.count);
      expect(allUnfavorable.totalWeight).toBe(expected.all_unfavorable.weight);
      expect(allUnfavorable.proportion).toBeCloseTo(
        expected.all_unfavorable.proportion,
        10
      );
    });
  });
});

describe("Statistics - Two Waves (No Weight Question)", () => {
  let stats: Statistics;
  let updateResult: any;
  let splits: Split[];

  beforeAll(() => {
    const config: StatsConfig = {
      responseQuestions: [favorabilityResponseQuestion],
      groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
    };

    // Initialize with wave 1
    const wave1Respondents = flattenWaveData(wave1Data);
    stats = new Statistics(config, wave1Respondents);

    // Update with wave 2
    const wave2Respondents = flattenWaveData(wave2Data);
    updateResult = stats.updateSplits(wave2Respondents);
    splits = stats.getSplits();
  });

  describe("Update result metadata", () => {
    it("should process wave 2 respondents correctly", () => {
      // Wave 2 has 3 new respondents
      expect(updateResult.validCount).toBe(3);
      expect(updateResult.invalidCount).toBe(0);
      expect(updateResult.totalProcessed).toBe(3);
    });

    it("should produce deltas for affected splits", () => {
      // Should have deltas for the splits that changed
      expect(updateResult.deltas).toBeDefined();
      expect(Array.isArray(updateResult.deltas)).toBe(true);
      expect(updateResult.deltas.length).toBeGreaterThan(0);
    });

    it("should track cumulative respondent counts", () => {
      // Total should be wave1 + wave2 = 7 + 3 = 10
      expect(stats.getTotalRespondentsProcessed()).toBe(10);
      expect(stats.getValidRespondentsCount()).toBe(10);
      expect(stats.getInvalidRespondentsCount()).toBe(0);
    });
  });

  describe("Young Males split after wave 2", () => {
    let youngMalesSplit: Split;
    let favQuestion: any;

    beforeAll(() => {
      const split = findSplit(splits, "young", "male");
      expect(split).toBeDefined();
      youngMalesSplit = split!;
      favQuestion = youngMalesSplit.responseQuestions[0];
    });

    it("should have correct cumulative counts and weights", () => {
      // Without weight question, weight = count
      // Wave 1: 3, Wave 2: 1, Total: 4
      expect(favQuestion.totalCount).toBe(4);
      expect(favQuestion.totalWeight).toBe(4);
    });

    it("should have correct cumulative expanded group statistics", () => {
      const stronglyFav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_favorable"
      );
      const favorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "favorable"
      );
      const unfavorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "unfavorable"
      );

      // After wave 2: 2 strongly_fav, 1 fav, 1 unfav (all weight 1)
      expect(stronglyFav.totalCount).toBe(2);
      expect(stronglyFav.totalWeight).toBe(2);
      expect(stronglyFav.proportion).toBeCloseTo(2 / 4, 10);

      expect(favorable.totalCount).toBe(1);
      expect(favorable.totalWeight).toBe(1);
      expect(favorable.proportion).toBeCloseTo(1 / 4, 10);

      expect(unfavorable.totalCount).toBe(1);
      expect(unfavorable.totalWeight).toBe(1);
      expect(unfavorable.proportion).toBeCloseTo(1 / 4, 10);
    });
  });

  describe("Old Females split after wave 2", () => {
    let oldFemalesSplit: Split;
    let favQuestion: any;

    beforeAll(() => {
      const split = findSplit(splits, "old", "female");
      expect(split).toBeDefined();
      oldFemalesSplit = split!;
      favQuestion = oldFemalesSplit.responseQuestions[0];
    });

    it("should have correct cumulative counts and weights", () => {
      // Wave 1: 4, Wave 2: 2, Total: 6
      expect(favQuestion.totalCount).toBe(6);
      expect(favQuestion.totalWeight).toBe(6);
    });

    it("should have correct cumulative expanded group statistics", () => {
      const favorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "favorable"
      );
      const unfavorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "unfavorable"
      );
      const stronglyUnfav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_unfavorable"
      );

      // After wave 2: 2 fav, 3 unfav, 1 strongly_unfav (all weight 1)
      expect(favorable.totalCount).toBe(2);
      expect(favorable.totalWeight).toBe(2);
      expect(favorable.proportion).toBeCloseTo(2 / 6, 10);

      expect(unfavorable.totalCount).toBe(3);
      expect(unfavorable.totalWeight).toBe(3);
      expect(unfavorable.proportion).toBeCloseTo(3 / 6, 10);

      expect(stronglyUnfav.totalCount).toBe(1);
      expect(stronglyUnfav.totalWeight).toBe(1);
      expect(stronglyUnfav.proportion).toBeCloseTo(1 / 6, 10);
    });
  });

  describe("Delta verification", () => {
    it("should include deltas for young males split", () => {
      // Find the delta for young males split
      const youngMalesDelta = updateResult.deltas.find((delta: any) => {
        const split = splits[delta.splitIndex];
        return (
          split.groups[0].responseGroup?.label === "young" &&
          split.groups[1].responseGroup?.label === "male"
        );
      });

      expect(youngMalesDelta).toBeDefined();
      expect(youngMalesDelta.responseQuestionChanges).toBeDefined();
      expect(youngMalesDelta.responseQuestionChanges.length).toBeGreaterThan(0);
    });

    it("should include deltas for old females split", () => {
      const oldFemalesDelta = updateResult.deltas.find((delta: any) => {
        const split = splits[delta.splitIndex];
        return (
          split.groups[0].responseGroup?.label === "old" &&
          split.groups[1].responseGroup?.label === "female"
        );
      });

      expect(oldFemalesDelta).toBeDefined();
      expect(oldFemalesDelta.responseQuestionChanges).toBeDefined();
      expect(oldFemalesDelta.responseQuestionChanges.length).toBeGreaterThan(0);
    });
  });
});

describe("Statistics - Two Waves (With Weight Question)", () => {
  let stats: Statistics;
  let updateResult: any;
  let splits: Split[];

  beforeAll(() => {
    const config: StatsConfig = {
      responseQuestions: [favorabilityResponseQuestion],
      groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
    };

    // Initialize with wave 1
    const wave1Respondents = flattenWaveData(wave1Data);
    stats = new Statistics(config, wave1Respondents, weightQuestion);

    // Update with wave 2
    const wave2Respondents = flattenWaveData(wave2Data);
    updateResult = stats.updateSplits(wave2Respondents);
    splits = stats.getSplits();
  });

  describe("Update result metadata", () => {
    it("should process wave 2 respondents correctly", () => {
      expect(updateResult.validCount).toBe(3);
      expect(updateResult.invalidCount).toBe(0);
      expect(updateResult.totalProcessed).toBe(3);
    });

    it("should track cumulative respondent counts", () => {
      expect(stats.getTotalRespondentsProcessed()).toBe(10);
      expect(stats.getValidRespondentsCount()).toBe(10);
      expect(stats.getInvalidRespondentsCount()).toBe(0);
    });
  });

  describe("Young Males split after wave 2", () => {
    let youngMalesSplit: Split;
    let favQuestion: any;

    beforeAll(() => {
      const split = findSplit(splits, "young", "male");
      expect(split).toBeDefined();
      youngMalesSplit = split!;
      favQuestion = youngMalesSplit.responseQuestions[0];
    });

    it("should have correct cumulative counts and weights", () => {
      expect(favQuestion.totalCount).toBe(
        expectedWave2Stats.youngMales.favorability.totalCount
      );
      expect(favQuestion.totalWeight).toBe(
        expectedWave2Stats.youngMales.favorability.totalWeight
      );
    });

    it("should have correct cumulative expanded group statistics", () => {
      const stronglyFav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_favorable"
      );
      const favorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "favorable"
      );
      const unfavorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "unfavorable"
      );
      const stronglyUnfav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_unfavorable"
      );

      const expected = expectedWave2Stats.youngMales.favorability.expanded;

      expect(stronglyFav.totalCount).toBe(expected.strongly_favorable.count);
      expect(stronglyFav.totalWeight).toBe(expected.strongly_favorable.weight);
      expect(stronglyFav.proportion).toBeCloseTo(
        expected.strongly_favorable.proportion,
        10
      );

      expect(favorable.totalCount).toBe(expected.favorable.count);
      expect(favorable.totalWeight).toBe(expected.favorable.weight);
      expect(favorable.proportion).toBeCloseTo(
        expected.favorable.proportion,
        10
      );

      expect(unfavorable.totalCount).toBe(expected.unfavorable.count);
      expect(unfavorable.totalWeight).toBe(expected.unfavorable.weight);
      expect(unfavorable.proportion).toBeCloseTo(
        expected.unfavorable.proportion,
        10
      );

      expect(stronglyUnfav.totalCount).toBe(expected.strongly_unfavorable.count);
      expect(stronglyUnfav.totalWeight).toBe(
        expected.strongly_unfavorable.weight
      );
      expect(stronglyUnfav.proportion).toBeCloseTo(
        expected.strongly_unfavorable.proportion,
        10
      );
    });

    it("should have correct cumulative collapsed group statistics", () => {
      const allFavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_favorable"
      );
      const allUnfavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_unfavorable"
      );

      const expected = expectedWave2Stats.youngMales.favorability.collapsed;

      expect(allFavorable.totalCount).toBe(expected.all_favorable.count);
      expect(allFavorable.totalWeight).toBe(expected.all_favorable.weight);
      expect(allFavorable.proportion).toBeCloseTo(
        expected.all_favorable.proportion,
        10
      );

      expect(allUnfavorable.totalCount).toBe(expected.all_unfavorable.count);
      expect(allUnfavorable.totalWeight).toBe(expected.all_unfavorable.weight);
      expect(allUnfavorable.proportion).toBeCloseTo(
        expected.all_unfavorable.proportion,
        10
      );
    });
  });

  describe("Old Females split after wave 2", () => {
    let oldFemalesSplit: Split;
    let favQuestion: any;

    beforeAll(() => {
      const split = findSplit(splits, "old", "female");
      expect(split).toBeDefined();
      oldFemalesSplit = split!;
      favQuestion = oldFemalesSplit.responseQuestions[0];
    });

    it("should have correct cumulative counts and weights", () => {
      expect(favQuestion.totalCount).toBe(
        expectedWave2Stats.oldFemales.favorability.totalCount
      );
      expect(favQuestion.totalWeight).toBe(
        expectedWave2Stats.oldFemales.favorability.totalWeight
      );
    });

    it("should have correct cumulative expanded group statistics", () => {
      const stronglyFav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_favorable"
      );
      const favorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "favorable"
      );
      const unfavorable = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "unfavorable"
      );
      const stronglyUnfav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_unfavorable"
      );

      const expected = expectedWave2Stats.oldFemales.favorability.expanded;

      expect(stronglyFav.totalCount).toBe(expected.strongly_favorable.count);
      expect(stronglyFav.totalWeight).toBe(expected.strongly_favorable.weight);
      expect(stronglyFav.proportion).toBeCloseTo(
        expected.strongly_favorable.proportion,
        10
      );

      expect(favorable.totalCount).toBe(expected.favorable.count);
      expect(favorable.totalWeight).toBe(expected.favorable.weight);
      expect(favorable.proportion).toBeCloseTo(
        expected.favorable.proportion,
        10
      );

      expect(unfavorable.totalCount).toBe(expected.unfavorable.count);
      expect(unfavorable.totalWeight).toBe(expected.unfavorable.weight);
      expect(unfavorable.proportion).toBeCloseTo(
        expected.unfavorable.proportion,
        10
      );

      expect(stronglyUnfav.totalCount).toBe(expected.strongly_unfavorable.count);
      expect(stronglyUnfav.totalWeight).toBe(
        expected.strongly_unfavorable.weight
      );
      expect(stronglyUnfav.proportion).toBeCloseTo(
        expected.strongly_unfavorable.proportion,
        10
      );
    });

    it("should have correct cumulative collapsed group statistics", () => {
      const allFavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_favorable"
      );
      const allUnfavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_unfavorable"
      );

      const expected = expectedWave2Stats.oldFemales.favorability.collapsed;

      expect(allFavorable.totalCount).toBe(expected.all_favorable.count);
      expect(allFavorable.totalWeight).toBe(expected.all_favorable.weight);
      expect(allFavorable.proportion).toBeCloseTo(
        expected.all_favorable.proportion,
        10
      );

      expect(allUnfavorable.totalCount).toBe(expected.all_unfavorable.count);
      expect(allUnfavorable.totalWeight).toBe(expected.all_unfavorable.weight);
      expect(allUnfavorable.proportion).toBeCloseTo(
        expected.all_unfavorable.proportion,
        10
      );
    });
  });

  describe("All Respondents split after wave 2", () => {
    let allRespondentsSplit: Split;
    let favQuestion: any;

    beforeAll(() => {
      const split = findSplit(splits, null, null);
      expect(split).toBeDefined();
      allRespondentsSplit = split!;
      favQuestion = allRespondentsSplit.responseQuestions[0];
    });

    it("should have correct cumulative counts and weights", () => {
      expect(favQuestion.totalCount).toBe(
        expectedWave2Stats.allRespondents.favorability.totalCount
      );
      expect(favQuestion.totalWeight).toBe(
        expectedWave2Stats.allRespondents.favorability.totalWeight
      );
    });

    it("should have correct cumulative statistics", () => {
      const expected = expectedWave2Stats.allRespondents.favorability;

      const stronglyFav = favQuestion.responseGroups.expanded.find(
        (g: any) => g.label === "strongly_favorable"
      );
      expect(stronglyFav.totalCount).toBe(
        expected.expanded.strongly_favorable.count
      );
      expect(stronglyFav.totalWeight).toBe(
        expected.expanded.strongly_favorable.weight
      );
      expect(stronglyFav.proportion).toBeCloseTo(
        expected.expanded.strongly_favorable.proportion,
        10
      );

      const allFavorable = favQuestion.responseGroups.collapsed.find(
        (g: any) => g.label === "all_favorable"
      );
      expect(allFavorable.totalCount).toBe(expected.collapsed.all_favorable.count);
      expect(allFavorable.totalWeight).toBe(
        expected.collapsed.all_favorable.weight
      );
      expect(allFavorable.proportion).toBeCloseTo(
        expected.collapsed.all_favorable.proportion,
        10
      );
    });
  });

  describe("Delta verification with weights", () => {
    it("should produce deltas with correct before/after values for young males", () => {
      const youngMalesDelta = updateResult.deltas.find((delta: any) => {
        const split = splits[delta.splitIndex];
        return (
          split.groups[0].responseGroup?.label === "young" &&
          split.groups[1].responseGroup?.label === "male"
        );
      });

      expect(youngMalesDelta).toBeDefined();

      const favQuestionChange = youngMalesDelta.responseQuestionChanges[0];
      const expectedDeltas = expectedWave2Deltas.youngMales.favorability;

      // Check total weight deltas
      expect(favQuestionChange.totalWeightBefore).toBe(
        expectedDeltas.totalWeightBefore
      );
      expect(favQuestionChange.totalWeightAfter).toBe(
        expectedDeltas.totalWeightAfter
      );
      expect(favQuestionChange.totalCountBefore).toBe(
        expectedDeltas.totalCountBefore
      );
      expect(favQuestionChange.totalCountAfter).toBe(
        expectedDeltas.totalCountAfter
      );

      // Check that expanded group changes exist
      expect(favQuestionChange.expandedGroupChanges).toBeDefined();
      expect(favQuestionChange.expandedGroupChanges.length).toBeGreaterThan(0);

      // Verify strongly_favorable delta
      const stronglyFavDelta = favQuestionChange.expandedGroupChanges.find(
        (gc: any) => gc.responseGroupLabel === "strongly_favorable"
      );
      expect(stronglyFavDelta).toBeDefined();
      expect(stronglyFavDelta.weightBefore).toBe(
        expectedDeltas.expanded.strongly_favorable.weightBefore
      );
      expect(stronglyFavDelta.weightAfter).toBe(
        expectedDeltas.expanded.strongly_favorable.weightAfter
      );
      expect(stronglyFavDelta.proportionBefore).toBeCloseTo(
        expectedDeltas.expanded.strongly_favorable.proportionBefore,
        10
      );
      expect(stronglyFavDelta.proportionAfter).toBeCloseTo(
        expectedDeltas.expanded.strongly_favorable.proportionAfter,
        10
      );
    });

    it("should produce deltas with correct before/after values for old females", () => {
      const oldFemalesDelta = updateResult.deltas.find((delta: any) => {
        const split = splits[delta.splitIndex];
        return (
          split.groups[0].responseGroup?.label === "old" &&
          split.groups[1].responseGroup?.label === "female"
        );
      });

      expect(oldFemalesDelta).toBeDefined();

      const favQuestionChange = oldFemalesDelta.responseQuestionChanges[0];
      const expectedDeltas = expectedWave2Deltas.oldFemales.favorability;

      expect(favQuestionChange.totalWeightBefore).toBe(
        expectedDeltas.totalWeightBefore
      );
      expect(favQuestionChange.totalWeightAfter).toBe(
        expectedDeltas.totalWeightAfter
      );

      // Verify collapsed group deltas
      expect(favQuestionChange.collapsedGroupChanges).toBeDefined();

      const allFavDelta = favQuestionChange.collapsedGroupChanges.find(
        (gc: any) => gc.responseGroupLabel === "all_favorable"
      );
      expect(allFavDelta).toBeDefined();
      expect(allFavDelta.weightBefore).toBe(
        expectedDeltas.collapsed.all_favorable.weightBefore
      );
      expect(allFavDelta.weightAfter).toBe(
        expectedDeltas.collapsed.all_favorable.weightAfter
      );
      expect(allFavDelta.proportionBefore).toBeCloseTo(
        expectedDeltas.collapsed.all_favorable.proportionBefore,
        10
      );
      expect(allFavDelta.proportionAfter).toBeCloseTo(
        expectedDeltas.collapsed.all_favorable.proportionAfter,
        10
      );
    });
  });
});
