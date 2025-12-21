import { getWidthHeight, computeSegmentGroupBounds, computeSegmentBounds } from '../../src/segmentViz/geometry';
import type { SegmentVizConfig } from '../../src/segmentViz/types';
import { createSegmentVizConfig } from '../fixtures/createSegmentVizConfig';





/**
 * GEOMETRY BOUNDS TESTS
 * 
 * getWidthHeight() calculates the FIXED CANVAS SIZE for the entire visualization.
 * This canvas size is based on the MAXIMUM possible grid - when ALL grouping questions
 * are active simultaneously. Individual views may use fewer grouping questions and will
 * subdivide this fixed canvas accordingly (see computeSegmentGroupBounds).
 * 
 * ============================================================================
 * CALCULATION LOGIC: 6 INDEPENDENT DIMENSIONS
 * ============================================================================
 * 
 * WIDTH CALCULATION (3 dimensions):
 * ---------------------------------
 * 
 * 1. numResponseGroupsExpanded: Number of response groups shown horizontally
 *    Each segment group contains these response groups side-by-side.
 * 
 * 2. xAxisResponseGroups: Array where length = number of x-axis grouping questions,
 *    and each element = number of groups for that question.
 *    Total x-axis segment groups = CARTESIAN PRODUCT of array elements.
 *    
 *    Example: [2, 3] means:
 *    - Question 1 has 2 groups (A, B)
 *    - Question 2 has 3 groups (X, Y, Z)
 *    - Total segment groups = 2 × 3 = 6: (A,X), (A,Y), (A,Z), (B,X), (B,Y), (B,Z)
 * 
 * 3. minGroupAvailableWidth: Minimum width allocated for distributing among
 *    response groups based on their proportions.
 * 
 * ASCII Diagram - Width Calculation:
 * 
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │                         TOTAL VIZ WIDTH                                 │
 *   └─────────────────────────────────────────────────────────────────────────┘
 *   
 *   ┌──────────────────┬─gap─┬──────────────────┬─gap─┬──────────────────┐
 *   │ Segment Group 1  │     │ Segment Group 2  │     │ Segment Group 3  │ ...
 *   └──────────────────┴─────┴──────────────────┴─────┴──────────────────┘
 *    \________________/       \________________/       \________________/
 *    segmentGroupWidth        segmentGroupWidth        segmentGroupWidth
 *   
 *   Each Segment Group (zoomed in):
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │                      segmentGroupWidth                              │
 *   └─────────────────────────────────────────────────────────────────────┘
 *   
 *   ┌──────┬─gap─┬──────┬─gap─┬──────┬───────────────────────────────────┐
 *   │ RG1  │     │ RG2  │     │ RG3  │     minGroupAvailableWidth         │
 *   └──────┴─────┴──────┴─────┴──────┴───────────────────────────────────┘
 *    \____/       \____/       \____/
 *     base         base         base
 *     width        width        width
 * 
 *   Where RG = Response Group
 * 
 *   Formula:
 *   
 *   baseWidth = (numResponseGroupsExpanded × baseSegmentWidth) + 
 *               ((numResponseGroupsExpanded - 1) × responseGap)
 *   
 *   segmentGroupWidth = baseWidth + minGroupAvailableWidth
 *   
 *   numSegmentGroupsX = product of all values in xAxisResponseGroups array
 *   
 *   vizWidth = (numSegmentGroupsX × segmentGroupWidth) + 
 *              ((numSegmentGroupsX - 1) × groupGapX)
 * 
 * 
 * HEIGHT CALCULATION (3 dimensions):
 * ----------------------------------
 * 
 * 4. yAxisResponseGroups: Array where length = number of y-axis grouping questions,
 *    and each element = number of groups for that question.
 *    Total y-axis segment groups = CARTESIAN PRODUCT of array elements.
 *    
 *    Example: [2, 2] means:
 *    - Question 1 has 2 groups (M, F)
 *    - Question 2 has 2 groups (Young, Old)
 *    - Total segment groups = 2 × 2 = 4: (M,Young), (M,Old), (F,Young), (F,Old)
 * 
 * 5. minGroupHeight: Fixed height for each segment group (not proportional).
 * 
 * 6. groupGapY: Vertical gap between segment groups.
 * 
 * ASCII Diagram - Height Calculation:
 * 
 *   ┌──────────────────────────────────┐  ▲
 *   │      Segment Group (0,0)         │  │ minGroupHeight
 *   └──────────────────────────────────┘  ▼
 *   
 *   ─ ─ ─ ─ ─ groupGapY ─ ─ ─ ─ ─
 *   
 *   ┌──────────────────────────────────┐  ▲
 *   │      Segment Group (0,1)         │  │ minGroupHeight
 *   └──────────────────────────────────┘  ▼
 *   
 *   ─ ─ ─ ─ ─ groupGapY ─ ─ ─ ─ ─
 *   
 *   ┌──────────────────────────────────┐  ▲
 *   │      Segment Group (0,2)         │  │ minGroupHeight
 *   └──────────────────────────────────┘  ▼
 * 
 *   Formula:
 *   
 *   numSegmentGroupsY = product of all values in yAxisResponseGroups array
 *   
 *   vizHeight = (numSegmentGroupsY × minGroupHeight) + 
 *               ((numSegmentGroupsY - 1) × groupGapY)
 * 
 * 
 * ============================================================================
 * KEY INSIGHT: CARTESIAN PRODUCTS
 * ============================================================================
 * 
 * Multiple grouping questions on an axis create a CARTESIAN PRODUCT of segment
 * groups. This is why the test helper uses ARRAYS - each array element represents
 * one question's contribution to the product.
 * 
 * Example with 2 x-axis questions:
 *   xAxisResponseGroups: [3, 2]
 *   
 *   Question 1: [A, B, C] (3 groups)
 *   Question 2: [X, Y] (2 groups)
 *   
 *   Resulting segment groups (3 × 2 = 6):
 *   (A,X), (A,Y), (B,X), (B,Y), (C,X), (C,Y)
 * 
 * This is the foundation for understanding the test organization below.
 */
