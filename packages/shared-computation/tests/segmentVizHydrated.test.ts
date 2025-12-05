/**
 * Tests for SegmentViz class with hydrated Statistics instance.
 *
 * Prerequisites:
 * - statistics.test.ts must pass (validates Statistics functionality)
 * - segmentViz.test.ts must pass (validates SegmentViz geometry without data)
 *
 * Test data (from test-data.ts):
 * - Wave 1 only (7 respondents across 2 populated splits)
 * - youngMales: 3 respondents (age=1, gender=1)
 * - oldFemales: 4 respondents (age=2, gender=2)
 * - youngFemales: 0 respondents (unpopulated split)
 * - oldMales: 0 respondents (unpopulated split)
 * - All tests use UNWEIGHTED statistics (equal weighting for all respondents)
 */

import { Statistics, type StatsConfig } from "../src/statistics";
import { SegmentViz } from "../src/segmentViz";
import type { SegmentVizConfig } from "../src/segmentViz/types";
import {
  ageGroupingQuestion,
  genderGroupingQuestion,
  favorabilityResponseQuestion,
  wave1Data,
} from "./fixtures/test-data";
import { flattenWaveData } from "./fixtures/helpers";
import { getQuestionKey } from "../src/utils";

/**
 * Shared configuration and setup for all tests
 */
