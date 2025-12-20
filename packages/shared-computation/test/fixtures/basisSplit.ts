import type { Split } from "../../src/statistics/types";
import { responseQuestion, groupingQuestion0, groupingQuestion1 } from "./questions";

/**
 * A basis split for testing updateBasisSplitFromResponses.
 * This split has groupingQuestion0's first response group (gq00) and
 * groupingQuestion1's first response group (gq10).
 * All statistics are initialized to 0.
 */
export const basisSplit: Split = {
  basisSplitIndices: [], // Not relevant for testing updateBasisSplitFromResponses
  groups: [
    {
      question: groupingQuestion0.question,
      responseGroup: groupingQuestion0.responseGroups[0] // gq00: values [0]
    },
    {
      question: groupingQuestion1.question,
      responseGroup: groupingQuestion1.responseGroups[0] // gq10: values [0]
    }
  ],
  totalWeight: 0,
  totalCount: 0,
  responseGroups: {
    expanded: [
      {
        label: "erg0",
        values: [0],
        totalCount: 0,
        totalWeight: 0,
        proportion: 0
      },
      {
        label: "erg1",
        values: [1],
        totalCount: 0,
        totalWeight: 0,
        proportion: 0
      },
      {
        label: "erg2",
        values: [2],
        totalCount: 0,
        totalWeight: 0,
        proportion: 0
      },
      {
        label: "erg3",
        values: [3],
        totalCount: 0,
        totalWeight: 0,
        proportion: 0
      }
    ],
    collapsed: [
      {
        label: "crg0",
        values: [0, 1],
        totalCount: 0,
        totalWeight: 0,
        proportion: 0
      },
      {
        label: "crg1",
        values: [2, 3],
        totalCount: 0,
        totalWeight: 0,
        proportion: 0
      }
    ]
  }
};
