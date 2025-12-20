import { updateBasisSplitFromResponses } from '../../src/statistics/update';
import { basisSplit } from '../fixtures/basisSplit';
import { testResponses } from '../fixtures/responses';

describe('updateBasisSplitFromResponses', () => {
  /**
   * TEST STRATEGY:
   * Apply updates in two stages to verify diff calculations are correct:
   * 1. First update: Apply first 3 responses
   * 2. Second update: Apply remaining 4 responses to the already-updated split
   * 
   * This ensures diffs are calculated correctly when starting from non-zero values.
   */

  // Split the responses into two batches
  const firstBatchResponses = testResponses.slice(0, 3); // erg0 (1.0), erg0 (1.5), erg1 (2.0)
  const secondBatchResponses = testResponses.slice(3);   // erg2 (1.0), erg2 (1.0), erg2 (0.5), erg3 (1.0)

  /**
   * FIRST UPDATE CALCULATIONS:
   * 
   * Starting from all zeros, applying:
   * - 2 responses to erg0 (weights: 1.0, 1.5) → count: 2, weight: 2.5
   * - 1 response to erg1 (weight: 2.0)        → count: 1, weight: 2.0
   * 
   * TOTAL AFTER FIRST UPDATE: count = 3, weight = 4.5
   * 
   * EXPANDED RESPONSE GROUPS AFTER FIRST UPDATE:
   * - erg0: count = 2, weight = 2.5, proportion = 2.5 / 4.5 = 0.5555555556
   * - erg1: count = 1, weight = 2.0, proportion = 2.0 / 4.5 = 0.4444444444
   * - erg2: count = 0, weight = 0.0, proportion = 0.0 / 4.5 = 0.0
   * - erg3: count = 0, weight = 0.0, proportion = 0.0 / 4.5 = 0.0
   * 
   * COLLAPSED RESPONSE GROUPS AFTER FIRST UPDATE:
   * - crg0 contains [0, 1], includes erg0 + erg1:
   *   count = 2 + 1 = 3, weight = 2.5 + 2.0 = 4.5, proportion = 4.5 / 4.5 = 1.0
   * - crg1 contains [2, 3], includes erg2 + erg3:
   *   count = 0 + 0 = 0, weight = 0.0 + 0.0 = 0.0, proportion = 0.0 / 4.5 = 0.0
   * 
   * FIRST UPDATE DIFF (starting from zeros, so diff = final values):
   * All diffs equal the final values above.
   */

  const afterFirstUpdate = {
    totalCount: 3,
    totalWeight: 4.5,
    expanded: [
      { count: 2, weight: 2.5, proportion: 2.5 / 4.5 }, // erg0
      { count: 1, weight: 2.0, proportion: 2.0 / 4.5 }, // erg1
      { count: 0, weight: 0.0, proportion: 0.0 / 4.5 }, // erg2
      { count: 0, weight: 0.0, proportion: 0.0 / 4.5 }  // erg3
    ],
    collapsed: [
      { count: 3, weight: 4.5, proportion: 4.5 / 4.5 }, // crg0
      { count: 0, weight: 0.0, proportion: 0.0 / 4.5 }  // crg1
    ]
  };

  const firstUpdateDiff = {
    totalCount: 3,
    totalWeight: 4.5,
    expanded: afterFirstUpdate.expanded,
    collapsed: afterFirstUpdate.collapsed
  };

  /**
   * SECOND UPDATE CALCULATIONS:
   * 
   * Starting from first update results, applying:
   * - 3 responses to erg2 (weights: 1.0, 1.0, 0.5) → count: 3, weight: 2.5
   * - 1 response to erg3 (weight: 1.0)            → count: 1, weight: 1.0
   * 
   * NEW TOTAL AFTER SECOND UPDATE: count = 3 + 4 = 7, weight = 4.5 + 3.5 = 8.0
   * 
   * EXPANDED RESPONSE GROUPS AFTER SECOND UPDATE:
   * - erg0: count = 2 + 0 = 2, weight = 2.5 + 0.0 = 2.5, proportion = 2.5 / 8.0 = 0.3125
   * - erg1: count = 1 + 0 = 1, weight = 2.0 + 0.0 = 2.0, proportion = 2.0 / 8.0 = 0.25
   * - erg2: count = 0 + 3 = 3, weight = 0.0 + 2.5 = 2.5, proportion = 2.5 / 8.0 = 0.3125
   * - erg3: count = 0 + 1 = 1, weight = 0.0 + 1.0 = 1.0, proportion = 1.0 / 8.0 = 0.125
   * 
   * COLLAPSED RESPONSE GROUPS AFTER SECOND UPDATE:
   * - crg0: count = 3 + 0 = 3, weight = 4.5 + 0.0 = 4.5, proportion = 4.5 / 8.0 = 0.5625
   * - crg1: count = 0 + 4 = 4, weight = 0.0 + 3.5 = 3.5, proportion = 3.5 / 8.0 = 0.4375
   * 
   * SECOND UPDATE DIFF (changes from first update to second update):
   * - Total count diff: 7 - 3 = 4
   * - Total weight diff: 8.0 - 4.5 = 3.5
   * 
   * EXPANDED DIFFS:
   * - erg0: count diff = 2 - 2 = 0, weight diff = 2.5 - 2.5 = 0.0,
   *         proportion diff = 0.3125 - (2.5/4.5) = 0.3125 - 0.5555555556 = -0.2430555556
   * - erg1: count diff = 1 - 1 = 0, weight diff = 2.0 - 2.0 = 0.0,
   *         proportion diff = 0.25 - (2.0/4.5) = 0.25 - 0.4444444444 = -0.1944444444
   * - erg2: count diff = 3 - 0 = 3, weight diff = 2.5 - 0.0 = 2.5,
   *         proportion diff = 0.3125 - 0.0 = 0.3125
   * - erg3: count diff = 1 - 0 = 1, weight diff = 1.0 - 0.0 = 1.0,
   *         proportion diff = 0.125 - 0.0 = 0.125
   * 
   * COLLAPSED DIFFS:
   * - crg0: count diff = 3 - 3 = 0, weight diff = 4.5 - 4.5 = 0.0,
   *         proportion diff = 0.5625 - 1.0 = -0.4375
   * - crg1: count diff = 4 - 0 = 4, weight diff = 3.5 - 0.0 = 3.5,
   *         proportion diff = 0.4375 - 0.0 = 0.4375
   */

  const afterSecondUpdate = {
    totalCount: 7,
    totalWeight: 8.0,
    expanded: [
      { count: 2, weight: 2.5, proportion: 2.5 / 8.0 }, // erg0
      { count: 1, weight: 2.0, proportion: 2.0 / 8.0 }, // erg1
      { count: 3, weight: 2.5, proportion: 2.5 / 8.0 }, // erg2
      { count: 1, weight: 1.0, proportion: 1.0 / 8.0 }  // erg3
    ],
    collapsed: [
      { count: 3, weight: 4.5, proportion: 4.5 / 8.0 }, // crg0
      { count: 4, weight: 3.5, proportion: 3.5 / 8.0 }  // crg1
    ]
  };

  const secondUpdateDiff = {
    totalCount: 4,
    totalWeight: 3.5,
    expanded: [
      { count: 0, weight: 0.0, proportion: (2.5 / 8.0) - (2.5 / 4.5) },  // erg0
      { count: 0, weight: 0.0, proportion: (2.0 / 8.0) - (2.0 / 4.5) },  // erg1
      { count: 3, weight: 2.5, proportion: (2.5 / 8.0) - 0.0 },          // erg2
      { count: 1, weight: 1.0, proportion: (1.0 / 8.0) - 0.0 }           // erg3
    ],
    collapsed: [
      { count: 0, weight: 0.0, proportion: (4.5 / 8.0) - 1.0 },  // crg0
      { count: 4, weight: 3.5, proportion: (3.5 / 8.0) - 0.0 }   // crg1
    ]
  };

  test('first update: applies first batch of responses correctly', () => {
    const [updatedSplit, diff] = updateBasisSplitFromResponses(basisSplit, firstBatchResponses);

    // Check updated split totals
    expect(updatedSplit.totalCount).toBe(afterFirstUpdate.totalCount);
    expect(updatedSplit.totalWeight).toBe(afterFirstUpdate.totalWeight);

    // Check updated split expanded response groups
    afterFirstUpdate.expanded.forEach((expected, idx) => {
      expect(updatedSplit.responseGroups.expanded[idx].totalCount).toBe(expected.count);
      expect(updatedSplit.responseGroups.expanded[idx].totalWeight).toBe(expected.weight);
      expect(updatedSplit.responseGroups.expanded[idx].proportion).toBeCloseTo(expected.proportion, 10);
    });

    // Check updated split collapsed response groups
    afterFirstUpdate.collapsed.forEach((expected, idx) => {
      expect(updatedSplit.responseGroups.collapsed[idx].totalCount).toBe(expected.count);
      expect(updatedSplit.responseGroups.collapsed[idx].totalWeight).toBe(expected.weight);
      expect(updatedSplit.responseGroups.collapsed[idx].proportion).toBeCloseTo(expected.proportion, 10);
    });

    // Check diff totals
    expect(diff.totalCount).toBe(firstUpdateDiff.totalCount);
    expect(diff.totalWeight).toBe(firstUpdateDiff.totalWeight);

    // Check diff expanded response groups
    firstUpdateDiff.expanded.forEach((expected, idx) => {
      expect(diff.responseGroups.expanded[idx].totalCount).toBe(expected.count);
      expect(diff.responseGroups.expanded[idx].totalWeight).toBe(expected.weight);
      expect(diff.responseGroups.expanded[idx].proportion).toBeCloseTo(expected.proportion, 10);
    });

    // Check diff collapsed response groups
    firstUpdateDiff.collapsed.forEach((expected, idx) => {
      expect(diff.responseGroups.collapsed[idx].totalCount).toBe(expected.count);
      expect(diff.responseGroups.collapsed[idx].totalWeight).toBe(expected.weight);
      expect(diff.responseGroups.collapsed[idx].proportion).toBeCloseTo(expected.proportion, 10);
    });
  });

  test('second update: applies second batch to already-updated split correctly', () => {
    // First update to get intermediate state
    const [splitAfterFirstUpdate] = updateBasisSplitFromResponses(basisSplit, firstBatchResponses);

    // Second update from intermediate state
    const [updatedSplit, diff] = updateBasisSplitFromResponses(splitAfterFirstUpdate, secondBatchResponses);

    // Check updated split totals
    expect(updatedSplit.totalCount).toBe(afterSecondUpdate.totalCount);
    expect(updatedSplit.totalWeight).toBe(afterSecondUpdate.totalWeight);

    // Check updated split expanded response groups
    afterSecondUpdate.expanded.forEach((expected, idx) => {
      expect(updatedSplit.responseGroups.expanded[idx].totalCount).toBe(expected.count);
      expect(updatedSplit.responseGroups.expanded[idx].totalWeight).toBe(expected.weight);
      expect(updatedSplit.responseGroups.expanded[idx].proportion).toBeCloseTo(expected.proportion, 10);
    });

    // Check updated split collapsed response groups
    afterSecondUpdate.collapsed.forEach((expected, idx) => {
      expect(updatedSplit.responseGroups.collapsed[idx].totalCount).toBe(expected.count);
      expect(updatedSplit.responseGroups.collapsed[idx].totalWeight).toBe(expected.weight);
      expect(updatedSplit.responseGroups.collapsed[idx].proportion).toBeCloseTo(expected.proportion, 10);
    });

    // Check diff totals
    expect(diff.totalCount).toBe(secondUpdateDiff.totalCount);
    expect(diff.totalWeight).toBe(secondUpdateDiff.totalWeight);

    // Check diff expanded response groups
    secondUpdateDiff.expanded.forEach((expected, idx) => {
      expect(diff.responseGroups.expanded[idx].totalCount).toBe(expected.count);
      expect(diff.responseGroups.expanded[idx].totalWeight).toBe(expected.weight);
      expect(diff.responseGroups.expanded[idx].proportion).toBeCloseTo(expected.proportion, 10);
    });

    // Check diff collapsed response groups
    secondUpdateDiff.collapsed.forEach((expected, idx) => {
      expect(diff.responseGroups.collapsed[idx].totalCount).toBe(expected.count);
      expect(diff.responseGroups.collapsed[idx].totalWeight).toBe(expected.weight);
      expect(diff.responseGroups.collapsed[idx].proportion).toBeCloseTo(expected.proportion, 10);
    });
  });
})