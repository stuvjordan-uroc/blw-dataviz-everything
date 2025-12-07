/**
 * @file Point Set Tests for SegmentViz Updates
 *
 * This file tests point ID management when SegmentViz responds to Statistics updates:
 * - Point ID creation with proper composite format (splitIdx-ergIdx-localId)
 * - Sequential localId assignment within response groups
 * - Point ID preservation across updates
 * - Added/removed point tracking
 *
 * Organization:
 * - Scenario 1: Proportion Shifts (Wave 1 → Wave 2)
 *   - youngMales: 3 respondents → 4 (adds id 8)
 *   - oldFemales: 4 respondents → 6 (adds ids 9, 10)
 * - Scenario 2: Newly Populated Splits (Wave 1+2 → Wave 3)
 *   - oldMales: 0 respondents → 2 (adds ids 11, 12)
 *   - youngFemales: 0 respondents → 2 (adds ids 13, 14)
 */

import { Statistics } from "../../src/statistics";
import { SegmentViz } from "../../src/segmentViz";
import type { SegmentVizConfig } from "../../src/segmentViz/types";
import {
  wave1Respondents,
  wave2Respondents,
  wave3Respondents,
  wave1And2Combined,
  statsConfig,
  baseVizConfig,
  favorabilityResponseQuestion,
  weightQuestion,
  getQuestionKey,
  findSplitIndex,
} from "./helpers";