describe('getWidthHeight', () => {
  describe('varying number of response question expanded groups', () => {
    test('calculates correct width with 2 expanded response groups', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 2,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2]
      });

      const [width, height] = getWidthHeight(config);

      // With defaults: baseSegmentWidth=5, responseGap=2, groupGapX=10
      // baseWidth = (2 * 5) + (1 * 2) = 12
      // segmentGroupWidth = 12 + 100 = 112
      // width = (2 * 112) + (1 * 10) = 234
      expect(width).toBe(234);
    });

    test('calculates correct width with 4 expanded response groups', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2]
      });

      const [width, height] = getWidthHeight(config);

      // With defaults: baseSegmentWidth=5, responseGap=2, groupGapX=10
      // baseWidth = (4 * 5) + (3 * 2) = 26
      // segmentGroupWidth = 26 + 100 = 126
      // width = (2 * 126) + (1 * 10) = 262
      expect(width).toBe(262);
    });

    test('calculates correct width with 6 expanded response groups', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 6,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2]
      });

      const [width, height] = getWidthHeight(config);

      // With defaults: baseSegmentWidth=5, responseGap=2, groupGapX=10
      // baseWidth = (6 * 5) + (5 * 2) = 40
      // segmentGroupWidth = 40 + 100 = 140
      // width = (2 * 140) + (1 * 10) = 290
      expect(width).toBe(290);
    });
  });

  describe('varying number of x-axis grouping questions', () => {
    test('calculates correct width with 1 x-axis grouping question', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2]
      });

      const [width, height] = getWidthHeight(config);

      // Response group product: 2 (one question with 2 groups)
      // With defaults: baseSegmentWidth=5, responseGap=2, groupGapX=10
      // segmentGroupWidth = 126 (from baseWidth=26 + minGroupAvailableWidth=100)
      // width = (2 * 126) + (1 * 10) = 262
      expect(width).toBe(262);
    });

    test('calculates correct width with 2 x-axis grouping questions (cartesian product)', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2, 2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2]
      });

      const [width, height] = getWidthHeight(config);

      // Response group product: 2 × 2 = 4 (cartesian product)
      // With defaults: groupGapX=10
      // segmentGroupWidth = 126 (from baseWidth=26 + minGroupAvailableWidth=100)
      // width = (4 * 126) + (3 * 10) = 534
      expect(width).toBe(534);
    });

    test('calculates correct width with 3 x-axis grouping questions (cartesian product)', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2, 2, 2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2]
      });

      const [width, height] = getWidthHeight(config);

      // Response group product: 2 × 2 × 2 = 8 (cartesian product)
      // With defaults: groupGapX=10
      // segmentGroupWidth = 126 (from baseWidth=26 + minGroupAvailableWidth=100)
      // width = (8 * 126) + (7 * 10) = 1078
      expect(width).toBe(1078);
    });
  });

  describe('varying response groups per x-axis grouping question', () => {
    test('calculates correct width with 2 response groups per x-axis question', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2, 2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2]
      });

      const [width, height] = getWidthHeight(config);

      // Response group product: 2 × 2 = 4
      // With defaults: groupGapX=10
      // segmentGroupWidth = 126 (from baseWidth=26 + minGroupAvailableWidth=100)
      // width = (4 * 126) + (3 * 10) = 534
      expect(width).toBe(534);
    });

    test('calculates correct width with 3 response groups per x-axis question', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [3, 3],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2]
      });

      const [width, height] = getWidthHeight(config);

      // Response group product: 3 × 3 = 9
      // With defaults: groupGapX=10
      // segmentGroupWidth = 126 (from baseWidth=26 + minGroupAvailableWidth=100)
      // width = (9 * 126) + (8 * 10) = 1214
      expect(width).toBe(1214);
    });

    test('calculates correct width with 4 response groups per x-axis question', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [4, 4],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2]
      });

      const [width, height] = getWidthHeight(config);

      // Response group product: 4 × 4 = 16
      // With defaults: groupGapX=10
      // segmentGroupWidth = 126 (from baseWidth=26 + minGroupAvailableWidth=100)
      // width = (16 * 126) + (15 * 10) = 2166
      expect(width).toBe(2166);
    });

    test('calculates correct width with varying response groups across questions', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2, 3],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2]
      });

      const [width, height] = getWidthHeight(config);

      // Response group product: 2 × 3 = 6
      // With defaults: groupGapX=10
      // segmentGroupWidth = 126 (from baseWidth=26 + minGroupAvailableWidth=100)
      // width = (6 * 126) + (5 * 10) = 806
      expect(width).toBe(806);
    });
  });

  describe('varying minGroupAvailableWidth', () => {
    test('calculates correct width with minGroupAvailableWidth = 50', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 50,
        yAxisResponseGroups: [2]
      });

      const [width, height] = getWidthHeight(config);

      // With defaults: baseSegmentWidth=5, responseGap=2, groupGapX=10
      // baseWidth = 26, segmentGroupWidth = 26 + 50 = 76
      // width = (2 * 76) + (1 * 10) = 162
      expect(width).toBe(162);
    });

    test('calculates correct width with minGroupAvailableWidth = 150', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 150,
        yAxisResponseGroups: [2]
      });

      const [width, height] = getWidthHeight(config);

      // With defaults: baseSegmentWidth=5, responseGap=2, groupGapX=10
      // baseWidth = 26, segmentGroupWidth = 26 + 150 = 176
      // width = (2 * 176) + (1 * 10) = 362
      expect(width).toBe(362);
    });

    test('calculates correct width with minGroupAvailableWidth = 0', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 0,
        yAxisResponseGroups: [2]
      });

      const [width, height] = getWidthHeight(config);

      // With defaults: baseSegmentWidth=5, responseGap=2, groupGapX=10
      // baseWidth = 26, segmentGroupWidth = 26 + 0 = 26
      // width = (2 * 26) + (1 * 10) = 62
      expect(width).toBe(62);
    });
  });

  describe('varying number of y-axis grouping questions', () => {
    test('calculates correct height with 1 y-axis grouping question', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2]
      });

      const [width, height] = getWidthHeight(config);

      // Response group product: 2 (one question with 2 groups)
      // With defaults: minGroupHeight=80, groupGapY=10
      // height = (2 * 80) + (1 * 10) = 170
      expect(height).toBe(170);
    });

    test('calculates correct height with 2 y-axis grouping questions (cartesian product)', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2, 2]
      });

      const [width, height] = getWidthHeight(config);

      // Response group product: 2 × 2 = 4 (cartesian product)
      // With defaults: minGroupHeight=80, groupGapY=10
      // height = (4 * 80) + (3 * 10) = 350
      expect(height).toBe(350);
    });

    test('calculates correct height with 3 y-axis grouping questions (cartesian product)', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2, 2, 2]
      });

      const [width, height] = getWidthHeight(config);

      // Response group product: 2 × 2 × 2 = 8 (cartesian product)
      // With defaults: minGroupHeight=80, groupGapY=10
      // height = (8 * 80) + (7 * 10) = 710
      expect(height).toBe(710);
    });
  });

  describe('varying response groups per y-axis grouping question', () => {
    test('calculates correct height with 2 response groups per y-axis question', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2, 2]
      });

      const [width, height] = getWidthHeight(config);

      // Response group product: 2 × 2 = 4
      // With defaults: minGroupHeight=80, groupGapY=10
      // height = (4 * 80) + (3 * 10) = 350
      expect(height).toBe(350);
    });

    test('calculates correct height with 3 response groups per y-axis question', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [3, 3]
      });

      const [width, height] = getWidthHeight(config);

      // Response group product: 3 × 3 = 9
      // With defaults: minGroupHeight=80, groupGapY=10
      // height = (9 * 80) + (8 * 10) = 800
      expect(height).toBe(800);
    });

    test('calculates correct height with 4 response groups per y-axis question', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [4, 4]
      });

      const [width, height] = getWidthHeight(config);

      // Response group product: 4 × 4 = 16
      // With defaults: minGroupHeight=80, groupGapY=10
      // height = (16 * 80) + (15 * 10) = 1430
      expect(height).toBe(1430);
    });

    test('calculates correct height with varying response groups across questions', () => {
      const config = createSegmentVizConfig({
        numResponseGroupsExpanded: 4,
        xAxisResponseGroups: [2],
        minGroupAvailableWidth: 100,
        yAxisResponseGroups: [2, 3]
      });

      const [width, height] = getWidthHeight(config);

      // Response group product: 2 × 3 = 6
      // With defaults: minGroupHeight=80, groupGapY=10
      // height = (6 * 80) + (5 * 10) = 530
      expect(height).toBe(530);
    });
  });
});

