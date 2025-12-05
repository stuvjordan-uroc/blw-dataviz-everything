/**
 * Tests for Statistics class update functionality.
 *
 * Prerequisites:
 * - statistics.test.ts must pass (validates initial Statistics functionality)
 *
 * The Statistics class is designed to operate independently of any visualization
 * layer. This test suite validates that Statistics correctly computes update deltas
 * when new data is ingested via updateSplits().
 *
 * SCOPE: This suite tests ONLY the delta computation logic, not the final statistics
 * themselves (which are already validated in statistics.test.ts).
 *
 * Test data (from test-data.ts):
 * - Wave 1: 7 respondents across 2 fully-specified populated splits
 *   - youngMales: 3 respondents (ids 1-3)
 *   - oldFemales: 4 respondents (ids 4-7)
 * - Wave 2: Adds 3 more respondents (ids 8-10) to EXISTING splits
 *   - youngMales: +1 respondent (id 8)
 *   - oldFemales: +2 respondents (ids 9-10)
 * - Wave 3: Adds 4 respondents (ids 11-14) to NEWLY POPULATED splits
 *   - oldMales: +2 respondents (ids 11-12) - was unpopulated
 *   - youngFemales: +2 respondents (ids 13-14) - was unpopulated
 *
 * Expected behavior after Wave 1 + Wave 2 + Wave 3:
 * - Newly populated splits (oldMales, youngFemales) should have deltas with before=0
 * - Already populated splits (youngMales, oldFemales) should NOT have deltas (unchanged)
 * - Aggregated splits (e.g., allRespondents) should have deltas
 *
 * Test organization:
 * - Two describe blocks: Unweighted and Weighted
 * - Each tests the same delta logic with different expected values
 */

import { Statistics, type StatsConfig, type StatisticsUpdateResult } from "../src/statistics";
import type { Split } from "../src/types";
import {
  ageGroupingQuestion,
  genderGroupingQuestion,
  favorabilityResponseQuestion,
  weightQuestion,
  wave1Data,
  wave2Data,
  wave3Data,
  expectedWave3Deltas,
} from "./fixtures/test-data";
import { flattenWaveData, combineWaves } from "./fixtures/helpers";
import { getQuestionKey } from "../src/utils";

/**
 * Shared configuration and setup for all tests
 */
