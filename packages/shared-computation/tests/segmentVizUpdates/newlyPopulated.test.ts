/**
 * @file Newly Populated Splits Delta Tests for SegmentViz Updates
 *
 * This file tests segment bounds and point position deltas when SegmentViz responds to
 * splits becoming populated for the first time (Wave 1+2 → Wave 3).
 *
 * Scenario 2: Newly Populated Splits (Wave 1+2 → Wave 3)
 * - oldMales: 0 respondents → 2 (adds ids 11, 12)
 *   - respondent 11: favorability=1 (strongly_favorable)
 *   - respondent 12: favorability=3 (unfavorable)
 *   - Synthetic proportions: [2/3, 0, 1/3, 0] → counts [67, 0, 33, 0]
 * - youngFemales: 0 respondents → 2 (adds ids 13, 14)
 *   - respondent 13: favorability=2 (favorable)
 *   - respondent 14: favorability=4 (strongly_unfavorable)
 *   - Synthetic proportions: [0, 1/4, 0, 3/4] → counts [0, 25, 0, 75]
 * - youngMales: No new respondents (unchanged)
 * - oldFemales: No new respondents (unchanged)
 *
 * Tests verify:
 * - For newly populated splits: xBefore/widthBefore = 0, all points are "added"
 * - For unchanged splits: null delta (no changes)
 * - Segment geometry is properly populated in visualization
 */

import { Statistics } from "../../src/statistics";
import { SegmentViz } from "../../src/segmentViz";
import type { SegmentVizConfig } from "../../src/segmentViz/types";
import {
  wave3Respondents,
  wave1And2Combined,
  statsConfig,
  baseVizConfig,
  favorabilityResponseQuestion,
  weightQuestion,
  getQuestionKey,
  findSplitIndex,
  findPointPosition,
} from "./helpers";

