/**
 * @file Proportion Shift Delta Tests for SegmentViz Updates
 *
 * This file tests segment bounds and point position deltas when SegmentViz responds to
 * proportion changes in already-populated splits (Wave 1 → Wave 2).
 *
 * Scenario 1: Proportion Shifts (Wave 1 → Wave 2)
 * - youngMales: 3 respondents → 4 (adds id 8)
 *   - Wave 1: proportions [1/3, 1/3, 1/3, 0]
 *   - Wave 2: proportions [2/4, 1/4, 1/4, 0]
 * - oldFemales: 4 respondents → 6 (adds ids 9, 10)
 *   - Wave 1: proportions [0, 1/4, 2/4, 1/4]
 *   - Wave 2: proportions [0, 2/6, 3/6, 1/6]
 *
 * Tests verify:
 * - Segment bounds before/after values match actual visualization geometry
 * - Point position deltas (added, removed, moved) accurately reflect changes
 * - Both expanded (4 response groups) and collapsed (2 groups) views work correctly
 */

import { Statistics } from "../../src/statistics";
import { SegmentViz } from "../../src/segmentViz";
import type { SegmentVizConfig } from "../../src/segmentViz/types";
import {
  wave1Respondents,
  wave2Respondents,
  statsConfig,
  baseVizConfig,
  favorabilityResponseQuestion,
  weightQuestion,
  getQuestionKey,
  findSplitIndex,
  randomSample,
  findPointPosition,
  getSegmentBounds,
} from "./helpers";