describe("SegmentViz Updates - Point ID Management Tests", () => {
  describe("Proportion Shifts (Wave 1 → Wave 2)", () => {
    describe("With Synthetic Sample Size", () => {
      let stats: Statistics;
      let segmentViz: SegmentViz;
      let favViz: any;
      let splits: any[];
      let youngMalesSplitIdx: number;
      let oldFemalesSplitIdx: number;

      beforeAll(() => {
        // (1) Create Statistics instance with Wave 1 data
        stats = new Statistics(statsConfig, wave1Respondents, weightQuestion);

        // (2) Create SegmentViz WITH synthetic sample size
        const vizConfig: SegmentVizConfig = {
          ...baseVizConfig,
          syntheticSampleSize: 100,
        };
        segmentViz = new SegmentViz(stats, vizConfig);

        // (3) Update Statistics with Wave 2 data
        stats.updateSplits(wave2Respondents);

        // Get updated state using public API
        splits = stats.getSplits();
        favViz = segmentViz.getVisualization(getQuestionKey(favorabilityResponseQuestion));

        // Find split indices
        youngMalesSplitIdx = findSplitIndex(splits, "young", "male");
        oldFemalesSplitIdx = findSplitIndex(splits, "old", "female");
      });

      describe("youngMales proportion shift (adds respondent 8)", () => {
        it("should maintain 100 total points with proper composite ID format", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx
          );

          // Total points should remain 100 (synthetic sample size)
          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(100);

          // Validate all IDs have correct format: splitIdx-ergIdx-localId
          pointSets.forEach((ps: any) => {
            ps.currentIds.forEach((id: string) => {
              const parts = id.split("-");
              expect(parts.length).toBe(3);
              expect(parts[0]).toBe(String(youngMalesSplitIdx));
              expect(parts[1]).toBe(String(ps.responseGroupIndex.expanded));
              expect(Number(parts[2])).toBeGreaterThanOrEqual(0);
            });
          });
        });

        it("should redistribute points with some added and removed based on proportion shift", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          // Wave 1: [1/3, 1/3, 1/3, 0] → counts [~33, ~33, ~33, 0] (actually [40, 40, 20, 0] due to rounding)
          // Wave 2: [2/4, 1/4, 1/4, 0] → counts [~50, ~25, ~25, 0] (actually [~63, 25, ~12, 0])
          const stronglyFav = pointSets[0]; // ergIdx = 0, gained points
          const favorable = pointSets[1]; // ergIdx = 1, lost points
          const unfavorable = pointSets[2]; // ergIdx = 2, lost points
          const stronglyUnfav = pointSets[3]; // ergIdx = 3, still 0

          // strongly_favorable: gained points (~23 added)
          expect(stronglyFav.currentIds.length).toBeGreaterThanOrEqual(62);
          expect(stronglyFav.currentIds.length).toBeLessThanOrEqual(63);
          expect(stronglyFav.addedIds.length).toBeGreaterThanOrEqual(22);
          expect(stronglyFav.addedIds.length).toBeLessThanOrEqual(23);

          // favorable: lost points (15 removed)
          expect(favorable.currentIds.length).toBe(25);
          expect(favorable.removedIds.length).toBe(15);

          // unfavorable: lost points (~7-8 removed)
          expect(unfavorable.currentIds.length).toBeGreaterThanOrEqual(12);
          expect(unfavorable.currentIds.length).toBeLessThanOrEqual(13);
          expect(unfavorable.removedIds.length).toBeGreaterThanOrEqual(7);
          expect(unfavorable.removedIds.length).toBeLessThanOrEqual(8);

          // strongly_unfavorable: still empty
          expect(stronglyUnfav.currentIds).toEqual([]);
          expect(stronglyUnfav.addedIds).toEqual([]);
          expect(stronglyUnfav.removedIds).toEqual([]);

          // Total should still be 100
          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(100);

          // Sequential localIds within each response group
          stronglyFav.currentIds.forEach((id: string, idx: number) => {
            expect(id).toBe(`${youngMalesSplitIdx}-0-${idx}`);
          });
          favorable.currentIds.forEach((id: string, idx: number) => {
            expect(id).toBe(`${youngMalesSplitIdx}-1-${idx}`);
          });
          unfavorable.currentIds.forEach((id: string, idx: number) => {
            expect(id).toBe(`${youngMalesSplitIdx}-2-${idx}`);
          });
        });
      });

      describe("oldFemales proportion shift (adds respondents 9 and 10)", () => {
        it("should maintain 100 total points with proper composite ID format", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );

          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(100);

          // Validate composite ID format
          pointSets.forEach((ps: any) => {
            ps.currentIds.forEach((id: string) => {
              const parts = id.split("-");
              expect(parts.length).toBe(3);
              expect(parts[0]).toBe(String(oldFemalesSplitIdx));
              expect(parts[1]).toBe(String(ps.responseGroupIndex.expanded));
              expect(Number(parts[2])).toBeGreaterThanOrEqual(0);
            });
          });
        });

        it("should redistribute points based on new proportions", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          // Wave 1: [0, 1/4, 2/4, 1/4] → counts [0, ~20, ~40, ~40] (actual [0, 20, 40, 40])
          // Wave 2: [0, 2/6, 3/6, 1/6] → counts [0, ~33, ~50, ~17] (actual [0, ~38, ~38, ~24])
          const stronglyFav = pointSets[0]; // ergIdx = 0, still 0
          const favorable = pointSets[1]; // ergIdx = 1, gained points (~18 added)
          const unfavorable = pointSets[2]; // ergIdx = 2, slight change (~2 removed)
          const stronglyUnfav = pointSets[3]; // ergIdx = 3, lost points (~16 removed)

          // strongly_favorable: still empty
          expect(stronglyFav.currentIds).toEqual([]);
          expect(stronglyFav.addedIds).toEqual([]);
          expect(stronglyFav.removedIds).toEqual([]);

          // favorable: gained points
          expect(favorable.currentIds.length).toBeGreaterThanOrEqual(37);
          expect(favorable.currentIds.length).toBeLessThanOrEqual(38);
          expect(favorable.addedIds.length).toBeGreaterThanOrEqual(17);
          expect(favorable.addedIds.length).toBeLessThanOrEqual(18);

          // unfavorable: slight decrease
          expect(unfavorable.currentIds.length).toBeGreaterThanOrEqual(37);
          expect(unfavorable.currentIds.length).toBeLessThanOrEqual(38);
          expect(unfavorable.removedIds.length).toBeGreaterThanOrEqual(2);
          expect(unfavorable.removedIds.length).toBeLessThanOrEqual(3);

          // strongly_unfavorable: lost points
          expect(stronglyUnfav.currentIds.length).toBeGreaterThanOrEqual(24);
          expect(stronglyUnfav.currentIds.length).toBeLessThanOrEqual(25);
          expect(stronglyUnfav.removedIds.length).toBeGreaterThanOrEqual(15);
          expect(stronglyUnfav.removedIds.length).toBeLessThanOrEqual(16);

          // Total should still be 100
          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(100);

          // Sequential localIds
          favorable.currentIds.forEach((id: string, idx: number) => {
            expect(id).toBe(`${oldFemalesSplitIdx}-1-${idx}`);
          });
          unfavorable.currentIds.forEach((id: string, idx: number) => {
            expect(id).toBe(`${oldFemalesSplitIdx}-2-${idx}`);
          });
          stronglyUnfav.currentIds.forEach((id: string, idx: number) => {
            expect(id).toBe(`${oldFemalesSplitIdx}-3-${idx}`);
          });
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
        // (1) Create Statistics instance with Wave 1 data
        stats = new Statistics(statsConfig, wave1Respondents, weightQuestion);

        // (2) Create SegmentViz WITHOUT synthetic sample size
        segmentViz = new SegmentViz(stats, baseVizConfig);

        // (3) Update Statistics with Wave 2 data
        stats.updateSplits(wave2Respondents);

        // Get updated state
        splits = stats.getSplits();
        favViz = segmentViz.getVisualization(getQuestionKey(favorabilityResponseQuestion));

        // Find split indices
        youngMalesSplitIdx = findSplitIndex(splits, "young", "male");
        oldFemalesSplitIdx = findSplitIndex(splits, "old", "female");
      });

      describe("youngMales adds respondent 8", () => {
        it("should have 4 total points (one per respondent)", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx
          );

          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(4);

          const totalAdded = pointSets.reduce((sum: number, ps: any) => sum + ps.addedIds.length, 0);
          expect(totalAdded).toBe(1);

          const totalRemoved = pointSets.reduce((sum: number, ps: any) => sum + ps.removedIds.length, 0);
          expect(totalRemoved).toBe(0);

          // Validate composite ID format
          pointSets.forEach((ps: any) => {
            ps.currentIds.forEach((id: string) => {
              const parts = id.split("-");
              expect(parts.length).toBe(3);
              expect(parts[0]).toBe(String(youngMalesSplitIdx));
              expect(parts[1]).toBe(String(ps.responseGroupIndex.expanded));
            });
          });
        });

        it("should preserve existing IDs and add one new ID for respondent 8", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const stronglyFav = pointSets[0]; // ergIdx = 0
          const favorable = pointSets[1]; // ergIdx = 1
          const unfavorable = pointSets[2]; // ergIdx = 2
          const stronglyUnfav = pointSets[3]; // ergIdx = 3

          // Wave 1: ids 1, 2, 3 with favorability [1, 2, 3] → stronglyFav=1, fav=1, unfav=1
          // Wave 2: adds id 8 with favorability=1 → stronglyFav=2, fav=1, unfav=1

          // strongly_favorable: should have 2 points (ids 1 and 8)
          expect(stronglyFav.currentIds.length).toBe(2);
          expect(stronglyFav.currentIds).toEqual([`${youngMalesSplitIdx}-0-0`, `${youngMalesSplitIdx}-0-1`]);
          expect(stronglyFav.addedIds).toEqual([`${youngMalesSplitIdx}-0-1`]);
          expect(stronglyFav.removedIds).toEqual([]);

          // favorable: 1 point (id 2)
          expect(favorable.currentIds).toEqual([`${youngMalesSplitIdx}-1-0`]);
          expect(favorable.addedIds).toEqual([]);
          expect(favorable.removedIds).toEqual([]);

          // unfavorable: 1 point (id 3)
          expect(unfavorable.currentIds).toEqual([`${youngMalesSplitIdx}-2-0`]);
          expect(unfavorable.addedIds).toEqual([]);
          expect(unfavorable.removedIds).toEqual([]);

          // strongly_unfavorable: empty
          expect(stronglyUnfav.currentIds).toEqual([]);
          expect(stronglyUnfav.addedIds).toEqual([]);
          expect(stronglyUnfav.removedIds).toEqual([]);
        });
      });

      describe("oldFemales adds respondents 9 and 10", () => {
        it("should have 6 total points with 2 added", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );

          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(6);

          const totalAdded = pointSets.reduce((sum: number, ps: any) => sum + ps.addedIds.length, 0);
          expect(totalAdded).toBe(2);

          const totalRemoved = pointSets.reduce((sum: number, ps: any) => sum + ps.removedIds.length, 0);
          expect(totalRemoved).toBe(0);

          // Validate composite ID format
          pointSets.forEach((ps: any) => {
            ps.currentIds.forEach((id: string) => {
              const parts = id.split("-");
              expect(parts.length).toBe(3);
              expect(parts[0]).toBe(String(oldFemalesSplitIdx));
              expect(parts[1]).toBe(String(ps.responseGroupIndex.expanded));
            });
          });
        });

        it("should preserve existing IDs and add two new IDs for respondents 9 and 10", () => {
          const pointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const stronglyFav = pointSets[0]; // ergIdx = 0
          const favorable = pointSets[1]; // ergIdx = 1
          const unfavorable = pointSets[2]; // ergIdx = 2
          const stronglyUnfav = pointSets[3]; // ergIdx = 3

          // Wave 1: ids 4, 5, 6, 7 with favorability [2, 3, 3, 4] → fav=1, unfav=2, stronglyUnfav=1
          // Wave 2: adds ids 9, 10 with favorability [2, 3] → fav=2, unfav=3, stronglyUnfav=1

          // strongly_favorable: still empty
          expect(stronglyFav.currentIds).toEqual([]);
          expect(stronglyFav.addedIds).toEqual([]);
          expect(stronglyFav.removedIds).toEqual([]);

          // favorable: should have 2 points (ids 4 and 9)
          expect(favorable.currentIds.length).toBe(2);
          expect(favorable.currentIds).toEqual([`${oldFemalesSplitIdx}-1-0`, `${oldFemalesSplitIdx}-1-1`]);
          expect(favorable.addedIds).toEqual([`${oldFemalesSplitIdx}-1-1`]);
          expect(favorable.removedIds).toEqual([]);

          // unfavorable: should have 3 points (ids 5, 6, 10)
          expect(unfavorable.currentIds.length).toBe(3);
          expect(unfavorable.currentIds).toEqual([
            `${oldFemalesSplitIdx}-2-0`,
            `${oldFemalesSplitIdx}-2-1`,
            `${oldFemalesSplitIdx}-2-2`,
          ]);
          expect(unfavorable.addedIds).toEqual([`${oldFemalesSplitIdx}-2-2`]);
          expect(unfavorable.removedIds).toEqual([]);

          // strongly_unfavorable: 1 point (id 7)
          expect(stronglyUnfav.currentIds).toEqual([`${oldFemalesSplitIdx}-3-0`]);
          expect(stronglyUnfav.addedIds).toEqual([]);
          expect(stronglyUnfav.removedIds).toEqual([]);
        });
      });
    });
  });

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
        oldMalesSplitIdx = findSplitIndex(splits, "old", "male");
        youngFemalesSplitIdx = findSplitIndex(splits, "young", "female");
        youngMalesSplitIdx = findSplitIndex(splits, "young", "male");
        oldFemalesSplitIdx = findSplitIndex(splits, "old", "female");
      });

      describe("Newly populated: oldMales gets 2 respondents (ids 11-12)", () => {
        it("should create 100 new point IDs with proper composite ID format", () => {
          const pointSets = favViz.points.filter((ps: any) => ps.fullySpecifiedSplitIndex === oldMalesSplitIdx);

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
              const parts = id.split("-");
              expect(parts.length).toBe(3);
              expect(parts[0]).toBe(String(oldMalesSplitIdx));
              expect(parts[1]).toBe(String(ps.responseGroupIndex.expanded));
              expect(Number(parts[2])).toBeGreaterThanOrEqual(0);
            });
          });
        });

        it("should assign sequential localIds within each response group", () => {
          const pointSets = favViz.points.filter((ps: any) => ps.fullySpecifiedSplitIndex === oldMalesSplitIdx);
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          // proportions [2/3, 0, 1/3, 0] → counts [67, 0, 33, 0]
          const stronglyFav = pointSets[0]; // ergIdx = 0, count = 67
          const favorable = pointSets[1]; // ergIdx = 1, count = 0
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
              const parts = id.split("-");
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
          const stronglyFav = pointSets[0]; // ergIdx = 0, count = 0
          const favorable = pointSets[1]; // ergIdx = 1, count = 25
          const unfavorable = pointSets[2]; // ergIdx = 2, count = 0
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
          const pointSets = favViz.points.filter((ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx);

          // Total should still be 100
          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(100);

          // No changes at all
          pointSets.forEach((ps: any) => {
            expect(ps.addedIds).toEqual([]);
            expect(ps.removedIds).toEqual([]);

            // Validate IDs are well-formed
            ps.currentIds.forEach((id: string) => {
              const parts = id.split("-");
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
          const pointSets = favViz.points.filter((ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx);

          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(100);

          // No changes
          pointSets.forEach((ps: any) => {
            expect(ps.addedIds).toEqual([]);
            expect(ps.removedIds).toEqual([]);

            // Validate IDs are well-formed
            ps.currentIds.forEach((id: string) => {
              const parts = id.split("-");
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

        // (2) Create SegmentViz WITHOUT synthetic sample size
        segmentViz = new SegmentViz(stats, baseVizConfig);

        // (3) Update Statistics with Wave 3 data
        stats.updateSplits(wave3Respondents);

        // Get updated state
        splits = stats.getSplits();
        favViz = segmentViz.getVisualization(getQuestionKey(favorabilityResponseQuestion));

        // Find split indices
        oldMalesSplitIdx = findSplitIndex(splits, "old", "male");
        youngFemalesSplitIdx = findSplitIndex(splits, "young", "female");
        youngMalesSplitIdx = findSplitIndex(splits, "young", "male");
        oldFemalesSplitIdx = findSplitIndex(splits, "old", "female");
      });

      describe("Newly populated: oldMales gets 2 respondents (ids 11-12)", () => {
        it("should create 2 new point IDs with proper composite format", () => {
          const pointSets = favViz.points.filter((ps: any) => ps.fullySpecifiedSplitIndex === oldMalesSplitIdx);

          const totalPoints = pointSets.reduce((sum: number, ps: any) => sum + ps.currentIds.length, 0);
          expect(totalPoints).toBe(2);

          const totalAdded = pointSets.reduce((sum: number, ps: any) => sum + ps.addedIds.length, 0);
          expect(totalAdded).toBe(2);

          const totalRemoved = pointSets.reduce((sum: number, ps: any) => sum + ps.removedIds.length, 0);
          expect(totalRemoved).toBe(0);

          // Validate composite ID format
          pointSets.forEach((ps: any) => {
            ps.currentIds.forEach((id: string) => {
              const parts = id.split("-");
              expect(parts.length).toBe(3);
              expect(parts[0]).toBe(String(oldMalesSplitIdx));
              expect(parts[1]).toBe(String(ps.responseGroupIndex.expanded));
            });
          });
        });

        it("should create specific IDs for respondents 11 and 12", () => {
          const pointSets = favViz.points.filter((ps: any) => ps.fullySpecifiedSplitIndex === oldMalesSplitIdx);
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const stronglyFav = pointSets[0]; // ergIdx = 0
          const favorable = pointSets[1]; // ergIdx = 1
          const unfavorable = pointSets[2]; // ergIdx = 2
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
              const parts = id.split("-");
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

          const stronglyFav = pointSets[0]; // ergIdx = 0
          const favorable = pointSets[1]; // ergIdx = 1
          const unfavorable = pointSets[2]; // ergIdx = 2
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
          const pointSets = favViz.points.filter((ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx);
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const stronglyFav = pointSets[0]; // ergIdx = 0
          const favorable = pointSets[1]; // ergIdx = 1
          const unfavorable = pointSets[2]; // ergIdx = 2
          const stronglyUnfav = pointSets[3]; // ergIdx = 3

          // Wave 1+2 final state: [2, 1, 1, 0] - respondents 1,2,3,8
          // strongly_favorable: respondents 1 and 8 → IDs 0-0-0, 0-0-1
          expect(stronglyFav.currentIds).toEqual([`${youngMalesSplitIdx}-0-0`, `${youngMalesSplitIdx}-0-1`]);
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
          const pointSets = favViz.points.filter((ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx);
          pointSets.sort((a: any, b: any) => a.responseGroupIndex.expanded - b.responseGroupIndex.expanded);

          const stronglyFav = pointSets[0]; // ergIdx = 0
          const favorable = pointSets[1]; // ergIdx = 1
          const unfavorable = pointSets[2]; // ergIdx = 2
          const stronglyUnfav = pointSets[3]; // ergIdx = 3

          // Wave 1+2 final state: [0, 2, 3, 1] - respondents 4,5,6,7,9,10
          // strongly_favorable: empty
          expect(stronglyFav.currentIds).toEqual([]);
          expect(stronglyFav.addedIds).toEqual([]);
          expect(stronglyFav.removedIds).toEqual([]);

          // favorable: respondents 4, 9 → IDs 1-1-0, 1-1-1
          expect(favorable.currentIds).toEqual([`${oldFemalesSplitIdx}-1-0`, `${oldFemalesSplitIdx}-1-1`]);
          expect(favorable.addedIds).toEqual([]);
          expect(favorable.removedIds).toEqual([]);

          // unfavorable: respondents 5, 6, 10 → IDs 1-2-0, 1-2-1, 1-2-2
          expect(unfavorable.currentIds).toEqual([
            `${oldFemalesSplitIdx}-2-0`,
            `${oldFemalesSplitIdx}-2-1`,
            `${oldFemalesSplitIdx}-2-2`,
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
