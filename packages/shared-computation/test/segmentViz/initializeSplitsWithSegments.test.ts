import { initializeSplitsWithSegments } from '../../src/segmentViz/initializeSplitsWithSegments';
import { segmentVizConfig } from '../fixtures/segmentVizConfig';
import { groupingQuestion0, groupingQuestion1 } from '../fixtures/questions';
import type { Group } from '../../src/statistics/types';

describe('initializeSplitsWithSegments', () => {
  const { basisSplitIndices, splits } = initializeSplitsWithSegments(segmentVizConfig);

  /**
   * EXPECTED SPLITS STRUCTURE:
   * 
   * With groupingQuestion0 on x-axis (2 groups) and groupingQuestion1 on y-axis (2 groups),
   * we get 4 views (2^1 x-axis views × 2^1 y-axis views).
   * 
   * Each view generates splits based on which questions are active:
   * 
   * 1. Both X and Y active: 2×2 grid = 4 basis splits
   * 2. X active, Y null: 2×1 grid = 2 partial splits (1 active question)
   * 3. X null, Y active: 1×2 grid = 2 partial splits (1 active question)
   * 4. Both null: 1×1 grid = 1 partial split (0 active questions)
   * 
   * Total: 9 splits
   * 
   * NOTE: The grouping questions are ordered [x-axis questions, y-axis questions] in the groups array.
   * So for our case: [groupingQuestion0, groupingQuestion1]
   */

  const expectedBasisSplitGroups: Group[][] = [
    [
      { question: groupingQuestion0.question, responseGroup: groupingQuestion0.responseGroups[0] }, // gq00 (x)
      { question: groupingQuestion1.question, responseGroup: groupingQuestion1.responseGroups[0] }  // gq10 (y)
    ],
    [
      { question: groupingQuestion0.question, responseGroup: groupingQuestion0.responseGroups[1] }, // gq01 (x)
      { question: groupingQuestion1.question, responseGroup: groupingQuestion1.responseGroups[0] }  // gq10 (y)
    ],
    [
      { question: groupingQuestion0.question, responseGroup: groupingQuestion0.responseGroups[0] }, // gq00 (x)
      { question: groupingQuestion1.question, responseGroup: groupingQuestion1.responseGroups[1] }  // gq11 (y)
    ],
    [
      { question: groupingQuestion0.question, responseGroup: groupingQuestion0.responseGroups[1] }, // gq01 (x)
      { question: groupingQuestion1.question, responseGroup: groupingQuestion1.responseGroups[1] }  // gq11 (y)
    ]
  ];

  const expectedPartialSplitGroups0ActiveQuestion: Group[][] = [
    [
      { question: groupingQuestion0.question, responseGroup: null },
      { question: groupingQuestion1.question, responseGroup: null }
    ]
  ];

  const expectedPartialSplitGroups1ActiveQuestion: Group[][] = [
    // X active, Y null
    [
      { question: groupingQuestion0.question, responseGroup: groupingQuestion0.responseGroups[0] }, // gq00
      { question: groupingQuestion1.question, responseGroup: null }
    ],
    [
      { question: groupingQuestion0.question, responseGroup: groupingQuestion0.responseGroups[1] }, // gq01
      { question: groupingQuestion1.question, responseGroup: null }
    ],
    // X null, Y active
    [
      { question: groupingQuestion0.question, responseGroup: null },
      { question: groupingQuestion1.question, responseGroup: groupingQuestion1.responseGroups[0] } // gq10
    ],
    [
      { question: groupingQuestion0.question, responseGroup: null },
      { question: groupingQuestion1.question, responseGroup: groupingQuestion1.responseGroups[1] } // gq11
    ]
  ];

  /**
   * SEGMENT GROUP BOUNDS CALCULATION:
   * 
   * From segmentVizConfig:
   * - minGroupAvailableWidth = 100
   * - minGroupHeight = 80
   * - groupGapX = 10
   * - groupGapY = 10
   * - responseGap = 2
   * - baseSegmentWidth = 5
   * - Number of expanded response groups = 4
   * 
   * Segment group width calculation (from getWidthHeight):
   * Each segment group width = minGroupAvailableWidth + 
   *                            (numResponseGroups * baseSegmentWidth) +
   *                            ((numResponseGroups - 1) * responseGap)
   *                          = 100 + (4 * 5) + (3 * 2)
   *                          = 100 + 20 + 6 = 126
   * 
   * Total viz width (2 x groups) = 2 * 126 + 1 * 10 = 262
   * Total viz height (2 y groups) = 2 * 80 + 1 * 10 = 170
   * 
   * ═══════════════════════════════════════════════════════════════════════════════
   * VIEW 1: BOTH X AND Y ACTIVE (2×2 grid)
   * ═══════════════════════════════════════════════════════════════════════════════
   * 
   * Grid Layout (4 basis splits):
   * 
   *     0                 136              262
   *     ┌─────────────────┬─────────────────┐
   *   0 │   gq00, gq10    │   gq01, gq10    │
   *     │   Split 0       │   Split 1       │
   *     │  x:0, y:0       │  x:136, y:0     │
   *     │  w:126, h:80    │  w:126, h:80    │
   *  80 ├─────────────────┼─────────────────┤
   *  90 │   gq00, gq11    │   gq01, gq11    │
   *     │   Split 2       │   Split 3       │
   *     │  x:0, y:90      │  x:136, y:90    │
   *     │  w:126, h:80    │  w:126, h:80    │
   * 170 └─────────────────┴─────────────────┘
   * 
   * ═══════════════════════════════════════════════════════════════════════════════
   * VIEW 2: X ACTIVE, Y NULL (2×1 grid)
   * ═══════════════════════════════════════════════════════════════════════════════
   * 
   * Grid Layout (2 partial splits, 1 active question):
   * 
   *     0                 136              262
   *     ┌─────────────────┬─────────────────┐
   *   0 │   gq00, null    │   gq01, null    │
   *     │   Split 4       │   Split 5       │
   *     │  x:0, y:0       │  x:136, y:0     │
   *     │  w:126, h:170   │  w:126, h:170   │
   *     │  (spans both    │  (spans both    │
   *     │   y groups)     │   y groups)     │
   * 170 └─────────────────┴─────────────────┘
   * 
   * Height calculation: 80 (first y group) + 10 (gap) + 80 (second y group) = 170
   * 
   * ═══════════════════════════════════════════════════════════════════════════════
   * VIEW 3: X NULL, Y ACTIVE (1×2 grid)
   * ═══════════════════════════════════════════════════════════════════════════════
   * 
   * Grid Layout (2 partial splits, 1 active question):
   * 
   *     0                                   262
   *     ┌─────────────────────────────────────┐
   *   0 │        null, gq10                   │
   *     │        Split 6                      │
   *     │       x:0, y:0                      │
   *     │       w:262, h:80                   │
   *     │    (spans both x groups)            │
   *  80 ├─────────────────────────────────────┤
   *  90 │        null, gq11                   │
   *     │        Split 7                      │
   *     │       x:0, y:90                     │
   *     │       w:262, h:80                   │
   *     │    (spans both x groups)            │
   * 170 └─────────────────────────────────────┘
   * 
   * Width calculation: 126 (first x group) + 10 (gap) + 126 (second x group) = 262
   * 
   * ═══════════════════════════════════════════════════════════════════════════════
   * VIEW 4: BOTH X AND Y NULL (1×1 grid)
   * ═══════════════════════════════════════════════════════════════════════════════
   * 
   * Grid Layout (1 partial split, 0 active questions):
   * 
   *     0                                   262
   *     ┌─────────────────────────────────────┐
   *   0 │         null, null                  │
   *     │         Split 8                     │
   *     │        x:0, y:0                     │
   *     │        w:262, h:170                 │
   *     │   (spans all groups)                │
   *     │                                     │
   * 170 └─────────────────────────────────────┘
   * 
   */

  const expectedBounds = [
    // Basis splits (both active) - 2x2 grid (iterates Y within X)
    { x: 0, y: 0, width: 126, height: 80 },      // gq00, gq10
    { x: 0, y: 90, width: 126, height: 80 },     // gq00, gq11
    { x: 136, y: 0, width: 126, height: 80 },    // gq01, gq10
    { x: 136, y: 90, width: 126, height: 80 },   // gq01, gq11

    // X active, Y null - 2x1 grid
    { x: 0, y: 0, width: 126, height: 170 },     // gq00, null
    { x: 136, y: 0, width: 126, height: 170 },   // gq01, null

    // X null, Y active - 1x2 grid
    { x: 0, y: 0, width: 262, height: 80 },      // null, gq10
    { x: 0, y: 90, width: 262, height: 80 },     // null, gq11

    // Both null - 1x1 grid
    { x: 0, y: 0, width: 262, height: 170 }      // null, null
  ];

  test('initialized basis splits are exactly the ones expected', () => {
    // Extract all basis splits (splits where no responseGroup is null)
    const actualBasisSplitGroups = splits
      .filter(split => split.groups.every(group => group.responseGroup !== null))
      .map(split => split.groups);

    // Compare as sets using JSON serialization
    const actualSet = new Set(actualBasisSplitGroups.map(groups => JSON.stringify(groups)));
    const expectedSet = new Set(expectedBasisSplitGroups.map(groups => JSON.stringify(groups)));

    expect(actualSet).toEqual(expectedSet);
  });

  test('basisSplitIndices correctly locates the basis splits', () => {
    // Check that basisSplitIndices has the correct length
    expect(basisSplitIndices).toHaveLength(expectedBasisSplitGroups.length);

    // Loop through each index and verify the split is a basis split
    for (const index of basisSplitIndices) {
      const split = splits[index];
      const isBasisSplit = split.groups.every(group => group.responseGroup !== null);
      expect(isBasisSplit).toBe(true);
    }
  });

  test('set of initialized partial splits with zero active questions are exactly the one expected', () => {
    // Extract all splits with zero active questions (all responseGroups are null)
    const actualPartialSplitGroups0Active = splits
      .filter(split => split.groups.every(group => group.responseGroup === null))
      .map(split => split.groups);

    // Compare as sets using JSON serialization
    const actualSet = new Set(actualPartialSplitGroups0Active.map(groups => JSON.stringify(groups)));
    const expectedSet = new Set(expectedPartialSplitGroups0ActiveQuestion.map(groups => JSON.stringify(groups)));

    expect(actualSet).toEqual(expectedSet);
  });

  test('set of initialized partial splits with one active question are exactly the ones expected', () => {
    // Extract all splits with exactly one active question (exactly one responseGroup is non-null)
    const actualPartialSplitGroups1Active = splits
      .filter(split => {
        const activeCount = split.groups.filter(group => group.responseGroup !== null).length;
        return activeCount === 1;
      })
      .map(split => split.groups);

    // Compare as sets using JSON serialization
    const actualSet = new Set(actualPartialSplitGroups1Active.map(groups => JSON.stringify(groups)));
    const expectedSet = new Set(expectedPartialSplitGroups1ActiveQuestion.map(groups => JSON.stringify(groups)));

    expect(actualSet).toEqual(expectedSet);
  });

  test('all expected splits present and no unexpected split present', () => {
    const totalExpectedSplits =
      expectedBasisSplitGroups.length +
      expectedPartialSplitGroups0ActiveQuestion.length +
      expectedPartialSplitGroups1ActiveQuestion.length;

    expect(splits).toHaveLength(totalExpectedSplits);
  });

  test('each returned split has the correct basis split indices', () => {
    // For each split, verify its basisSplitIndices are correct
    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];

      // Find all basis splits that should match this split
      const expectedBasisIndices: number[] = [];

      for (let j = 0; j < splits.length; j++) {
        const candidateSplit = splits[j];

        // Check if candidate is a basis split
        const isBasisSplit = candidateSplit.groups.every(group => group.responseGroup !== null);
        if (!isBasisSplit) continue;

        // Check if this basis split matches the current split's pattern
        const matches = split.groups.every((group, groupIndex) => {
          const candidateGroup = candidateSplit.groups[groupIndex];

          // If split has null responseGroup, any basis split value matches
          if (group.responseGroup === null) return true;

          // If split has non-null responseGroup, must match exactly
          return group.responseGroup.label === candidateGroup.responseGroup?.label;
        });

        if (matches) {
          expectedBasisIndices.push(j);
        }
      }

      // Sort both arrays for comparison
      const actualSorted = [...split.basisSplitIndices].sort((a, b) => a - b);
      const expectedSorted = expectedBasisIndices.sort((a, b) => a - b);

      expect(actualSorted).toEqual(expectedSorted);
    }
  });

  test('all weights, counts, and proportions equal 0 everywhere in every split', () => {
    for (const split of splits) {
      // Check top-level totalWeight and totalCount
      expect(split.totalWeight).toBe(0);
      expect(split.totalCount).toBe(0);

      // Check expanded response groups
      for (const responseGroup of split.responseGroups.expanded) {
        expect(responseGroup.totalWeight).toBe(0);
        expect(responseGroup.totalCount).toBe(0);
        expect(responseGroup.proportion).toBe(0);
      }

      // Check collapsed response groups
      for (const responseGroup of split.responseGroups.collapsed) {
        expect(responseGroup.totalWeight).toBe(0);
        expect(responseGroup.totalCount).toBe(0);
        expect(responseGroup.proportion).toBe(0);
      }
    }
  });

  test('each split has correct segment group bounds', () => {
    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      const expected = expectedBounds[i];

      expect(split.segmentGroupBounds.x).toBe(expected.x);
      expect(split.segmentGroupBounds.y).toBe(expected.y);
      expect(split.segmentGroupBounds.width).toBe(expected.width);
      expect(split.segmentGroupBounds.height).toBe(expected.height);
    }
  });

  test('each split has empty points arrays initialized', () => {
    for (const split of splits) {
      // Should have one empty array per expanded response group
      expect(split.points).toHaveLength(segmentVizConfig.responseQuestion.responseGroups.expanded.length);

      // Each array should be empty initially
      for (const pointArray of split.points) {
        expect(pointArray).toEqual([]);
      }
    }
  });

  test('each split has response groups with empty bounds and pointPositions', () => {
    for (const split of splits) {
      // Check expanded response groups
      for (const rg of split.responseGroups.expanded) {
        expect(rg.bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
        expect(rg.pointPositions).toEqual([]);
      }

      // Check collapsed response groups
      for (const rg of split.responseGroups.collapsed) {
        expect(rg.bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
        expect(rg.pointPositions).toEqual([]);
      }
    }
  });
});