describe("SegmentViz Updates - Proportion Shift Delta Tests", () => {
  describe("Proportion Shifts (Wave 1 → Wave 2)", () => {
    describe("With Synthetic Sample Size", () => {
      let beforeViz: any;
      let afterViz: any;
      let segmentsDiff: any;
      let youngMalesSplitIdx: number;
      let oldFemalesSplitIdx: number;

      beforeAll(() => {
        // We need to create a completely fresh SegmentViz to capture before/after states properly
        // since point positions are randomized and we need to track the SAME instance's deltas
        const statsForTest = new Statistics(statsConfig, wave1Respondents, weightQuestion);
        const vizConfigForTest: SegmentVizConfig = {
          ...baseVizConfig,
          syntheticSampleSize: 100,
        };
        const segmentVizForTest = new SegmentViz(statsForTest, vizConfigForTest);

        // Capture before state
        beforeViz = segmentVizForTest.getVisualization(getQuestionKey(favorabilityResponseQuestion));

        // Perform update
        statsForTest.updateSplits(wave2Respondents);

        // Capture after state
        afterViz = segmentVizForTest.getVisualization(getQuestionKey(favorabilityResponseQuestion));

        // Get the diff
        segmentsDiff = segmentVizForTest.getSegmentsDiffMap(getQuestionKey(favorabilityResponseQuestion));

        // Find split indices
        const splits = statsForTest.getSplits();
        youngMalesSplitIdx = findSplitIndex(splits, "young", "male");
        oldFemalesSplitIdx = findSplitIndex(splits, "old", "female");
      });

      describe("youngMales segment bounds deltas - Expanded view", () => {
        it("should have boundsDelta for all 4 response groups with correct before/after values", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          expect(youngMalesDiff).toBeDefined();

          const boundsDelta = youngMalesDiff.segmentsDelta.expanded.boundsDelta;
          expect(boundsDelta.length).toBe(4);

          // Verify each response group has a bounds delta
          for (let rgIdx = 0; rgIdx < 4; rgIdx++) {
            const delta = boundsDelta.find((bd: any) => bd.responseGroupIndex === rgIdx);
            expect(delta).toBeDefined();
            expect(delta.responseGroupIndex).toBe(rgIdx);

            // Get actual before/after bounds
            const beforeBounds = getSegmentBounds(beforeViz, youngMalesSplitIdx, rgIdx, "expanded");
            const afterBounds = getSegmentBounds(afterViz, youngMalesSplitIdx, rgIdx, "expanded");

            expect(beforeBounds).toBeDefined();
            expect(afterBounds).toBeDefined();

            // Verify delta matches actual changes
            expect(delta.xBefore).toBeCloseTo(beforeBounds!.x, 5);
            expect(delta.xAfter).toBeCloseTo(afterBounds!.x, 5);
            expect(delta.widthBefore).toBeCloseTo(beforeBounds!.width, 5);
            expect(delta.widthAfter).toBeCloseTo(afterBounds!.width, 5);
          }
        });

        it("should show width increase for strongly_favorable (proportion 2/5 → 5/8)", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const stronglyFavDelta = youngMalesDiff.segmentsDelta.expanded.boundsDelta.find(
            (bd: any) => bd.responseGroupIndex === 0
          );

          expect(stronglyFavDelta.widthAfter).toBeGreaterThan(stronglyFavDelta.widthBefore);
        });

        it("should show width decrease for favorable (proportion 2/5 → 2/8)", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const favDelta = youngMalesDiff.segmentsDelta.expanded.boundsDelta.find(
            (bd: any) => bd.responseGroupIndex === 1
          );

          expect(favDelta.widthAfter).toBeLessThan(favDelta.widthBefore);
        });

        it("should show width decrease for unfavorable (proportion 1/5 → 1/8)", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const unfavDelta = youngMalesDiff.segmentsDelta.expanded.boundsDelta.find(
            (bd: any) => bd.responseGroupIndex === 2
          );

          expect(unfavDelta.widthAfter).toBeLessThan(unfavDelta.widthBefore);
        });
      });

      describe("youngMales segment bounds deltas - Collapsed view", () => {
        it("should have boundsDelta for both collapsed response groups", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const boundsDelta = youngMalesDiff.segmentsDelta.collapsed.boundsDelta;
          expect(boundsDelta.length).toBe(2);

          for (let rgIdx = 0; rgIdx < 2; rgIdx++) {
            const delta = boundsDelta.find((bd: any) => bd.responseGroupIndex === rgIdx);
            expect(delta).toBeDefined();

            const beforeBounds = getSegmentBounds(beforeViz, youngMalesSplitIdx, rgIdx, "collapsed");
            const afterBounds = getSegmentBounds(afterViz, youngMalesSplitIdx, rgIdx, "collapsed");

            expect(delta.xBefore).toBeCloseTo(beforeBounds!.x, 5);
            expect(delta.xAfter).toBeCloseTo(afterBounds!.x, 5);
            expect(delta.widthBefore).toBeCloseTo(beforeBounds!.width, 5);
            expect(delta.widthAfter).toBeCloseTo(afterBounds!.width, 5);
          }
        });
      });

      describe("youngMales point position deltas - Expanded view", () => {
        it("should have pointsDelta for all 4 response groups", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const pointsDelta = youngMalesDiff.segmentsDelta.expanded.pointsDelta;
          expect(pointsDelta.length).toBe(4);
        });

        it("should have added points in strongly_favorable with correct positions", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const stronglyFavDelta = youngMalesDiff.segmentsDelta.expanded.pointsDelta.find(
            (pd: any) => pd.responseGroupIndex === 0
          );

          expect(stronglyFavDelta.addedPoints.length).toBeGreaterThanOrEqual(22);
          expect(stronglyFavDelta.addedPoints.length).toBeLessThanOrEqual(23);
          expect(stronglyFavDelta.removedPoints).toEqual([]);

          // Verify positions of added points match current visualization
          stronglyFavDelta.addedPoints.forEach((pt: any) => {
            const actualPos = findPointPosition(afterViz, youngMalesSplitIdx, pt.id, "expanded");
            expect(actualPos).toBeDefined();
            expect(pt.x).toBeCloseTo(actualPos!.x, 5);
            expect(pt.y).toBeCloseTo(actualPos!.y, 5);
          });
        });

        it("should have moved points in strongly_favorable with correct before/after positions", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const stronglyFavDelta = youngMalesDiff.segmentsDelta.expanded.pointsDelta.find(
            (pd: any) => pd.responseGroupIndex === 0
          );

          expect(stronglyFavDelta.movedPoints.length).toBeGreaterThan(0);

          // Sample and verify some moved points
          const sampled = randomSample(stronglyFavDelta.movedPoints, 5);
          sampled.forEach((movedPt: any) => {
            const beforePos = findPointPosition(beforeViz, youngMalesSplitIdx, movedPt.id, "expanded");
            const afterPos = findPointPosition(afterViz, youngMalesSplitIdx, movedPt.id, "expanded");

            expect(beforePos).toBeDefined();
            expect(afterPos).toBeDefined();

            expect(movedPt.xBefore).toBeCloseTo(beforePos!.x, 5);
            expect(movedPt.yBefore).toBeCloseTo(beforePos!.y, 5);
            expect(movedPt.xAfter).toBeCloseTo(afterPos!.x, 5);
            expect(movedPt.yAfter).toBeCloseTo(afterPos!.y, 5);
          });
        });

        it("should have removed points in favorable with correct positions", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const favDelta = youngMalesDiff.segmentsDelta.expanded.pointsDelta.find(
            (pd: any) => pd.responseGroupIndex === 1
          );

          expect(favDelta.addedPoints).toEqual([]);
          expect(favDelta.removedPoints.length).toBe(15);

          // Verify positions of removed points match before visualization
          favDelta.removedPoints.forEach((pt: any) => {
            const beforePos = findPointPosition(beforeViz, youngMalesSplitIdx, pt.id, "expanded");
            expect(beforePos).toBeDefined();
            expect(pt.x).toBeCloseTo(beforePos!.x, 5);
            expect(pt.y).toBeCloseTo(beforePos!.y, 5);
          });
        });

        it("should have moved points in favorable with correct before/after positions", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const favDelta = youngMalesDiff.segmentsDelta.expanded.pointsDelta.find(
            (pd: any) => pd.responseGroupIndex === 1
          );

          expect(favDelta.movedPoints.length).toBe(25);

          // Sample and verify
          const sampled = randomSample(favDelta.movedPoints, 5);
          sampled.forEach((movedPt: any) => {
            const beforePos = findPointPosition(beforeViz, youngMalesSplitIdx, movedPt.id, "expanded");
            const afterPos = findPointPosition(afterViz, youngMalesSplitIdx, movedPt.id, "expanded");

            expect(movedPt.xBefore).toBeCloseTo(beforePos!.x, 5);
            expect(movedPt.yBefore).toBeCloseTo(beforePos!.y, 5);
            expect(movedPt.xAfter).toBeCloseTo(afterPos!.x, 5);
            expect(movedPt.yAfter).toBeCloseTo(afterPos!.y, 5);
          });
        });

        it("should have empty arrays for strongly_unfavorable (remains at 0)", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const stronglyUnfavDelta = youngMalesDiff.segmentsDelta.expanded.pointsDelta.find(
            (pd: any) => pd.responseGroupIndex === 3
          );

          expect(stronglyUnfavDelta.addedPoints).toEqual([]);
          expect(stronglyUnfavDelta.removedPoints).toEqual([]);
          expect(stronglyUnfavDelta.movedPoints).toEqual([]);
        });
      });

      describe("youngMales point position deltas - Collapsed view", () => {
        it("should have pointsDelta for both collapsed response groups", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const pointsDelta = youngMalesDiff.segmentsDelta.collapsed.pointsDelta;
          expect(pointsDelta.length).toBe(2);
        });

        it("should have added and moved points in all_favorable", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const allFavDelta = youngMalesDiff.segmentsDelta.collapsed.pointsDelta.find(
            (pd: any) => pd.responseGroupIndex === 0
          );

          expect(allFavDelta.addedPoints.length).toBeGreaterThan(0);
          expect(allFavDelta.movedPoints.length).toBeGreaterThan(0);

          // Sample and verify some moved points
          const sampled = randomSample(allFavDelta.movedPoints, 5);
          sampled.forEach((movedPt: any) => {
            const beforePos = findPointPosition(beforeViz, youngMalesSplitIdx, movedPt.id, "collapsed");
            const afterPos = findPointPosition(afterViz, youngMalesSplitIdx, movedPt.id, "collapsed");

            if (beforePos && afterPos) {
              expect(movedPt.xBefore).toBeCloseTo(beforePos.x, 5);
              expect(movedPt.yBefore).toBeCloseTo(beforePos.y, 5);
              expect(movedPt.xAfter).toBeCloseTo(afterPos.x, 5);
              expect(movedPt.yAfter).toBeCloseTo(afterPos.y, 5);
            }
          });
        });
      });

      describe("oldFemales segment bounds deltas - Expanded view", () => {
        it("should have boundsDelta for all 4 response groups", () => {
          const oldFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldFemalesSplitIdx);
          const boundsDelta = oldFemalesDiff.segmentsDelta.expanded.boundsDelta;
          expect(boundsDelta.length).toBe(4);

          for (let rgIdx = 0; rgIdx < 4; rgIdx++) {
            const delta = boundsDelta.find((bd: any) => bd.responseGroupIndex === rgIdx);
            expect(delta).toBeDefined();

            const beforeBounds = getSegmentBounds(beforeViz, oldFemalesSplitIdx, rgIdx, "expanded");
            const afterBounds = getSegmentBounds(afterViz, oldFemalesSplitIdx, rgIdx, "expanded");

            expect(delta.xBefore).toBeCloseTo(beforeBounds!.x, 5);
            expect(delta.xAfter).toBeCloseTo(afterBounds!.x, 5);
            expect(delta.widthBefore).toBeCloseTo(beforeBounds!.width, 5);
            expect(delta.widthAfter).toBeCloseTo(afterBounds!.width, 5);
          }
        });

        it("should show width increase for favorable (proportion 1/5 → 3/8)", () => {
          const oldFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldFemalesSplitIdx);
          const favDelta = oldFemalesDiff.segmentsDelta.expanded.boundsDelta.find(
            (bd: any) => bd.responseGroupIndex === 1
          );

          expect(favDelta.widthAfter).toBeGreaterThan(favDelta.widthBefore);
        });

        it("should show width decrease for strongly_unfavorable (proportion 2/5 → 2/8)", () => {
          const oldFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldFemalesSplitIdx);
          const stronglyUnfavDelta = oldFemalesDiff.segmentsDelta.expanded.boundsDelta.find(
            (bd: any) => bd.responseGroupIndex === 3
          );

          expect(stronglyUnfavDelta.widthAfter).toBeLessThan(stronglyUnfavDelta.widthBefore);
        });
      });

      describe("oldFemales segment bounds deltas - Collapsed view", () => {
        it("should have boundsDelta for both collapsed response groups", () => {
          const oldFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldFemalesSplitIdx);
          const boundsDelta = oldFemalesDiff.segmentsDelta.collapsed.boundsDelta;
          expect(boundsDelta.length).toBe(2);

          for (let rgIdx = 0; rgIdx < 2; rgIdx++) {
            const delta = boundsDelta.find((bd: any) => bd.responseGroupIndex === rgIdx);
            expect(delta).toBeDefined();

            const beforeBounds = getSegmentBounds(beforeViz, oldFemalesSplitIdx, rgIdx, "collapsed");
            const afterBounds = getSegmentBounds(afterViz, oldFemalesSplitIdx, rgIdx, "collapsed");

            expect(delta.xBefore).toBeCloseTo(beforeBounds!.x, 5);
            expect(delta.xAfter).toBeCloseTo(afterBounds!.x, 5);
            expect(delta.widthBefore).toBeCloseTo(beforeBounds!.width, 5);
            expect(delta.widthAfter).toBeCloseTo(afterBounds!.width, 5);
          }
        });
      });

      describe("oldFemales point position deltas - Expanded view", () => {
        it("should have added points in favorable with correct positions", () => {
          const oldFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldFemalesSplitIdx);
          const favDelta = oldFemalesDiff.segmentsDelta.expanded.pointsDelta.find(
            (pd: any) => pd.responseGroupIndex === 1
          );

          expect(favDelta.addedPoints.length).toBeGreaterThanOrEqual(17);
          expect(favDelta.addedPoints.length).toBeLessThanOrEqual(18);
          expect(favDelta.removedPoints).toEqual([]);

          // Verify positions match
          favDelta.addedPoints.forEach((pt: any) => {
            const actualPos = findPointPosition(afterViz, oldFemalesSplitIdx, pt.id, "expanded");
            expect(actualPos).toBeDefined();
            expect(pt.x).toBeCloseTo(actualPos!.x, 5);
            expect(pt.y).toBeCloseTo(actualPos!.y, 5);
          });
        });

        it("should have removed points in strongly_unfavorable with correct positions", () => {
          const oldFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldFemalesSplitIdx);
          const stronglyUnfavDelta = oldFemalesDiff.segmentsDelta.expanded.pointsDelta.find(
            (pd: any) => pd.responseGroupIndex === 3
          );

          expect(stronglyUnfavDelta.removedPoints.length).toBeGreaterThanOrEqual(15);
          expect(stronglyUnfavDelta.removedPoints.length).toBeLessThanOrEqual(16);
          expect(stronglyUnfavDelta.addedPoints).toEqual([]);

          // Verify positions match before state
          stronglyUnfavDelta.removedPoints.forEach((pt: any) => {
            const beforePos = findPointPosition(beforeViz, oldFemalesSplitIdx, pt.id, "expanded");
            expect(beforePos).toBeDefined();
            expect(pt.x).toBeCloseTo(beforePos!.x, 5);
            expect(pt.y).toBeCloseTo(beforePos!.y, 5);
          });
        });

        it("should have moved points with correct before/after positions", () => {
          const oldFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldFemalesSplitIdx);
          const pointsDelta = oldFemalesDiff.segmentsDelta.expanded.pointsDelta;

          // Collect all moved points across response groups
          const allMovedPoints = pointsDelta.flatMap((pd: any) => pd.movedPoints);
          expect(allMovedPoints.length).toBeGreaterThan(0);

          // Sample and verify
          const sampled = randomSample(allMovedPoints, 10);
          sampled.forEach((movedPt: any) => {
            const beforePos = findPointPosition(beforeViz, oldFemalesSplitIdx, movedPt.id, "expanded");
            const afterPos = findPointPosition(afterViz, oldFemalesSplitIdx, movedPt.id, "expanded");

            expect(beforePos).toBeDefined();
            expect(afterPos).toBeDefined();

            expect(movedPt.xBefore).toBeCloseTo(beforePos!.x, 5);
            expect(movedPt.yBefore).toBeCloseTo(beforePos!.y, 5);
            expect(movedPt.xAfter).toBeCloseTo(afterPos!.x, 5);
            expect(movedPt.yAfter).toBeCloseTo(afterPos!.y, 5);
          });
        });
      });

      describe("oldFemales point position deltas - Collapsed view", () => {
        it("should have pointsDelta for both collapsed response groups", () => {
          const oldFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldFemalesSplitIdx);
          const pointsDelta = oldFemalesDiff.segmentsDelta.collapsed.pointsDelta;
          expect(pointsDelta.length).toBe(2);
        });

        it("should have moved points with correct positions in all_unfavorable", () => {
          const oldFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldFemalesSplitIdx);
          const allUnfavDelta = oldFemalesDiff.segmentsDelta.collapsed.pointsDelta.find(
            (pd: any) => pd.responseGroupIndex === 1
          );

          expect(allUnfavDelta.movedPoints.length).toBeGreaterThan(0);

          // Sample and verify
          const sampled = randomSample(allUnfavDelta.movedPoints, 5);
          sampled.forEach((movedPt: any) => {
            const beforePos = findPointPosition(beforeViz, oldFemalesSplitIdx, movedPt.id, "collapsed");
            const afterPos = findPointPosition(afterViz, oldFemalesSplitIdx, movedPt.id, "collapsed");

            if (beforePos && afterPos) {
              expect(movedPt.xBefore).toBeCloseTo(beforePos.x, 5);
              expect(movedPt.yBefore).toBeCloseTo(beforePos.y, 5);
              expect(movedPt.xAfter).toBeCloseTo(afterPos.x, 5);
              expect(movedPt.yAfter).toBeCloseTo(afterPos.y, 5);
            }
          });
        });
      });
    });

    describe("Without Synthetic Sample Size", () => {
      let beforeViz: any;
      let afterViz: any;
      let segmentsDiff: any;
      let youngMalesSplitIdx: number;
      let oldFemalesSplitIdx: number;

      beforeAll(() => {
        // Create a fresh instance to track deltas properly
        const statsForTest = new Statistics(statsConfig, wave1Respondents, weightQuestion);
        const vizConfigForTest: SegmentVizConfig = {
          ...baseVizConfig,
          // No syntheticSampleSize
        };
        const segmentVizForTest = new SegmentViz(statsForTest, vizConfigForTest);

        // Capture before state
        beforeViz = segmentVizForTest.getVisualization(getQuestionKey(favorabilityResponseQuestion));

        // Perform update
        statsForTest.updateSplits(wave2Respondents);

        // Capture after state
        afterViz = segmentVizForTest.getVisualization(getQuestionKey(favorabilityResponseQuestion));

        // Get diff
        segmentsDiff = segmentVizForTest.getSegmentsDiffMap(getQuestionKey(favorabilityResponseQuestion));

        // Find split indices
        const splits = statsForTest.getSplits();
        youngMalesSplitIdx = findSplitIndex(splits, "young", "male");
        oldFemalesSplitIdx = findSplitIndex(splits, "old", "female");
      });

      describe("youngMales deltas - Expanded view", () => {
        it("should have boundsDelta for all 4 response groups", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          expect(youngMalesDiff).toBeDefined();

          const boundsDelta = youngMalesDiff.segmentsDelta.expanded.boundsDelta;
          expect(boundsDelta.length).toBe(4);

          // Verify bounds match before/after state
          for (let rgIdx = 0; rgIdx < 4; rgIdx++) {
            const delta = boundsDelta.find((bd: any) => bd.responseGroupIndex === rgIdx);
            const beforeBounds = getSegmentBounds(beforeViz, youngMalesSplitIdx, rgIdx, "expanded");
            const afterBounds = getSegmentBounds(afterViz, youngMalesSplitIdx, rgIdx, "expanded");

            expect(delta.xBefore).toBeCloseTo(beforeBounds!.x, 5);
            expect(delta.xAfter).toBeCloseTo(afterBounds!.x, 5);
            expect(delta.widthBefore).toBeCloseTo(beforeBounds!.width, 5);
            expect(delta.widthAfter).toBeCloseTo(afterBounds!.width, 5);
          }
        });

        it("should have exactly 1 added point in strongly_favorable with correct position", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const stronglyFavDelta = youngMalesDiff.segmentsDelta.expanded.pointsDelta.find(
            (pd: any) => pd.responseGroupIndex === 0
          );

          expect(stronglyFavDelta.addedPoints.length).toBe(1);
          expect(stronglyFavDelta.removedPoints).toEqual([]);

          const addedPt = stronglyFavDelta.addedPoints[0];
          expect(addedPt.id).toBe(`${youngMalesSplitIdx}-0-1`);

          const actualPos = findPointPosition(afterViz, youngMalesSplitIdx, addedPt.id, "expanded");
          expect(actualPos).toBeDefined();
          expect(addedPt.x).toBeCloseTo(actualPos!.x, 5);
          expect(addedPt.y).toBeCloseTo(actualPos!.y, 5);
        });

        it("should track moved points if existing points repositioned", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const pointsDelta = youngMalesDiff.segmentsDelta.expanded.pointsDelta;

          // Check if any points moved (they might due to segment bound changes)
          const allMovedPoints = pointsDelta.flatMap((pd: any) => pd.movedPoints);

          // If points moved, verify their before/after positions
          allMovedPoints.forEach((movedPt: any) => {
            const beforePos = findPointPosition(beforeViz, youngMalesSplitIdx, movedPt.id, "expanded");
            const afterPos = findPointPosition(afterViz, youngMalesSplitIdx, movedPt.id, "expanded");

            expect(beforePos).toBeDefined();
            expect(afterPos).toBeDefined();

            expect(movedPt.xBefore).toBeCloseTo(beforePos!.x, 5);
            expect(movedPt.yBefore).toBeCloseTo(beforePos!.y, 5);
            expect(movedPt.xAfter).toBeCloseTo(afterPos!.x, 5);
            expect(movedPt.yAfter).toBeCloseTo(afterPos!.y, 5);
          });
        });

        it("should have no changes in favorable and unfavorable", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);

          const favDelta = youngMalesDiff.segmentsDelta.expanded.pointsDelta.find(
            (pd: any) => pd.responseGroupIndex === 1
          );
          expect(favDelta.addedPoints).toEqual([]);
          expect(favDelta.removedPoints).toEqual([]);

          const unfavDelta = youngMalesDiff.segmentsDelta.expanded.pointsDelta.find(
            (pd: any) => pd.responseGroupIndex === 2
          );
          expect(unfavDelta.addedPoints).toEqual([]);
          expect(unfavDelta.removedPoints).toEqual([]);
        });
      });

      describe("youngMales deltas - Collapsed view", () => {
        it("should have boundsDelta for both collapsed response groups", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const boundsDelta = youngMalesDiff.segmentsDelta.collapsed.boundsDelta;
          expect(boundsDelta.length).toBe(2);

          for (let rgIdx = 0; rgIdx < 2; rgIdx++) {
            const delta = boundsDelta.find((bd: any) => bd.responseGroupIndex === rgIdx);
            const beforeBounds = getSegmentBounds(beforeViz, youngMalesSplitIdx, rgIdx, "collapsed");
            const afterBounds = getSegmentBounds(afterViz, youngMalesSplitIdx, rgIdx, "collapsed");

            expect(delta.xBefore).toBeCloseTo(beforeBounds!.x, 5);
            expect(delta.xAfter).toBeCloseTo(afterBounds!.x, 5);
            expect(delta.widthBefore).toBeCloseTo(beforeBounds!.width, 5);
            expect(delta.widthAfter).toBeCloseTo(afterBounds!.width, 5);
          }
        });

        it("should have exactly 1 added point in all_favorable", () => {
          const youngMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngMalesSplitIdx);
          const allFavDelta = youngMalesDiff.segmentsDelta.collapsed.pointsDelta.find(
            (pd: any) => pd.responseGroupIndex === 0
          );

          expect(allFavDelta.addedPoints.length).toBe(1);
          expect(allFavDelta.removedPoints).toEqual([]);

          const addedPt = allFavDelta.addedPoints[0];
          const actualPos = findPointPosition(afterViz, youngMalesSplitIdx, addedPt.id, "collapsed");
          expect(actualPos).toBeDefined();
          expect(addedPt.x).toBeCloseTo(actualPos!.x, 5);
          expect(addedPt.y).toBeCloseTo(actualPos!.y, 5);
        });
      });

      describe("oldFemales deltas - Expanded view", () => {
        it("should have boundsDelta for all 4 response groups", () => {
          const oldFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldFemalesSplitIdx);
          const boundsDelta = oldFemalesDiff.segmentsDelta.expanded.boundsDelta;
          expect(boundsDelta.length).toBe(4);

          for (let rgIdx = 0; rgIdx < 4; rgIdx++) {
            const delta = boundsDelta.find((bd: any) => bd.responseGroupIndex === rgIdx);
            const beforeBounds = getSegmentBounds(beforeViz, oldFemalesSplitIdx, rgIdx, "expanded");
            const afterBounds = getSegmentBounds(afterViz, oldFemalesSplitIdx, rgIdx, "expanded");

            expect(delta.xBefore).toBeCloseTo(beforeBounds!.x, 5);
            expect(delta.xAfter).toBeCloseTo(afterBounds!.x, 5);
            expect(delta.widthBefore).toBeCloseTo(beforeBounds!.width, 5);
            expect(delta.widthAfter).toBeCloseTo(afterBounds!.width, 5);
          }
        });

        it("should have exactly 1 added point in favorable with correct position", () => {
          const oldFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldFemalesSplitIdx);
          const favDelta = oldFemalesDiff.segmentsDelta.expanded.pointsDelta.find(
            (pd: any) => pd.responseGroupIndex === 1
          );

          expect(favDelta.addedPoints.length).toBe(1);
          expect(favDelta.removedPoints).toEqual([]);

          const addedPt = favDelta.addedPoints[0];
          expect(addedPt.id).toBe(`${oldFemalesSplitIdx}-1-1`);

          const actualPos = findPointPosition(afterViz, oldFemalesSplitIdx, addedPt.id, "expanded");
          expect(actualPos).toBeDefined();
          expect(addedPt.x).toBeCloseTo(actualPos!.x, 5);
          expect(addedPt.y).toBeCloseTo(actualPos!.y, 5);
        });

        it("should have exactly 1 added point in unfavorable with correct position", () => {
          const oldFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldFemalesSplitIdx);
          const unfavDelta = oldFemalesDiff.segmentsDelta.expanded.pointsDelta.find(
            (pd: any) => pd.responseGroupIndex === 2
          );

          expect(unfavDelta.addedPoints.length).toBe(1);
          expect(unfavDelta.removedPoints).toEqual([]);

          const addedPt = unfavDelta.addedPoints[0];
          expect(addedPt.id).toBe(`${oldFemalesSplitIdx}-2-2`);

          const actualPos = findPointPosition(afterViz, oldFemalesSplitIdx, addedPt.id, "expanded");
          expect(actualPos).toBeDefined();
          expect(addedPt.x).toBeCloseTo(actualPos!.x, 5);
          expect(addedPt.y).toBeCloseTo(actualPos!.y, 5);
        });

        it("should track all moved points with correct before/after positions", () => {
          const oldFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldFemalesSplitIdx);
          const pointsDelta = oldFemalesDiff.segmentsDelta.expanded.pointsDelta;

          const allMovedPoints = pointsDelta.flatMap((pd: any) => pd.movedPoints);

          // Verify all moved points have correct positions
          allMovedPoints.forEach((movedPt: any) => {
            const beforePos = findPointPosition(beforeViz, oldFemalesSplitIdx, movedPt.id, "expanded");
            const afterPos = findPointPosition(afterViz, oldFemalesSplitIdx, movedPt.id, "expanded");

            expect(beforePos).toBeDefined();
            expect(afterPos).toBeDefined();

            expect(movedPt.xBefore).toBeCloseTo(beforePos!.x, 5);
            expect(movedPt.yBefore).toBeCloseTo(beforePos!.y, 5);
            expect(movedPt.xAfter).toBeCloseTo(afterPos!.x, 5);
            expect(movedPt.yAfter).toBeCloseTo(afterPos!.y, 5);
          });
        });
      });

      describe("oldFemales deltas - Collapsed view", () => {
        it("should have boundsDelta for both collapsed response groups", () => {
          const oldFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldFemalesSplitIdx);
          const boundsDelta = oldFemalesDiff.segmentsDelta.collapsed.boundsDelta;
          expect(boundsDelta.length).toBe(2);

          for (let rgIdx = 0; rgIdx < 2; rgIdx++) {
            const delta = boundsDelta.find((bd: any) => bd.responseGroupIndex === rgIdx);
            const beforeBounds = getSegmentBounds(beforeViz, oldFemalesSplitIdx, rgIdx, "collapsed");
            const afterBounds = getSegmentBounds(afterViz, oldFemalesSplitIdx, rgIdx, "collapsed");

            expect(delta.xBefore).toBeCloseTo(beforeBounds!.x, 5);
            expect(delta.xAfter).toBeCloseTo(afterBounds!.x, 5);
            expect(delta.widthBefore).toBeCloseTo(beforeBounds!.width, 5);
            expect(delta.widthAfter).toBeCloseTo(afterBounds!.width, 5);
          }
        });

        it("should have exactly 2 added points total across both response groups", () => {
          const oldFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldFemalesSplitIdx);
          const pointsDelta = oldFemalesDiff.segmentsDelta.collapsed.pointsDelta;

          const totalAdded = pointsDelta.reduce((sum: number, pd: any) => sum + pd.addedPoints.length, 0);
          expect(totalAdded).toBe(2);

          // Verify all added points have correct positions
          pointsDelta.forEach((pd: any) => {
            pd.addedPoints.forEach((addedPt: any) => {
              const actualPos = findPointPosition(afterViz, oldFemalesSplitIdx, addedPt.id, "collapsed");
              expect(actualPos).toBeDefined();
              expect(addedPt.x).toBeCloseTo(actualPos!.x, 5);
              expect(addedPt.y).toBeCloseTo(actualPos!.y, 5);
            });
          });
        });
      });
    });
  });
});