describe("Statistics - Data Updates", () => {
  // Prepare wave data
  const wave1Respondents = flattenWaveData(wave1Data);
  const wave2Respondents = flattenWaveData(wave2Data);
  const wave3Respondents = flattenWaveData(wave3Data);

  // Wave 1+2 combined (state before Wave 3 update)
  const wave1And2Combined = combineWaves(wave1Data, wave2Data);

  // Statistics configuration
  const statsConfig: StatsConfig = {
    responseQuestions: [favorabilityResponseQuestion],
    groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
  };

  /**
   * ========================================================================
   * UNWEIGHTED UPDATES
   * ========================================================================
   * 
   * Tests delta computation without weighting.
   * All respondents have equal weight (implicitly 1).
   */
  describe("Unweighted Updates", () => {
    let stats: Statistics;
    let updateResult: StatisticsUpdateResult;
    let splitsAfterUpdate: Split[];

    beforeAll(() => {
      // Create Statistics instance with Wave 1+2 combined data (no weight question)
      stats = new Statistics(statsConfig, wave1And2Combined);

      // Update with Wave 3 data (newly populated splits)
      updateResult = stats.updateSplits(wave3Respondents);
      splitsAfterUpdate = stats.getSplits();
    });

    describe("Update Result Structure", () => {
      it("should return StatisticsUpdateResult with deltas array", () => {
        expect(updateResult).toBeDefined();
        expect(updateResult.deltas).toBeDefined();
        expect(Array.isArray(updateResult.deltas)).toBe(true);
      });

      it("should have correct processing counts", () => {
        // Wave 3 has 4 respondents
        expect(updateResult.totalProcessed).toBe(4);
        expect(updateResult.validCount).toBe(4);
        expect(updateResult.invalidCount).toBe(0);
      });
    });

    describe("Deltas Array - Changed vs Unchanged Splits", () => {
      it("should include deltas for newly populated splits (oldMales, youngFemales)", () => {
        // Find oldMales split (age=2, gender=1)
        const oldMalesSplitIndex = splitsAfterUpdate.findIndex(split =>
          split.groups.length === 2 &&
          split.groups[0].responseGroup?.label === 'old' &&
          split.groups[1].responseGroup?.label === 'male'
        );
        expect(oldMalesSplitIndex).toBeGreaterThanOrEqual(0);

        // Find youngFemales split (age=1, gender=2)
        const youngFemalesSplitIndex = splitsAfterUpdate.findIndex(split =>
          split.groups.length === 2 &&
          split.groups[0].responseGroup?.label === 'young' &&
          split.groups[1].responseGroup?.label === 'female'
        );
        expect(youngFemalesSplitIndex).toBeGreaterThanOrEqual(0);

        // Verify both appear in deltas
        const deltaIndices = updateResult.deltas.map(d => d.splitIndex);
        expect(deltaIndices).toContain(oldMalesSplitIndex);
        expect(deltaIndices).toContain(youngFemalesSplitIndex);
      });

      it("should include deltas for aggregated split (allRespondents)", () => {
        // Find allRespondents split (age=null, gender=null)
        const allRespondentsSplitIndex = splitsAfterUpdate.findIndex(split =>
          split.groups.length === 2 &&
          split.groups[0].responseGroup === null &&
          split.groups[1].responseGroup === null
        );
        expect(allRespondentsSplitIndex).toBeGreaterThanOrEqual(0);

        // Verify it appears in deltas
        const deltaIndices = updateResult.deltas.map(d => d.splitIndex);
        expect(deltaIndices).toContain(allRespondentsSplitIndex);
      });

      it("should NOT include deltas for unchanged splits (youngMales, oldFemales)", () => {
        // Find youngMales split (age=1, gender=1)
        const youngMalesSplitIndex = splitsAfterUpdate.findIndex(split =>
          split.groups.length === 2 &&
          split.groups[0].responseGroup?.label === 'young' &&
          split.groups[1].responseGroup?.label === 'male'
        );
        expect(youngMalesSplitIndex).toBeGreaterThanOrEqual(0);

        // Find oldFemales split (age=2, gender=2)
        const oldFemalesSplitIndex = splitsAfterUpdate.findIndex(split =>
          split.groups.length === 2 &&
          split.groups[0].responseGroup?.label === 'old' &&
          split.groups[1].responseGroup?.label === 'female'
        );
        expect(oldFemalesSplitIndex).toBeGreaterThanOrEqual(0);

        // Verify neither appears in deltas (no new data for these splits in Wave 3)
        const deltaIndices = updateResult.deltas.map(d => d.splitIndex);
        expect(deltaIndices).not.toContain(youngMalesSplitIndex);
        expect(deltaIndices).not.toContain(oldFemalesSplitIndex);
      });

      it("should have multiple deltas including aggregated splits", () => {
        // TODO: Implement
        // Note: More than just oldMales, youngFemales, allRespondents
        // Partial aggregations also change (e.g., age=null+gender=male)
        // Will verify exact deltas when implementing
        expect(updateResult.deltas.length).toBeGreaterThan(0);
      });
    });

    describe("Delta Values for Newly Populated Splits", () => {
      describe("oldMales split delta", () => {
        it("should have correct before/after totals in delta", () => {
          // Find oldMales split
          const oldMalesSplitIndex = splitsAfterUpdate.findIndex(split =>
            split.groups.length === 2 &&
            split.groups[0].responseGroup?.label === 'old' &&
            split.groups[1].responseGroup?.label === 'male'
          );

          // Find the delta for this split
          const delta = updateResult.deltas.find(d => d.splitIndex === oldMalesSplitIndex);
          expect(delta).toBeDefined();

          // Check favorability question changes
          const favChange = delta!.responseQuestionChanges.find(rqc =>
            rqc.responseQuestionKey === getQuestionKey(favorabilityResponseQuestion)
          );
          expect(favChange).toBeDefined();

          // Verify before/after totals (unweighted: weight = count)
          expect(favChange!.totalCountBefore).toBe(0);
          expect(favChange!.totalCountAfter).toBe(2);
          expect(favChange!.totalWeightBefore).toBe(0);
          expect(favChange!.totalWeightAfter).toBe(2);
        });

        it("should have correct expanded group deltas", () => {
          // Find oldMales split delta
          const oldMalesSplitIndex = splitsAfterUpdate.findIndex(split =>
            split.groups.length === 2 &&
            split.groups[0].responseGroup?.label === 'old' &&
            split.groups[1].responseGroup?.label === 'male'
          );
          const delta = updateResult.deltas.find(d => d.splitIndex === oldMalesSplitIndex);
          const favChange = delta!.responseQuestionChanges[0];

          // Get expanded group changes
          const expandedChanges = favChange.expandedGroupChanges;

          // Find specific group changes
          const stronglyFav = expandedChanges.find(g => g.responseGroupLabel === 'strongly_favorable');
          const unfavorable = expandedChanges.find(g => g.responseGroupLabel === 'unfavorable');

          // Verify strongly_favorable (1 respondent with value 1)
          expect(stronglyFav).toBeDefined();
          expect(stronglyFav!.countBefore).toBe(0);
          expect(stronglyFav!.countAfter).toBe(1);
          expect(stronglyFav!.weightBefore).toBe(0);
          expect(stronglyFav!.weightAfter).toBe(1);
          expect(stronglyFav!.proportionBefore).toBe(0);
          expect(stronglyFav!.proportionAfter).toBe(1 / 2);

          // Verify unfavorable (1 respondent with value 3)
          expect(unfavorable).toBeDefined();
          expect(unfavorable!.countBefore).toBe(0);
          expect(unfavorable!.countAfter).toBe(1);
          expect(unfavorable!.weightBefore).toBe(0);
          expect(unfavorable!.weightAfter).toBe(1);
          expect(unfavorable!.proportionBefore).toBe(0);
          expect(unfavorable!.proportionAfter).toBe(1 / 2);
        });

        it("should have correct collapsed group deltas", () => {
          // Find oldMales split delta
          const oldMalesSplitIndex = splitsAfterUpdate.findIndex(split =>
            split.groups.length === 2 &&
            split.groups[0].responseGroup?.label === 'old' &&
            split.groups[1].responseGroup?.label === 'male'
          );
          const delta = updateResult.deltas.find(d => d.splitIndex === oldMalesSplitIndex);
          const favChange = delta!.responseQuestionChanges[0];

          // Get collapsed group changes
          const collapsedChanges = favChange.collapsedGroupChanges;

          // Find specific group changes
          const allFav = collapsedChanges.find(g => g.responseGroupLabel === 'all_favorable');
          const allUnfav = collapsedChanges.find(g => g.responseGroupLabel === 'all_unfavorable');

          // Verify all_favorable (1 respondent: strongly_favorable)
          expect(allFav).toBeDefined();
          expect(allFav!.countBefore).toBe(0);
          expect(allFav!.countAfter).toBe(1);
          expect(allFav!.weightBefore).toBe(0);
          expect(allFav!.weightAfter).toBe(1);
          expect(allFav!.proportionBefore).toBe(0);
          expect(allFav!.proportionAfter).toBe(1 / 2);

          // Verify all_unfavorable (1 respondent: unfavorable)
          expect(allUnfav).toBeDefined();
          expect(allUnfav!.countBefore).toBe(0);
          expect(allUnfav!.countAfter).toBe(1);
          expect(allUnfav!.weightBefore).toBe(0);
          expect(allUnfav!.weightAfter).toBe(1);
          expect(allUnfav!.proportionBefore).toBe(0);
          expect(allUnfav!.proportionAfter).toBe(1 / 2);
        });
      });

      describe("youngFemales split delta", () => {
        it("should have correct before/after totals in delta", () => {
          // Find youngFemales split
          const youngFemalesSplitIndex = splitsAfterUpdate.findIndex(split =>
            split.groups.length === 2 &&
            split.groups[0].responseGroup?.label === 'young' &&
            split.groups[1].responseGroup?.label === 'female'
          );

          // Find the delta for this split
          const delta = updateResult.deltas.find(d => d.splitIndex === youngFemalesSplitIndex);
          expect(delta).toBeDefined();

          // Check favorability question changes
          const favChange = delta!.responseQuestionChanges.find(rqc =>
            rqc.responseQuestionKey === getQuestionKey(favorabilityResponseQuestion)
          );
          expect(favChange).toBeDefined();

          // Verify before/after totals (unweighted: weight = count)
          expect(favChange!.totalCountBefore).toBe(0);
          expect(favChange!.totalCountAfter).toBe(2);
          expect(favChange!.totalWeightBefore).toBe(0);
          expect(favChange!.totalWeightAfter).toBe(2);
        });

        it("should have correct expanded group deltas", () => {
          // Find youngFemales split delta
          const youngFemalesSplitIndex = splitsAfterUpdate.findIndex(split =>
            split.groups.length === 2 &&
            split.groups[0].responseGroup?.label === 'young' &&
            split.groups[1].responseGroup?.label === 'female'
          );
          const delta = updateResult.deltas.find(d => d.splitIndex === youngFemalesSplitIndex);
          const favChange = delta!.responseQuestionChanges[0];

          // Get expanded group changes
          const expandedChanges = favChange.expandedGroupChanges;

          // Find specific group changes
          const favorable = expandedChanges.find(g => g.responseGroupLabel === 'favorable');
          const stronglyUnfav = expandedChanges.find(g => g.responseGroupLabel === 'strongly_unfavorable');

          // Verify favorable (1 respondent with value 2)
          expect(favorable).toBeDefined();
          expect(favorable!.countBefore).toBe(0);
          expect(favorable!.countAfter).toBe(1);
          expect(favorable!.weightBefore).toBe(0);
          expect(favorable!.weightAfter).toBe(1);
          expect(favorable!.proportionBefore).toBe(0);
          expect(favorable!.proportionAfter).toBe(1 / 2);

          // Verify strongly_unfavorable (1 respondent with value 4)
          expect(stronglyUnfav).toBeDefined();
          expect(stronglyUnfav!.countBefore).toBe(0);
          expect(stronglyUnfav!.countAfter).toBe(1);
          expect(stronglyUnfav!.weightBefore).toBe(0);
          expect(stronglyUnfav!.weightAfter).toBe(1);
          expect(stronglyUnfav!.proportionBefore).toBe(0);
          expect(stronglyUnfav!.proportionAfter).toBe(1 / 2);
        });

        it("should have correct collapsed group deltas", () => {
          // Find youngFemales split delta
          const youngFemalesSplitIndex = splitsAfterUpdate.findIndex(split =>
            split.groups.length === 2 &&
            split.groups[0].responseGroup?.label === 'young' &&
            split.groups[1].responseGroup?.label === 'female'
          );
          const delta = updateResult.deltas.find(d => d.splitIndex === youngFemalesSplitIndex);
          const favChange = delta!.responseQuestionChanges[0];

          // Get collapsed group changes
          const collapsedChanges = favChange.collapsedGroupChanges;

          // Find specific group changes
          const allFav = collapsedChanges.find(g => g.responseGroupLabel === 'all_favorable');
          const allUnfav = collapsedChanges.find(g => g.responseGroupLabel === 'all_unfavorable');

          // Verify all_favorable (1 respondent: favorable)
          expect(allFav).toBeDefined();
          expect(allFav!.countBefore).toBe(0);
          expect(allFav!.countAfter).toBe(1);
          expect(allFav!.weightBefore).toBe(0);
          expect(allFav!.weightAfter).toBe(1);
          expect(allFav!.proportionBefore).toBe(0);
          expect(allFav!.proportionAfter).toBe(1 / 2);

          // Verify all_unfavorable (1 respondent: strongly_unfavorable)
          expect(allUnfav).toBeDefined();
          expect(allUnfav!.countBefore).toBe(0);
          expect(allUnfav!.countAfter).toBe(1);
          expect(allUnfav!.weightBefore).toBe(0);
          expect(allUnfav!.weightAfter).toBe(1);
          expect(allUnfav!.proportionBefore).toBe(0);
          expect(allUnfav!.proportionAfter).toBe(1 / 2);
        });
      });
    });

    describe("Delta Values for Aggregated Split", () => {
      it("should have delta for allRespondents split", () => {
        // TODO: Implement
        // Find allRespondents split (age=null, gender=null) in deltas
        // Verify it exists in deltas array
      });

      it("should have correct before/after totals in delta", () => {
        // TODO: Implement
        // totalCountBefore: 10 (from Waves 1+2)
        // totalCountAfter: 14 (after Wave 3)
        // totalWeightBefore: 10 (unweighted)
        // totalWeightAfter: 14 (unweighted)
      });

      it("should have correct aggregated expanded group deltas", () => {
        // TODO: Implement
        // Verify a few expanded groups changed correctly
        // E.g., strongly_favorable, favorable (sample, not all required)
      });

      it("should have correct aggregated collapsed group deltas", () => {
        // TODO: Implement
        // all_favorable: before and after values
        // all_unfavorable: before and after values
      });
    });
  });

  /**
   * ========================================================================
   * WEIGHTED UPDATES
   * ========================================================================
   * 
   * Tests delta computation WITH weighting.
   * Uses weightQuestion to weight respondents differently.
   * 
   * Expected weighted values are documented in test-data.ts:
   * - Wave 1 youngMales: totalWeight=5 (not 3)
   * - Wave 2 adds weight=3, making totalWeight=8 (not 4)
   */
  describe("Weighted Updates", () => {
    let stats: Statistics;
    let updateResult: StatisticsUpdateResult;
    let splitsAfterUpdate: Split[];

    beforeAll(() => {
      // Create Statistics instance with Wave 1+2 combined data AND weight question
      stats = new Statistics(statsConfig, wave1And2Combined, weightQuestion);

      // Update with Wave 3 data (newly populated splits)
      updateResult = stats.updateSplits(wave3Respondents);
      splitsAfterUpdate = stats.getSplits();
    });

    describe("Update Result Structure", () => {
      it("should return StatisticsUpdateResult with deltas array", () => {
        // TODO: Implement
        expect(updateResult).toBeDefined();
        expect(updateResult.deltas).toBeDefined();
        expect(Array.isArray(updateResult.deltas)).toBe(true);
      });

      it("should have correct processing counts", () => {
        // TODO: Implement
        // Wave 3 has 4 respondents
        expect(updateResult.totalProcessed).toBe(4);
        expect(updateResult.validCount).toBe(4);
        expect(updateResult.invalidCount).toBe(0);
      });
    });

    describe("Deltas Array - Changed vs Unchanged Splits", () => {
      it("should include deltas for newly populated splits (oldMales, youngFemales)", () => {
        // Find oldMales split (age=2, gender=1)
        const oldMalesSplitIndex = splitsAfterUpdate.findIndex(split =>
          split.groups.length === 2 &&
          split.groups[0].responseGroup?.label === 'old' &&
          split.groups[1].responseGroup?.label === 'male'
        );
        expect(oldMalesSplitIndex).toBeGreaterThanOrEqual(0);

        // Find youngFemales split (age=1, gender=2)
        const youngFemalesSplitIndex = splitsAfterUpdate.findIndex(split =>
          split.groups.length === 2 &&
          split.groups[0].responseGroup?.label === 'young' &&
          split.groups[1].responseGroup?.label === 'female'
        );
        expect(youngFemalesSplitIndex).toBeGreaterThanOrEqual(0);

        // Verify both appear in deltas
        const deltaIndices = updateResult.deltas.map(d => d.splitIndex);
        expect(deltaIndices).toContain(oldMalesSplitIndex);
        expect(deltaIndices).toContain(youngFemalesSplitIndex);
      });

      it("should include deltas for aggregated split (allRespondents)", () => {
        // Find allRespondents split (age=null, gender=null)
        const allRespondentsSplitIndex = splitsAfterUpdate.findIndex(split =>
          split.groups.length === 2 &&
          split.groups[0].responseGroup === null &&
          split.groups[1].responseGroup === null
        );
        expect(allRespondentsSplitIndex).toBeGreaterThanOrEqual(0);

        // Verify it appears in deltas
        const deltaIndices = updateResult.deltas.map(d => d.splitIndex);
        expect(deltaIndices).toContain(allRespondentsSplitIndex);
      });

      it("should NOT include deltas for unchanged splits (youngMales, oldFemales)", () => {
        // Find youngMales split (age=1, gender=1)
        const youngMalesSplitIndex = splitsAfterUpdate.findIndex(split =>
          split.groups.length === 2 &&
          split.groups[0].responseGroup?.label === 'young' &&
          split.groups[1].responseGroup?.label === 'male'
        );
        expect(youngMalesSplitIndex).toBeGreaterThanOrEqual(0);

        // Find oldFemales split (age=2, gender=2)
        const oldFemalesSplitIndex = splitsAfterUpdate.findIndex(split =>
          split.groups.length === 2 &&
          split.groups[0].responseGroup?.label === 'old' &&
          split.groups[1].responseGroup?.label === 'female'
        );
        expect(oldFemalesSplitIndex).toBeGreaterThanOrEqual(0);

        // Verify neither appears in deltas (no new data for these splits in Wave 3)
        const deltaIndices = updateResult.deltas.map(d => d.splitIndex);
        expect(deltaIndices).not.toContain(youngMalesSplitIndex);
        expect(deltaIndices).not.toContain(oldFemalesSplitIndex);
      });

      it("should have multiple deltas including aggregated splits", () => {
        // TODO: Implement
        // Note: More than just oldMales, youngFemales, allRespondents
        // Partial aggregations also change
        expect(updateResult.deltas.length).toBeGreaterThan(0);
      });
    });

    describe("Delta Values for Newly Populated Splits", () => {
      describe("oldMales split delta", () => {
        it("should have correct before/after totals in delta", () => {
          // Find oldMales split
          const oldMalesSplitIndex = splitsAfterUpdate.findIndex(split =>
            split.groups.length === 2 &&
            split.groups[0].responseGroup?.label === 'old' &&
            split.groups[1].responseGroup?.label === 'male'
          );

          // Find the delta for this split
          const delta = updateResult.deltas.find(d => d.splitIndex === oldMalesSplitIndex);
          expect(delta).toBeDefined();

          // Check favorability question changes
          const favChange = delta!.responseQuestionChanges.find(rqc =>
            rqc.responseQuestionKey === getQuestionKey(favorabilityResponseQuestion)
          );
          expect(favChange).toBeDefined();

          // Verify before/after totals (weighted: id 11 weight=2, id 12 weight=1)
          expect(favChange!.totalCountBefore).toBe(0);
          expect(favChange!.totalCountAfter).toBe(2);
          expect(favChange!.totalWeightBefore).toBe(0);
          expect(favChange!.totalWeightAfter).toBe(3);
        });

        it("should have correct expanded group deltas", () => {
          // Find oldMales split delta
          const oldMalesSplitIndex = splitsAfterUpdate.findIndex(split =>
            split.groups.length === 2 &&
            split.groups[0].responseGroup?.label === 'old' &&
            split.groups[1].responseGroup?.label === 'male'
          );
          const delta = updateResult.deltas.find(d => d.splitIndex === oldMalesSplitIndex);
          const favChange = delta!.responseQuestionChanges[0];

          // Get expanded group changes
          const expandedChanges = favChange.expandedGroupChanges;

          // Find specific group changes
          const stronglyFav = expandedChanges.find(g => g.responseGroupLabel === 'strongly_favorable');
          const unfavorable = expandedChanges.find(g => g.responseGroupLabel === 'unfavorable');

          // Verify strongly_favorable (id 11: value=1, weight=2)
          expect(stronglyFav).toBeDefined();
          expect(stronglyFav!.countBefore).toBe(0);
          expect(stronglyFav!.countAfter).toBe(1);
          expect(stronglyFav!.weightBefore).toBe(0);
          expect(stronglyFav!.weightAfter).toBe(2);
          expect(stronglyFav!.proportionBefore).toBe(0);
          expect(stronglyFav!.proportionAfter).toBe(2 / 3);

          // Verify unfavorable (id 12: value=3, weight=1)
          expect(unfavorable).toBeDefined();
          expect(unfavorable!.countBefore).toBe(0);
          expect(unfavorable!.countAfter).toBe(1);
          expect(unfavorable!.weightBefore).toBe(0);
          expect(unfavorable!.weightAfter).toBe(1);
          expect(unfavorable!.proportionBefore).toBe(0);
          expect(unfavorable!.proportionAfter).toBe(1 / 3);
        });

        it("should have correct collapsed group deltas", () => {
          // Find oldMales split delta
          const oldMalesSplitIndex = splitsAfterUpdate.findIndex(split =>
            split.groups.length === 2 &&
            split.groups[0].responseGroup?.label === 'old' &&
            split.groups[1].responseGroup?.label === 'male'
          );
          const delta = updateResult.deltas.find(d => d.splitIndex === oldMalesSplitIndex);
          const favChange = delta!.responseQuestionChanges[0];

          // Get collapsed group changes
          const collapsedChanges = favChange.collapsedGroupChanges;

          // Find specific group changes
          const allFav = collapsedChanges.find(g => g.responseGroupLabel === 'all_favorable');
          const allUnfav = collapsedChanges.find(g => g.responseGroupLabel === 'all_unfavorable');

          // Verify all_favorable (strongly_favorable: weight=2)
          expect(allFav).toBeDefined();
          expect(allFav!.countBefore).toBe(0);
          expect(allFav!.countAfter).toBe(1);
          expect(allFav!.weightBefore).toBe(0);
          expect(allFav!.weightAfter).toBe(2);
          expect(allFav!.proportionBefore).toBe(0);
          expect(allFav!.proportionAfter).toBe(2 / 3);

          // Verify all_unfavorable (unfavorable: weight=1)
          expect(allUnfav).toBeDefined();
          expect(allUnfav!.countBefore).toBe(0);
          expect(allUnfav!.countAfter).toBe(1);
          expect(allUnfav!.weightBefore).toBe(0);
          expect(allUnfav!.weightAfter).toBe(1);
          expect(allUnfav!.proportionBefore).toBe(0);
          expect(allUnfav!.proportionAfter).toBe(1 / 3);
        });
      });

      describe("youngFemales split delta", () => {
        it("should have correct before/after totals in delta", () => {
          // Find youngFemales split
          const youngFemalesSplitIndex = splitsAfterUpdate.findIndex(split =>
            split.groups.length === 2 &&
            split.groups[0].responseGroup?.label === 'young' &&
            split.groups[1].responseGroup?.label === 'female'
          );

          // Find the delta for this split
          const delta = updateResult.deltas.find(d => d.splitIndex === youngFemalesSplitIndex);
          expect(delta).toBeDefined();

          // Check favorability question changes
          const favChange = delta!.responseQuestionChanges.find(rqc =>
            rqc.responseQuestionKey === getQuestionKey(favorabilityResponseQuestion)
          );
          expect(favChange).toBeDefined();

          // Verify before/after totals (weighted: id 13 weight=1, id 14 weight=3)
          expect(favChange!.totalCountBefore).toBe(0);
          expect(favChange!.totalCountAfter).toBe(2);
          expect(favChange!.totalWeightBefore).toBe(0);
          expect(favChange!.totalWeightAfter).toBe(4);
        });

        it("should have correct expanded group deltas", () => {
          // Find youngFemales split delta
          const youngFemalesSplitIndex = splitsAfterUpdate.findIndex(split =>
            split.groups.length === 2 &&
            split.groups[0].responseGroup?.label === 'young' &&
            split.groups[1].responseGroup?.label === 'female'
          );
          const delta = updateResult.deltas.find(d => d.splitIndex === youngFemalesSplitIndex);
          const favChange = delta!.responseQuestionChanges[0];

          // Get expanded group changes
          const expandedChanges = favChange.expandedGroupChanges;

          // Find specific group changes
          const favorable = expandedChanges.find(g => g.responseGroupLabel === 'favorable');
          const stronglyUnfav = expandedChanges.find(g => g.responseGroupLabel === 'strongly_unfavorable');

          // Verify favorable (id 13: value=2, weight=1)
          expect(favorable).toBeDefined();
          expect(favorable!.countBefore).toBe(0);
          expect(favorable!.countAfter).toBe(1);
          expect(favorable!.weightBefore).toBe(0);
          expect(favorable!.weightAfter).toBe(1);
          expect(favorable!.proportionBefore).toBe(0);
          expect(favorable!.proportionAfter).toBe(1 / 4);

          // Verify strongly_unfavorable (id 14: value=4, weight=3)
          expect(stronglyUnfav).toBeDefined();
          expect(stronglyUnfav!.countBefore).toBe(0);
          expect(stronglyUnfav!.countAfter).toBe(1);
          expect(stronglyUnfav!.weightBefore).toBe(0);
          expect(stronglyUnfav!.weightAfter).toBe(3);
          expect(stronglyUnfav!.proportionBefore).toBe(0);
          expect(stronglyUnfav!.proportionAfter).toBe(3 / 4);
        });

        it("should have correct collapsed group deltas", () => {
          // Find youngFemales split delta
          const youngFemalesSplitIndex = splitsAfterUpdate.findIndex(split =>
            split.groups.length === 2 &&
            split.groups[0].responseGroup?.label === 'young' &&
            split.groups[1].responseGroup?.label === 'female'
          );
          const delta = updateResult.deltas.find(d => d.splitIndex === youngFemalesSplitIndex);
          const favChange = delta!.responseQuestionChanges[0];

          // Get collapsed group changes
          const collapsedChanges = favChange.collapsedGroupChanges;

          // Find specific group changes
          const allFav = collapsedChanges.find(g => g.responseGroupLabel === 'all_favorable');
          const allUnfav = collapsedChanges.find(g => g.responseGroupLabel === 'all_unfavorable');

          // Verify all_favorable (favorable: weight=1)
          expect(allFav).toBeDefined();
          expect(allFav!.countBefore).toBe(0);
          expect(allFav!.countAfter).toBe(1);
          expect(allFav!.weightBefore).toBe(0);
          expect(allFav!.weightAfter).toBe(1);
          expect(allFav!.proportionBefore).toBe(0);
          expect(allFav!.proportionAfter).toBe(1 / 4);

          // Verify all_unfavorable (strongly_unfavorable: weight=3)
          expect(allUnfav).toBeDefined();
          expect(allUnfav!.countBefore).toBe(0);
          expect(allUnfav!.countAfter).toBe(1);
          expect(allUnfav!.weightBefore).toBe(0);
          expect(allUnfav!.weightAfter).toBe(3);
          expect(allUnfav!.proportionBefore).toBe(0);
          expect(allUnfav!.proportionAfter).toBe(3 / 4);
        });
      });
    });

    describe("Delta Values for Aggregated Split", () => {
      it("should have delta for allRespondents split", () => {
        // Find allRespondents split (age=null, gender=null)
        const allRespondentsSplitIndex = splitsAfterUpdate.findIndex(split =>
          split.groups.length === 2 &&
          split.groups[0].responseGroup === null &&
          split.groups[1].responseGroup === null
        );
        expect(allRespondentsSplitIndex).toBeGreaterThanOrEqual(0);

        // Verify this split has a delta
        const delta = updateResult.deltas.find(d => d.splitIndex === allRespondentsSplitIndex);
        expect(delta).toBeDefined();
      });

      it("should have correct before/after totals in delta", () => {
        // Find allRespondents split
        const allRespondentsSplitIndex = splitsAfterUpdate.findIndex(split =>
          split.groups.length === 2 &&
          split.groups[0].responseGroup === null &&
          split.groups[1].responseGroup === null
        );
        const delta = updateResult.deltas.find(d => d.splitIndex === allRespondentsSplitIndex);
        expect(delta).toBeDefined();

        // Check favorability question changes
        const favChange = delta!.responseQuestionChanges.find(rqc =>
          rqc.responseQuestionKey === getQuestionKey(favorabilityResponseQuestion)
        );
        expect(favChange).toBeDefined();

        // Verify before/after totals (weighted)
        // Wave 1+2: 10 respondents, total weight=16
        // Wave 3 adds 4 respondents, total weight=7 (oldMales weight=3, youngFemales weight=4)
        expect(favChange!.totalCountBefore).toBe(10);
        expect(favChange!.totalCountAfter).toBe(14);
        expect(favChange!.totalWeightBefore).toBe(16);
        expect(favChange!.totalWeightAfter).toBe(23);
      });

      it("should have correct aggregated expanded group deltas", () => {
        // Find allRespondents split delta
        const allRespondentsSplitIndex = splitsAfterUpdate.findIndex(split =>
          split.groups.length === 2 &&
          split.groups[0].responseGroup === null &&
          split.groups[1].responseGroup === null
        );
        const delta = updateResult.deltas.find(d => d.splitIndex === allRespondentsSplitIndex);
        const favChange = delta!.responseQuestionChanges[0];
        const expandedChanges = favChange.expandedGroupChanges;

        // Verify strongly_favorable: Wave1+2 weight=5 (ids 1,8: 2+3), Wave3 adds weight=2 (id 11)
        const stronglyFav = expandedChanges.find(g => g.responseGroupLabel === 'strongly_favorable');
        expect(stronglyFav).toBeDefined();
        expect(stronglyFav!.countBefore).toBe(2);
        expect(stronglyFav!.countAfter).toBe(3);
        expect(stronglyFav!.weightBefore).toBe(5);
        expect(stronglyFav!.weightAfter).toBe(7);
        expect(stronglyFav!.proportionBefore).toBe(5 / 16);
        expect(stronglyFav!.proportionAfter).toBe(7 / 23);

        // Verify favorable: Wave1+2 weight=5 (ids 2,4,9: 2+1+2), Wave3 adds weight=1 (id 13)
        const favorable = expandedChanges.find(g => g.responseGroupLabel === 'favorable');
        expect(favorable).toBeDefined();
        expect(favorable!.countBefore).toBe(3);
        expect(favorable!.countAfter).toBe(4);
        expect(favorable!.weightBefore).toBe(5);
        expect(favorable!.weightAfter).toBe(6);
        expect(favorable!.proportionBefore).toBe(5 / 16);
        expect(favorable!.proportionAfter).toBe(6 / 23);
      });

      it("should have correct aggregated collapsed group deltas", () => {
        // Find allRespondents split delta
        const allRespondentsSplitIndex = splitsAfterUpdate.findIndex(split =>
          split.groups.length === 2 &&
          split.groups[0].responseGroup === null &&
          split.groups[1].responseGroup === null
        );
        const delta = updateResult.deltas.find(d => d.splitIndex === allRespondentsSplitIndex);
        const favChange = delta!.responseQuestionChanges[0];
        const collapsedChanges = favChange.collapsedGroupChanges;

        // Verify all_favorable: Wave1+2 weight=10, Wave3 adds weight=3 (oldMales weight=2, youngFemales weight=1)
        const allFav = collapsedChanges.find(g => g.responseGroupLabel === 'all_favorable');
        expect(allFav).toBeDefined();
        expect(allFav!.countBefore).toBe(5);
        expect(allFav!.countAfter).toBe(7);
        expect(allFav!.weightBefore).toBe(10);
        expect(allFav!.weightAfter).toBe(13);
        expect(allFav!.proportionBefore).toBe(10 / 16);
        expect(allFav!.proportionAfter).toBe(13 / 23);

        // Verify all_unfavorable: Wave1+2 weight=6, Wave3 adds weight=4 (oldMales weight=1, youngFemales weight=3)
        const allUnfav = collapsedChanges.find(g => g.responseGroupLabel === 'all_unfavorable');
        expect(allUnfav).toBeDefined();
        expect(allUnfav!.countBefore).toBe(5);
        expect(allUnfav!.countAfter).toBe(7);
        expect(allUnfav!.weightBefore).toBe(6);
        expect(allUnfav!.weightAfter).toBe(10);
        expect(allUnfav!.proportionBefore).toBe(6 / 16);
        expect(allUnfav!.proportionAfter).toBe(10 / 23);
      });
    });
  });
});
