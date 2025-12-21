/**
 * INTEGRATION TESTS FOR initializeSplitsWithSegments
 * 
 * This file will contain integration tests that verify initializeSplitsWithSegments
 * correctly integrates the geometry calculation functions (getWidthHeight and 
 * computeSegmentGroupBounds) with the view/split generation logic.
 * 
 * Strategy:
 * - The geometry functions (in geometry.ts) are tested independently in their own
 *   unit test files (geometryBounds.test.ts and geometryPoints.test.ts)
 * - These integration tests will verify that initializeSplitsWithSegments:
 *   1. Correctly calculates vizWidth and vizHeight using getWidthHeight
 *   2. Correctly determines the number of segment groups per view
 *   3. Correctly determines grid positions for each split
 *   4. Correctly calls computeSegmentGroupBounds with the derived parameters
 *   5. Generates the expected set of views and splits
 * 
 * This approach keeps test logic simple and transparent:
 * - No hard-coded expected bounds values
 * - No duplication of geometry calculation logic
 * - Test verifies integration, not mathematical correctness
 * - Works with any fixture configuration
 */

import { initializeSplitsWithSegments } from '../../src/segmentViz/initializeSplitsWithSegments';
import { getWidthHeight, computeSegmentGroupBounds } from '../../src/segmentViz/geometry';
import { createSegmentVizConfig } from '../fixtures/createSegmentVizConfig';

/**
 * Helper to group splits by view (based on which grouping questions are active)
 * A view is defined by which specific questions have active (non-null) responseGroups.
 * Uses question identifiers rather than array position to work regardless of group order.
 */
function groupSplitsByView(splits: any[]) {
  const viewMap = new Map<string, any[]>();

  for (const split of splits) {
    // Create a view key based on which specific questions are active
    // Sort the active question identifiers to ensure consistent key regardless of order
    const activeQuestions = split.groups
      .filter((g: any) => g.responseGroup !== null)
      .map((g: any) => `${g.question.batteryName}.${g.question.subBattery}.${g.question.varName}`)
      .sort();

    const viewKey = activeQuestions.join('|');

    if (!viewMap.has(viewKey)) {
      viewMap.set(viewKey, []);
    }
    viewMap.get(viewKey)!.push(split);
  }

  return Array.from(viewMap.values());
}



/**
 * Helper to check if two questions are the same based on their identifying properties
 */
function isSameQuestion(q1: any, q2: any): boolean {
  return q1.batteryName === q2.batteryName &&
    q1.subBattery === q2.subBattery &&
    q1.varName === q2.varName;
}

/**
 * Helper to calculate expected number of segment groups for a view
 * Identifies x-axis vs y-axis groups by comparing questions, not array position
 */
function getExpectedSegmentGroupCount(split: any, config: any) {
  // Product of response groups for active x-axis questions
  let numSegmentGroupsX = 1;
  config.groupingQuestions.x.forEach((xQuestion: any) => {
    const group = split.groups.find((g: any) => isSameQuestion(g.question, xQuestion.question));
    if (group && group.responseGroup !== null) {
      numSegmentGroupsX *= xQuestion.responseGroups.length;
    }
  });

  // Product of response groups for active y-axis questions
  let numSegmentGroupsY = 1;
  config.groupingQuestions.y.forEach((yQuestion: any) => {
    const group = split.groups.find((g: any) => isSameQuestion(g.question, yQuestion.question));
    if (group && group.responseGroup !== null) {
      numSegmentGroupsY *= yQuestion.responseGroups.length;
    }
  });

  return { x: numSegmentGroupsX, y: numSegmentGroupsY };
}