/**
 * computeSegmentGroupBounds() subdivides the fixed canvas into a grid of segment groups.
 * 
 * SUBDIVISION ALGORITHM (per axis):
 * 
 * For the x-axis:
 * 1. Allocate gap space: (numSegmentGroups.x - 1) × groupGapX
 * 2. Distribute remaining space equally: segmentGroupWidth = (vizWidth - gap space) / numSegmentGroups.x
 * 3. Position by ordinal index: x = segmentGroupIndices.x × (segmentGroupWidth + groupGapX)
 * 
 * For the y-axis (identical logic):
 * 1. Allocate gap space: (numSegmentGroups.y - 1) × groupGapY
 * 2. Distribute remaining space equally: segmentGroupHeight = (vizHeight - gap space) / numSegmentGroups.y
 * 3. Position by ordinal index: y = segmentGroupIndices.y × (segmentGroupHeight + groupGapY)
 * 
 * KEY PROPERTIES:
 * - All segment groups in a grid have IDENTICAL dimensions (equal width, equal height)
 * - Segment groups are positioned in a REGULAR GRID with uniform gaps
 * - The grid PERFECTLY TILES the canvas (no overlaps, no uncovered space)
 * 
 * TESTING STRATEGY:
 * Tests use "grid fixtures" that specify the grid dimensions and canvas size.
 * For each fixture, we iterate through all grid positions and verify that
 * computeSegmentGroupBounds produces correct positions and dimensions.
 */
