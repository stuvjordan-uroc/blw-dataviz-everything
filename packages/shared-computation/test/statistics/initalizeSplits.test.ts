import { ResponseQuestion, Group } from '../../src/statistics/types';
import { initializeSplits } from '../../src/statistics/initializeSplits';
import { groupingQuestion0, groupingQuestion1, responseQuestion } from '../fixtures/questions';
describe('initializeSplits', () => {
  const { basisSplitIndices, splits } = initializeSplits(responseQuestion, [groupingQuestion0, groupingQuestion1])

  const expectedBasisSplitGroups: Group[][] = [
    [
      { question: groupingQuestion0.question, responseGroup: groupingQuestion0.responseGroups[0] }, // gq00
      { question: groupingQuestion1.question, responseGroup: groupingQuestion1.responseGroups[0] }  // gq10
    ],
    [
      { question: groupingQuestion0.question, responseGroup: groupingQuestion0.responseGroups[0] }, // gq00
      { question: groupingQuestion1.question, responseGroup: groupingQuestion1.responseGroups[1] }  // gq11
    ],
    [
      { question: groupingQuestion0.question, responseGroup: groupingQuestion0.responseGroups[1] }, // gq01
      { question: groupingQuestion1.question, responseGroup: groupingQuestion1.responseGroups[0] }  // gq10
    ],
    [
      { question: groupingQuestion0.question, responseGroup: groupingQuestion0.responseGroups[1] }, // gq01
      { question: groupingQuestion1.question, responseGroup: groupingQuestion1.responseGroups[1] }  // gq11
    ]
  ];

  const expectedPartialSplitGroups0ActiveQuestion: Group[][] = [
    [
      { question: groupingQuestion0.question, responseGroup: null },
      { question: groupingQuestion1.question, responseGroup: null }
    ]
  ];

  const expectedPartialSplitGroups1ActiveQuestion: Group[][] = [
    // groupingQuestion0 active, groupingQuestion1 null
    [
      { question: groupingQuestion0.question, responseGroup: groupingQuestion0.responseGroups[0] }, // gq00
      { question: groupingQuestion1.question, responseGroup: null }
    ],
    [
      { question: groupingQuestion0.question, responseGroup: groupingQuestion0.responseGroups[1] }, // gq01
      { question: groupingQuestion1.question, responseGroup: null }
    ],
    // groupingQuestion0 null, groupingQuestion1 active
    [
      { question: groupingQuestion0.question, responseGroup: null },
      { question: groupingQuestion1.question, responseGroup: groupingQuestion1.responseGroups[0] } // gq10
    ],
    [
      { question: groupingQuestion0.question, responseGroup: null },
      { question: groupingQuestion1.question, responseGroup: groupingQuestion1.responseGroups[1] } // gq11
    ]
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
  })

  test('basisSplitIndices correctly locates the basis splits', () => {
    // Check that basisSplitIndices has the correct length
    expect(basisSplitIndices).toHaveLength(expectedBasisSplitGroups.length);

    // Loop through each index and verify the split is a basis split
    for (const index of basisSplitIndices) {
      const split = splits[index];
      const isBasisSplit = split.groups.every(group => group.responseGroup !== null);
      expect(isBasisSplit).toBe(true);
    }
  })

  test('set of initialized basis splits with zero active questions are exactly the one expected', () => {
    // Extract all splits with zero active questions (all responseGroups are null)
    const actualPartialSplitGroups0Active = splits
      .filter(split => split.groups.every(group => group.responseGroup === null))
      .map(split => split.groups);

    // Compare as sets using JSON serialization
    const actualSet = new Set(actualPartialSplitGroups0Active.map(groups => JSON.stringify(groups)));
    const expectedSet = new Set(expectedPartialSplitGroups0ActiveQuestion.map(groups => JSON.stringify(groups)));

    expect(actualSet).toEqual(expectedSet);
  })

  test('set of set of initialized basis splits with one active question are exactly the ones expected', () => {
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
  })

  test('all expected splits present and no unexpected split present', () => {
    const totalExpectedSplits =
      expectedBasisSplitGroups.length +
      expectedPartialSplitGroups0ActiveQuestion.length +
      expectedPartialSplitGroups1ActiveQuestion.length;

    expect(splits).toHaveLength(totalExpectedSplits);
  })

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
  })

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
  })
})