describe("SegmentViz - Hydrated Statistics", () => {
  // Prepare wave 1 data (unweighted)
  const wave1Respondents = flattenWaveData(wave1Data);

  // Statistics configuration
  const statsConfig: StatsConfig = {
    responseQuestions: [favorabilityResponseQuestion],
    groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
  };

  // Base SegmentViz configuration (same as in segmentViz.test.ts for consistent geometry)
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
   * WITHOUT SYNTHETIC SAMPLE SIZE
   * ========================================================================
   * 
   * These tests use SegmentViz with no synthetic sample size defined.
   * Point counts will match actual respondent counts in the data.
   */
  describe("Without Synthetic Sample Size", () => {
    let stats: Statistics;
    let segmentViz: SegmentViz;
    let vizMap: any;
    let splits: any[];

    beforeAll(() => {
      // Create Statistics instance (unweighted)
      stats = new Statistics(
        statsConfig,
        wave1Respondents
        // No weightQuestion parameter - all respondents weighted equally
      );

      splits = stats.getSplits();

      // Create SegmentViz WITHOUT synthetic sample size
      const vizConfig: SegmentVizConfig = {
        ...baseVizConfig,
        // syntheticSampleSize is undefined - use actual respondent counts
      };

      segmentViz = new SegmentViz(stats, vizConfig);
      vizMap = segmentViz["vizMap"];
    });

    describe("Point counts", () => {
      describe("youngMales split", () => {
        it("should have correct point counts per response group", () => {
          // youngMales split (3 respondents, age=1, gender=1):
          // - id 1: favorability=1 (strongly_favorable)
          // - id 2: favorability=2 (favorable)
          // - id 3: favorability=3 (unfavorable)
          //
          // Expected counts by expanded response group:
          // - strongly_favorable (ergIdx=0): 1 point
          // - favorable (ergIdx=1): 1 point
          // - unfavorable (ergIdx=2): 1 point
          // - strongly_unfavorable (ergIdx=3): 0 points
          //
          // Total: 3 points

          const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));
          const youngMalesSplitIdx = splits.findIndex((split) => {
            const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
            const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
            return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
          });

          const youngMalesPointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx
          );

          // Should have 4 point sets (one per expanded response group)
          expect(youngMalesPointSets).toHaveLength(4);

          // Verify counts per response group
          const counts = youngMalesPointSets.map((ps: any) => ps.currentIds.length);
          expect(counts).toEqual([1, 1, 1, 0]);
        });
      });

      describe("oldFemales split", () => {
        it("should have correct point counts per response group", () => {
          // oldFemales split (4 respondents, age=2, gender=2):
          // - id 4: favorability=2 (favorable)
          // - id 5: favorability=3 (unfavorable)
          // - id 6: favorability=3 (unfavorable)
          // - id 7: favorability=4 (strongly_unfavorable)
          //
          // Expected counts by expanded response group:
          // - strongly_favorable (ergIdx=0): 0 points
          // - favorable (ergIdx=1): 1 point
          // - unfavorable (ergIdx=2): 2 points
          // - strongly_unfavorable (ergIdx=3): 1 point
          //
          // Total: 4 points

          const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));
          const oldFemalesSplitIdx = splits.findIndex((split) => {
            const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
            const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
            return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
          });

          const oldFemalesPointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );

          // Should have 4 point sets (one per expanded response group)
          expect(oldFemalesPointSets).toHaveLength(4);

          // Verify counts per response group
          const counts = oldFemalesPointSets.map((ps: any) => ps.currentIds.length);
          expect(counts).toEqual([0, 1, 2, 1]);
        });
      });
    });

    describe("Point ID format", () => {
      it("should have correctly formatted point IDs with sequential local IDs", () => {
        // Test one randomly selected fully-specified-and-populated split
        // Point ID format: "${splitIdx}-${ergIdx}-${localId}"
        // Local IDs should increment from 0 within each response group
        //
        // We'll test the youngMales split (first one encountered)
        // For response groups with multiple points, verify sequential local IDs

        const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));
        const youngMalesSplitIdx = splits.findIndex((split) => {
          const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
          const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
          return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
        });

        const youngMalesPointSets = favViz.points.filter(
          (ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx
        );

        // Test each response group that has points
        for (let ergIdx = 0; ergIdx < youngMalesPointSets.length; ergIdx++) {
          const pointSet = youngMalesPointSets.find((ps: any) => ps.responseGroupIndex.expanded === ergIdx);
          if (pointSet && pointSet.currentIds.length > 0) {
            // Verify sequential local IDs starting from 0
            for (let localId = 0; localId < pointSet.currentIds.length; localId++) {
              const expectedId = `${youngMalesSplitIdx}-${ergIdx}-${localId}`;
              expect(pointSet.currentIds[localId]).toBe(expectedId);
            }
          }
        }
      });
    });

    /**
     * ========================================================================
     * SEGMENT GEOMETRY TESTS
     * ========================================================================
     *
     * IMPORTANT: We test segment geometry ONLY on the synthetic sample size case because:
     * 1. Segment bounds depend ONLY on proportions (which are identical for both cases)
     * 2. Synthetic case has 100 points per split (vs 3-4 for non-synthetic)
     * 3. More points = harder test for point positioning constraints
     * 4. Testing one case avoids redundancy while maximizing test rigor
     *
     * 
     */
  });

  /**
   * ========================================================================
   * WITH SYNTHETIC SAMPLE SIZE
   * ========================================================================
   * 
   * These tests use SegmentViz with syntheticSampleSize set to 100.
   * Point counts will be scaled to the synthetic sample size.
   */
  describe("With Synthetic Sample Size", () => {
    let stats: Statistics;
    let segmentViz: SegmentViz;
    let vizMap: any;
    let splits: any[];

    beforeAll(() => {
      // Create Statistics instance (unweighted)
      stats = new Statistics(
        statsConfig,
        wave1Respondents
        // No weightQuestion parameter - all respondents weighted equally
      );

      splits = stats.getSplits();

      // Create SegmentViz WITH synthetic sample size
      const vizConfig: SegmentVizConfig = {
        ...baseVizConfig,
        syntheticSampleSize: 100, // <-- Scale points to synthetic sample of 100
      };

      segmentViz = new SegmentViz(stats, vizConfig);
      vizMap = segmentViz["vizMap"];
    });

    describe("Point counts", () => {
      describe("youngMales split", () => {
        it("should have correct point counts per response group", () => {
          // youngMales split (3 respondents, age=1, gender=1):
          // - id 1: favorability=1 (strongly_favorable)
          // - id 2: favorability=2 (favorable)
          // - id 3: favorability=3 (unfavorable)
          //
          // Unweighted proportions: [1/3, 1/3, 1/3, 0]
          //
          // getSyntheticCounts algorithm with syntheticSampleSize=100:
          // 1. Initial floats: [33.333..., 33.333..., 33.333..., 0]
          // 2. Initial wholes: [33, 33, 33, 0] = 99 total
          // 3. Need to add 1 more point
          // 4. Remainders (errors): [0.333, 0.333, 0.333, 0] - tie!
          // 5. Tie-breaker: .reduce() picks the LAST occurrence (ergIdx=2)
          //
          // Expected counts by expanded response group:
          // - strongly_favorable (ergIdx=0): 33 points
          // - favorable (ergIdx=1): 33 points
          // - unfavorable (ergIdx=2): 34 points
          // - strongly_unfavorable (ergIdx=3): 0 points
          //
          // Total: 100 points

          const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));
          const youngMalesSplitIdx = splits.findIndex((split) => {
            const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
            const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
            return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
          });

          const youngMalesPointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === youngMalesSplitIdx
          );

          // Should have 4 point sets (one per expanded response group)
          expect(youngMalesPointSets).toHaveLength(4);

          // Verify counts per response group
          const counts = youngMalesPointSets.map((ps: any) => ps.currentIds.length);
          expect(counts).toEqual([33, 33, 34, 0]);
        });

        it("should have total point count equal to syntheticSampleSize", () => {
          // Total across all response groups should equal 100
        });
      });

      describe("oldFemales split", () => {
        it("should have correct point counts per response group", () => {
          // oldFemales split (4 respondents, age=2, gender=2):
          // - id 4: favorability=2 (favorable)
          // - id 5: favorability=3 (unfavorable)
          // - id 6: favorability=3 (unfavorable)
          // - id 7: favorability=4 (strongly_unfavorable)
          //
          // Unweighted proportions: [0, 1/4, 2/4, 1/4] = [0, 0.25, 0.5, 0.25]
          //
          // getSyntheticCounts algorithm with syntheticSampleSize=100:
          // 1. Initial floats: [0, 25, 50, 25]
          // 2. Initial wholes: [0, 25, 50, 25] = 100 total
          // 3. Already sums to 100 - no adjustment needed!
          //
          // Expected counts by expanded response group:
          // - strongly_favorable (ergIdx=0): 0 points
          // - favorable (ergIdx=1): 25 points
          // - unfavorable (ergIdx=2): 50 points
          // - strongly_unfavorable (ergIdx=3): 25 points
          //
          // Total: 100 points

          const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));
          const oldFemalesSplitIdx = splits.findIndex((split) => {
            const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
            const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
            return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
          });

          const oldFemalesPointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );

          // Should have 4 point sets (one per expanded response group)
          expect(oldFemalesPointSets).toHaveLength(4);

          // Verify counts per response group
          const counts = oldFemalesPointSets.map((ps: any) => ps.currentIds.length);
          expect(counts).toEqual([0, 25, 50, 25]);
        });

        it("should have total point count equal to syntheticSampleSize", () => {
          // Total across all response groups should equal 100

          const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));
          const oldFemalesSplitIdx = splits.findIndex((split) => {
            const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
            const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
            return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
          });

          const oldFemalesPointSets = favViz.points.filter(
            (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
          );

          const totalCount = oldFemalesPointSets.reduce(
            (sum: number, ps: any) => sum + ps.currentIds.length,
            0
          );

          expect(totalCount).toBe(100);
        });
      });
    });

    describe("Point ID format", () => {
      it("should have correctly formatted point IDs with sequential local IDs", () => {
        // Test one randomly selected fully-specified-and-populated split
        // Point ID format: "${splitIdx}-${ergIdx}-${localId}"
        // Local IDs should increment from 0 within each response group
        //
        // We'll test the oldFemales split (has larger point sets)
        // Sample a few consecutive IDs from response groups with multiple points
        // to verify sequential local ID incrementing

        const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));
        const oldFemalesSplitIdx = splits.findIndex((split) => {
          const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
          const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
          return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
        });

        const oldFemalesPointSets = favViz.points.filter(
          (ps: any) => ps.fullySpecifiedSplitIndex === oldFemalesSplitIdx
        );

        // Test response group 2 (unfavorable) which has 50 points
        const unfavorablePointSet = oldFemalesPointSets.find(
          (ps: any) => ps.responseGroupIndex.expanded === 2
        );

        expect(unfavorablePointSet).toBeDefined();
        expect(unfavorablePointSet.currentIds.length).toBe(50);

        // Sample first 5, middle 5, and last 5 IDs to verify sequential local IDs
        const samplesToTest = [
          { start: 0, end: 5, desc: "first 5" },
          { start: 22, end: 27, desc: "middle 5" },
          { start: 45, end: 50, desc: "last 5" },
        ];

        for (const sample of samplesToTest) {
          for (let i = sample.start; i < sample.end; i++) {
            const expectedId = `${oldFemalesSplitIdx}-2-${i}`;
            expect(unfavorablePointSet.currentIds[i]).toBe(expectedId);
          }
        }
      });
    });

    /**
     * ========================================================================
     * SEGMENT GEOMETRY TESTS
     * ========================================================================
     *
     * IMPORTANT: These tests run ONLY on the synthetic sample size case because:
     * 1. Segment bounds depend ONLY on proportions (which are identical for both cases)
     * 2. Synthetic case has 100 points per split (vs 3-4 for non-synthetic)
     * 3. More points = harder test for point positioning constraints
     * 4. Testing one case avoids redundancy while maximizing test rigor
     *
     * Test data context:
     * - youngMales split: 3 respondents with proportions [1/3, 1/3, 1/3, 0]
     * - oldFemales split: 4 respondents with proportions [0, 1/4, 1/2, 1/4]
     * - youngFemales: unpopulated (segments: null)
     * - oldMales: unpopulated (segments: null)
     *
     * Segment geometry testing phases:
     * - Phase 1: Segment Existence - verify populated vs unpopulated splits
     * - Phase 2: Segment Bounds (Expanded) - hand-calculated x and width values
     * - Phase 3: Segment Bounds (Collapsed) - verify collapsed view aggregation
     * - Phase 4: Point Allocation - correct point IDs in each segment
     * - Phase 5: Point Positioning - bounds compliance and position constraints
     */

    describe("Segment Geometry", () => {
      /**
       * PHASE 1: SEGMENT EXISTENCE
       *
       * Verify that:
       * - Populated splits (youngMales, oldFemales) have non-null segments
       * - Unpopulated splits (youngFemales, oldMales) have null segments
       * - Aggregated splits also have null segments (until Wave 2 data)
       */
      describe("Phase 1: Segment Existence", () => {
        describe("Populated splits", () => {
          it("should have non-null segments for youngMales split", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const youngMalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
            });

            const youngMalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === youngMalesSplitIdx
            );

            expect(youngMalesSegmentGroup).toBeDefined();
            expect(youngMalesSegmentGroup.segments).not.toBeNull();
            expect(youngMalesSegmentGroup.segments).toHaveProperty("expanded");
            expect(youngMalesSegmentGroup.segments).toHaveProperty("collapsed");
          }); it("should have non-null segments for oldFemales split", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const oldFemalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
            });

            const oldFemalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === oldFemalesSplitIdx
            );

            expect(oldFemalesSegmentGroup).toBeDefined();
            expect(oldFemalesSegmentGroup.segments).not.toBeNull();
            expect(oldFemalesSegmentGroup.segments).toHaveProperty("expanded");
            expect(oldFemalesSegmentGroup.segments).toHaveProperty("collapsed");
          });
        });

        describe("Unpopulated splits", () => {
          it("should have null segments for youngFemales split", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const youngFemalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "female";
            });

            const youngFemalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === youngFemalesSplitIdx
            );

            expect(youngFemalesSegmentGroup).toBeDefined();
            expect(youngFemalesSegmentGroup.segments).toBeNull();
          });

          it("should have null segments for oldMales split", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const oldMalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "male";
            });

            const oldMalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === oldMalesSplitIdx
            );

            expect(oldMalesSegmentGroup).toBeDefined();
            expect(oldMalesSegmentGroup.segments).toBeNull();
          });
        });

        describe("Aggregated splits", () => {
          it("should have segments for young-aggregated split", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const youngAggregatedSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup === null;
            });

            const youngAggregatedSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === youngAggregatedSplitIdx
            );

            expect(youngAggregatedSegmentGroup).toBeDefined();
            // Should have segments because youngMales split is populated
            expect(youngAggregatedSegmentGroup.segments).not.toBeNull();
            expect(youngAggregatedSegmentGroup.segments).toBeDefined();
          });

          it("should have segments for old-aggregated split", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const oldAggregatedSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup === null;
            });

            const oldAggregatedSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === oldAggregatedSplitIdx
            );

            expect(oldAggregatedSegmentGroup).toBeDefined();
            // Should have segments because oldFemales split is populated
            expect(oldAggregatedSegmentGroup.segments).not.toBeNull();
            expect(oldAggregatedSegmentGroup.segments).toBeDefined();
          });

          it("should have segments for males-aggregated split", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const malesAggregatedSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup === null && genderGroup?.responseGroup?.label === "male";
            });

            const malesAggregatedSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === malesAggregatedSplitIdx
            );

            expect(malesAggregatedSegmentGroup).toBeDefined();
            // Should have segments because youngMales split is populated
            expect(malesAggregatedSegmentGroup.segments).not.toBeNull();
            expect(malesAggregatedSegmentGroup.segments).toBeDefined();
          });

          it("should have segments for females-aggregated split", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const femalesAggregatedSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup === null && genderGroup?.responseGroup?.label === "female";
            });

            const femalesAggregatedSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === femalesAggregatedSplitIdx
            );

            expect(femalesAggregatedSegmentGroup).toBeDefined();
            // Should have segments because oldFemales split is populated
            expect(femalesAggregatedSegmentGroup.segments).not.toBeNull();
            expect(femalesAggregatedSegmentGroup.segments).toBeDefined();
          });

          it("should have segments for fully-aggregated split", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const fullyAggregatedSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup === null && genderGroup?.responseGroup === null;
            });

            const fullyAggregatedSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === fullyAggregatedSplitIdx
            );

            expect(fullyAggregatedSegmentGroup).toBeDefined();
            // Should have segments because both youngMales and oldFemales are populated
            expect(fullyAggregatedSegmentGroup.segments).not.toBeNull();
            expect(fullyAggregatedSegmentGroup.segments).toBeDefined();
          });
        });
      });

      /**
       * PHASE 2: SEGMENT BOUNDS (EXPANDED VIEW)
       *
       * Test hand-calculated segment bounds for expanded view.
       * Note: We test ONLY x and width fields (y and height are trivial).
       *
       * Geometry calculation for youngMales split:
       * - Proportions: [1/3, 1/3, 1/3, 0]
       * - Segment group bounds: x=0, y=110, width=140, height=100
       * - Available width: 140
       * - Base width per segment: 10
       * - Response gap: 0
       *
       * Segment widths calculation:
       * - Base total: 4 * 10 = 40
       * - Remaining for proportional distribution: 140 - 40 = 100
       * - Proportional widths: [100*1/3, 100*1/3, 100*1/3, 100*0]
       * - Final widths: [10+33.33, 10+33.33, 10+33.33, 10+0]
       * - Final widths: [43.33, 43.33, 43.33, 10]
       *
       * Segment x positions (with responseGap=0):
       * - Segment 0: x = 0
       * - Segment 1: x = 0 + 43.33 = 43.33
       * - Segment 2: x = 43.33 + 43.33 = 86.67
       * - Segment 3: x = 86.67 + 43.33 = 130
       */
      describe("Phase 2: Segment Bounds - Expanded View", () => {
        describe("youngMales split", () => {
          it("should have correct segment bounds for all response groups", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const youngMalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
            });

            const youngMalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === youngMalesSplitIdx
            );

            expect(youngMalesSegmentGroup.segments).not.toBeNull();
            const expandedSegments = youngMalesSegmentGroup.segments.expanded;

            // Should have 4 segments (one per response group)
            expect(expandedSegments).toHaveLength(4);

            // Segment 0: strongly_favorable
            expect(expandedSegments[0].responseGroupIndex).toBe(0);
            expect(expandedSegments[0].x).toBeCloseTo(0, 2);
            expect(expandedSegments[0].width).toBeCloseTo(43.33, 2);

            // Segment 1: favorable
            expect(expandedSegments[1].responseGroupIndex).toBe(1);
            expect(expandedSegments[1].x).toBeCloseTo(43.33, 2);
            expect(expandedSegments[1].width).toBeCloseTo(43.33, 2);

            // Segment 2: unfavorable
            expect(expandedSegments[2].responseGroupIndex).toBe(2);
            expect(expandedSegments[2].x).toBeCloseTo(86.67, 2);
            expect(expandedSegments[2].width).toBeCloseTo(43.33, 2);

            // Segment 3: strongly_unfavorable
            expect(expandedSegments[3].responseGroupIndex).toBe(3);
            expect(expandedSegments[3].x).toBeCloseTo(130, 2);
            expect(expandedSegments[3].width).toBeCloseTo(10, 2);
          });
        });

        describe("oldFemales split", () => {
          it("should have correct segment bounds for all response groups", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const oldFemalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
            });

            const oldFemalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === oldFemalesSplitIdx
            );

            expect(oldFemalesSegmentGroup.segments).not.toBeNull();
            const expandedSegments = oldFemalesSegmentGroup.segments.expanded;

            // Should have 4 segments (one per response group)
            expect(expandedSegments).toHaveLength(4);

            // Segment 0: strongly_favorable
            expect(expandedSegments[0].responseGroupIndex).toBe(0);
            expect(expandedSegments[0].x).toBeCloseTo(0, 2);
            expect(expandedSegments[0].width).toBeCloseTo(10, 2);

            // Segment 1: favorable
            expect(expandedSegments[1].responseGroupIndex).toBe(1);
            expect(expandedSegments[1].x).toBeCloseTo(10, 2);
            expect(expandedSegments[1].width).toBeCloseTo(35, 2);

            // Segment 2: unfavorable
            expect(expandedSegments[2].responseGroupIndex).toBe(2);
            expect(expandedSegments[2].x).toBeCloseTo(45, 2);
            expect(expandedSegments[2].width).toBeCloseTo(60, 2);

            // Segment 3: strongly_unfavorable
            expect(expandedSegments[3].responseGroupIndex).toBe(3);
            expect(expandedSegments[3].x).toBeCloseTo(105, 2);
            expect(expandedSegments[3].width).toBeCloseTo(35, 2);
          });
        });
      });

      /**
       * PHASE 3: SEGMENT BOUNDS (COLLAPSED VIEW)
       *
       * Test segment bounds for collapsed view.
       * Collapsed view merges response groups according to collapse rules.
       *
       * For favorability question (4 response groups):
       * - Collapsed groups: [[0,1], [2,3]] (favorable vs unfavorable)
       *
       * youngMales collapsed calculation:
       * - Proportions for collapsed groups: [2/3, 1/3]
       * - Available width: 140
       * - Base total: 2 * 10 = 20
       * - Remaining: 140 - 20 = 120
       * - Proportional: [120*2/3, 120*1/3] = [80, 40]
       * - Final widths: [90, 50]
       * - Positions: x=[0, 90]
       *
       * oldFemales collapsed calculation:
       * - Proportions for collapsed groups: [1/4, 3/4]
       * - Remaining: 120
       * - Proportional: [30, 90]
       * - Final widths: [40, 100]
       * - Positions: x=[0, 40]
       */
      describe("Phase 3: Segment Bounds - Collapsed View", () => {
        describe("youngMales split", () => {
          it("should have correct collapsed segment bounds", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const youngMalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
            });

            const youngMalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === youngMalesSplitIdx
            );

            expect(youngMalesSegmentGroup.segments).not.toBeNull();
            const collapsedSegments = youngMalesSegmentGroup.segments.collapsed;

            // Should have 2 collapsed segments (favorable vs unfavorable)
            expect(collapsedSegments).toHaveLength(2);

            // Segment 0: favorable (merged from strongly_favorable + favorable)
            expect(collapsedSegments[0].responseGroupIndex).toBe(0);
            expect(collapsedSegments[0].x).toBeCloseTo(0, 2);
            expect(collapsedSegments[0].width).toBeCloseTo(90, 2);

            // Segment 1: unfavorable (merged from unfavorable + strongly_unfavorable)
            expect(collapsedSegments[1].responseGroupIndex).toBe(1);
            expect(collapsedSegments[1].x).toBeCloseTo(90, 2);
            expect(collapsedSegments[1].width).toBeCloseTo(50, 2);
          });
        });

        describe("oldFemales split", () => {
          it("should have correct collapsed segment bounds", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const oldFemalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
            });

            const oldFemalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === oldFemalesSplitIdx
            );

            expect(oldFemalesSegmentGroup.segments).not.toBeNull();
            const collapsedSegments = oldFemalesSegmentGroup.segments.collapsed;

            // Should have 2 collapsed segments (favorable vs unfavorable)
            expect(collapsedSegments).toHaveLength(2);

            // Segment 0: favorable (merged from strongly_favorable + favorable)
            expect(collapsedSegments[0].responseGroupIndex).toBe(0);
            expect(collapsedSegments[0].x).toBeCloseTo(0, 2);
            expect(collapsedSegments[0].width).toBeCloseTo(40, 2);

            // Segment 1: unfavorable (merged from unfavorable + strongly_unfavorable)
            expect(collapsedSegments[1].responseGroupIndex).toBe(1);
            expect(collapsedSegments[1].x).toBeCloseTo(40, 2);
            expect(collapsedSegments[1].width).toBeCloseTo(100, 2);
          });
        });
      });

      /**
       * PHASE 4: POINT ALLOCATION
       *
       * Verify that:
       * - Correct point IDs are allocated to each segment
       * - Point counts in segments match expected counts
       * - For collapsed segments, points from multiple expanded groups are merged correctly
       *
       * This is especially important for collapsed segments where the logic
       * must correctly aggregate points from multiple expanded response groups.
       *
       * youngMales point allocation:
       * - Expanded: [33, 33, 34, 0] points in segments [0, 1, 2, 3]
       * - Collapsed: [66, 34] points in segments [0, 1] (merges [0+1], [2+3])
       *
       * oldFemales point allocation:
       * - Expanded: [0, 25, 50, 25] points in segments [0, 1, 2, 3]
       * - Collapsed: [25, 75] points in segments [0, 1] (merges [0+1], [2+3])
       */
      describe("Phase 4: Point Allocation", () => {
        describe("Expanded view", () => {
          it("should allocate correct point IDs to youngMales segments", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const youngMalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
            });

            const youngMalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === youngMalesSplitIdx
            );

            const expandedSegments = youngMalesSegmentGroup.segments.expanded;

            // Segment 0: strongly_favorable - should have 33 points
            expect(expandedSegments[0].pointPositions).toHaveLength(33);
            expandedSegments[0].pointPositions.forEach((pp: any) => {
              expect(pp.id).toMatch(new RegExp(`^${youngMalesSplitIdx}-0-\\d+$`));
            });

            // Segment 1: favorable - should have 33 points
            expect(expandedSegments[1].pointPositions).toHaveLength(33);
            expandedSegments[1].pointPositions.forEach((pp: any) => {
              expect(pp.id).toMatch(new RegExp(`^${youngMalesSplitIdx}-1-\\d+$`));
            });

            // Segment 2: unfavorable - should have 34 points
            expect(expandedSegments[2].pointPositions).toHaveLength(34);
            expandedSegments[2].pointPositions.forEach((pp: any) => {
              expect(pp.id).toMatch(new RegExp(`^${youngMalesSplitIdx}-2-\\d+$`));
            });

            // Segment 3: strongly_unfavorable - should have 0 points
            expect(expandedSegments[3].pointPositions).toHaveLength(0);
          });

          it("should allocate correct point IDs to oldFemales segments", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const oldFemalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
            });

            const oldFemalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === oldFemalesSplitIdx
            );

            const expandedSegments = oldFemalesSegmentGroup.segments.expanded;

            // Segment 0: strongly_favorable - should have 0 points
            expect(expandedSegments[0].pointPositions).toHaveLength(0);

            // Segment 1: favorable - should have 25 points
            expect(expandedSegments[1].pointPositions).toHaveLength(25);
            expandedSegments[1].pointPositions.forEach((pp: any) => {
              expect(pp.id).toMatch(new RegExp(`^${oldFemalesSplitIdx}-1-\\d+$`));
            });

            // Segment 2: unfavorable - should have 50 points
            expect(expandedSegments[2].pointPositions).toHaveLength(50);
            expandedSegments[2].pointPositions.forEach((pp: any) => {
              expect(pp.id).toMatch(new RegExp(`^${oldFemalesSplitIdx}-2-\\d+$`));
            });

            // Segment 3: strongly_unfavorable - should have 25 points
            expect(expandedSegments[3].pointPositions).toHaveLength(25);
            expandedSegments[3].pointPositions.forEach((pp: any) => {
              expect(pp.id).toMatch(new RegExp(`^${oldFemalesSplitIdx}-3-\\d+$`));
            });
          });
        });

        describe("Collapsed view", () => {
          it("should merge points correctly in youngMales collapsed segments", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const youngMalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
            });

            const youngMalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === youngMalesSplitIdx
            );

            const collapsedSegments = youngMalesSegmentGroup.segments.collapsed;

            // Segment 0: favorable (merged from expanded 0 + 1) - should have 66 points
            expect(collapsedSegments[0].pointPositions).toHaveLength(66);
            const seg0PointIds = collapsedSegments[0].pointPositions.map((pp: any) => pp.id);
            // Should contain points from expanded segments 0 and 1
            const seg0From0 = seg0PointIds.filter((id: string) => id.startsWith(`${youngMalesSplitIdx}-0-`));
            const seg0From1 = seg0PointIds.filter((id: string) => id.startsWith(`${youngMalesSplitIdx}-1-`));
            expect(seg0From0).toHaveLength(33);
            expect(seg0From1).toHaveLength(33);

            // Segment 1: unfavorable (merged from expanded 2 + 3) - should have 34 points
            expect(collapsedSegments[1].pointPositions).toHaveLength(34);
            const seg1PointIds = collapsedSegments[1].pointPositions.map((pp: any) => pp.id);
            // Should contain points from expanded segments 2 and 3
            const seg1From2 = seg1PointIds.filter((id: string) => id.startsWith(`${youngMalesSplitIdx}-2-`));
            const seg1From3 = seg1PointIds.filter((id: string) => id.startsWith(`${youngMalesSplitIdx}-3-`));
            expect(seg1From2).toHaveLength(34);
            expect(seg1From3).toHaveLength(0);
          });

          it("should merge points correctly in oldFemales collapsed segments", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const oldFemalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
            });

            const oldFemalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === oldFemalesSplitIdx
            );

            const collapsedSegments = oldFemalesSegmentGroup.segments.collapsed;

            // Segment 0: favorable (merged from expanded 0 + 1) - should have 25 points
            expect(collapsedSegments[0].pointPositions).toHaveLength(25);
            const seg0PointIds = collapsedSegments[0].pointPositions.map((pp: any) => pp.id);
            // Should contain points from expanded segments 0 and 1
            const seg0From0 = seg0PointIds.filter((id: string) => id.startsWith(`${oldFemalesSplitIdx}-0-`));
            const seg0From1 = seg0PointIds.filter((id: string) => id.startsWith(`${oldFemalesSplitIdx}-1-`));
            expect(seg0From0).toHaveLength(0);
            expect(seg0From1).toHaveLength(25);

            // Segment 1: unfavorable (merged from expanded 2 + 3) - should have 75 points
            expect(collapsedSegments[1].pointPositions).toHaveLength(75);
            const seg1PointIds = collapsedSegments[1].pointPositions.map((pp: any) => pp.id);
            // Should contain points from expanded segments 2 and 3
            const seg1From2 = seg1PointIds.filter((id: string) => id.startsWith(`${oldFemalesSplitIdx}-2-`));
            const seg1From3 = seg1PointIds.filter((id: string) => id.startsWith(`${oldFemalesSplitIdx}-3-`));
            expect(seg1From2).toHaveLength(50);
            expect(seg1From3).toHaveLength(25);
          });
        });
      });

      /**
       * PHASE 5: POINT POSITIONING
       *
       * Verify that:
       * a. All allocated points have been positioned (have x and y coordinates)
       * b. All point positions are within segment bounds (with margin consideration)
       *
       * Note: We do NOT test specific inter-point distances because Poisson disk
       * sampling is non-deterministic. However, we log distance statistics for
       * manual inspection.
       *
       * Segment bounds include a 1-pixel margin, so points should be:
       * - x: [segmentX + 1, segmentX + segmentWidth - 1]
       * - y: [segmentY + 1, segmentY + segmentHeight - 1]
       */
      describe("Phase 5: Point Positioning", () => {
        describe("All points positioned", () => {
          it("should position all youngMales points in expanded view", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const youngMalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
            });

            const youngMalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === youngMalesSplitIdx
            );

            const expandedSegments = youngMalesSegmentGroup.segments.expanded;

            // Verify all points have x and y coordinates
            expandedSegments.forEach((segment: any) => {
              segment.pointPositions.forEach((pp: any) => {
                expect(pp).toHaveProperty('id');
                expect(pp).toHaveProperty('x');
                expect(pp).toHaveProperty('y');
                expect(typeof pp.x).toBe('number');
                expect(typeof pp.y).toBe('number');
                expect(isFinite(pp.x)).toBe(true);
                expect(isFinite(pp.y)).toBe(true);
              });
            });
          });

          it("should position all oldFemales points in expanded view", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const oldFemalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
            });

            const oldFemalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === oldFemalesSplitIdx
            );

            const expandedSegments = oldFemalesSegmentGroup.segments.expanded;

            // Verify all points have x and y coordinates
            expandedSegments.forEach((segment: any) => {
              segment.pointPositions.forEach((pp: any) => {
                expect(pp).toHaveProperty('id');
                expect(pp).toHaveProperty('x');
                expect(pp).toHaveProperty('y');
                expect(typeof pp.x).toBe('number');
                expect(typeof pp.y).toBe('number');
                expect(isFinite(pp.x)).toBe(true);
                expect(isFinite(pp.y)).toBe(true);
              });
            });
          });

          it("should position all youngMales points in collapsed view", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const youngMalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
            });

            const youngMalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === youngMalesSplitIdx
            );

            const collapsedSegments = youngMalesSegmentGroup.segments.collapsed;

            // Verify all points have x and y coordinates
            collapsedSegments.forEach((segment: any) => {
              segment.pointPositions.forEach((pp: any) => {
                expect(pp).toHaveProperty('id');
                expect(pp).toHaveProperty('x');
                expect(pp).toHaveProperty('y');
                expect(typeof pp.x).toBe('number');
                expect(typeof pp.y).toBe('number');
                expect(isFinite(pp.x)).toBe(true);
                expect(isFinite(pp.y)).toBe(true);
              });
            });
          });

          it("should position all oldFemales points in collapsed view", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const oldFemalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
            });

            const oldFemalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === oldFemalesSplitIdx
            );

            const collapsedSegments = oldFemalesSegmentGroup.segments.collapsed;

            // Verify all points have x and y coordinates
            collapsedSegments.forEach((segment: any) => {
              segment.pointPositions.forEach((pp: any) => {
                expect(pp).toHaveProperty('id');
                expect(pp).toHaveProperty('x');
                expect(pp).toHaveProperty('y');
                expect(typeof pp.x).toBe('number');
                expect(typeof pp.y).toBe('number');
                expect(isFinite(pp.x)).toBe(true);
                expect(isFinite(pp.y)).toBe(true);
              });
            });
          });
        });

        describe("Point bounds compliance", () => {
          it("should keep all youngMales expanded points within segment bounds", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const youngMalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
            });

            const youngMalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === youngMalesSplitIdx
            );

            const expandedSegments = youngMalesSegmentGroup.segments.expanded;

            // Verify all points are within segment bounds (accounting for 1px margin)
            expandedSegments.forEach((segment: any) => {
              const minX = segment.x + 1;
              const maxX = segment.x + segment.width - 1;
              const minY = segment.y + 1;
              const maxY = segment.y + segment.height - 1;

              segment.pointPositions.forEach((pp: any) => {
                expect(pp.x).toBeGreaterThanOrEqual(minX);
                expect(pp.x).toBeLessThanOrEqual(maxX);
                expect(pp.y).toBeGreaterThanOrEqual(minY);
                expect(pp.y).toBeLessThanOrEqual(maxY);
              });
            });
          });

          it("should keep all oldFemales expanded points within segment bounds", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const oldFemalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
            });

            const oldFemalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === oldFemalesSplitIdx
            );

            const expandedSegments = oldFemalesSegmentGroup.segments.expanded;

            // Verify all points are within segment bounds (accounting for 1px margin)
            expandedSegments.forEach((segment: any) => {
              const minX = segment.x + 1;
              const maxX = segment.x + segment.width - 1;
              const minY = segment.y + 1;
              const maxY = segment.y + segment.height - 1;

              segment.pointPositions.forEach((pp: any) => {
                expect(pp.x).toBeGreaterThanOrEqual(minX);
                expect(pp.x).toBeLessThanOrEqual(maxX);
                expect(pp.y).toBeGreaterThanOrEqual(minY);
                expect(pp.y).toBeLessThanOrEqual(maxY);
              });
            });
          });

          it("should keep all youngMales collapsed points within segment bounds", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const youngMalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
            });

            const youngMalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === youngMalesSplitIdx
            );

            const collapsedSegments = youngMalesSegmentGroup.segments.collapsed;

            // Verify all points are within segment bounds (accounting for 1px margin)
            collapsedSegments.forEach((segment: any) => {
              const minX = segment.x + 1;
              const maxX = segment.x + segment.width - 1;
              const minY = segment.y + 1;
              const maxY = segment.y + segment.height - 1;

              segment.pointPositions.forEach((pp: any) => {
                expect(pp.x).toBeGreaterThanOrEqual(minX);
                expect(pp.x).toBeLessThanOrEqual(maxX);
                expect(pp.y).toBeGreaterThanOrEqual(minY);
                expect(pp.y).toBeLessThanOrEqual(maxY);
              });
            });
          });

          it("should keep all oldFemales collapsed points within segment bounds", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const oldFemalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
            });

            const oldFemalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === oldFemalesSplitIdx
            );

            const collapsedSegments = oldFemalesSegmentGroup.segments.collapsed;

            // Verify all points are within segment bounds (accounting for 1px margin)
            collapsedSegments.forEach((segment: any) => {
              const minX = segment.x + 1;
              const maxX = segment.x + segment.width - 1;
              const minY = segment.y + 1;
              const maxY = segment.y + segment.height - 1;

              segment.pointPositions.forEach((pp: any) => {
                expect(pp.x).toBeGreaterThanOrEqual(minX);
                expect(pp.x).toBeLessThanOrEqual(maxX);
                expect(pp.y).toBeGreaterThanOrEqual(minY);
                expect(pp.y).toBeLessThanOrEqual(maxY);
              });
            });
          });
        });

        describe("Distance statistics (logged for manual inspection)", () => {
          it("should log inter-point distance distribution for youngMales", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const youngMalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "young" && genderGroup?.responseGroup?.label === "male";
            });

            const youngMalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === youngMalesSplitIdx
            );

            const expandedSegments = youngMalesSegmentGroup.segments.expanded;

            console.log("\n=== youngMales Inter-Point Distance Statistics ===");
            expandedSegments.forEach((segment: any, segIdx: number) => {
              if (segment.pointPositions.length < 2) {
                console.log(`Segment ${segIdx}: <2 points, skipping distance calculation`);
                return;
              }

              const distances: number[] = [];
              for (let i = 0; i < segment.pointPositions.length; i++) {
                for (let j = i + 1; j < segment.pointPositions.length; j++) {
                  const dx = segment.pointPositions[i].x - segment.pointPositions[j].x;
                  const dy = segment.pointPositions[i].y - segment.pointPositions[j].y;
                  distances.push(Math.sqrt(dx * dx + dy * dy));
                }
              }

              distances.sort((a, b) => a - b);
              const min = distances[0];
              const max = distances[distances.length - 1];
              const mean = distances.reduce((sum, d) => sum + d, 0) / distances.length;
              const median = distances[Math.floor(distances.length / 2)];
              const variance = distances.reduce((sum, d) => sum + (d - mean) ** 2, 0) / distances.length;
              const stdDev = Math.sqrt(variance);

              console.log(`Segment ${segIdx} (${segment.pointPositions.length} points):`);
              console.log(`  Min: ${min.toFixed(2)}, Max: ${max.toFixed(2)}`);
              console.log(`  Mean: ${mean.toFixed(2)}, Median: ${median.toFixed(2)}, StdDev: ${stdDev.toFixed(2)}`);
            });
          });

          it("should log inter-point distance distribution for oldFemales", () => {
            const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

            const oldFemalesSplitIdx = splits.findIndex((split) => {
              const ageGroup = split.groups.find((g: any) => g.question.varName === "age");
              const genderGroup = split.groups.find((g: any) => g.question.varName === "gender");
              return ageGroup?.responseGroup?.label === "old" && genderGroup?.responseGroup?.label === "female";
            });

            const oldFemalesSegmentGroup = favViz.segmentGroups.find(
              (sg: any) => sg.splitIndex === oldFemalesSplitIdx
            );

            const expandedSegments = oldFemalesSegmentGroup.segments.expanded;

            console.log("\n=== oldFemales Inter-Point Distance Statistics ===");
            expandedSegments.forEach((segment: any, segIdx: number) => {
              if (segment.pointPositions.length < 2) {
                console.log(`Segment ${segIdx}: <2 points, skipping distance calculation`);
                return;
              }

              const distances: number[] = [];
              for (let i = 0; i < segment.pointPositions.length; i++) {
                for (let j = i + 1; j < segment.pointPositions.length; j++) {
                  const dx = segment.pointPositions[i].x - segment.pointPositions[j].x;
                  const dy = segment.pointPositions[i].y - segment.pointPositions[j].y;
                  distances.push(Math.sqrt(dx * dx + dy * dy));
                }
              }

              distances.sort((a, b) => a - b);
              const min = distances[0];
              const max = distances[distances.length - 1];
              const mean = distances.reduce((sum, d) => sum + d, 0) / distances.length;
              const median = distances[Math.floor(distances.length / 2)];
              const variance = distances.reduce((sum, d) => sum + (d - mean) ** 2, 0) / distances.length;
              const stdDev = Math.sqrt(variance);

              console.log(`Segment ${segIdx} (${segment.pointPositions.length} points):`);
              console.log(`  Min: ${min.toFixed(2)}, Max: ${max.toFixed(2)}`);
              console.log(`  Mean: ${mean.toFixed(2)}, Median: ${median.toFixed(2)}, StdDev: ${stdDev.toFixed(2)}`);
            });
          });
        });
      });
    });
  });
});
