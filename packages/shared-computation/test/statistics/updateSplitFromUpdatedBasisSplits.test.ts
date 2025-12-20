import { updateSplitFromUpdatedBasisSplits } from '../../src/statistics/update';
import { partialSplit, basisSplitsForPartial } from '../fixtures/partialSplit';

describe('updateSplitFromUpdatedBasisSplits', () => {
  /**
   * EXPECTED VALUES CALCULATION:
   * 
   * partialSplit has groupingQuestion0 = gq00 (specified) and groupingQuestion1 = null (aggregates over all).
   * It aggregates two basis splits:
   * - basisSplit1 (gq00 + gq10): count = 5, weight = 6.0
   * - basisSplit2 (gq00 + gq11): count = 6, weight = 8.0
   * 
   * UPDATED TOTALS:
   * - totalCount = 5 + 6 = 11
   * - totalWeight = 6.0 + 8.0 = 14.0
   * 
   * UPDATED EXPANDED RESPONSE GROUPS (sum counts and weights from both basis splits):
   * - erg0: count = 2 + 1 = 3, weight = 2.0 + 2.0 = 4.0
   *   proportion = weighted avg = (6.0/14.0)*(2.0/6.0) + (8.0/14.0)*(2.0/8.0)
   *              = 0.428571 * 0.333333 + 0.571429 * 0.25
   *              = 0.142857 + 0.142857 = 0.285714 = 4.0/14.0 ✓
   * 
   * - erg1: count = 1 + 2 = 3, weight = 1.5 + 3.0 = 4.5
   *   proportion = (6.0/14.0)*(1.5/6.0) + (8.0/14.0)*(3.0/8.0)
   *              = 0.428571 * 0.25 + 0.571429 * 0.375
   *              = 0.107143 + 0.214286 = 0.321429 = 4.5/14.0 ✓
   * 
   * - erg2: count = 1 + 2 = 3, weight = 1.5 + 2.0 = 3.5
   *   proportion = (6.0/14.0)*(1.5/6.0) + (8.0/14.0)*(2.0/8.0)
   *              = 0.428571 * 0.25 + 0.571429 * 0.25
   *              = 0.107143 + 0.142857 = 0.25 = 3.5/14.0 ✓
   * 
   * - erg3: count = 1 + 1 = 2, weight = 1.0 + 1.0 = 2.0
   *   proportion = (6.0/14.0)*(1.0/6.0) + (8.0/14.0)*(1.0/8.0)
   *              = 0.428571 * 0.166667 + 0.571429 * 0.125
   *              = 0.071429 + 0.071429 = 0.142857 = 2.0/14.0 ✓
   * 
   * UPDATED COLLAPSED RESPONSE GROUPS:
   * - crg0: count = 3 + 3 = 6, weight = 3.5 + 5.0 = 8.5
   *   proportion = (6.0/14.0)*(3.5/6.0) + (8.0/14.0)*(5.0/8.0)
   *              = 0.428571 * 0.583333 + 0.571429 * 0.625
   *              = 0.25 + 0.357143 = 0.607143 = 8.5/14.0 ✓
   * 
   * - crg1: count = 2 + 3 = 5, weight = 2.5 + 3.0 = 5.5
   *   proportion = (6.0/14.0)*(2.5/6.0) + (8.0/14.0)*(3.0/8.0)
   *              = 0.428571 * 0.416667 + 0.571429 * 0.375
   *              = 0.178571 + 0.214286 = 0.392857 = 5.5/14.0 ✓
   * 
   * DIFF CALCULATIONS (new - old):
   * Initial partialSplit has: totalCount = 8, totalWeight = 10.0
   * 
   * - totalCount diff = 11 - 8 = 3
   * - totalWeight diff = 14.0 - 10.0 = 4.0
   * 
   * EXPANDED DIFFS (initial partialSplit expanded values):
   * - erg0 initial: count = 2, weight = 3.0, proportion = 0.3
   *   diffs: count = 3 - 2 = 1, weight = 4.0 - 3.0 = 1.0, proportion = 0.285714 - 0.3 = -0.014286
   * 
   * - erg1 initial: count = 2, weight = 2.0, proportion = 0.2
   *   diffs: count = 3 - 2 = 1, weight = 4.5 - 2.0 = 2.5, proportion = 0.321429 - 0.2 = 0.121429
   * 
   * - erg2 initial: count = 2, weight = 3.0, proportion = 0.3
   *   diffs: count = 3 - 2 = 1, weight = 3.5 - 3.0 = 0.5, proportion = 0.25 - 0.3 = -0.05
   * 
   * - erg3 initial: count = 2, weight = 2.0, proportion = 0.2
   *   diffs: count = 2 - 2 = 0, weight = 2.0 - 2.0 = 0.0, proportion = 0.142857 - 0.2 = -0.057143
   * 
   * COLLAPSED DIFFS (initial partialSplit collapsed values):
   * - crg0 initial: count = 4, weight = 5.0, proportion = 0.5
   *   diffs: count = 6 - 4 = 2, weight = 8.5 - 5.0 = 3.5, proportion = 0.607143 - 0.5 = 0.107143
   * 
   * - crg1 initial: count = 4, weight = 5.0, proportion = 0.5
   *   diffs: count = 5 - 4 = 1, weight = 5.5 - 5.0 = 0.5, proportion = 0.392857 - 0.5 = -0.107143
   */

  const expectedUpdated = {
    totalCount: 11,
    totalWeight: 14.0,
    expanded: [
      { count: 3, weight: 4.0, proportion: 4.0 / 14.0 },   // erg0
      { count: 3, weight: 4.5, proportion: 4.5 / 14.0 },   // erg1
      { count: 3, weight: 3.5, proportion: 3.5 / 14.0 },   // erg2
      { count: 2, weight: 2.0, proportion: 2.0 / 14.0 }    // erg3
    ],
    collapsed: [
      { count: 6, weight: 8.5, proportion: 8.5 / 14.0 },   // crg0
      { count: 5, weight: 5.5, proportion: 5.5 / 14.0 }    // crg1
    ]
  };

  const expectedDiff = {
    totalCount: 3,
    totalWeight: 4.0,
    expanded: [
      { count: 1, weight: 1.0, proportion: (4.0 / 14.0) - 0.3 },   // erg0
      { count: 1, weight: 2.5, proportion: (4.5 / 14.0) - 0.2 },   // erg1
      { count: 1, weight: 0.5, proportion: (3.5 / 14.0) - 0.3 },   // erg2
      { count: 0, weight: 0.0, proportion: (2.0 / 14.0) - 0.2 }    // erg3
    ],
    collapsed: [
      { count: 2, weight: 3.5, proportion: (8.5 / 14.0) - 0.5 },   // crg0
      { count: 1, weight: 0.5, proportion: (5.5 / 14.0) - 0.5 }    // crg1
    ]
  };

  test('updates partial split from basis splits correctly', () => {
    const [updatedSplit, diff] = updateSplitFromUpdatedBasisSplits(partialSplit, basisSplitsForPartial);

    // Check updated split totals
    expect(updatedSplit.totalCount).toBe(expectedUpdated.totalCount);
    expect(updatedSplit.totalWeight).toBe(expectedUpdated.totalWeight);

    // Check updated split expanded response groups
    expectedUpdated.expanded.forEach((expected, idx) => {
      expect(updatedSplit.responseGroups.expanded[idx].totalCount).toBe(expected.count);
      expect(updatedSplit.responseGroups.expanded[idx].totalWeight).toBe(expected.weight);
      expect(updatedSplit.responseGroups.expanded[idx].proportion).toBeCloseTo(expected.proportion, 10);
    });

    // Check updated split collapsed response groups
    expectedUpdated.collapsed.forEach((expected, idx) => {
      expect(updatedSplit.responseGroups.collapsed[idx].totalCount).toBe(expected.count);
      expect(updatedSplit.responseGroups.collapsed[idx].totalWeight).toBe(expected.weight);
      expect(updatedSplit.responseGroups.collapsed[idx].proportion).toBeCloseTo(expected.proportion, 10);
    });

    // Check diff totals
    expect(diff.totalCount).toBe(expectedDiff.totalCount);
    expect(diff.totalWeight).toBe(expectedDiff.totalWeight);

    // Check diff expanded response groups
    expectedDiff.expanded.forEach((expected, idx) => {
      expect(diff.responseGroups.expanded[idx].totalCount).toBe(expected.count);
      expect(diff.responseGroups.expanded[idx].totalWeight).toBe(expected.weight);
      expect(diff.responseGroups.expanded[idx].proportion).toBeCloseTo(expected.proportion, 10);
    });

    // Check diff collapsed response groups
    expectedDiff.collapsed.forEach((expected, idx) => {
      expect(diff.responseGroups.collapsed[idx].totalCount).toBe(expected.count);
      expect(diff.responseGroups.collapsed[idx].totalWeight).toBe(expected.weight);
      expect(diff.responseGroups.collapsed[idx].proportion).toBeCloseTo(expected.proportion, 10);
    });
  });
});
