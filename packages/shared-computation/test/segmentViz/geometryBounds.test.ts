import { getWidthHeight, computeSegmentGroupBounds, computeSegmentBounds } from '../../src/segmentViz/geometry';
import type { SegmentVizConfig } from '../../src/segmentViz/types';
import { createSegmentVizConfig } from '../fixtures/createSegmentVizConfig';

/**
 * 
 * NEXT STEP: Tests of computeSegmentGroupBounds
 */



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

describe('computeSegmentGroupBounds', () => {
  describe('basic grid positions', () => {
    test('calculates bounds for top-left position (0,0) in 2x2 grid', () => {
      // TODO: Implement
    });

    test('calculates bounds for top-right position (1,0) in 2x2 grid', () => {
      // TODO: Implement
    });

    test('calculates bounds for bottom-left position (0,1) in 2x2 grid', () => {
      // TODO: Implement
    });

    test('calculates bounds for bottom-right position (1,1) in 2x2 grid', () => {
      // TODO: Implement
    });
  });

  describe('different grid sizes', () => {
    test('calculates bounds for 1x1 grid (entire viz)', () => {
      // TODO: Implement
    });

    test('calculates bounds for 3x3 grid', () => {
      // TODO: Implement
    });

    test('calculates bounds for asymmetric grid (3x2)', () => {
      // TODO: Implement
    });

    test('calculates bounds for large grid (5x5)', () => {
      // TODO: Implement
    });
  });

  describe('with different gap sizes', () => {
    test('calculates bounds with zero gaps', () => {
      // TODO: Implement
    });

    test('calculates bounds with large gaps', () => {
      // TODO: Implement
    });

    test('calculates bounds with asymmetric gaps (different x and y)', () => {
      // TODO: Implement
    });
  });

  describe('with different viz dimensions', () => {
    test('calculates bounds for small visualization', () => {
      // TODO: Implement
    });

    test('calculates bounds for large visualization', () => {
      // TODO: Implement
    });

    test('calculates bounds for non-square visualization', () => {
      // TODO: Implement
    });
  });

  describe('edge cases', () => {
    test('handles single segment group spanning entire viz', () => {
      // TODO: Implement
    });

    test('divides space evenly when gaps are zero', () => {
      // TODO: Implement
    });
  });
});

describe('computeSegmentBounds', () => {
  describe('with equal proportions', () => {
    test('distributes width equally among 2 segments with equal proportions', () => {
      // TODO: Implement
    });

    test('distributes width equally among 4 segments with equal proportions', () => {
      // TODO: Implement
    });
  });

  describe('with unequal proportions', () => {
    test('distributes width according to proportions (0.7, 0.3)', () => {
      // TODO: Implement
    });

    test('distributes width according to proportions (0.5, 0.3, 0.2)', () => {
      // TODO: Implement
    });

    test('handles zero proportion segments', () => {
      // TODO: Implement
    });

    test('handles one segment with 100% proportion', () => {
      // TODO: Implement
    });
  });

  describe('with different response gaps', () => {
    test('accounts for gaps between segments', () => {
      // TODO: Implement
    });

    test('handles zero response gap', () => {
      // TODO: Implement
    });

    test('handles large response gap', () => {
      // TODO: Implement
    });
  });

  describe('with different base widths', () => {
    test('adds base width to proportional allocation', () => {
      // TODO: Implement
    });

    test('handles zero base width', () => {
      // TODO: Implement
    });

    test('handles large base width', () => {
      // TODO: Implement
    });
  });

  describe('segment positioning', () => {
    test('positions first segment at x=0', () => {
      // TODO: Implement
    });

    test('positions segments sequentially with gaps', () => {
      // TODO: Implement
    });

    test('assigns correct response group indices', () => {
      // TODO: Implement
    });
  });

  describe('edge cases', () => {
    test('handles single segment', () => {
      // TODO: Implement
    });

    test('handles narrow segment group with many segments', () => {
      // TODO: Implement
    });

    test('maintains segment group height for all segments', () => {
      // TODO: Implement
    });
  });
});
