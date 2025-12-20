import type { Split } from "../../src/statistics/types";
import { responseQuestion, groupingQuestion0, groupingQuestion1 } from "./questions";

/**
 * A partial split for testing updateSplitFromUpdatedBasisSplits.
 * 
 * This split has:
 * - groupingQuestion0's first response group (gq00) - SPECIFIED
 * - groupingQuestion1's response group is NULL - UNSPECIFIED
 * 
 * This means it aggregates all basis splits where groupingQuestion0 = gq00,
 * regardless of groupingQuestion1's value.
 * 
 * Initial statistics are set to non-zero values to test diff calculations.
 */
export const partialSplit: Split = {
  basisSplitIndices: [], // Will be set based on which basis splits match
  groups: [
    {
      question: groupingQuestion0.question,
      responseGroup: groupingQuestion0.responseGroups[0] // gq00: values [0] - SPECIFIED
    },
    {
      question: groupingQuestion1.question,
      responseGroup: null // NULL - aggregates over all values
    }
  ],
  totalWeight: 10.0,
  totalCount: 8,
  responseGroups: {
    expanded: [
      {
        label: "erg0",
        values: [0],
        totalCount: 2,
        totalWeight: 3.0,
        proportion: 0.3
      },
      {
        label: "erg1",
        values: [1],
        totalCount: 2,
        totalWeight: 2.0,
        proportion: 0.2
      },
      {
        label: "erg2",
        values: [2],
        totalCount: 2,
        totalWeight: 3.0,
        proportion: 0.3
      },
      {
        label: "erg3",
        values: [3],
        totalCount: 2,
        totalWeight: 2.0,
        proportion: 0.2
      }
    ],
    collapsed: [
      {
        label: "crg0",
        values: [0, 1],
        totalCount: 4,
        totalWeight: 5.0,
        proportion: 0.5
      },
      {
        label: "crg1",
        values: [2, 3],
        totalCount: 4,
        totalWeight: 5.0,
        proportion: 0.5
      }
    ]
  }
};

/**
 * The two basis splits that aggregate to form partialSplit.
 * 
 * basisSplit1: groupingQuestion0 = gq00, groupingQuestion1 = gq10
 * basisSplit2: groupingQuestion0 = gq00, groupingQuestion1 = gq11
 * 
 * Together, these cover all combinations where groupingQuestion0 = gq00.
 */
export const basisSplitsForPartial: Split[] = [
  // Basis split 1: gq00 + gq10
  {
    basisSplitIndices: [],
    groups: [
      {
        question: groupingQuestion0.question,
        responseGroup: groupingQuestion0.responseGroups[0] // gq00
      },
      {
        question: groupingQuestion1.question,
        responseGroup: groupingQuestion1.responseGroups[0] // gq10
      }
    ],
    totalWeight: 6.0,
    totalCount: 5,
    responseGroups: {
      expanded: [
        {
          label: "erg0",
          values: [0],
          totalCount: 2,
          totalWeight: 2.0,
          proportion: 2.0 / 6.0 // 0.333...
        },
        {
          label: "erg1",
          values: [1],
          totalCount: 1,
          totalWeight: 1.5,
          proportion: 1.5 / 6.0 // 0.25
        },
        {
          label: "erg2",
          values: [2],
          totalCount: 1,
          totalWeight: 1.5,
          proportion: 1.5 / 6.0 // 0.25
        },
        {
          label: "erg3",
          values: [3],
          totalCount: 1,
          totalWeight: 1.0,
          proportion: 1.0 / 6.0 // 0.166...
        }
      ],
      collapsed: [
        {
          label: "crg0",
          values: [0, 1],
          totalCount: 3,
          totalWeight: 3.5,
          proportion: 3.5 / 6.0 // 0.583...
        },
        {
          label: "crg1",
          values: [2, 3],
          totalCount: 2,
          totalWeight: 2.5,
          proportion: 2.5 / 6.0 // 0.416...
        }
      ]
    }
  },
  // Basis split 2: gq00 + gq11
  {
    basisSplitIndices: [],
    groups: [
      {
        question: groupingQuestion0.question,
        responseGroup: groupingQuestion0.responseGroups[0] // gq00
      },
      {
        question: groupingQuestion1.question,
        responseGroup: groupingQuestion1.responseGroups[1] // gq11
      }
    ],
    totalWeight: 8.0,
    totalCount: 6,
    responseGroups: {
      expanded: [
        {
          label: "erg0",
          values: [0],
          totalCount: 1,
          totalWeight: 2.0,
          proportion: 2.0 / 8.0 // 0.25
        },
        {
          label: "erg1",
          values: [1],
          totalCount: 2,
          totalWeight: 3.0,
          proportion: 3.0 / 8.0 // 0.375
        },
        {
          label: "erg2",
          values: [2],
          totalCount: 2,
          totalWeight: 2.0,
          proportion: 2.0 / 8.0 // 0.25
        },
        {
          label: "erg3",
          values: [3],
          totalCount: 1,
          totalWeight: 1.0,
          proportion: 1.0 / 8.0 // 0.125
        }
      ],
      collapsed: [
        {
          label: "crg0",
          values: [0, 1],
          totalCount: 3,
          totalWeight: 5.0,
          proportion: 5.0 / 8.0 // 0.625
        },
        {
          label: "crg1",
          values: [2, 3],
          totalCount: 3,
          totalWeight: 3.0,
          proportion: 3.0 / 8.0 // 0.375
        }
      ]
    }
  }
];
