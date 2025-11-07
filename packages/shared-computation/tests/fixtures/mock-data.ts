import type { SessionConfig, Question, ResponseGroup } from "shared-schemas";
import type { ResponseData, QuestionKey } from "../../src/types";
import * as fs from "fs";
import * as path from "path";

/**
 * Question metadata mapping for CSV parsing
 */
const QUESTION_METADATA: Record<
  string,
  { varName: string; batteryName: string; subBattery: string }
> = {
  weight: { varName: "weight", batteryName: "demographics", subBattery: "" },
  party: { varName: "party", batteryName: "demographics", subBattery: "" },
  age_group: {
    varName: "age_group",
    batteryName: "demographics",
    subBattery: "",
  },
  approval: { varName: "approval", batteryName: "policy", subBattery: "" },
  anger: { varName: "anger", batteryName: "feelings", subBattery: "" },
};

/**
 * Parses CSV file and converts it to ResponseData array
 * CSV format: respondent_id,weight,party,age_group,approval,anger
 * Lines starting with # are treated as comments and ignored
 */
export function loadMockResponsesFromCsv(): ResponseData[] {
  const csvPath = path.join(__dirname, "mock-responses.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");

  const lines = csvContent
    .trim()
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("#"));

  const headers = lines[0].split(",");

  const responses: ResponseData[] = [];
  let questionSessionId = 1;

  // Parse each respondent row
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const respondentId = parseInt(values[0], 10);

    // Create response data for each question column (skip respondent_id column)
    for (let j = 1; j < headers.length; j++) {
      const questionKey = headers[j].trim();
      const metadata = QUESTION_METADATA[questionKey];

      if (!metadata) {
        throw new Error(`Unknown question key in CSV: ${questionKey}`);
      }

      const responseValue = values[j].trim();
      const response =
        responseValue === "" || responseValue === "null"
          ? null
          : parseFloat(responseValue);

      responses.push({
        respondentId,
        questionSessionId: questionSessionId++,
        varName: metadata.varName,
        batteryName: metadata.batteryName,
        subBattery: metadata.subBattery,
        response,
      });
    }
  }

  return responses;
}

/**
 * Mock session configuration for testing
 */
export const mockSessionConfig: SessionConfig = {
  groupingQuestions: [
    {
      varName: "party",
      batteryName: "demographics",
      subBattery: "",
      responseGroups: [
        {
          label: "Democrat",
          values: [0],
        },
        {
          label: "Republican",
          values: [1],
        },
      ],
    },
    {
      varName: "age_group",
      batteryName: "demographics",
      subBattery: "",
      responseGroups: [
        {
          label: "18-34 OR 35-54",
          values: [0, 1],
        },
        {
          label: "55+",
          values: [2],
        },
      ],
    },
  ],
  responseQuestions: [
    {
      varName: "approval",
      batteryName: "policy",
      subBattery: "",
      responseGroups: {
        expanded: [
          {
            label: "Strongly Approve",
            values: [0],
          },
          {
            label: "Somewhat Approve",
            values: [1],
          },
          {
            label: "Somewhat Disapprove",
            values: [2],
          },
          {
            label: "Strongly Disapprove",
            values: [3],
          },
        ],
        collapsed: [
          {
            label: "Approve",
            values: [0, 1],
          },
          {
            label: "Disapprove",
            values: [2, 3],
          },
        ],
      },
    },
    {
      varName: "anger",
      batteryName: "feelings",
      subBattery: "",
      responseGroups: {
        expanded: [
          {
            label: "none",
            values: [0],
          },
          {
            label: "irritated",
            values: [1],
          },
          {
            label: "hot",
            values: [2],
          },
          {
            label: "aflame",
            values: [3],
          },
        ],
        collapsed: [
          {
            label: "some",
            values: [0, 1],
          },
          {
            label: "a lot",
            values: [2, 3],
          },
        ],
      },
    },
  ],
};

/**
 * Mock weight question key
 */
export const mockWeightQuestion: QuestionKey = {
  varName: "weight",
  batteryName: "demographics",
  subBattery: "",
};

/**
 * Load all mock responses from CSV (includes weight responses)
 */
let _cachedResponses: ResponseData[] | null = null;

export function getAllMockResponses(): ResponseData[] {
  if (!_cachedResponses) {
    _cachedResponses = loadMockResponsesFromCsv();
  }
  return _cachedResponses;
}

/**
 * Get mock responses without weight data (for unweighted tests)
 */
export function getMockResponses(): ResponseData[] {
  return getAllMockResponses().filter(
    (r) => r.varName !== mockWeightQuestion.varName
  );
}

/**
 * Get only weight responses
 */