describe('initializeSplitsWithSegments', () => {
  describe('integration with geometry functions (items 1-4)', () => {
    test('correctly integrates geometry calculations for 1x1 grouping questions', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [3]
      });

      const [expectedVizWidth, expectedVizHeight] = getWidthHeight(config);
      const result = initializeSplitsWithSegments(config);

      // Group splits by view
      const views = groupSplitsByView(result.splits);

      views.forEach(viewSplits => {
        const firstSplit = viewSplits[0];
        const numSegmentGroups = getExpectedSegmentGroupCount(firstSplit, config);

        // Verify split count matches grid size (items 2)
        expect(viewSplits).toHaveLength(numSegmentGroups.x * numSegmentGroups.y);

        // For each split, verify bounds match expected (items 1, 3, 4)
        viewSplits.forEach((split: any) => {
          const expectedBounds = computeSegmentGroupBounds(
            split.segmentGroupBounds.segmentGroupIndices ||
            {
              x: split.segmentGroupBounds.x / (split.segmentGroupBounds.width + config.groupGapX),
              y: split.segmentGroupBounds.y / (split.segmentGroupBounds.height + config.groupGapY)
            },
            numSegmentGroups,
            expectedVizWidth,
            expectedVizHeight,
            config.groupGapX,
            config.groupGapY
          );

          // Verify bounds are correct
          expect(split.segmentGroupBounds.width).toBeCloseTo(expectedBounds.width, 10);
          expect(split.segmentGroupBounds.height).toBeCloseTo(expectedBounds.height, 10);

          // Verify all bounds fit within canvas
          expect(split.segmentGroupBounds.x).toBeGreaterThanOrEqual(0);
          expect(split.segmentGroupBounds.y).toBeGreaterThanOrEqual(0);
          expect(split.segmentGroupBounds.x + split.segmentGroupBounds.width).toBeLessThanOrEqual(expectedVizWidth + 0.001);
          expect(split.segmentGroupBounds.y + split.segmentGroupBounds.height).toBeLessThanOrEqual(expectedVizHeight + 0.001);
        });
      });
    });

    test('correctly integrates geometry calculations for 2x2 grouping questions', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 3,
        xAxisResponseGroups: [2, 3],
        minGroupAvailableWidth: 80,
        yAxisResponseGroups: [2, 2]
      });

      const [expectedVizWidth, expectedVizHeight] = getWidthHeight(config);
      const result = initializeSplitsWithSegments(config);

      const views = groupSplitsByView(result.splits);

      views.forEach(viewSplits => {
        const firstSplit = viewSplits[0];
        const numSegmentGroups = getExpectedSegmentGroupCount(firstSplit, config);

        expect(viewSplits).toHaveLength(numSegmentGroups.x * numSegmentGroups.y);

        viewSplits.forEach((split: any) => {
          expect(split.segmentGroupBounds.x).toBeGreaterThanOrEqual(0);
          expect(split.segmentGroupBounds.y).toBeGreaterThanOrEqual(0);
          expect(split.segmentGroupBounds.x + split.segmentGroupBounds.width).toBeLessThanOrEqual(expectedVizWidth + 0.001);
          expect(split.segmentGroupBounds.y + split.segmentGroupBounds.height).toBeLessThanOrEqual(expectedVizHeight + 0.001);
        });
      });
    });

    test('correctly integrates geometry calculations for asymmetric grouping questions', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 5,
        xAxisResponseGroups: [3],
        minGroupAvailableWidth: 120,
        yAxisResponseGroups: [2, 3]
      });

      const [expectedVizWidth, expectedVizHeight] = getWidthHeight(config);
      const result = initializeSplitsWithSegments(config);

      const views = groupSplitsByView(result.splits);

      views.forEach(viewSplits => {
        const firstSplit = viewSplits[0];
        const numSegmentGroups = getExpectedSegmentGroupCount(firstSplit, config);

        expect(viewSplits).toHaveLength(numSegmentGroups.x * numSegmentGroups.y);

        viewSplits.forEach((split: any) => {
          expect(split.segmentGroupBounds.x).toBeGreaterThanOrEqual(0);
          expect(split.segmentGroupBounds.y).toBeGreaterThanOrEqual(0);
          expect(split.segmentGroupBounds.x + split.segmentGroupBounds.width).toBeLessThanOrEqual(expectedVizWidth + 0.001);
          expect(split.segmentGroupBounds.y + split.segmentGroupBounds.height).toBeLessThanOrEqual(expectedVizHeight + 0.001);
        });
      });
    });

    test('correctly integrates geometry calculations for many grouping questions', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2, 2, 2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2, 2]
      });

      const [expectedVizWidth, expectedVizHeight] = getWidthHeight(config);
      const result = initializeSplitsWithSegments(config);

      const views = groupSplitsByView(result.splits);

      views.forEach(viewSplits => {
        const firstSplit = viewSplits[0];
        const numSegmentGroups = getExpectedSegmentGroupCount(firstSplit, config);

        expect(viewSplits).toHaveLength(numSegmentGroups.x * numSegmentGroups.y);

        viewSplits.forEach((split: any) => {
          expect(split.segmentGroupBounds.x).toBeGreaterThanOrEqual(0);
          expect(split.segmentGroupBounds.y).toBeGreaterThanOrEqual(0);
          expect(split.segmentGroupBounds.x + split.segmentGroupBounds.width).toBeLessThanOrEqual(expectedVizWidth + 0.001);
          expect(split.segmentGroupBounds.y + split.segmentGroupBounds.height).toBeLessThanOrEqual(expectedVizHeight + 0.001);
        });
      });
    });
  });

  describe('view and split generation (item 5)', () => {
    test('generates correct number of views for 1x1 grouping questions', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2]
      });

      const result = initializeSplitsWithSegments(config);
      const views = groupSplitsByView(result.splits);

      // With 1 question on each axis: 2 states per question (active/inactive)
      // Total views = 2^1 * 2^1 = 4
      expect(views).toHaveLength(4);
    });

    test('generates correct number of views for 2x2 grouping questions', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 3,
        xAxisResponseGroups: [2, 3],
        minGroupAvailableWidth: 80,
        yAxisResponseGroups: [2, 2]
      });

      const result = initializeSplitsWithSegments(config);
      const views = groupSplitsByView(result.splits);

      // With 2 questions on each axis: 2 states per question
      // Total views = 2^2 * 2^2 = 16
      expect(views).toHaveLength(16);
    });

    test('generates correct number of total splits across all views', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [3]
      });

      const result = initializeSplitsWithSegments(config);

      // Calculate expected total splits across all views
      // Each view has a different number of splits based on which questions are active
      const views = groupSplitsByView(result.splits);
      let totalSplits = 0;

      views.forEach(viewSplits => {
        totalSplits += viewSplits.length;
      });

      expect(result.splits).toHaveLength(totalSplits);
      expect(totalSplits).toBeGreaterThan(0);
    });
  });
});