describe('computeSegmentGroupBounds', () => {
  describe('2×2 grid', () => {
    const vizWidth = 500;
    const vizHeight = 400;
    const numSegmentGroups = { x: 2, y: 2 };
    const groupGapX = 10;
    const groupGapY = 20;

    // Expected dimensions (same for all positions in grid)
    const expectedWidth = (vizWidth - (numSegmentGroups.x - 1) * groupGapX) / numSegmentGroups.x;
    const expectedHeight = (vizHeight - (numSegmentGroups.y - 1) * groupGapY) / numSegmentGroups.y;

    test('position (0,0): top-left', () => {
      const bounds = computeSegmentGroupBounds(
        { x: 0, y: 0 },
        numSegmentGroups,
        vizWidth,
        vizHeight,
        groupGapX,
        groupGapY
      );

      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(expectedWidth);
      expect(bounds.height).toBe(expectedHeight);
    });

    test('position (1,0): top-right', () => {
      const bounds = computeSegmentGroupBounds(
        { x: 1, y: 0 },
        numSegmentGroups,
        vizWidth,
        vizHeight,
        groupGapX,
        groupGapY
      );

      expect(bounds.x).toBe(1 * (expectedWidth + groupGapX));
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(expectedWidth);
      expect(bounds.height).toBe(expectedHeight);
    });

    test('position (0,1): bottom-left', () => {
      const bounds = computeSegmentGroupBounds(
        { x: 0, y: 1 },
        numSegmentGroups,
        vizWidth,
        vizHeight,
        groupGapX,
        groupGapY
      );

      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(1 * (expectedHeight + groupGapY));
      expect(bounds.width).toBe(expectedWidth);
      expect(bounds.height).toBe(expectedHeight);
    });

    test('position (1,1): bottom-right', () => {
      const bounds = computeSegmentGroupBounds(
        { x: 1, y: 1 },
        numSegmentGroups,
        vizWidth,
        vizHeight,
        groupGapX,
        groupGapY
      );

      expect(bounds.x).toBe(1 * (expectedWidth + groupGapX));
      expect(bounds.y).toBe(1 * (expectedHeight + groupGapY));
      expect(bounds.width).toBe(expectedWidth);
      expect(bounds.height).toBe(expectedHeight);
    });
  });

  describe('3×3 grid', () => {
    const vizWidth = 600;
    const vizHeight = 900;
    const numSegmentGroups = { x: 3, y: 3 };
    const groupGapX = 15;
    const groupGapY = 30;

    const expectedWidth = (vizWidth - (numSegmentGroups.x - 1) * groupGapX) / numSegmentGroups.x;
    const expectedHeight = (vizHeight - (numSegmentGroups.y - 1) * groupGapY) / numSegmentGroups.y;

    test('iterates through all 9 positions with correct bounds', () => {
      for (let yIdx = 0; yIdx < numSegmentGroups.y; yIdx++) {
        for (let xIdx = 0; xIdx < numSegmentGroups.x; xIdx++) {
          const bounds = computeSegmentGroupBounds(
            { x: xIdx, y: yIdx },
            numSegmentGroups,
            vizWidth,
            vizHeight,
            groupGapX,
            groupGapY
          );

          // Verify dimensions (same for all positions)
          expect(bounds.width).toBe(expectedWidth);
          expect(bounds.height).toBe(expectedHeight);

          // Verify position based on ordinal index
          expect(bounds.x).toBe(xIdx * (expectedWidth + groupGapX));
          expect(bounds.y).toBe(yIdx * (expectedHeight + groupGapY));
        }
      }
    });
  });

  describe('asymmetric grid (2×3)', () => {
    const vizWidth = 800;
    const vizHeight = 600;
    const numSegmentGroups = { x: 2, y: 3 };
    const groupGapX = 20;
    const groupGapY = 10;

    const expectedWidth = (vizWidth - (numSegmentGroups.x - 1) * groupGapX) / numSegmentGroups.x;
    const expectedHeight = (vizHeight - (numSegmentGroups.y - 1) * groupGapY) / numSegmentGroups.y;

    test('iterates through all 6 positions with correct bounds', () => {
      for (let yIdx = 0; yIdx < numSegmentGroups.y; yIdx++) {
        for (let xIdx = 0; xIdx < numSegmentGroups.x; xIdx++) {
          const bounds = computeSegmentGroupBounds(
            { x: xIdx, y: yIdx },
            numSegmentGroups,
            vizWidth,
            vizHeight,
            groupGapX,
            groupGapY
          );

          expect(bounds.width).toBe(expectedWidth);
          expect(bounds.height).toBe(expectedHeight);
          expect(bounds.x).toBe(xIdx * (expectedWidth + groupGapX));
          expect(bounds.y).toBe(yIdx * (expectedHeight + groupGapY));
        }
      }
    });
  });

  describe('1×1 grid (degenerate case)', () => {
    const vizWidth = 500;
    const vizHeight = 400;
    const numSegmentGroups = { x: 1, y: 1 };
    const groupGapX = 10;
    const groupGapY = 20;

    test('single group fills entire canvas (gaps not used)', () => {
      const bounds = computeSegmentGroupBounds(
        { x: 0, y: 0 },
        numSegmentGroups,
        vizWidth,
        vizHeight,
        groupGapX,
        groupGapY
      );

      // With 1 group, there are 0 gaps, so group fills entire canvas
      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(vizWidth);
      expect(bounds.height).toBe(vizHeight);
    });
  });

  describe('zero gap spacing', () => {
    const vizWidth = 600;
    const vizHeight = 400;
    const numSegmentGroups = { x: 3, y: 2 };
    const groupGapX = 0;
    const groupGapY = 0;

    const expectedWidth = vizWidth / numSegmentGroups.x;
    const expectedHeight = vizHeight / numSegmentGroups.y;

    test('groups tile edge-to-edge with no gaps', () => {
      for (let yIdx = 0; yIdx < numSegmentGroups.y; yIdx++) {
        for (let xIdx = 0; xIdx < numSegmentGroups.x; xIdx++) {
          const bounds = computeSegmentGroupBounds(
            { x: xIdx, y: yIdx },
            numSegmentGroups,
            vizWidth,
            vizHeight,
            groupGapX,
            groupGapY
          );

          expect(bounds.width).toBe(expectedWidth);
          expect(bounds.height).toBe(expectedHeight);
          expect(bounds.x).toBe(xIdx * expectedWidth);
          expect(bounds.y).toBe(yIdx * expectedHeight);
        }
      }
    });
  });

  describe('large gap spacing', () => {
    const vizWidth = 1000;
    const vizHeight = 800;
    const numSegmentGroups = { x: 2, y: 2 };
    const groupGapX = 100;
    const groupGapY = 80;

    const expectedWidth = (vizWidth - groupGapX) / numSegmentGroups.x;
    const expectedHeight = (vizHeight - groupGapY) / numSegmentGroups.y;

    test('groups are smaller due to large gaps', () => {
      for (let yIdx = 0; yIdx < numSegmentGroups.y; yIdx++) {
        for (let xIdx = 0; xIdx < numSegmentGroups.x; xIdx++) {
          const bounds = computeSegmentGroupBounds(
            { x: xIdx, y: yIdx },
            numSegmentGroups,
            vizWidth,
            vizHeight,
            groupGapX,
            groupGapY
          );

          expect(bounds.width).toBe(expectedWidth);
          expect(bounds.height).toBe(expectedHeight);
          expect(bounds.x).toBe(xIdx * (expectedWidth + groupGapX));
          expect(bounds.y).toBe(yIdx * (expectedHeight + groupGapY));
        }
      }
    });
  });
});

