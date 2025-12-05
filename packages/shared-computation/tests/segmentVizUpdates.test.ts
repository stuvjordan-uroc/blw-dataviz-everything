/**
 * Tests for SegmentViz update functionality.
 *
 * Prerequisites:
 * - statistics.test.ts must pass (validates Statistics functionality)
 * - statisticsUpdates.test.ts must pass (validates Statistics update functionality)
 * - segmentViz.test.ts must pass (validates SegmentViz geometry without data)
 * - segmentVizHydrated.test.ts must pass (validates SegmentViz with hydrated Statistics)
 *
 * SCOPE: This suite tests how SegmentViz responds to Statistics updates.
 *
 * Test Scenarios:
 * 
 * 1. Wave 1 → Wave 2: Proportion shifts in already-populated splits
 *    - youngMales: proportions shift from [2/5, 2/5, 1/5, 0] to [5/8, 2/8, 1/8, 0]
 *    - oldFemales: proportions shift from [0, 1/5, 2/5, 2/5] to [0, 3/8, 3/8, 2/8]
 *    - Tests point redistribution (added/removed) when proportions change
 *
 * 2. Wave 1+2 → Wave 3: Newly populated splits
 *    - oldMales: unpopulated → populated (2 respondents)
 *    - youngFemales: unpopulated → populated (2 respondents)
 *    - youngMales/oldFemales: no new respondents, proportions unchanged
 *    - Tests new point creation and no-change cases
 */

import { Statistics, type StatsConfig } from "../src/statistics";
import { SegmentViz } from "../src/segmentViz";
import type { SegmentVizConfig } from "../src/segmentViz/types";
import {
  ageGroupingQuestion,
  genderGroupingQuestion,
  favorabilityResponseQuestion,
  weightQuestion,
  wave1Data,
  wave2Data,
  wave3Data,
} from "./fixtures/test-data";
import { flattenWaveData, combineWaves } from "./fixtures/helpers";
import { getQuestionKey } from "../src/utils";

/**
 * Shared configuration and setup for all tests
 */