export function getMockWeights(): ResponseData[] {
  return getAllMockResponses().filter(
    (r) => r.varName === mockWeightQuestion.varName
  );
}

/**
 * Legacy exports for backward compatibility
 * @deprecated Use getMockResponses() instead
 */
export const mockResponses = getMockResponses();

/**
 * Legacy exports for backward compatibility
 * @deprecated Use getAllMockResponses() instead
 */
export const mockWeightedResponses = getAllMockResponses();

/**
 * Helper to create additional mock responses
 */
export function createMockResponse(
  respondentId: number,
  questionSessionId: number,
  question: Question,
  responseValue: number | null
): ResponseData {
  return {
    respondentId,
    questionSessionId,
    varName: question.varName,
    batteryName: question.batteryName,
    subBattery: question.subBattery,
    response: responseValue,
  };
}

/**
 * Helper to create a simple session config for testing
 */
export function createSimpleSessionConfig(
  groupingQuestions: (Question & { responseGroups: ResponseGroup[] })[],
  responseQuestions: (Question & {
    responseGroups: { expanded: ResponseGroup[]; collapsed: ResponseGroup[] };
  })[]
): SessionConfig {
  return {
    groupingQuestions,
    responseQuestions,
  };
}

// ============================================================================
// EXPECTED TEST RESULTS - SINGLE SOURCE OF TRUTH
// ============================================================================
// These values are hand-calculated from the mock data CSV and serve as the
// "correct" answers that tests verify against. All calculations are shown
// with inline comments to make the math transparent and verifiable.

/**
 * Expected results for buildRespondentRecords tests
 * Based on mock-responses.csv data
 */
export const expectedRespondentRecords = {
  /**
   * WITHOUT weight question (testing non-weight filtering)
   * Valid respondents must have valid responses to ALL non-weight questions
   */
  withoutWeight: {
    includedIds: [1, 2, 3, 4, 5] as const,
    excludedIds: [6, 7, 8] as const,
    totalCount: 5,
    explanation: {
      included: "Respondents 1-5 have valid responses to all non-weight questions",
      excluded: {
        6: "Missing party (null) - required grouping question",
        7: "Missing age_group (null) - required grouping question",
        8: "Invalid approval value (5) - not in any response group",
      },
    },
  },

  /**
   * WITH weight question (testing weight filtering)
   * Valid respondents must have valid responses to ALL questions INCLUDING weight
   */
  withWeight: {
    includedIds: [1, 2, 3, 4, 5] as const,
    excludedIds: [6, 7, 8] as const,
    totalCount: 5,
    explanation: {
      included: "Respondents 1-5 have valid weights and all required responses",
      excluded: {
        6: "Missing both weight and party - fails on multiple requirements",
        7: "Missing age_group - required grouping question",
        8: "Invalid approval value (5) - not in any response group",
      },
    },
  },
} as const;

/**
 * Expected results for generateSplits tests
 * Based on mockSessionConfig which has:
 * - 2 party groups (Democrat, Republican) + null = 3 options
 * - 2 age groups (18-34 OR 35-54, 55+) + null = 3 options
 * Total combinations: 3 × 3 = 9 splits
 */
export const expectedSplits = {
  totalCount: 9,
  splitLabels: [
    "Democrat × 18-34 OR 35-54",
    "Democrat × 55+",
    "Democrat × (all ages)",
    "Republican × 18-34 OR 35-54",
    "Republican × 55+",
    "Republican × (all ages)",
    "(all parties) × 18-34 OR 35-54",
    "(all parties) × 55+",
    "(all parties) × (all ages)",
  ] as const,
  explanation: "Cartesian product of [Democrat, Republican, null] × [18-34 OR 35-54, 55+, null]",
} as const;

/**
 * Expected statistics for populateSplitStatistics tests
 * Hand-calculated proportions for each split, both weighted and unweighted
 * 
 * Mock data reference (valid respondents only):
 * | ID | Weight | Party      | Age    | Approval            | Anger     |
 * |----|--------|------------|--------|---------------------|-----------|
 * | 1  | 1.5    | Democrat   | 18-34  | Strongly Approve    | irritated |
 * | 2  | 0.8    | Democrat   | 35-54  | Somewhat Approve    | none      |
 * | 3  | 2.0    | Republican | 18-34  | Strongly Disapprove | aflame    |
 * | 4  | 1.2    | Republican | 55+    | Somewhat Disapprove | hot       |
 * | 5  | 1.0    | Democrat   | 55+    | Strongly Approve    | hot       |
 */