/**
 * computeSegmentBounds() divides a segment group into individual segments (one per response group).
 * 
 * SEGMENT BOUNDS CALCULATION:
 * 
 * Height (simple):
 * - All segments have exactly the height of their containing segment group
 * - segment.height = segmentGroupBounds.height
 * - segment.y = segmentGroupBounds.y
 * 
 * Width (complex - three-part allocation):
 * 1. Base width allocation: Each segment gets baseSegmentWidth
 * 2. Gap allocation: (numResponseGroups - 1) gaps of responseGap between segments
 * 3. Proportional distribution: Remaining width distributed by proportion
 * 
 * Formula:
 *   widthToBeDistributed = segmentGroupBounds.width 
 *                        - (numResponseGroups - 1) × responseGap
 *                        - numResponseGroups × baseSegmentWidth
 *   
 *   segment[i].width = baseSegmentWidth + (widthToBeDistributed × proportion[i])
 * 
 * Where proportions must sum to 1.0
 * 
 * TESTING STRATEGY:
 * Test how segment dimensions vary as each parameter changes independently:
 * 1. Segment heights vary uniformly with segment group height
 * 2. Segment widths vary with:
 *    a. Segment group width
 *    b. Base segment width
 *    c. Response gap
 *    d. Number of response groups
 *    e. Proportion of each response group (must sum to 1)
 */