describe("SegmentViz - Data Updates", () => {
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

  // Base SegmentViz configuration
  const baseVizConfig = {
    responseQuestionKeys: [getQuestionKey(favorabilityResponseQuestion)],
    groupingQuestionKeys: {
      x: [getQuestionKey(ageGroupingQuestion)],
      y: [getQuestionKey(genderGroupingQuestion)],
    },
    minGroupAvailableWidth: 100,
    minGroupHeight: 100,
    groupGapX: 10,
    groupGapY: 10,
    responseGap: 0,
    baseSegmentWidth: 10,
  };

  /**
   * ========================================================================
   * SCENARIO 1: PROPORTION SHIFTS (Wave 1 → Wave 2)
   * ========================================================================
   * 
   * Tests point redistribution when proportions change in already-populated splits.
   * 
   * youngMales:
   * - Wave 1: 3 respondents (ids 1-3), proportions [2/5, 2/5, 1/5, 0]
   *   - Synthetic (100 pts): [40, 40, 20, 0]
   *   - Non-synthetic: [1, 1, 1, 0] (3 points)
   * - Wave 2: adds id 8, total 4 respondents, proportions [5/8, 2/8, 1/8, 0]
   *   - Synthetic (100 pts): [62.5, 25, 12.5, 0] → actual [63, 25, 12, 0] or [62, 25, 13, 0]
   *   - Non-synthetic: [2, 1, 1, 0] (4 points)
   * - Expected changes (synthetic): ~23 added to strongly_favorable, ~15 removed from favorable
   * - Expected changes (non-synthetic): 1 added to strongly_favorable
   * 
   * oldFemales:
   * - Wave 1: 4 respondents (ids 4-7), proportions [0, 1/5, 2/5, 2/5]
   *   - Synthetic (100 pts): [0, 20, 40, 40]
   *   - Non-synthetic: [0, 1, 2, 1] (4 points)
   * - Wave 2: adds ids 9-10, total 6 respondents, proportions [0, 3/8, 3/8, 2/8]
   *   - Synthetic (100 pts): [0, 37.5, 37.5, 25] → actual [0, 38, 38, 24] or [0, 37, 38, 25]
   *   - Non-synthetic: [0, 2, 3, 1] (6 points)
   * - Expected changes (synthetic): ~18 added to favorable, ~2 removed from unfavorable, ~15 removed from strongly_unfavorable
   * - Expected changes (non-synthetic): 1 added to favorable, 1 added to unfavorable
   */
  describe("Proportion Shifts (Wave 1 → Wave 2)", () => {
    describe("With Synthetic Sample Size", () => {
      let stats: Statistics;
      let segmentViz: SegmentViz;
      let favViz: any;
      let splits: any[];
      let youngMalesSplitIdx: number;
      let oldFemalesSplitIdx: number;

      beforeAll(() => {
        // (1) Create Statistics with Wave 1 data
        stats = new Statistics(statsConfig, wave1Respondents, weightQuestion);

        // (2) Create SegmentViz WITH synthetic sample size
        const vizConfig: SegmentVizConfig = {
          ...baseVizConfig,
          syntheticSampleSize: 100,
        };
        segmentViz = new SegmentViz(stats, vizConfig);

        // (3) Update Statistics with Wave 2 data (triggers proportion shifts)
        stats.updateSplits(wave2Respondents);

        // Get updated state
        splits = stats.getSplits();
        favViz = segmentViz.getVisualization(getQuestionKey(favorabilityResponseQuestion));

        // Find split indices
        youngMalesSplitIdx = splits.findIndex((split) => {
          const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
          const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
          return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
        });

        oldFemalesSplitIdx = splits.findIndex((split) => {
          const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
          const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
          return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
        });
      });

      describe("youngMales proportion shift: [40,40,20,0] → [~63,25,~12,0]", () => {
        it("should preserve existing point IDs in strongly_favorable and add new sequential IDs", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const stronglyFav = pointSets[0]; // ergIdx = 0

          // Wave 1 had 40 points: IDs 0-0-0 through 0-0-39
          // Wave 2 needs ~63 points, so should ADD ~23 new points with sequential IDs
          expect(stronglyFav.currentIds.length).toBeGreaterThanOrEqual(62);
          expect(stronglyFav.currentIds.length).toBeLessThanOrEqual(63);

          // Validate existing IDs are preserved (first 40 should be 0-0-0 through 0-0-39)
          const first40Ids = stronglyFav.currentIds.slice(0, 40);
          expect(first40Ids).toEqual(
            Array.from({ length: 40 }, (_, i) => `${youngMalesSplitIdx}-0-${i}`)
          );

          // Validate new IDs follow sequential pattern starting at localId 40
          const addedIds = stronglyFav.addedIds;
          expect(addedIds.length).toBeGreaterThanOrEqual(22);
          expect(addedIds.length).toBeLessThanOrEqual(23);

          addedIds.forEach((id: string, i: number) => {
            expect(id).toBe(`${youngMalesSplitIdx}-0-${40 + i}`);
          });

          // No removals from strongly_favorable
          expect(stronglyFav.removedIds).toEqual([]);
        });

        it("should remove points from end of favorable's ID list", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const favorable = pointSets[1]; // ergIdx = 1

          // Wave 1 had 40 points: IDs 0-1-0 through 0-1-39
          // Wave 2 needs 25 points, so should REMOVE last 15 points (IDs 0-1-25 through 0-1-39)
          expect(favorable.currentIds.length).toBe(25);

          // Validate remaining IDs are the first 25
          expect(favorable.currentIds).toEqual(
            Array.from({ length: 25 }, (_, i) => `${youngMalesSplitIdx}-1-${i}`)
          );

          // Validate removed IDs are the last 15
          expect(favorable.removedIds.length).toBe(15);
          expect(favorable.removedIds).toEqual(
            Array.from({ length: 15 }, (_, i) => `${youngMalesSplitIdx}-1-${25 + i}`)
          );

          // No additions to favorable
          expect(favorable.addedIds).toEqual([]);
        });

        it("should remove points from end of unfavorable's ID list", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const unfavorable = pointSets[2]; // ergIdx = 2

          // Wave 1 had 20 points: IDs 0-2-0 through 0-2-19
          // Wave 2 needs ~12 points, so should REMOVE last ~8 points
          expect(unfavorable.currentIds.length).toBeGreaterThanOrEqual(12);
          expect(unfavorable.currentIds.length).toBeLessThanOrEqual(13);

          const currentCount = unfavorable.currentIds.length;

          // Validate remaining IDs are the first N
          expect(unfavorable.currentIds).toEqual(
            Array.from({ length: currentCount }, (_, i) => `${youngMalesSplitIdx}-2-${i}`)
          );

          // Validate removed IDs are from the end
          const removedCount = unfavorable.removedIds.length;
          expect(removedCount).toBeGreaterThanOrEqual(7);
          expect(removedCount).toBeLessThanOrEqual(8);

          expect(unfavorable.removedIds).toEqual(
            Array.from({ length: removedCount }, (_, i) => `${youngMalesSplitIdx}-2-${currentCount + i}`)
          );

          // No additions to unfavorable
          expect(unfavorable.addedIds).toEqual([]);
        });

        it("should maintain total of 100 points with balanced redistribution", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx
          );

          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(100);

          // Total added should approximately equal total removed (conservation during redistribution)
          const totalAdded = pointSets.reduce((sum: number, ps: any) => sum + ps.addedIds.length, 0);
          const totalRemoved = pointSets.reduce((sum: number, ps: any) => sum + ps.removedIds.length, 0);
          expect(Math.abs(totalAdded - totalRemoved)).toBeLessThan(3);
        });
      });

      describe("oldFemales proportion shift: [0,20,40,40] → [0,~38,~38,24]", () => {
        it("should maintain empty strongly_favorable with no ID changes", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const stronglyFav = pointSets[0]; // ergIdx = 0

          // Was 0, stays 0
          expect(stronglyFav.currentIds).toEqual([]);
          expect(stronglyFav.addedIds).toEqual([]);
          expect(stronglyFav.removedIds).toEqual([]);
        });

        it("should preserve existing favorable IDs and add new sequential IDs", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const favorable = pointSets[1]; // ergIdx = 1

          // Wave 1 had 20 points: IDs 1-1-0 through 1-1-19
          // Wave 2 needs ~38 points, so should ADD ~18 new points
          expect(favorable.currentIds.length).toBeGreaterThanOrEqual(37);
          expect(favorable.currentIds.length).toBeLessThanOrEqual(38);

          // Validate existing IDs preserved (first 20)
          const first20Ids = favorable.currentIds.slice(0, 20);
          expect(first20Ids).toEqual(
            Array.from({ length: 20 }, (_, i) => `${oldFemalesSplitIdx}-1-${i}`)
          );

          // Validate new IDs sequential starting at localId 20
          const addedIds = favorable.addedIds;
          expect(addedIds.length).toBeGreaterThanOrEqual(17);
          expect(addedIds.length).toBeLessThanOrEqual(18);

          addedIds.forEach((id: string, i: number) => {
            expect(id).toBe(`${oldFemalesSplitIdx}-1-${20 + i}`);
          });

          expect(favorable.removedIds).toEqual([]);
        });

        it("should remove a few points from end of unfavorable's ID list", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const unfavorable = pointSets[2]; // ergIdx = 2

          // Wave 1 had 40 points: IDs 1-2-0 through 1-2-39
          // Wave 2 needs ~38 points, so should REMOVE last ~2 points
          expect(unfavorable.currentIds.length).toBeGreaterThanOrEqual(37);
          expect(unfavorable.currentIds.length).toBeLessThanOrEqual(38);

          const currentCount = unfavorable.currentIds.length;

          // Validate remaining IDs are first N
          expect(unfavorable.currentIds).toEqual(
            Array.from({ length: currentCount }, (_, i) => `${oldFemalesSplitIdx}-2-${i}`)
          );

          // Validate small number of removals from end
          const removedCount = unfavorable.removedIds.length;
          expect(removedCount).toBeGreaterThanOrEqual(2);
          expect(removedCount).toBeLessThanOrEqual(3);

          expect(unfavorable.removedIds).toEqual(
            Array.from({ length: removedCount }, (_, i) => `${oldFemalesSplitIdx}-2-${currentCount + i}`)
          );

          expect(unfavorable.addedIds).toEqual([]);
        });

        it("should remove many points from end of strongly_unfavorable's ID list", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const stronglyUnfav = pointSets[3]; // ergIdx = 3

          // Wave 1 had 40 points: IDs 1-3-0 through 1-3-39
          // Wave 2 needs ~24 points, so should REMOVE last ~16 points
          expect(stronglyUnfav.currentIds.length).toBeGreaterThanOrEqual(24);
          expect(stronglyUnfav.currentIds.length).toBeLessThanOrEqual(25);

          const currentCount = stronglyUnfav.currentIds.length;

          // Validate remaining IDs are first N
          expect(stronglyUnfav.currentIds).toEqual(
            Array.from({ length: currentCount }, (_, i) => `${oldFemalesSplitIdx}-3-${i}`)
          );

          // Validate removals from end
          const removedCount = stronglyUnfav.removedIds.length;
          expect(removedCount).toBeGreaterThanOrEqual(15);
          expect(removedCount).toBeLessThanOrEqual(16);

          expect(stronglyUnfav.removedIds).toEqual(
            Array.from({ length: removedCount }, (_, i) => `${oldFemalesSplitIdx}-3-${currentCount + i}`)
          );

          expect(stronglyUnfav.addedIds).toEqual([]);
        });

        it("should maintain total of 100 points with balanced redistribution", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );

          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(100);

          const totalAdded = pointSets.reduce((sum: number, ps: any) => sum + ps.addedIds.length, 0);
          const totalRemoved = pointSets.reduce((sum: number, ps: any) => sum + ps.removedIds.length, 0);
          expect(Math.abs(totalAdded - totalRemoved)).toBeLessThan(3);
        });
      });
    });

    describe("Without Synthetic Sample Size", () => {
      let stats: Statistics;
      let segmentViz: SegmentViz;
      let favViz: any;
      let splits: any[];
      let youngMalesSplitIdx: number;
      let oldFemalesSplitIdx: number;

      beforeAll(() => {
        // (1) Create Statistics with Wave 1 data
        stats = new Statistics(statsConfig, wave1Respondents, weightQuestion);

        // (2) Create SegmentViz WITHOUT synthetic sample size
        const vizConfig: SegmentVizConfig = {
          ...baseVizConfig,
          // syntheticSampleSize is undefined
        };
        segmentViz = new SegmentViz(stats, vizConfig);

        // (3) Update Statistics with Wave 2 data
        stats.updateSplits(wave2Respondents);

        // Get updated state
        splits = stats.getSplits();
        favViz = segmentViz.getVisualization(getQuestionKey(favorabilityResponseQuestion));

        // Find split indices
        youngMalesSplitIdx = splits.findIndex((split) => {
          const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
          const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
          return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
        });

        oldFemalesSplitIdx = splits.findIndex((split) => {
          const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
          const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
          return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
        });
      });

      describe("youngMales: adds respondent id 8 (favorability=1)", () => {
        it("should preserve all existing point IDs and add one new sequential ID", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const stronglyFav = pointSets[0]; // ergIdx = 0
          const favorable = pointSets[1];   // ergIdx = 1
          const unfavorable = pointSets[2]; // ergIdx = 2
          const stronglyUnfav = pointSets[3]; // ergIdx = 3

          // Wave 1 distribution: [1, 1, 1, 0] (respondents 1,2,3)
          // Wave 2 adds respondent 8 with favorability=1 → strongly_favorable

          // strongly_favorable: had ID 0-0-0 (respondent 1), now adds 0-0-1 (respondent 8)
          expect(stronglyFav.currentIds).toEqual([
            `${youngMalesSplitIdx}-0-0`,
            `${youngMalesSplitIdx}-0-1`
          ]);
          expect(stronglyFav.addedIds).toEqual([`${youngMalesSplitIdx}-0-1`]);
          expect(stronglyFav.removedIds).toEqual([]);

          // favorable: had ID 0-1-0 (respondent 2), unchanged
          expect(favorable.currentIds).toEqual([`${youngMalesSplitIdx}-1-0`]);
          expect(favorable.addedIds).toEqual([]);
          expect(favorable.removedIds).toEqual([]);

          // unfavorable: had ID 0-2-0 (respondent 3), unchanged
          expect(unfavorable.currentIds).toEqual([`${youngMalesSplitIdx}-2-0`]);
          expect(unfavorable.addedIds).toEqual([]);
          expect(unfavorable.removedIds).toEqual([]);

          // strongly_unfavorable: empty, unchanged
          expect(stronglyUnfav.currentIds).toEqual([]);
          expect(stronglyUnfav.addedIds).toEqual([]);
          expect(stronglyUnfav.removedIds).toEqual([]);
        });

        it("should have exactly 4 total points after addition", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx
          );

          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(4);
        });
      });

      describe("oldFemales: adds respondents id 9 (favorability=2), id 10 (favorability=3)", () => {
        it("should preserve all existing point IDs and add two new sequential IDs", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const stronglyFav = pointSets[0]; // ergIdx = 0
          const favorable = pointSets[1];   // ergIdx = 1
          const unfavorable = pointSets[2]; // ergIdx = 2
          const stronglyUnfav = pointSets[3]; // ergIdx = 3

          // Wave 1 distribution: [0, 1, 2, 1] (respondents 4,5,6,7)
          // Wave 2 adds: respondent 9 (favorability=2) → favorable
          //              respondent 10 (favorability=3) → unfavorable

          // strongly_favorable: was empty, stays empty
          expect(stronglyFav.currentIds).toEqual([]);
          expect(stronglyFav.addedIds).toEqual([]);
          expect(stronglyFav.removedIds).toEqual([]);

          // favorable: had ID 1-1-0 (respondent 4), now adds 1-1-1 (respondent 9)
          expect(favorable.currentIds).toEqual([
            `${oldFemalesSplitIdx}-1-0`,
            `${oldFemalesSplitIdx}-1-1`
          ]);
          expect(favorable.addedIds).toEqual([`${oldFemalesSplitIdx}-1-1`]);
          expect(favorable.removedIds).toEqual([]);

          // unfavorable: had IDs 1-2-0, 1-2-1 (respondents 5,6), now adds 1-2-2 (respondent 10)
          expect(unfavorable.currentIds).toEqual([
            `${oldFemalesSplitIdx}-2-0`,
            `${oldFemalesSplitIdx}-2-1`,
            `${oldFemalesSplitIdx}-2-2`
          ]);
          expect(unfavorable.addedIds).toEqual([`${oldFemalesSplitIdx}-2-2`]);
          expect(unfavorable.removedIds).toEqual([]);

          // strongly_unfavorable: had ID 1-3-0 (respondent 7), unchanged
          expect(stronglyUnfav.currentIds).toEqual([`${oldFemalesSplitIdx}-3-0`]);
          expect(stronglyUnfav.addedIds).toEqual([]);
          expect(stronglyUnfav.removedIds).toEqual([]);
        });

        it("should have exactly 6 total points after additions", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );

          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(6);
        });
      });
    });
  });

  /**
   * ========================================================================
   * SCENARIO 2: NEWLY POPULATED SPLITS (Wave 1+2 → Wave 3)
   * ========================================================================
   * 
   * Tests new point creation when splits go from unpopulated to populated,
   * and no-change behavior when splits have no new respondents.
   * 
   * Wave 1+2 state (before Wave 3):
   * - youngMales: 4 respondents, proportions [5/8, 2/8, 1/8, 0]
   * - oldFemales: 6 respondents, proportions [0, 3/8, 3/8, 2/8]
   * - oldMales: 0 respondents (unpopulated)
   * - youngFemales: 0 respondents (unpopulated)
   * 
   * Wave 3 adds:
   * - oldMales: 2 respondents (ids 11-12), proportions [2/3, 0, 1/3, 0]
   * - youngFemales: 2 respondents (ids 13-14), proportions [0, 1/4, 0, 3/4]
   * - youngMales/oldFemales: no new respondents, proportions unchanged
   */
  describe("Newly Populated Splits (Wave 1+2 → Wave 3)", () => {
    describe("With Synthetic Sample Size", () => {
      let stats: Statistics;
      let segmentViz: SegmentViz;
      let favViz: any;
      let splits: any[];
      let oldMalesSplitIdx: number;
      let youngFemalesSplitIdx: number;
      let youngMalesSplitIdx: number;
      let oldFemalesSplitIdx: number;

      beforeAll(() => {
        // (1) Create Statistics instance with Wave 1+2 combined data
        stats = new Statistics(statsConfig, wave1And2Combined, weightQuestion);

        // (2) Create SegmentViz WITH synthetic sample size
        const vizConfig: SegmentVizConfig = {
          ...baseVizConfig,
          syntheticSampleSize: 100,
        };
        segmentViz = new SegmentViz(stats, vizConfig);

        // (4) Update Statistics with Wave 3 data
        stats.updateSplits(wave3Respondents);

        // Get updated state using public API
        splits = stats.getSplits();
        favViz = segmentViz.getVisualization(getQuestionKey(favorabilityResponseQuestion));

        // Find split indices
        oldMalesSplitIdx = splits.findIndex((split) => {
          const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
          const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
          return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "male";
        });

        youngFemalesSplitIdx = splits.findIndex((split) => {
          const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
          const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
          return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "female";
        });

        youngMalesSplitIdx = splits.findIndex((split) => {
          const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
          const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
          return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
        });

        oldFemalesSplitIdx = splits.findIndex((split) => {
          const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
          const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
          return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
        });
      });

      describe("Newly populated: oldMales gets 2 respondents (ids 11-12)", () => {
        it("should create 100 new point IDs with proper composite ID format", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldMalesSplitIdx
          );

          // All 100 points should be new
          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(100);

          const totalAdded = pointSets.reduce((sum: number, ps: any) => sum + ps.addedIds.length, 0);
          expect(totalAdded).toBe(100);

          const totalRemoved = pointSets.reduce((sum: number, ps: any) => sum + ps.removedIds.length, 0);
          expect(totalRemoved).toBe(0);

          // Validate all IDs have correct format: splitIdx-ergIdx-localId
          pointSets.forEach((ps: any) => {
            ps.currentIds.forEach((id: string) => {
              const parts = id.split('-');
              expect(parts.length).toBe(3);
              expect(parts[0]).toBe(String(oldMalesSplitIdx));
              expect(parts[1]).toBe(String(ps.responseGroupIndex.expanded));
              expect(Number(parts[2])).toBeGreaterThanOrEqual(0);
            });
          });
        });

        it("should assign sequential localIds within each response group", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldMalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          // proportions [2/3, 0, 1/3, 0] → counts [67, 0, 33, 0]
          const stronglyFav = pointSets[0]; // ergIdx = 0, count = 67
          const favorable = pointSets[1];   // ergIdx = 1, count = 0
          const unfavorable = pointSets[2]; // ergIdx = 2, count = 33
          const stronglyUnfav = pointSets[3]; // ergIdx = 3, count = 0

          // strongly_favorable: 67 points with localIds 0-66
          expect(stronglyFav.currentIds.length).toBe(67);
          expect(stronglyFav.currentIds).toEqual(
            Array.from({ length: 67 }, (_, i) => `${oldMalesSplitIdx}-0-${i}`)
          );
          expect(stronglyFav.addedIds).toEqual(stronglyFav.currentIds);
          expect(stronglyFav.removedIds).toEqual([]);

          // favorable: 0 points
          expect(favorable.currentIds).toEqual([]);
          expect(favorable.addedIds).toEqual([]);
          expect(favorable.removedIds).toEqual([]);

          // unfavorable: 33 points with localIds 0-32
          expect(unfavorable.currentIds.length).toBe(33);
          expect(unfavorable.currentIds).toEqual(
            Array.from({ length: 33 }, (_, i) => `${oldMalesSplitIdx}-2-${i}`)
          );
          expect(unfavorable.addedIds).toEqual(unfavorable.currentIds);
          expect(unfavorable.removedIds).toEqual([]);

          // strongly_unfavorable: 0 points
          expect(stronglyUnfav.currentIds).toEqual([]);
          expect(stronglyUnfav.addedIds).toEqual([]);
          expect(stronglyUnfav.removedIds).toEqual([]);
        });
      });

      describe("Newly populated: youngFemales gets 2 respondents (ids 13-14)", () => {
        it("should create 100 new point IDs with proper composite ID format", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngFemalesSplitIdx
          );

          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(100);

          const totalAdded = pointSets.reduce((sum: number, ps: any) => sum + ps.addedIds.length, 0);
          expect(totalAdded).toBe(100);

          const totalRemoved = pointSets.reduce((sum: number, ps: any) => sum + ps.removedIds.length, 0);
          expect(totalRemoved).toBe(0);

          // Validate composite ID format
          pointSets.forEach((ps: any) => {
            ps.currentIds.forEach((id: string) => {
              const parts = id.split('-');
              expect(parts.length).toBe(3);
              expect(parts[0]).toBe(String(youngFemalesSplitIdx));
              expect(parts[1]).toBe(String(ps.responseGroupIndex.expanded));
              expect(Number(parts[2])).toBeGreaterThanOrEqual(0);
            });
          });
        });

        it("should assign sequential localIds within each response group", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngFemalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          // proportions [0, 1/4, 0, 3/4] → counts [0, 25, 0, 75]
          const stronglyFav = pointSets[0];   // ergIdx = 0, count = 0
          const favorable = pointSets[1];     // ergIdx = 1, count = 25
          const unfavorable = pointSets[2];   // ergIdx = 2, count = 0
          const stronglyUnfav = pointSets[3]; // ergIdx = 3, count = 75

          // strongly_favorable: 0 points
          expect(stronglyFav.currentIds).toEqual([]);
          expect(stronglyFav.addedIds).toEqual([]);
          expect(stronglyFav.removedIds).toEqual([]);

          // favorable: 25 points with localIds 0-24
          expect(favorable.currentIds.length).toBe(25);
          expect(favorable.currentIds).toEqual(
            Array.from({ length: 25 }, (_, i) => `${youngFemalesSplitIdx}-1-${i}`)
          );
          expect(favorable.addedIds).toEqual(favorable.currentIds);
          expect(favorable.removedIds).toEqual([]);

          // unfavorable: 0 points
          expect(unfavorable.currentIds).toEqual([]);
          expect(unfavorable.addedIds).toEqual([]);
          expect(unfavorable.removedIds).toEqual([]);

          // strongly_unfavorable: 75 points with localIds 0-74
          expect(stronglyUnfav.currentIds.length).toBe(75);
          expect(stronglyUnfav.currentIds).toEqual(
            Array.from({ length: 75 }, (_, i) => `${youngFemalesSplitIdx}-3-${i}`)
          );
          expect(stronglyUnfav.addedIds).toEqual(stronglyUnfav.currentIds);
          expect(stronglyUnfav.removedIds).toEqual([]);
        });
      });

      describe("Unchanged splits: youngMales and oldFemales", () => {
        it("should preserve all youngMales point IDs with no additions or removals", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx
          );

          // Total should still be 100
          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(100);

          // No changes at all
          pointSets.forEach((ps: any) => {
            expect(ps.addedIds).toEqual([]);
            expect(ps.removedIds).toEqual([]);

            // Validate IDs are well-formed
            ps.currentIds.forEach((id: string) => {
              const parts = id.split('-');
              expect(parts.length).toBe(3);
              expect(parts[0]).toBe(String(youngMalesSplitIdx));
            });
          });

          const totalAdded = pointSets.reduce((sum: number, ps: any) => sum + ps.addedIds.length, 0);
          expect(totalAdded).toBe(0);

          const totalRemoved = pointSets.reduce((sum: number, ps: any) => sum + ps.removedIds.length, 0);
          expect(totalRemoved).toBe(0);
        });

        it("should preserve all oldFemales point IDs with no additions or removals", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );

          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(100);

          // No changes
          pointSets.forEach((ps: any) => {
            expect(ps.addedIds).toEqual([]);
            expect(ps.removedIds).toEqual([]);

            // Validate IDs are well-formed
            ps.currentIds.forEach((id: string) => {
              const parts = id.split('-');
              expect(parts.length).toBe(3);
              expect(parts[0]).toBe(String(oldFemalesSplitIdx));
            });
          });

          const totalAdded = pointSets.reduce((sum: number, ps: any) => sum + ps.addedIds.length, 0);
          expect(totalAdded).toBe(0);

          const totalRemoved = pointSets.reduce((sum: number, ps: any) => sum + ps.removedIds.length, 0);
          expect(totalRemoved).toBe(0);
        });
      });
    });

    describe("Without Synthetic Sample Size", () => {
      let stats: Statistics;
      let segmentViz: SegmentViz;
      let favViz: any;
      let splits: any[];
      let oldMalesSplitIdx: number;
      let youngFemalesSplitIdx: number;
      let youngMalesSplitIdx: number;
      let oldFemalesSplitIdx: number;

      beforeAll(() => {
        // (1) Create Statistics instance with Wave 1+2 combined data
        stats = new Statistics(statsConfig, wave1And2Combined, weightQuestion);

        // (3) Create SegmentViz WITHOUT synthetic sample size
        const vizConfig: SegmentVizConfig = {
          ...baseVizConfig,
          // syntheticSampleSize is undefined
        };
        segmentViz = new SegmentViz(stats, vizConfig);

        // (4) Update Statistics with Wave 3 data
        stats.updateSplits(wave3Respondents);

        // Get updated state using public API
        splits = stats.getSplits();
        favViz = segmentViz.getVisualization(getQuestionKey(favorabilityResponseQuestion));

        // Find split indices
        oldMalesSplitIdx = splits.findIndex((split) => {
          const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
          const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
          return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "male";
        });

        youngFemalesSplitIdx = splits.findIndex((split) => {
          const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
          const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
          return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "female";
        });

        youngMalesSplitIdx = splits.findIndex((split) => {
          const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
          const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
          return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
        });

        oldFemalesSplitIdx = splits.findIndex((split) => {
          const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
          const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
          return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
        });
      });

      describe("Newly populated: oldMales gets 2 respondents (ids 11-12)", () => {
        it("should create 2 new point IDs with proper composite format", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldMalesSplitIdx
          );

          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(2);

          const totalAdded = pointSets.reduce((sum: number, ps: any) => sum + ps.addedIds.length, 0);
          expect(totalAdded).toBe(2);

          const totalRemoved = pointSets.reduce((sum: number, ps: any) => sum + ps.removedIds.length, 0);
          expect(totalRemoved).toBe(0);

          // Validate composite ID format
          pointSets.forEach((ps: any) => {
            ps.currentIds.forEach((id: string) => {
              const parts = id.split('-');
              expect(parts.length).toBe(3);
              expect(parts[0]).toBe(String(oldMalesSplitIdx));
              expect(parts[1]).toBe(String(ps.responseGroupIndex.expanded));
            });
          });
        });

        it("should create specific IDs for respondents 11 and 12", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldMalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const stronglyFav = pointSets[0];   // ergIdx = 0
          const favorable = pointSets[1];     // ergIdx = 1
          const unfavorable = pointSets[2];   // ergIdx = 2
          const stronglyUnfav = pointSets[3]; // ergIdx = 3

          // id 11: favorability=1 (strongly_favorable), id 12: favorability=3 (unfavorable)

          // strongly_favorable: 1 point with localId 0
          expect(stronglyFav.currentIds).toEqual([`${oldMalesSplitIdx}-0-0`]);
          expect(stronglyFav.addedIds).toEqual([`${oldMalesSplitIdx}-0-0`]);
          expect(stronglyFav.removedIds).toEqual([]);

          // favorable: empty
          expect(favorable.currentIds).toEqual([]);
          expect(favorable.addedIds).toEqual([]);
          expect(favorable.removedIds).toEqual([]);

          // unfavorable: 1 point with localId 0
          expect(unfavorable.currentIds).toEqual([`${oldMalesSplitIdx}-2-0`]);
          expect(unfavorable.addedIds).toEqual([`${oldMalesSplitIdx}-2-0`]);
          expect(unfavorable.removedIds).toEqual([]);

          // strongly_unfavorable: empty
          expect(stronglyUnfav.currentIds).toEqual([]);
          expect(stronglyUnfav.addedIds).toEqual([]);
          expect(stronglyUnfav.removedIds).toEqual([]);
        });
      });

      describe("Newly populated: youngFemales gets 2 respondents (ids 13-14)", () => {
        it("should create 2 new point IDs with proper composite format", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngFemalesSplitIdx
          );

          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(2);

          const totalAdded = pointSets.reduce((sum: number, ps: any) => sum + ps.addedIds.length, 0);
          expect(totalAdded).toBe(2);

          const totalRemoved = pointSets.reduce((sum: number, ps: any) => sum + ps.removedIds.length, 0);
          expect(totalRemoved).toBe(0);

          // Validate composite ID format
          pointSets.forEach((ps: any) => {
            ps.currentIds.forEach((id: string) => {
              const parts = id.split('-');
              expect(parts.length).toBe(3);
              expect(parts[0]).toBe(String(youngFemalesSplitIdx));
              expect(parts[1]).toBe(String(ps.responseGroupIndex.expanded));
            });
          });
        });

        it("should create specific IDs for respondents 13 and 14", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngFemalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const stronglyFav = pointSets[0];   // ergIdx = 0
          const favorable = pointSets[1];     // ergIdx = 1
          const unfavorable = pointSets[2];   // ergIdx = 2
          const stronglyUnfav = pointSets[3]; // ergIdx = 3

          // id 13: favorability=2 (favorable), id 14: favorability=4 (strongly_unfavorable)

          // strongly_favorable: empty
          expect(stronglyFav.currentIds).toEqual([]);
          expect(stronglyFav.addedIds).toEqual([]);
          expect(stronglyFav.removedIds).toEqual([]);

          // favorable: 1 point with localId 0
          expect(favorable.currentIds).toEqual([`${youngFemalesSplitIdx}-1-0`]);
          expect(favorable.addedIds).toEqual([`${youngFemalesSplitIdx}-1-0`]);
          expect(favorable.removedIds).toEqual([]);

          // unfavorable: empty
          expect(unfavorable.currentIds).toEqual([]);
          expect(unfavorable.addedIds).toEqual([]);
          expect(unfavorable.removedIds).toEqual([]);

          // strongly_unfavorable: 1 point with localId 0
          expect(stronglyUnfav.currentIds).toEqual([`${youngFemalesSplitIdx}-3-0`]);
          expect(stronglyUnfav.addedIds).toEqual([`${youngFemalesSplitIdx}-3-0`]);
          expect(stronglyUnfav.removedIds).toEqual([]);
        });
      });

      describe("Unchanged splits: youngMales and oldFemales preserve exact IDs", () => {
        it("should preserve exact youngMales point IDs from Wave 1+2", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const stronglyFav = pointSets[0];   // ergIdx = 0
          const favorable = pointSets[1];     // ergIdx = 1
          const unfavorable = pointSets[2];   // ergIdx = 2
          const stronglyUnfav = pointSets[3]; // ergIdx = 3

          // Wave 1+2 final state: [2, 1, 1, 0] - respondents 1,2,3,8
          // strongly_favorable: respondents 1 and 8 → IDs 0-0-0, 0-0-1
          expect(stronglyFav.currentIds).toEqual([
            `${youngMalesSplitIdx}-0-0`,
            `${youngMalesSplitIdx}-0-1`
          ]);
          expect(stronglyFav.addedIds).toEqual([]);
          expect(stronglyFav.removedIds).toEqual([]);

          // favorable: respondent 2 → ID 0-1-0
          expect(favorable.currentIds).toEqual([`${youngMalesSplitIdx}-1-0`]);
          expect(favorable.addedIds).toEqual([]);
          expect(favorable.removedIds).toEqual([]);

          // unfavorable: respondent 3 → ID 0-2-0
          expect(unfavorable.currentIds).toEqual([`${youngMalesSplitIdx}-2-0`]);
          expect(unfavorable.addedIds).toEqual([]);
          expect(unfavorable.removedIds).toEqual([]);

          // strongly_unfavorable: empty
          expect(stronglyUnfav.currentIds).toEqual([]);
          expect(stronglyUnfav.addedIds).toEqual([]);
          expect(stronglyUnfav.removedIds).toEqual([]);

          // Total: 4 points
          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(4);
        });

        it("should preserve exact oldFemales point IDs from Wave 1+2", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const stronglyFav = pointSets[0];   // ergIdx = 0
          const favorable = pointSets[1];     // ergIdx = 1
          const unfavorable = pointSets[2];   // ergIdx = 2
          const stronglyUnfav = pointSets[3]; // ergIdx = 3

          // Wave 1+2 final state: [0, 2, 3, 1] - respondents 4,5,6,7,9,10
          // strongly_favorable: empty
          expect(stronglyFav.currentIds).toEqual([]);
          expect(stronglyFav.addedIds).toEqual([]);
          expect(stronglyFav.removedIds).toEqual([]);

          // favorable: respondents 4, 9 → IDs 1-1-0, 1-1-1
          expect(favorable.currentIds).toEqual([
            `${oldFemalesSplitIdx}-1-0`,
            `${oldFemalesSplitIdx}-1-1`
          ]);
          expect(favorable.addedIds).toEqual([]);
          expect(favorable.removedIds).toEqual([]);

          // unfavorable: respondents 5, 6, 10 → IDs 1-2-0, 1-2-1, 1-2-2
          expect(unfavorable.currentIds).toEqual([
            `${oldFemalesSplitIdx}-2-0`,
            `${oldFemalesSplitIdx}-2-1`,
            `${oldFemalesSplitIdx}-2-2`
          ]);
          expect(unfavorable.addedIds).toEqual([]);
          expect(unfavorable.removedIds).toEqual([]);

          // strongly_unfavorable: respondent 7 → ID 1-3-0
          expect(stronglyUnfav.currentIds).toEqual([`${oldFemalesSplitIdx}-3-0`]);
          expect(stronglyUnfav.addedIds).toEqual([]);
          expect(stronglyUnfav.removedIds).toEqual([]);

          // Total: 6 points
          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(6);
        });
      });
    });
  });
});
