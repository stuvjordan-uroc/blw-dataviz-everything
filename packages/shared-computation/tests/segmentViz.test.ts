/**
 * Tests for SegmentViz class initialization without data.
 *
 * These tests verify that SegmentViz correctly performs computational tasks
 * that don't require the connected Statistics instance to be hydrated with data:
 * 1. Computing vizWidth and vizHeight
 * 2. Constructing grouping questions for each response question
 * 3. Creating empty point sets
 * 4. Computing segment group bounds
 */

import { Statistics, type StatsConfig } from "../src/statistics";
import { SegmentViz } from "../src/segmentViz";
import type { SegmentVizConfig } from "../src/segmentViz/types";
import {
  ageGroupingQuestion,
  genderGroupingQuestion,
  partisanshipGroupingQuestion,
  favorabilityResponseQuestion,
  partisanshipResponseQuestion,
} from "./fixtures/segmentViz-fixtures";
import { getQuestionKey } from "../src/utils";

/**
 * Helper to find a segment group by split characteristics.
 */
function findSegmentGroupBySplit(
  segmentGroups: any[],
  splits: any[],
  ageLabelOrNull: string | null,
  genderLabelOrNull: string | null
): any {
  return segmentGroups.find((sg) => {
    const split = splits[sg.splitIndex];
    const ageGroup = split.groups.find(
      (g: any) => g.question.varName === "age"
    );
    const genderGroup = split.groups.find(
      (g: any) => g.question.varName === "gender"
    );

    const ageMatch =
      ageLabelOrNull === null
        ? ageGroup.responseGroup === null
        : ageGroup.responseGroup?.label === ageLabelOrNull;

    const genderMatch =
      genderLabelOrNull === null
        ? genderGroup.responseGroup === null
        : genderGroup.responseGroup?.label === genderLabelOrNull;

    return ageMatch && genderMatch;
  });
}