describe("SegmentViz Updates - Newly Populated Split Delta Tests", () => {
  describe("Newly Populated Splits (Wave 1+2 → Wave 3)", () => {
    describe("With Synthetic Sample Size", () => {
      let stats: Statistics;
      let segmentViz: SegmentViz;
      let afterViz: any;
      let segmentsDiff: any;
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

        // (3) Update Statistics with Wave 3 data
        stats.updateSplits(wave3Respondents);

        // Get updated state using public API
        splits = stats.getSplits();
        afterViz = segmentViz.getVisualization(getQuestionKey(favorabilityResponseQuestion));

        // Get diff
        segmentsDiff = segmentViz.getSegmentsDiffMap(getQuestionKey(favorabilityResponseQuestion));

        // Find split indices
        oldMalesSplitIdx = findSplitIndex(splits, "old", "male");
        youngFemalesSplitIdx = findSplitIndex(splits, "young", "female");
        youngMalesSplitIdx = findSplitIndex(splits, "young", "male");
        oldFemalesSplitIdx = findSplitIndex(splits, "old", "female");
      });

      it("should have diffs only for oldMales and youngFemales (newly populated splits)", () => {
        expect(segmentsDiff).toBeDefined();

        // The diff may include entries for all splits that had response question changes
        // We need to verify that oldMales and youngFemales are present
        const splitIndices = segmentsDiff.map((d: any) => d.splitIndex);
        expect(splitIndices).toContain(oldMalesSplitIdx);
        expect(splitIndices).toContain(youngFemalesSplitIdx);

        // youngMales and oldFemales should have null deltas (no changes)
        const youngMalesDiff = segmentsDiff.find((d: any) => d.splitIndex === youngMalesSplitIdx);
        const oldFemalesDiff = segmentsDiff.find((d: any) => d.splitIndex === oldFemalesSplitIdx);

        if (youngMalesDiff) {
          expect(youngMalesDiff.segmentsDelta).toBeNull();
        }
        if (oldFemalesDiff) {
          expect(oldFemalesDiff.segmentsDelta).toBeNull();
        }
      });

      describe("oldMales (newly populated) - Expanded view", () => {
        it("should have boundsDelta for all 4 response groups with xBefore/widthBefore = 0", () => {
          const oldMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldMalesSplitIdx);
          expect(oldMalesDiff).toBeDefined();

          const boundsDelta = oldMalesDiff.segmentsDelta.expanded.boundsDelta;
          expect(boundsDelta.length).toBe(4);

          // For newly populated splits, before values should be 0
          boundsDelta.forEach((bd: any) => {
            expect(bd.xBefore).toBe(0);
            expect(bd.widthBefore).toBe(0);
            // xAfter can be 0 for the first segment, but width should be > 0
            expect(bd.xAfter).toBeGreaterThanOrEqual(0);
            expect(bd.widthAfter).toBeGreaterThan(0);
          });
        });

        it("should have pointsDelta with all points as added (100 synthetic points)", () => {
          const oldMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldMalesSplitIdx);
          const pointsDelta = oldMalesDiff.segmentsDelta.expanded.pointsDelta;

          expect(pointsDelta.length).toBe(4);

          // All points should be in addedPoints, none removed or moved
          const totalAdded = pointsDelta.reduce((sum: number, pd: any) => sum + pd.addedPoints.length, 0);
          expect(totalAdded).toBe(100);

          pointsDelta.forEach((pd: any) => {
            expect(pd.removedPoints).toEqual([]);
            expect(pd.movedPoints).toEqual([]);

            // Verify positions match visualization
            pd.addedPoints.forEach((addedPt: any) => {
              const actualPos = findPointPosition(afterViz, oldMalesSplitIdx, addedPt.id, "expanded");
              expect(actualPos).toBeDefined();
              expect(addedPt.x).toBeCloseTo(actualPos!.x, 5);
              expect(addedPt.y).toBeCloseTo(actualPos!.y, 5);
            });
          });
        });

        it("should have segments populated in visualization", () => {
          const segmentGroup = afterViz.segmentGroups.find((sg: any) => sg.splitIndex === oldMalesSplitIdx);

          expect(segmentGroup).toBeDefined();
          expect(segmentGroup.segments).not.toBeNull();
          expect(segmentGroup.segments.expanded.length).toBe(4);

          // Verify total points across all segments = 100
          const totalPoints = segmentGroup.segments.expanded.reduce(
            (sum: number, seg: any) => sum + seg.pointPositions.length,
            0
          );
          expect(totalPoints).toBe(100);
        });
      });

      describe("oldMales (newly populated) - Collapsed view", () => {
        it("should have boundsDelta for both collapsed response groups", () => {
          const oldMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldMalesSplitIdx);
          const boundsDelta = oldMalesDiff.segmentsDelta.collapsed.boundsDelta;

          expect(boundsDelta.length).toBe(2);

          boundsDelta.forEach((bd: any) => {
            expect(bd.xBefore).toBe(0);
            expect(bd.widthBefore).toBe(0);
          });
        });

        it("should have pointsDelta with 100 added points total", () => {
          const oldMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldMalesSplitIdx);
          const pointsDelta = oldMalesDiff.segmentsDelta.collapsed.pointsDelta;

          const totalAdded = pointsDelta.reduce((sum: number, pd: any) => sum + pd.addedPoints.length, 0);
          expect(totalAdded).toBe(100);
        });
      });

      describe("youngFemales (newly populated) - Expanded view", () => {
        it("should have boundsDelta for all 4 response groups", () => {
          const youngFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngFemalesSplitIdx);
          const boundsDelta = youngFemalesDiff.segmentsDelta.expanded.boundsDelta;

          expect(boundsDelta.length).toBe(4);

          boundsDelta.forEach((bd: any) => {
            expect(bd.xBefore).toBe(0);
            expect(bd.widthBefore).toBe(0);
          });
        });

        it("should have pointsDelta with 100 added points total", () => {
          const youngFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngFemalesSplitIdx);
          const pointsDelta = youngFemalesDiff.segmentsDelta.expanded.pointsDelta;

          const totalAdded = pointsDelta.reduce((sum: number, pd: any) => sum + pd.addedPoints.length, 0);
          expect(totalAdded).toBe(100);
        });
      });

      describe("youngFemales (newly populated) - Collapsed view", () => {
        it("should have segments populated in visualization", () => {
          const segmentGroup = afterViz.segmentGroups.find((sg: any) => sg.splitIndex === youngFemalesSplitIdx);

          expect(segmentGroup).toBeDefined();
          expect(segmentGroup.segments).not.toBeNull();
          expect(segmentGroup.segments.collapsed.length).toBe(2);

          const totalPoints = segmentGroup.segments.collapsed.reduce(
            (sum: number, seg: any) => sum + seg.pointPositions.length,
            0
          );
          expect(totalPoints).toBe(100);
        });
      });
    });

    describe("Without Synthetic Sample Size", () => {
      let stats: Statistics;
      let segmentViz: SegmentViz;
      let afterViz: any;
      let segmentsDiff: any;
      let splits: any[];
      let oldMalesSplitIdx: number;
      let youngFemalesSplitIdx: number;

      beforeAll(() => {
        // (1) Create Statistics instance with Wave 1+2 combined data
        stats = new Statistics(statsConfig, wave1And2Combined, weightQuestion);

        // (2) Create SegmentViz WITHOUT synthetic sample size
        const vizConfig: SegmentVizConfig = {
          ...baseVizConfig,
          // syntheticSampleSize is undefined
        };
        segmentViz = new SegmentViz(stats, vizConfig);

        // (3) Update Statistics with Wave 3 data
        stats.updateSplits(wave3Respondents);

        // Get updated state using public API
        splits = stats.getSplits();
        afterViz = segmentViz.getVisualization(getQuestionKey(favorabilityResponseQuestion));

        // Get diff
        segmentsDiff = segmentViz.getSegmentsDiffMap(getQuestionKey(favorabilityResponseQuestion));

        // Find split indices
        oldMalesSplitIdx = findSplitIndex(splits, "old", "male");
        youngFemalesSplitIdx = findSplitIndex(splits, "young", "female");
      });

      describe("oldMales (newly populated) - Expanded view", () => {
        it("should have boundsDelta for all 4 response groups with xBefore/widthBefore = 0", () => {
          const oldMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldMalesSplitIdx);
          const boundsDelta = oldMalesDiff.segmentsDelta.expanded.boundsDelta;

          expect(boundsDelta.length).toBe(4);

          boundsDelta.forEach((bd: any) => {
            expect(bd.xBefore).toBe(0);
            expect(bd.widthBefore).toBe(0);
          });
        });

        it("should have pointsDelta with 2 added points total", () => {
          const oldMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldMalesSplitIdx);
          const pointsDelta = oldMalesDiff.segmentsDelta.expanded.pointsDelta;

          const totalAdded = pointsDelta.reduce((sum: number, pd: any) => sum + pd.addedPoints.length, 0);
          expect(totalAdded).toBe(2);

          // Verify positions
          pointsDelta.forEach((pd: any) => {
            pd.addedPoints.forEach((addedPt: any) => {
              const actualPos = findPointPosition(afterViz, oldMalesSplitIdx, addedPt.id, "expanded");
              expect(actualPos).toBeDefined();
              expect(addedPt.x).toBeCloseTo(actualPos!.x, 5);
              expect(addedPt.y).toBeCloseTo(actualPos!.y, 5);
            });
          });
        });

        it("should have segments populated with 2 points total", () => {
          const segmentGroup = afterViz.segmentGroups.find((sg: any) => sg.splitIndex === oldMalesSplitIdx);

          expect(segmentGroup).toBeDefined();
          expect(segmentGroup.segments).not.toBeNull();
          expect(segmentGroup.segments.expanded.length).toBe(4);

          // respondent 11: favorability=1 (strongly_favorable)
          // respondent 12: favorability=3 (unfavorable)
          const stronglyFavSeg = segmentGroup.segments.expanded.find((s: any) => s.responseGroupIndex === 0);
          const unfavSeg = segmentGroup.segments.expanded.find((s: any) => s.responseGroupIndex === 2);

          expect(stronglyFavSeg.pointPositions.length).toBe(1);
          expect(unfavSeg.pointPositions.length).toBe(1);
        });
      });

      describe("oldMales (newly populated) - Collapsed view", () => {
        it("should have boundsDelta for both collapsed response groups", () => {
          const oldMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldMalesSplitIdx);
          const boundsDelta = oldMalesDiff.segmentsDelta.collapsed.boundsDelta;

          expect(boundsDelta.length).toBe(2);

          boundsDelta.forEach((bd: any) => {
            expect(bd.xBefore).toBe(0);
            expect(bd.widthBefore).toBe(0);
          });
        });

        it("should have pointsDelta with 2 added points total", () => {
          const oldMalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === oldMalesSplitIdx);
          const pointsDelta = oldMalesDiff.segmentsDelta.collapsed.pointsDelta;

          const totalAdded = pointsDelta.reduce((sum: number, pd: any) => sum + pd.addedPoints.length, 0);
          expect(totalAdded).toBe(2);
        });

        it("should have segments populated with 2 points total", () => {
          const segmentGroup = afterViz.segmentGroups.find((sg: any) => sg.splitIndex === oldMalesSplitIdx);

          expect(segmentGroup.segments.collapsed.length).toBe(2);

          const totalPoints = segmentGroup.segments.collapsed.reduce(
            (sum: number, seg: any) => sum + seg.pointPositions.length,
            0
          );
          expect(totalPoints).toBe(2);
        });
      });

      describe("youngFemales (newly populated) - Expanded view", () => {
        it("should have boundsDelta for all 4 response groups", () => {
          const youngFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngFemalesSplitIdx);
          const boundsDelta = youngFemalesDiff.segmentsDelta.expanded.boundsDelta;

          expect(boundsDelta.length).toBe(4);

          boundsDelta.forEach((bd: any) => {
            expect(bd.xBefore).toBe(0);
            expect(bd.widthBefore).toBe(0);
          });
        });

        it("should have pointsDelta with 2 added points total", () => {
          const youngFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngFemalesSplitIdx);
          const pointsDelta = youngFemalesDiff.segmentsDelta.expanded.pointsDelta;

          const totalAdded = pointsDelta.reduce((sum: number, pd: any) => sum + pd.addedPoints.length, 0);
          expect(totalAdded).toBe(2);
        });

        it("should have segments populated in visualization", () => {
          const segmentGroup = afterViz.segmentGroups.find((sg: any) => sg.splitIndex === youngFemalesSplitIdx);

          expect(segmentGroup).toBeDefined();
          expect(segmentGroup.segments).not.toBeNull();
          expect(segmentGroup.segments.expanded.length).toBe(4);

          // respondent 13: favorability=2 (favorable)
          // respondent 14: favorability=4 (strongly_unfavorable)
          const favSeg = segmentGroup.segments.expanded.find((s: any) => s.responseGroupIndex === 1);
          const stronglyUnfavSeg = segmentGroup.segments.expanded.find((s: any) => s.responseGroupIndex === 3);

          expect(favSeg.pointPositions.length).toBe(1);
          expect(stronglyUnfavSeg.pointPositions.length).toBe(1);
        });
      });

      describe("youngFemales (newly populated) - Collapsed view", () => {
        it("should have boundsDelta for both collapsed response groups", () => {
          const youngFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngFemalesSplitIdx);
          const boundsDelta = youngFemalesDiff.segmentsDelta.collapsed.boundsDelta;

          expect(boundsDelta.length).toBe(2);
        });

        it("should have pointsDelta with 2 added points total", () => {
          const youngFemalesDiff = segmentsDiff?.find((d: any) => d.splitIndex === youngFemalesSplitIdx);
          const pointsDelta = youngFemalesDiff.segmentsDelta.collapsed.pointsDelta;

          const totalAdded = pointsDelta.reduce((sum: number, pd: any) => sum + pd.addedPoints.length, 0);
          expect(totalAdded).toBe(2);
        });

        it("should have segments populated with 2 points total", () => {
          const segmentGroup = afterViz.segmentGroups.find((sg: any) => sg.splitIndex === youngFemalesSplitIdx);

          expect(segmentGroup.segments.collapsed.length).toBe(2);

          const totalPoints = segmentGroup.segments.collapsed.reduce(
            (sum: number, seg: any) => sum + seg.pointPositions.length,
            0
          );
          expect(totalPoints).toBe(2);
        });
      });
    });
  });
});