describe('computeSegmentBounds', () => {
  describe('segment heights match segment group height', () => {
    test('with segment group height = 100', () => {
      const responseGroups = [
        { proportion: 0.5 },
        { proportion: 0.5 }
      ];
      const segmentGroupBounds = { x: 0, y: 50, width: 200, height: 100 };
      const responseGap = 5;
      const baseWidth = 10;

      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      segments.forEach(segment => {
        expect(segment.height).toBe(100);
        expect(segment.y).toBe(50);
      });
    });

    test('with segment group height = 250', () => {
      const responseGroups = [
        { proportion: 0.5 },
        { proportion: 0.5 }
      ];
      const segmentGroupBounds = { x: 0, y: 100, width: 200, height: 250 };
      const responseGap = 5;
      const baseWidth = 10;

      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      segments.forEach(segment => {
        expect(segment.height).toBe(250);
        expect(segment.y).toBe(100);
      });
    });

    test('with segment group height = 80', () => {
      const responseGroups = [
        { proportion: 0.5 },
        { proportion: 0.5 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 200, height: 80 };
      const responseGap = 5;
      const baseWidth = 10;

      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      segments.forEach(segment => {
        expect(segment.height).toBe(80);
        expect(segment.y).toBe(0);
      });
    });
  });

  describe('varying segment group width', () => {
    test('with segment group width = 200, equal proportions', () => {
      const responseGroups = [
        { proportion: 0.5 },
        { proportion: 0.5 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 200, height: 100 };
      const responseGap = 10;
      const baseWidth = 20;

      // widthToBeDistributed = 200 - (1 × 10) - (2 × 20) = 150
      // Each segment: 20 + (150 × 0.5) = 95
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments[0].width).toBe(95);
      expect(segments[1].width).toBe(95);
    });

    test('with segment group width = 400, equal proportions', () => {
      const responseGroups = [
        { proportion: 0.5 },
        { proportion: 0.5 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 400, height: 100 };
      const responseGap = 10;
      const baseWidth = 20;

      // widthToBeDistributed = 400 - (1 × 10) - (2 × 20) = 350
      // Each segment: 20 + (350 × 0.5) = 195
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments[0].width).toBe(195);
      expect(segments[1].width).toBe(195);
    });

    test('with segment group width = 100, equal proportions', () => {
      const responseGroups = [
        { proportion: 0.5 },
        { proportion: 0.5 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 100, height: 100 };
      const responseGap = 10;
      const baseWidth = 20;

      // widthToBeDistributed = 100 - (1 × 10) - (2 × 20) = 50
      // Each segment: 20 + (50 × 0.5) = 45
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments[0].width).toBe(45);
      expect(segments[1].width).toBe(45);
    });
  });

  describe('varying base segment width', () => {
    test('with baseWidth = 10', () => {
      const responseGroups = [
        { proportion: 0.5 },
        { proportion: 0.5 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 200, height: 100 };
      const responseGap = 10;
      const baseWidth = 10;

      // widthToBeDistributed = 200 - (1 × 10) - (2 × 10) = 170
      // Each segment: 10 + (170 × 0.5) = 95
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments[0].width).toBe(95);
      expect(segments[1].width).toBe(95);
    });

    test('with baseWidth = 30', () => {
      const responseGroups = [
        { proportion: 0.5 },
        { proportion: 0.5 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 200, height: 100 };
      const responseGap = 10;
      const baseWidth = 30;

      // widthToBeDistributed = 200 - (1 × 10) - (2 × 30) = 130
      // Each segment: 30 + (130 × 0.5) = 95
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments[0].width).toBe(95);
      expect(segments[1].width).toBe(95);
    });

    test('with baseWidth = 0', () => {
      const responseGroups = [
        { proportion: 0.5 },
        { proportion: 0.5 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 200, height: 100 };
      const responseGap = 10;
      const baseWidth = 0;

      // widthToBeDistributed = 200 - (1 × 10) - (2 × 0) = 190
      // Each segment: 0 + (190 × 0.5) = 95
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments[0].width).toBe(95);
      expect(segments[1].width).toBe(95);
    });
  });

  describe('varying response gap', () => {
    test('with responseGap = 5', () => {
      const responseGroups = [
        { proportion: 0.5 },
        { proportion: 0.5 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 200, height: 100 };
      const responseGap = 5;
      const baseWidth = 20;

      // widthToBeDistributed = 200 - (1 × 5) - (2 × 20) = 155
      // Each segment: 20 + (155 × 0.5) = 97.5
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments[0].width).toBe(97.5);
      expect(segments[1].width).toBe(97.5);
    });

    test('with responseGap = 20', () => {
      const responseGroups = [
        { proportion: 0.5 },
        { proportion: 0.5 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 200, height: 100 };
      const responseGap = 20;
      const baseWidth = 20;

      // widthToBeDistributed = 200 - (1 × 20) - (2 × 20) = 140
      // Each segment: 20 + (140 × 0.5) = 90
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments[0].width).toBe(90);
      expect(segments[1].width).toBe(90);
    });

    test('with responseGap = 0', () => {
      const responseGroups = [
        { proportion: 0.5 },
        { proportion: 0.5 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 200, height: 100 };
      const responseGap = 0;
      const baseWidth = 20;

      // widthToBeDistributed = 200 - (1 × 0) - (2 × 20) = 160
      // Each segment: 20 + (160 × 0.5) = 100
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments[0].width).toBe(100);
      expect(segments[1].width).toBe(100);
    });
  });

  describe('varying number of response groups', () => {
    test('with 2 response groups, equal proportions', () => {
      const responseGroups = [
        { proportion: 0.5 },
        { proportion: 0.5 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 200, height: 100 };
      const responseGap = 10;
      const baseWidth = 20;

      // widthToBeDistributed = 200 - (1 × 10) - (2 × 20) = 150
      // Each segment: 20 + (150 × 0.5) = 95
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments).toHaveLength(2);
      expect(segments[0].width).toBe(95);
      expect(segments[1].width).toBe(95);
    });

    test('with 3 response groups, equal proportions', () => {
      const responseGroups = [
        { proportion: 1 / 3 },
        { proportion: 1 / 3 },
        { proportion: 1 / 3 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 200, height: 100 };
      const responseGap = 10;
      const baseWidth = 20;

      // widthToBeDistributed = 200 - (2 × 10) - (3 × 20) = 120
      // Each segment: 20 + (120 × 1/3) = 60
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments).toHaveLength(3);
      expect(segments[0].width).toBe(60);
      expect(segments[1].width).toBe(60);
      expect(segments[2].width).toBe(60);
    });

    test('with 4 response groups, equal proportions', () => {
      const responseGroups = [
        { proportion: 0.25 },
        { proportion: 0.25 },
        { proportion: 0.25 },
        { proportion: 0.25 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 200, height: 100 };
      const responseGap = 10;
      const baseWidth = 20;

      // widthToBeDistributed = 200 - (3 × 10) - (4 × 20) = 90
      // Each segment: 20 + (90 × 0.25) = 42.5
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments).toHaveLength(4);
      expect(segments[0].width).toBe(42.5);
      expect(segments[1].width).toBe(42.5);
      expect(segments[2].width).toBe(42.5);
      expect(segments[3].width).toBe(42.5);
    });

    test('with 1 response group (no gaps needed)', () => {
      const responseGroups = [
        { proportion: 1.0 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 200, height: 100 };
      const responseGap = 10;
      const baseWidth = 20;

      // widthToBeDistributed = 200 - (0 × 10) - (1 × 20) = 180
      // Segment: 20 + (180 × 1.0) = 200
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments).toHaveLength(1);
      expect(segments[0].width).toBe(200);
    });
  });

  describe('varying proportions (must sum to 1)', () => {
    test('with proportions [0.7, 0.3]', () => {
      const responseGroups = [
        { proportion: 0.7 },
        { proportion: 0.3 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 200, height: 100 };
      const responseGap = 10;
      const baseWidth = 20;

      // widthToBeDistributed = 200 - (1 × 10) - (2 × 20) = 150
      // Segment 0: 20 + (150 × 0.7) = 125
      // Segment 1: 20 + (150 × 0.3) = 65
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments[0].width).toBe(125);
      expect(segments[1].width).toBe(65);
    });

    test('with proportions [0.5, 0.3, 0.2]', () => {
      const responseGroups = [
        { proportion: 0.5 },
        { proportion: 0.3 },
        { proportion: 0.2 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 300, height: 100 };
      const responseGap = 10;
      const baseWidth = 20;

      // widthToBeDistributed = 300 - (2 × 10) - (3 × 20) = 220
      // Segment 0: 20 + (220 × 0.5) = 130
      // Segment 1: 20 + (220 × 0.3) = 86
      // Segment 2: 20 + (220 × 0.2) = 64
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments[0].width).toBe(130);
      expect(segments[1].width).toBe(86);
      expect(segments[2].width).toBe(64);
    });

    test('with proportions [0.4, 0.35, 0.15, 0.1]', () => {
      const responseGroups = [
        { proportion: 0.4 },
        { proportion: 0.35 },
        { proportion: 0.15 },
        { proportion: 0.1 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 400, height: 100 };
      const responseGap = 10;
      const baseWidth = 20;

      // widthToBeDistributed = 400 - (3 × 10) - (4 × 20) = 290
      // Segment 0: 20 + (290 × 0.4) = 136
      // Segment 1: 20 + (290 × 0.35) = 121.5
      // Segment 2: 20 + (290 × 0.15) = 63.5
      // Segment 3: 20 + (290 × 0.1) = 49
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments[0].width).toBe(136);
      expect(segments[1].width).toBe(121.5);
      expect(segments[2].width).toBe(63.5);
      expect(segments[3].width).toBe(49);
    });

    test('with extreme proportions [0.9, 0.1]', () => {
      const responseGroups = [
        { proportion: 0.9 },
        { proportion: 0.1 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 200, height: 100 };
      const responseGap = 10;
      const baseWidth = 20;

      // widthToBeDistributed = 200 - (1 × 10) - (2 × 20) = 150
      // Segment 0: 20 + (150 × 0.9) = 155
      // Segment 1: 20 + (150 × 0.1) = 35
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments[0].width).toBe(155);
      expect(segments[1].width).toBe(35);
    });

    test('with proportion = 0 (edge case)', () => {
      const responseGroups = [
        { proportion: 1.0 },
        { proportion: 0.0 }
      ];
      const segmentGroupBounds = { x: 0, y: 0, width: 200, height: 100 };
      const responseGap = 10;
      const baseWidth = 20;

      // widthToBeDistributed = 200 - (1 × 10) - (2 × 20) = 150
      // Segment 0: 20 + (150 × 1.0) = 170
      // Segment 1: 20 + (150 × 0.0) = 20 (only base width)
      const segments = computeSegmentBounds(responseGroups, segmentGroupBounds, responseGap, baseWidth);

      expect(segments[0].width).toBe(170);
      expect(segments[1].width).toBe(20);
    });
  });
});