export const expectedSplitStatistics = {
  /**
   * Split: Democrat × 18-34 OR 35-54
   * Matching respondents: 1, 2 (party=0 AND age_group IN [0,1])
   */
  "Democrat × 18-34 OR 35-54": {
    respondentIds: [1, 2],
    unweighted: {
      n: 2,
      approval: {
        expanded: {
          "Strongly Approve": 1 / 2,    // R1: approval=0
          "Somewhat Approve": 1 / 2,    // R2: approval=1
          "Somewhat Disapprove": 0 / 2,
          "Strongly Disapprove": 0 / 2,
        },
        collapsed: {
          "Approve": 2 / 2,             // R1+R2: approval IN [0,1]
          "Disapprove": 0 / 2,
        },
      },
      anger: {
        expanded: {
          none: 1 / 2,                  // R2: anger=0
          irritated: 1 / 2,             // R1: anger=1
          hot: 0 / 2,
          aflame: 0 / 2,
        },
        collapsed: {
          some: 2 / 2,                  // R1+R2: anger IN [0,1]
          "a lot": 0 / 2,
        },
      },
    },
    weighted: {
      effectiveN: 1.5 + 0.8,            // = 2.3
      approval: {
        expanded: {
          "Strongly Approve": 1.5 / 2.3,    // R1 weight
          "Somewhat Approve": 0.8 / 2.3,    // R2 weight
          "Somewhat Disapprove": 0 / 2.3,
          "Strongly Disapprove": 0 / 2.3,
        },
        collapsed: {
          "Approve": 2.3 / 2.3,             // Both respondents
          "Disapprove": 0 / 2.3,
        },
      },
      anger: {
        expanded: {
          none: 0.8 / 2.3,              // R2 weight
          irritated: 1.5 / 2.3,         // R1 weight
          hot: 0 / 2.3,
          aflame: 0 / 2.3,
        },
        collapsed: {
          some: 2.3 / 2.3,              // Both respondents
          "a lot": 0 / 2.3,
        },
      },
    },
  },

  /**
   * Split: Democrat × 55+
   * Matching respondents: 5 (party=0 AND age_group=2)
   */
  "Democrat × 55+": {
    respondentIds: [5],
    unweighted: {
      n: 1,
      approval: {
        expanded: {
          "Strongly Approve": 1 / 1,    // R5: approval=0
          "Somewhat Approve": 0 / 1,
          "Somewhat Disapprove": 0 / 1,
          "Strongly Disapprove": 0 / 1,
        },
        collapsed: {
          "Approve": 1 / 1,             // R5: approval IN [0,1]
          "Disapprove": 0 / 1,
        },
      },
      anger: {
        expanded: {
          none: 0 / 1,
          irritated: 0 / 1,
          hot: 1 / 1,                   // R5: anger=2
          aflame: 0 / 1,
        },
        collapsed: {
          some: 0 / 1,
          "a lot": 1 / 1,               // R5: anger IN [2,3]
        },
      },
    },
    weighted: {
      effectiveN: 1.0,
      approval: {
        expanded: {
          "Strongly Approve": 1.0 / 1.0,
          "Somewhat Approve": 0 / 1.0,
          "Somewhat Disapprove": 0 / 1.0,
          "Strongly Disapprove": 0 / 1.0,
        },
        collapsed: {
          "Approve": 1.0 / 1.0,
          "Disapprove": 0 / 1.0,
        },
      },
      anger: {
        expanded: {
          none: 0 / 1.0,
          irritated: 0 / 1.0,
          hot: 1.0 / 1.0,
          aflame: 0 / 1.0,
        },
        collapsed: {
          some: 0 / 1.0,
          "a lot": 1.0 / 1.0,
        },
      },
    },
  },

  /**
   * Split: Republican × 18-34 OR 35-54
   * Matching respondents: 3 (party=1 AND age_group IN [0,1])
   */
  "Republican × 18-34 OR 35-54": {
    respondentIds: [3],
    unweighted: {
      n: 1,
      approval: {
        expanded: {
          "Strongly Approve": 0 / 1,
          "Somewhat Approve": 0 / 1,
          "Somewhat Disapprove": 0 / 1,
          "Strongly Disapprove": 1 / 1,  // R3: approval=3
        },
        collapsed: {
          "Approve": 0 / 1,
          "Disapprove": 1 / 1,           // R3: approval IN [2,3]
        },
      },
      anger: {
        expanded: {
          none: 0 / 1,
          irritated: 0 / 1,
          hot: 0 / 1,
          aflame: 1 / 1,                 // R3: anger=3
        },
        collapsed: {
          some: 0 / 1,
          "a lot": 1 / 1,                // R3: anger IN [2,3]
        },
      },
    },
    weighted: {
      effectiveN: 2.0,
      approval: {
        expanded: {
          "Strongly Approve": 0 / 2.0,
          "Somewhat Approve": 0 / 2.0,
          "Somewhat Disapprove": 0 / 2.0,
          "Strongly Disapprove": 2.0 / 2.0,
        },
        collapsed: {
          "Approve": 0 / 2.0,
          "Disapprove": 2.0 / 2.0,
        },
      },
      anger: {
        expanded: {
          none: 0 / 2.0,
          irritated: 0 / 2.0,
          hot: 0 / 2.0,
          aflame: 2.0 / 2.0,
        },
        collapsed: {
          some: 0 / 2.0,
          "a lot": 2.0 / 2.0,
        },
      },
    },
  },

  /**
   * Split: Republican × 55+
   * Matching respondents: 4 (party=1 AND age_group=2)
   */
  "Republican × 55+": {
    respondentIds: [4],
    unweighted: {
      n: 1,
      approval: {
        expanded: {
          "Strongly Approve": 0 / 1,
          "Somewhat Approve": 0 / 1,
          "Somewhat Disapprove": 1 / 1,  // R4: approval=2
          "Strongly Disapprove": 0 / 1,
        },
        collapsed: {
          "Approve": 0 / 1,
          "Disapprove": 1 / 1,           // R4: approval IN [2,3]
        },
      },
      anger: {
        expanded: {
          none: 0 / 1,
          irritated: 0 / 1,
          hot: 1 / 1,                    // R4: anger=2
          aflame: 0 / 1,
        },
        collapsed: {
          some: 0 / 1,
          "a lot": 1 / 1,                // R4: anger IN [2,3]
        },
      },
    },
    weighted: {
      effectiveN: 1.2,
      approval: {
        expanded: {
          "Strongly Approve": 0 / 1.2,
          "Somewhat Approve": 0 / 1.2,
          "Somewhat Disapprove": 1.2 / 1.2,
          "Strongly Disapprove": 0 / 1.2,
        },
        collapsed: {
          "Approve": 0 / 1.2,
          "Disapprove": 1.2 / 1.2,
        },
      },
      anger: {
        expanded: {
          none: 0 / 1.2,
          irritated: 0 / 1.2,
          hot: 1.2 / 1.2,
          aflame: 0 / 1.2,
        },
        collapsed: {
          some: 0 / 1.2,
          "a lot": 1.2 / 1.2,
        },
      },
    },
  },

  /**
   * Split: (all parties) × (all ages)
   * Matching respondents: 1, 2, 3, 4, 5 (all valid respondents)
   */
  "(all parties) × (all ages)": {
    respondentIds: [1, 2, 3, 4, 5],
    unweighted: {
      n: 5,
      approval: {
        expanded: {
          "Strongly Approve": 2 / 5,     // R1, R5
          "Somewhat Approve": 1 / 5,     // R2
          "Somewhat Disapprove": 1 / 5,  // R4
          "Strongly Disapprove": 1 / 5,  // R3
        },
        collapsed: {
          "Approve": 3 / 5,              // R1, R2, R5
          "Disapprove": 2 / 5,           // R3, R4
        },
      },
      anger: {
        expanded: {
          none: 1 / 5,                   // R2
          irritated: 1 / 5,              // R1
          hot: 2 / 5,                    // R4, R5
          aflame: 1 / 5,                 // R3
        },
        collapsed: {
          some: 2 / 5,                   // R1, R2
          "a lot": 3 / 5,                // R3, R4, R5
        },
      },
    },
    weighted: {
      effectiveN: 1.5 + 0.8 + 2.0 + 1.2 + 1.0,  // = 6.5
      approval: {
        expanded: {
          "Strongly Approve": (1.5 + 1.0) / 6.5,    // R1 + R5
          "Somewhat Approve": 0.8 / 6.5,            // R2
          "Somewhat Disapprove": 1.2 / 6.5,         // R4
          "Strongly Disapprove": 2.0 / 6.5,         // R3
        },
        collapsed: {
          "Approve": (1.5 + 0.8 + 1.0) / 6.5,       // R1 + R2 + R5
          "Disapprove": (2.0 + 1.2) / 6.5,          // R3 + R4
        },
      },
      anger: {
        expanded: {
          none: 0.8 / 6.5,                          // R2
          irritated: 1.5 / 6.5,                     // R1
          hot: (1.2 + 1.0) / 6.5,                   // R4 + R5
          aflame: 2.0 / 6.5,                        // R3
        },
        collapsed: {
          some: (1.5 + 0.8) / 6.5,                  // R1 + R2
          "a lot": (2.0 + 1.2 + 1.0) / 6.5,         // R3 + R4 + R5
        },
      },
    },
  },
} as const;