describe("SegmentViz - Initialization (No Data)", () => {
  describe("Viz dimensions computation", () => {
    let stats: Statistics;
    let segmentViz: SegmentViz;

    beforeAll(() => {
      const statsConfig: StatsConfig = {
        responseQuestions: [favorabilityResponseQuestion],
        groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
      };

      // Create Statistics instance with no data
      stats = new Statistics(statsConfig);

      const vizConfig: SegmentVizConfig = {
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

      segmentViz = new SegmentViz(stats, vizConfig);
    });

    it("should compute vizWidth correctly", () => {
      // VizWidth calculation:
      // - X-axis grouping questions: age (2 groups)
      // - Max response groups across all response questions: favorability has 4 expanded groups
      //
      // Formula: (numGroupsX - 1) * groupGapX + numGroupsX * ((maxRespGroups - 1) * responseGap + maxRespGroups * baseSegmentWidth + minGroupAvailableWidth)
      //        = (2 - 1) * 10 + 2 * ((4 - 1) * 0 + 4 * 10 + 100)
      //        = 10 + 2 * (0 + 40 + 100)
      //        = 10 + 2 * 140
      //        = 10 + 280
      //        = 290

      expect(segmentViz["vizWidth"]).toBe(290);
    });

    it("should compute vizHeight correctly", () => {
      // VizHeight calculation:
      // - Y-axis grouping questions: gender (2 groups)
      //
      // Formula: (numGroupsY - 1) * groupGapY + numGroupsY * minGroupHeight
      //        = (2 - 1) * 10 + 2 * 100
      //        = 10 + 200
      //        = 210

      expect(segmentViz["vizHeight"]).toBe(210);
    });
  });

  describe("Grouping questions construction", () => {
    describe("when response question is not a grouping question", () => {
      let segmentViz: SegmentViz;
      let vizMap: any;

      beforeAll(() => {
        const statsConfig: StatsConfig = {
          responseQuestions: [favorabilityResponseQuestion],
          groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
        };

        const stats = new Statistics(statsConfig);

        const vizConfig: SegmentVizConfig = {
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

        segmentViz = new SegmentViz(stats, vizConfig);
        vizMap = segmentViz["vizMap"];
      });

      it("should include all configured grouping questions", () => {
        const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

        expect(favViz.groupingQuestions.x).toHaveLength(1);
        expect(favViz.groupingQuestions.x[0].varName).toBe("age");

        expect(favViz.groupingQuestions.y).toHaveLength(1);
        expect(favViz.groupingQuestions.y[0].varName).toBe("gender");
      });

      it("should have no excluded grouping questions", () => {
        const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));
        expect(favViz.groupingQuestions.excludedQuestionKeys).toHaveLength(0);
      });
    });

    describe("when response question IS a grouping question", () => {
      let segmentViz: SegmentViz;
      let vizMap: any;

      beforeAll(() => {
        const statsConfig: StatsConfig = {
          responseQuestions: [
            favorabilityResponseQuestion,
            partisanshipResponseQuestion,
          ],
          groupingQuestions: [
            ageGroupingQuestion,
            partisanshipGroupingQuestion,
          ],
        };

        const stats = new Statistics(statsConfig);

        const vizConfig: SegmentVizConfig = {
          responseQuestionKeys: [
            getQuestionKey(favorabilityResponseQuestion),
            getQuestionKey(partisanshipResponseQuestion),
          ],
          groupingQuestionKeys: {
            x: [
              getQuestionKey(ageGroupingQuestion),
              getQuestionKey(partisanshipGroupingQuestion),
            ],
            y: [],
          },
          minGroupAvailableWidth: 100,
          minGroupHeight: 100,
          groupGapX: 10,
          groupGapY: 10,
          responseGap: 0,
          baseSegmentWidth: 10,
        };

        segmentViz = new SegmentViz(stats, vizConfig);
        vizMap = segmentViz["vizMap"];
      });

      it("should exclude partisanship from its own viz grouping questions", () => {
        const partViz = vizMap.get(
          getQuestionKey(partisanshipResponseQuestion)
        );

        // X-axis should only have age (partisanship excluded because it's the response question)
        expect(partViz.groupingQuestions.x).toHaveLength(1);
        expect(partViz.groupingQuestions.x[0].varName).toBe("age");

        // Y-axis should be empty
        expect(partViz.groupingQuestions.y).toHaveLength(0);

        // Partisanship should be in excluded list
        expect(partViz.groupingQuestions.excludedQuestionKeys).toContain(
          getQuestionKey(partisanshipGroupingQuestion)
        );
      });

      it("should include partisanship in favorability viz grouping questions", () => {
        const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

        // X-axis should have both age and partisanship
        expect(favViz.groupingQuestions.x).toHaveLength(2);
        expect(favViz.groupingQuestions.x[0].varName).toBe("age");
        expect(favViz.groupingQuestions.x[1].varName).toBe("partisanship");

        // No excluded questions
        expect(favViz.groupingQuestions.excludedQuestionKeys).toHaveLength(0);
      });
    });
  });

  describe("Point sets creation", () => {
    let stats: Statistics;
    let segmentViz: SegmentViz;
    let vizMap: any;

    beforeAll(() => {
      const statsConfig: StatsConfig = {
        responseQuestions: [favorabilityResponseQuestion],
        groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
      };

      stats = new Statistics(statsConfig);

      const vizConfig: SegmentVizConfig = {
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

      segmentViz = new SegmentViz(stats, vizConfig);
      vizMap = segmentViz["vizMap"];
    });

    it("should create one point set per fully-specified split", () => {
      const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

      // With 2 grouping questions (age, gender), each with 2 groups,
      // we have 2 * 2 = 4 fully-specified splits
      expect(favViz.points).toHaveLength(4 * 4); // 4 splits × 4 expanded response groups
    });

    it("should have empty point ID arrays (no data)", () => {
      const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

      for (const pointSet of favViz.points) {
        expect(pointSet.currentIds).toEqual([]);
        expect(pointSet.addedIds).toEqual([]);
        expect(pointSet.removedIds).toEqual([]);
      }
    });

    it("should have correct response group indices", () => {
      const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

      // Favorability response groups:
      // Expanded: [strongly_favorable(1), favorable(2), unfavorable(3), strongly_unfavorable(4)]
      // Collapsed: [all_favorable(1,2), all_unfavorable(3,4)]
      //
      // Expected mapping (computed from values):
      // - Expanded group 0 (values: [1]) -> Collapsed group 0 (values: [1,2]) ✓ (1 is in [1,2])
      // - Expanded group 1 (values: [2]) -> Collapsed group 0 (values: [1,2]) ✓ (2 is in [1,2])
      // - Expanded group 2 (values: [3]) -> Collapsed group 1 (values: [3,4]) ✓ (3 is in [3,4])
      // - Expanded group 3 (values: [4]) -> Collapsed group 1 (values: [3,4]) ✓ (4 is in [3,4])

      const expandedGroups =
        favorabilityResponseQuestion.responseGroups.expanded;
      const collapsedGroups =
        favorabilityResponseQuestion.responseGroups.collapsed;

      // For each point set, verify the mapping
      for (const pointSet of favViz.points) {
        const expandedIdx = pointSet.responseGroupIndex.expanded;
        const collapsedIdx = pointSet.responseGroupIndex.collapsed;

        // Get the value(s) from the expanded group
        const expandedValues = expandedGroups[expandedIdx].values;

        // Get the values from the collapsed group
        const collapsedValues = collapsedGroups[collapsedIdx].values;

        // Verify that all expanded values are contained in the collapsed values
        for (const expVal of expandedValues) {
          expect(collapsedValues).toContain(expVal);
        }
      }
    });

    it("should map expanded groups to collapsed groups correctly for favorability", () => {
      const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

      // Find point sets for each expanded group (using first fully-specified split)
      const fullySpecifiedSplitIdx = favViz.fullySpecifiedSplitIndices[0];

      const pointSetsForSplit = favViz.points.filter(
        (ps: any) => ps.fullySpecifiedSplitIndex === fullySpecifiedSplitIdx
      );

      // Verify we have one point set per expanded group
      expect(pointSetsForSplit).toHaveLength(4);

      // Group by collapsed index
      const byCollapsedIdx: Record<number, number[]> = {};
      for (const ps of pointSetsForSplit) {
        const collapsedIdx = ps.responseGroupIndex.collapsed;
        if (!byCollapsedIdx[collapsedIdx]) {
          byCollapsedIdx[collapsedIdx] = [];
        }
        byCollapsedIdx[collapsedIdx].push(ps.responseGroupIndex.expanded);
      }

      // Collapsed group 0 (all_favorable: values [1,2]) should contain expanded groups 0 and 1
      expect(byCollapsedIdx[0].sort()).toEqual([0, 1]);

      // Collapsed group 1 (all_unfavorable: values [3,4]) should contain expanded groups 2 and 3
      expect(byCollapsedIdx[1].sort()).toEqual([2, 3]);
    });
  });

  describe("Segment group bounds computation", () => {
    let stats: Statistics;
    let segmentViz: SegmentViz;
    let vizMap: any;
    let splits: any[];

    beforeAll(() => {
      const statsConfig: StatsConfig = {
        responseQuestions: [favorabilityResponseQuestion],
        groupingQuestions: [ageGroupingQuestion, genderGroupingQuestion],
      };

      stats = new Statistics(statsConfig);
      splits = stats.getSplits();

      const vizConfig: SegmentVizConfig = {
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

      segmentViz = new SegmentViz(stats, vizConfig);
      vizMap = segmentViz["vizMap"];
    });

    describe("Visual layout (2x2 grid)", () => {
      // Visual layout (not to scale):
      //
      //        young (x=0)         old (x=150)
      //        width=140          width=140
      //   ┌─────────────────┬──┬─────────────────┐
      //   │                 │10│                 │
      // f │  young_female   │  │  old_female     │ height=100
      // e │  (0,0)          │  │  (1,0)          │ y=0
      // m │                 │  │                 │
      //   ├─────────────────┼──┼─────────────────┤
      //   │       gap = 10  │  │                 │
      // m ├─────────────────┼──┼─────────────────┤
      // a │                 │10│                 │
      // l │  young_male     │  │  old_male       │ height=100
      // e │  (0,1)          │  │  (1,1)          │ y=110
      //   │                 │  │                 │
      //   └─────────────────┴──┴─────────────────┘
      //
      // Aggregated splits overlay this grid:
      //
      // young_allGenders (age=young, gender=null):
      //   Sees 2×1 grid (2 age groups, 1 implicit Y group)
      //   Occupies full height at x=0: { x: 0, y: 0, width: 140, height: 210 }
      //
      // allAges_male (age=null, gender=male):
      //   Sees 1×2 grid (1 implicit X group, 2 gender groups)
      //   Occupies full width at y=110: { x: 0, y: 110, width: 290, height: 100 }
      //
      // allAges_allGenders (both null):
      //   Sees 1×1 grid
      //   Occupies entire viz: { x: 0, y: 0, width: 290, height: 210 }

      it("should create segment groups for all relevant splits", () => {
        const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

        // With 2 grouping questions (age, gender), we have:
        // - 4 fully-specified splits (2 × 2)
        // - 4 partially-aggregated splits (2 with age null, 2 with gender null)
        // - 1 fully-aggregated split (both null)
        // Total: 9 segment groups

        expect(favViz.segmentGroups).toHaveLength(9);
      });
    });

    describe("Fully-specified split", () => {
      it("should compute bounds correctly for a randomly selected fully-specified split", () => {
        const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

        // Randomly select one of the 4 fully-specified splits
        const fullySpecifiedOptions = [
          { age: "young", gender: "male" },
          { age: "young", gender: "female" },
          { age: "old", gender: "male" },
          { age: "old", gender: "female" },
        ];
        const selected =
          fullySpecifiedOptions[
          Math.floor(Math.random() * fullySpecifiedOptions.length)
          ];

        const segmentGroup = findSegmentGroupBySplit(
          favViz.segmentGroups,
          splits,
          selected.age,
          selected.gender
        );

        expect(segmentGroup).toBeDefined();

        // This split sees a 2×2 grid (2 age groups × 2 gender groups)
        // numSegmentGroups: { x: 2, y: 2 }
        //
        // segmentGroupWidth = (vizWidth - (numGroupsX - 1) * groupGapX) / numGroupsX
        //                   = (290 - (2 - 1) * 10) / 2
        //                   = (290 - 10) / 2
        //                   = 280 / 2
        //                   = 140
        //
        // segmentGroupHeight = (vizHeight - (numGroupsY - 1) * groupGapY) / numGroupsY
        //                    = (210 - (2 - 1) * 10) / 2
        //                    = (210 - 10) / 2
        //                    = 200 / 2
        //                    = 100

        expect(segmentGroup.segmentGroup.width).toBe(140);
        expect(segmentGroup.segmentGroup.height).toBe(100);

        // Position depends on which split was selected:
        // young=0, old=1; male=0, female=1
        const xIdx = selected.age === "young" ? 0 : 1;
        const yIdx = selected.gender === "male" ? 0 : 1;

        // x = xIdx * (segmentGroupWidth + groupGapX)
        //   = xIdx * (140 + 10)
        //   = xIdx * 150
        const expectedX = xIdx * 150;

        // y = yIdx * (segmentGroupHeight + groupGapY)
        //   = yIdx * (100 + 10)
        //   = yIdx * 110
        const expectedY = yIdx * 110;

        expect(segmentGroup.segmentGroup.x).toBe(expectedX);
        expect(segmentGroup.segmentGroup.y).toBe(expectedY);
      });
    });

    describe("Partially-aggregated split", () => {
      it("should compute bounds correctly for a randomly selected partially-aggregated split", () => {
        const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

        // Randomly select one of the partially-aggregated splits
        const partialOptions = [
          { age: "young", gender: null, desc: "young_allGenders" },
          { age: "old", gender: null, desc: "old_allGenders" },
          { age: null, gender: "male", desc: "allAges_male" },
          { age: null, gender: "female", desc: "allAges_female" },
        ];
        const selected =
          partialOptions[Math.floor(Math.random() * partialOptions.length)];

        const segmentGroup = findSegmentGroupBySplit(
          favViz.segmentGroups,
          splits,
          selected.age,
          selected.gender
        );

        expect(segmentGroup).toBeDefined();

        if (selected.age !== null && selected.gender === null) {
          // Age is specified, gender is null
          // This split sees a 2×1 grid (2 age groups × 1 implicit Y group)
          // numSegmentGroups: { x: 2, y: 1 }
          //
          // segmentGroupWidth = (290 - (2-1)*10) / 2 = 280 / 2 = 140
          // segmentGroupHeight = (210 - (1-1)*10) / 1 = 210 / 1 = 210 (full height!)
          //
          // xIdx = age === 'young' ? 0 : 1
          // yIdx = 0 (only one Y group)
          //
          // x = xIdx * (140 + 10) = xIdx * 150
          // y = 0 * (210 + 10) = 0

          expect(segmentGroup.segmentGroup.width).toBe(140);
          expect(segmentGroup.segmentGroup.height).toBe(210);

          const xIdx = selected.age === "young" ? 0 : 1;
          expect(segmentGroup.segmentGroup.x).toBe(xIdx * 150);
          expect(segmentGroup.segmentGroup.y).toBe(0);
        } else if (selected.age === null && selected.gender !== null) {
          // Gender is specified, age is null
          // This split sees a 1×2 grid (1 implicit X group × 2 gender groups)
          // numSegmentGroups: { x: 1, y: 2 }
          //
          // segmentGroupWidth = (290 - (1-1)*10) / 1 = 290 / 1 = 290 (full width!)
          // segmentGroupHeight = (210 - (2-1)*10) / 2 = 200 / 2 = 100
          //
          // xIdx = 0 (only one X group)
          // yIdx = gender === 'male' ? 0 : 1
          //
          // x = 0 * (290 + 10) = 0
          // y = yIdx * (100 + 10) = yIdx * 110

          expect(segmentGroup.segmentGroup.width).toBe(290);
          expect(segmentGroup.segmentGroup.height).toBe(100);

          const yIdx = selected.gender === "male" ? 0 : 1;
          expect(segmentGroup.segmentGroup.x).toBe(0);
          expect(segmentGroup.segmentGroup.y).toBe(yIdx * 110);
        }
      });
    });

    describe("Fully-aggregated split", () => {
      it("should compute bounds correctly for the all-null split", () => {
        const favViz = vizMap.get(getQuestionKey(favorabilityResponseQuestion));

        const segmentGroup = findSegmentGroupBySplit(
          favViz.segmentGroups,
          splits,
          null,
          null
        );

        expect(segmentGroup).toBeDefined();

        // age=null, gender=null
        // This split sees a 1×1 grid (1 implicit X group × 1 implicit Y group)
        // numSegmentGroups: { x: 1, y: 1 }
        //
        // segmentGroupWidth = (290 - (1-1)*10) / 1 = 290 / 1 = 290 (full width)
        // segmentGroupHeight = (210 - (1-1)*10) / 1 = 210 / 1 = 210 (full height)
        //
        // segmentGroupIndices: { x: 0, y: 0 } (no active grouping questions)
        //
        // x = 0 * (290 + 10) = 0
        // y = 0 * (210 + 10) = 0

        expect(segmentGroup.segmentGroup).toEqual({
          x: 0,
          y: 0,
          width: 290,
          height: 210,
        });
      });
    });
  });
});
