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
 * 
 * CSV format: respondent_id,weight,party,age_group,approval,anger
 * Lines starting with # are treated as comments and ignored
 * 
 * Value handling:
 * - Numeric value (e.g., 0, 1, 1.5): Creates ResponseData element with that value
 * - Empty string or "null": Creates ResponseData element with response=null
 * - "MISSING" (case-insensitive): Skips creating ResponseData element entirely
 * 
 * This allows testing two types of missing data:
 * 1. Null response: Element exists but has response=null
 * 2. Missing entry: No element created at all
 * 
 * @param csvFileName - Name of CSV file to load (defaults to wave 1)
 */
export function loadMockResponsesFromCsv(
  csvFileName: string = "mock-responses-wave1.csv"
): ResponseData[] {
  const csvPath = path.join(__dirname, csvFileName);
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

      // Skip creating element if value is "MISSING" (case-insensitive)
      if (responseValue.toLowerCase() === "missing") {
        continue;
      }

      // Parse response: empty or "null" → null, otherwise parse as number
      const response =
        responseValue === "" || responseValue.toLowerCase() === "null"
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
 * Load Wave 1 mock responses from CSV (includes weight responses)
 * Wave 1 represents the initial/original dataset (respondents 1-10)
 */
let _cachedResponses: ResponseData[] | null = null;

export function getAllMockResponses(): ResponseData[] {
  if (!_cachedResponses) {
    _cachedResponses = loadMockResponsesFromCsv("mock-responses-wave1.csv");
  }
  return _cachedResponses;
}

/**
 * Get Wave 1 mock responses without weight data (for unweighted tests)
 */
export function getMockResponses(): ResponseData[] {
  return getAllMockResponses().filter(
    (r) => r.varName !== mockWeightQuestion.varName
  );
}

/**
 * Get only weight responses from Wave 1
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

// ============================================================================
// WAVE 2 DATA (Incremental Update Testing)
// ============================================================================

/**
 * Load Wave 2 mock responses from CSV (includes weight responses)
 * Wave 2 represents incremental update data for testing updateSplitStatistics
 * (respondents 11-20)
 */
let _cachedWave2Responses: ResponseData[] | null = null;

export function getWave2MockResponses(): ResponseData[] {
  if (!_cachedWave2Responses) {
    _cachedWave2Responses = loadMockResponsesFromCsv("mock-responses-wave2.csv");
  }
  return _cachedWave2Responses;
}

/**
 * Get Wave 2 mock responses without weight data (for unweighted update tests)
 */
export function getWave2MockResponsesUnweighted(): ResponseData[] {
  return getWave2MockResponses().filter(
    (r) => r.varName !== mockWeightQuestion.varName
  );
}

/**
 * Get combined Wave 1 + Wave 2 responses (all waves)
 * Includes weight data - useful for verifying incremental updates against full recomputation
 */
export function getAllWavesMockResponses(): ResponseData[] {
  return [...getAllMockResponses(), ...getWave2MockResponses()];
}

/**
 * Get combined Wave 1 + Wave 2 responses without weight data
 */
export function getAllWavesMockResponsesUnweighted(): ResponseData[] {
  return getAllWavesMockResponses().filter(
    (r) => r.varName !== mockWeightQuestion.varName
  );
}

// ============================================================================
// LEGACY ALIASES (for backward compatibility during transition)
// ============================================================================

/**
 * @deprecated Use getWave2MockResponses() instead
 */
export const getAllNewMockResponses = getWave2MockResponses;

/**
 * @deprecated Use getWave2MockResponsesUnweighted() instead
 */
export const getNewMockResponses = getWave2MockResponsesUnweighted;

/**
 * @deprecated Use getAllWavesMockResponses() instead
 */
export const getAllMockResponsesCombined = getAllWavesMockResponses;

/**
 * @deprecated Use getAllWavesMockResponsesUnweighted() instead
 */
export const getMockResponsesCombined = getAllWavesMockResponsesUnweighted;


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
 * 
 * IMPORTANT: Tests two types of missing data:
 * 1. Null response: ResponseData element exists with response=null (respondents 6, 7)
 * 2. Missing entry: No ResponseData element created at all (respondents 9, 10)
 */
export const expectedRespondentRecords = {
  /**
   * WITHOUT weight question (testing non-weight filtering)
   * Valid respondents must have valid responses to ALL non-weight questions
   */
  withoutWeight: {
    includedIds: [1, 2, 3, 4, 5] as const,
    excludedIds: [6, 7, 8, 9, 10] as const,
    totalCount: 5,
    explanation: {
      included: "Respondents 1-5 have valid responses to all non-weight questions",
      excluded: {
        6: "Missing party (null response element exists) - required grouping question",
        7: "Missing age_group (null response element exists) - required grouping question",
        8: "Invalid approval value (5) - not in any response group",
        9: "Missing party (no response element) - required grouping question",
        10: "Missing approval (no response element) - required response question",
      },
    },
  },

  /**
   * WITH weight question (testing weight filtering)
   * Valid respondents must have valid responses to ALL questions INCLUDING weight
   */
  withWeight: {
    includedIds: [1, 2, 3, 4, 5] as const,
    excludedIds: [6, 7, 8, 9, 10] as const,
    totalCount: 5,
    explanation: {
      included: "Respondents 1-5 have valid weights and all required responses",
      excluded: {
        6: "Missing both weight (null element) and party (null element) - multiple failures",
        7: "Missing age_group (null response element exists) - required grouping question",
        8: "Invalid approval value (5) - not in any response group",
        9: "Missing party (no response element) - required grouping question",
        10: "Missing approval (no response element) - required response question",
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

// ============================================================================
// EXPECTED TEST RESULTS FOR updateSplitStatistics - SINGLE SOURCE OF TRUTH
// ============================================================================
// These values are hand-calculated from both mock-responses-wave1.csv and
// mock-responses-wave2.csv and serve as the "correct" answers that tests
// verify against. All calculations are shown with inline comments.

/**
 * Expected results for updateSplitStatistics tests
 * 
 * Shows the mathematical progression for incremental updates:
 * 1. Wave 1 state (from Wave 1 respondents 1-5)
 * 2. Wave 2 data (from Wave 2 respondents 11-15)
 * 3. Combined state (combined Wave 1 + Wave 2)
 * 
 * For each test case, we verify:
 * - Incremental update matches full recomputation from scratch
 * - Invalid Wave 2 respondents are correctly filtered
 * - Proportions are correctly recalculated with new totals
 * 
 * WAVE 1 VALID RESPONDENTS (1-5):
 * | ID | Weight | Party      | Age    | Approval            | Anger     |
 * |----|--------|------------|--------|---------------------|-----------|
 * | 1  | 1.5    | Democrat   | 18-34  | Strongly Approve    | irritated |
 * | 2  | 0.8    | Democrat   | 35-54  | Somewhat Approve    | none      |
 * | 3  | 2.0    | Republican | 18-34  | Strongly Disapprove | aflame    |
 * | 4  | 1.2    | Republican | 55+    | Somewhat Disapprove | hot       |
 * | 5  | 1.0    | Democrat   | 55+    | Strongly Approve    | hot       |
 * 
 * WAVE 2 VALID RESPONDENTS (11-15):
 * | ID | Weight | Party      | Age    | Approval            | Anger     |
 * |----|--------|------------|--------|---------------------|-----------|
 * | 11 | 1.3    | Democrat   | 18-34  | Somewhat Approve    | none      |
 * | 12 | 0.9    | Republican | 55+    | Somewhat Disapprove | irritated |
 * | 13 | 1.1    | Democrat   | 35-54  | Strongly Approve    | hot       |
 * | 14 | 1.5    | Republican | 18-34  | Strongly Disapprove | aflame    |
 * | 15 | 0.7    | Democrat   | 55+    | Somewhat Approve    | irritated |
 * 
 * WAVE 2 INVALID RESPONDENTS (16-20):
 * | ID | Weight | Party      | Age    | Approval            | Anger     | Issue          |
 * |----|--------|------------|--------|---------------------|-----------|----------------|
 * | 16 | null   | null       | 35-54  | Somewhat Approve    | none      | null responses |
 * | 17 | 1.2    | Republican | null   | Somewhat Disapprove | none      | null response  |
 * | 18 | 0.95   | Democrat   | 18-34  | 5 (invalid)         | irritated | invalid value  |
 * | 19 | 1.6    | MISSING    | 35-54  | Somewhat Approve    | none      | missing entry  |
 * | 20 | 1.4    | Republican | 35-54  | MISSING             | hot       | missing entry  |
 */
export const expectedUpdateResults = {
  /**
   * Wave 2 respondent processing
   * Tests that buildRespondentRecords correctly filters Wave 2 responses
   */
  wave2Respondents: {
    includedIds: [11, 12, 13, 14, 15] as const,
    excludedIds: [16, 17, 18, 19, 20] as const,
    totalCount: 5,
    explanation: {
      included: "Respondents 11-15 have valid responses to all required questions",
      excluded: {
        16: "Missing both weight (null element) and party (null element) - multiple failures",
        17: "Missing age_group (null response element exists) - required grouping question",
        18: "Invalid approval value (5) - not in any response group",
        19: "Missing party (no response element) - required grouping question",
        20: "Missing approval (no response element) - required response question",
      },
    },
  },

  /**
   * Total weight progression across waves
   * Tracks cumulative weight as Wave 2 respondents are added
   */
  totalWeight: {
    wave1: 1.5 + 0.8 + 2.0 + 1.2 + 1.0,          // = 6.5 (Wave 1: R1-R5)
    wave2: 1.3 + 0.9 + 1.1 + 1.5 + 0.7,          // = 5.5 (Wave 2: R11-R15)
    combined: 6.5 + 5.5,                         // = 12.0 (Wave 1 + Wave 2)
  },

  /**
   * Split-specific update calculations
   * Each split shows: Wave 1 state → Wave 2 incremental data → combined state
   * All calculations include inline math for transparency
   */
  splits: {
    /**
     * Split: Democrat × 18-34 OR 35-54
     * 
     * WAVE 1 STATE:
     * - Respondents: R1 (18-34), R2 (35-54)
     * - effectiveN = 1.5 + 0.8 = 2.3
     * - Approval: Strongly=1.5, Somewhat=0.8
     * - Anger: none=0.8, irritated=1.5
     * 
     * WAVE 2 RESPONDENTS:
     * - Respondents: R11 (18-34), R13 (35-54)
     * - incrementalN = 1.3 + 1.1 = 2.4
     * - Approval: Strongly=1.1, Somewhat=1.3
     * - Anger: none=1.3, hot=1.1
     * 
     * INCREMENTAL UPDATE PROCESS:
     * 1. Convert proportions to counts:
     *    - Strongly Approve: 0.6522 × 2.3 ≈ 1.5
     *    - Somewhat Approve: 0.3478 × 2.3 ≈ 0.8
     * 2. Add incremental counts:
     *    - Strongly Approve: 1.5 + 1.1 = 2.6
     *    - Somewhat Approve: 0.8 + 1.3 = 2.1
     * 3. New effectiveN: 2.3 + 2.4 = 4.7
     * 4. Recompute proportions:
     *    - Strongly Approve: 2.6/4.7 ≈ 0.5532
     *    - Somewhat Approve: 2.1/4.7 ≈ 0.4468
     * 
     * VERIFICATION (full recomputation with R1, R2, R11, R13):
     * - effectiveN = 1.5 + 0.8 + 1.3 + 1.1 = 4.7 ✓
     * - Strongly Approve: (1.5 + 1.1)/4.7 ≈ 0.5532 ✓
     * - Somewhat Approve: (0.8 + 1.3)/4.7 ≈ 0.4468 ✓
     */
    "Democrat × 18-34 OR 35-54": {
      wave1: {
        respondentIds: [1, 2],
        effectiveN: 2.3,  // 1.5 + 0.8
        approval: {
          expanded: {
            "Strongly Approve": 1.5 / 2.3,      // R1
            "Somewhat Approve": 0.8 / 2.3,      // R2
            "Somewhat Disapprove": 0 / 2.3,
            "Strongly Disapprove": 0 / 2.3,
          },
          collapsed: {
            "Approve": 2.3 / 2.3,               // R1 + R2
            "Disapprove": 0 / 2.3,
          },
        },
        anger: {
          expanded: {
            none: 0.8 / 2.3,                    // R2
            irritated: 1.5 / 2.3,               // R1
            hot: 0 / 2.3,
            aflame: 0 / 2.3,
          },
          collapsed: {
            some: 2.3 / 2.3,                    // R1 + R2
            "a lot": 0 / 2.3,
          },
        },
      },
      wave2: {
        wave2RespondentIds: [11, 13],             // Both match Democrat × (18-34 OR 35-54)
        incrementalWeight: 1.3 + 1.1,           // = 2.4
        weightedCounts: {
          approval: {
            expanded: {
              "Strongly Approve": 1.1,          // R13
              "Somewhat Approve": 1.3,          // R11
              "Somewhat Disapprove": 0,
              "Strongly Disapprove": 0,
            },
            collapsed: {
              "Approve": 2.4,                   // R11 + R13
              "Disapprove": 0,
            },
          },
          anger: {
            expanded: {
              none: 1.3,                        // R11
              irritated: 0,
              hot: 1.1,                         // R13
              aflame: 0,
            },
            collapsed: {
              some: 1.3,                        // R11
              "a lot": 1.1,                     // R13
            },
          },
        },
      },
      combined: {
        combinedRespondentIds: [1, 2, 11, 13],
        effectiveN: 4.7,                        // 2.3 + 2.4
        approval: {
          expanded: {
            "Strongly Approve": (1.5 + 1.1) / 4.7,     // = 2.6/4.7
            "Somewhat Approve": (0.8 + 1.3) / 4.7,     // = 2.1/4.7
            "Somewhat Disapprove": 0 / 4.7,
            "Strongly Disapprove": 0 / 4.7,
          },
          collapsed: {
            "Approve": 4.7 / 4.7,                       // All respondents
            "Disapprove": 0 / 4.7,
          },
        },
        anger: {
          expanded: {
            none: (0.8 + 1.3) / 4.7,            // = 2.1/4.7 (R2 + R11)
            irritated: 1.5 / 4.7,               // R1
            hot: 1.1 / 4.7,                     // R13
            aflame: 0 / 4.7,
          },
          collapsed: {
            some: (0.8 + 1.3 + 1.5) / 4.7,      // = 3.6/4.7 (R2 + R11 + R1)
            "a lot": 1.1 / 4.7,                 // R13
          },
        },
      },
    },

    /**
     * Split: Democrat × 55+
     * 
     * WAVE 1 STATE (Wave 1):
     * - Respondents: R5
     * - effectiveN = 1.0
     * - Approval: Strongly=1.0
     * - Anger: hot=1.0
     * 
     * WAVE 2 RESPONDENTS (Wave 2):
     * - Respondents: R15
     * - incrementalN = 0.7
     * - Approval: Somewhat=0.7
     * - Anger: irritated=0.7
     * 
     * COMBINED STATE:
     * - effectiveN = 1.0 + 0.7 = 1.7
     * - Approval: Strongly=1.0/1.7, Somewhat=0.7/1.7
     * - Anger: hot=1.0/1.7, irritated=0.7/1.7
     */
    "Democrat × 55+": {
      wave1: {
        respondentIds: [5],
        effectiveN: 1.0,
        approval: {
          expanded: {
            "Strongly Approve": 1.0 / 1.0,      // R5
            "Somewhat Approve": 0 / 1.0,
            "Somewhat Disapprove": 0 / 1.0,
            "Strongly Disapprove": 0 / 1.0,
          },
          collapsed: {
            "Approve": 1.0 / 1.0,               // R5
            "Disapprove": 0 / 1.0,
          },
        },
        anger: {
          expanded: {
            none: 0 / 1.0,
            irritated: 0 / 1.0,
            hot: 1.0 / 1.0,                     // R5
            aflame: 0 / 1.0,
          },
          collapsed: {
            some: 0 / 1.0,
            "a lot": 1.0 / 1.0,                 // R5
          },
        },
      },
      wave2: {
        wave2RespondentIds: [15],                 // R15: Democrat × 55+
        incrementalWeight: 0.7,
        weightedCounts: {
          approval: {
            expanded: {
              "Strongly Approve": 0,
              "Somewhat Approve": 0.7,          // R15
              "Somewhat Disapprove": 0,
              "Strongly Disapprove": 0,
            },
            collapsed: {
              "Approve": 0.7,                   // R15
              "Disapprove": 0,
            },
          },
          anger: {
            expanded: {
              none: 0,
              irritated: 0.7,                   // R15
              hot: 0,
              aflame: 0,
            },
            collapsed: {
              some: 0.7,                        // R15
              "a lot": 0,
            },
          },
        },
      },
      combined: {
        combinedRespondentIds: [5, 15],
        effectiveN: 1.7,                        // 1.0 + 0.7
        approval: {
          expanded: {
            "Strongly Approve": 1.0 / 1.7,      // R5
            "Somewhat Approve": 0.7 / 1.7,      // R15
            "Somewhat Disapprove": 0 / 1.7,
            "Strongly Disapprove": 0 / 1.7,
          },
          collapsed: {
            "Approve": 1.7 / 1.7,               // R5 + R15
            "Disapprove": 0 / 1.7,
          },
        },
        anger: {
          expanded: {
            none: 0 / 1.7,
            irritated: 0.7 / 1.7,               // R15
            hot: 1.0 / 1.7,                     // R5
            aflame: 0 / 1.7,
          },
          collapsed: {
            some: 0.7 / 1.7,                    // R15
            "a lot": 1.0 / 1.7,                 // R5
          },
        },
      },
    },

    /**
     * Split: Republican × 18-34 OR 35-54
     * 
     * WAVE 1 STATE (Wave 1):
     * - Respondents: R3 (18-34)
     * - effectiveN = 2.0
     * - Approval: Strongly Disapprove=2.0
     * - Anger: aflame=2.0
     * 
     * WAVE 2 RESPONDENTS (Wave 2):
     * - Respondents: R14 (18-34)
     * - incrementalN = 1.5
     * - Approval: Strongly Disapprove=1.5
     * - Anger: aflame=1.5
     * 
     * COMBINED STATE:
     * - effectiveN = 2.0 + 1.5 = 3.5
     * - Approval: Strongly Disapprove=3.5/3.5
     * - Anger: aflame=3.5/3.5
     */
    "Republican × 18-34 OR 35-54": {
      wave1: {
        respondentIds: [3],
        effectiveN: 2.0,
        approval: {
          expanded: {
            "Strongly Approve": 0 / 2.0,
            "Somewhat Approve": 0 / 2.0,
            "Somewhat Disapprove": 0 / 2.0,
            "Strongly Disapprove": 2.0 / 2.0,   // R3
          },
          collapsed: {
            "Approve": 0 / 2.0,
            "Disapprove": 2.0 / 2.0,            // R3
          },
        },
        anger: {
          expanded: {
            none: 0 / 2.0,
            irritated: 0 / 2.0,
            hot: 0 / 2.0,
            aflame: 2.0 / 2.0,                  // R3
          },
          collapsed: {
            some: 0 / 2.0,
            "a lot": 2.0 / 2.0,                 // R3
          },
        },
      },
      wave2: {
        wave2RespondentIds: [14],                 // R14: Republican × 18-34
        incrementalWeight: 1.5,
        weightedCounts: {
          approval: {
            expanded: {
              "Strongly Approve": 0,
              "Somewhat Approve": 0,
              "Somewhat Disapprove": 0,
              "Strongly Disapprove": 1.5,       // R14
            },
            collapsed: {
              "Approve": 0,
              "Disapprove": 1.5,                // R14
            },
          },
          anger: {
            expanded: {
              none: 0,
              irritated: 0,
              hot: 0,
              aflame: 1.5,                      // R14
            },
            collapsed: {
              some: 0,
              "a lot": 1.5,                     // R14
            },
          },
        },
      },
      combined: {
        combinedRespondentIds: [3, 14],
        effectiveN: 3.5,                        // 2.0 + 1.5
        approval: {
          expanded: {
            "Strongly Approve": 0 / 3.5,
            "Somewhat Approve": 0 / 3.5,
            "Somewhat Disapprove": 0 / 3.5,
            "Strongly Disapprove": 3.5 / 3.5,   // R3 + R14
          },
          collapsed: {
            "Approve": 0 / 3.5,
            "Disapprove": 3.5 / 3.5,            // R3 + R14
          },
        },
        anger: {
          expanded: {
            none: 0 / 3.5,
            irritated: 0 / 3.5,
            hot: 0 / 3.5,
            aflame: 3.5 / 3.5,                  // R3 + R14
          },
          collapsed: {
            some: 0 / 3.5,
            "a lot": 3.5 / 3.5,                 // R3 + R14
          },
        },
      },
    },

    /**
     * Split: Republican × 55+
     * 
     * WAVE 1 STATE (Wave 1):
     * - Respondents: R4
     * - effectiveN = 1.2
     * - Approval: Somewhat Disapprove=1.2
     * - Anger: hot=1.2
     * 
     * WAVE 2 RESPONDENTS (Wave 2):
     * - Respondents: R12
     * - incrementalN = 0.9
     * - Approval: Somewhat Disapprove=0.9
     * - Anger: irritated=0.9
     * 
     * COMBINED STATE:
     * - effectiveN = 1.2 + 0.9 = 2.1
     * - Approval: Somewhat Disapprove=2.1/2.1
     * - Anger: hot=1.2/2.1, irritated=0.9/2.1
     */
    "Republican × 55+": {
      wave1: {
        respondentIds: [4],
        effectiveN: 1.2,
        approval: {
          expanded: {
            "Strongly Approve": 0 / 1.2,
            "Somewhat Approve": 0 / 1.2,
            "Somewhat Disapprove": 1.2 / 1.2,   // R4
            "Strongly Disapprove": 0 / 1.2,
          },
          collapsed: {
            "Approve": 0 / 1.2,
            "Disapprove": 1.2 / 1.2,            // R4
          },
        },
        anger: {
          expanded: {
            none: 0 / 1.2,
            irritated: 0 / 1.2,
            hot: 1.2 / 1.2,                     // R4
            aflame: 0 / 1.2,
          },
          collapsed: {
            some: 0 / 1.2,
            "a lot": 1.2 / 1.2,                 // R4
          },
        },
      },
      wave2: {
        wave2RespondentIds: [12],                 // R12: Republican × 55+
        incrementalWeight: 0.9,
        weightedCounts: {
          approval: {
            expanded: {
              "Strongly Approve": 0,
              "Somewhat Approve": 0,
              "Somewhat Disapprove": 0.9,       // R12
              "Strongly Disapprove": 0,
            },
            collapsed: {
              "Approve": 0,
              "Disapprove": 0.9,                // R12
            },
          },
          anger: {
            expanded: {
              none: 0,
              irritated: 0.9,                   // R12
              hot: 0,
              aflame: 0,
            },
            collapsed: {
              some: 0.9,                        // R12
              "a lot": 0,
            },
          },
        },
      },
      combined: {
        combinedRespondentIds: [4, 12],
        effectiveN: 2.1,                        // 1.2 + 0.9
        approval: {
          expanded: {
            "Strongly Approve": 0 / 2.1,
            "Somewhat Approve": 0 / 2.1,
            "Somewhat Disapprove": 2.1 / 2.1,   // R4 + R12
            "Strongly Disapprove": 0 / 2.1,
          },
          collapsed: {
            "Approve": 0 / 2.1,
            "Disapprove": 2.1 / 2.1,            // R4 + R12
          },
        },
        anger: {
          expanded: {
            none: 0 / 2.1,
            irritated: 0.9 / 2.1,               // R12
            hot: 1.2 / 2.1,                     // R4
            aflame: 0 / 2.1,
          },
          collapsed: {
            some: 0.9 / 2.1,                    // R12
            "a lot": 1.2 / 2.1,                 // R4
          },
        },
      },
    },

    /**
     * Split: (all parties) × (all ages)
     * 
     * WAVE 1 STATE:
     * - Respondents: R1, R2, R3, R4, R5 (all Wave 1 valid respondents)
     * - effectiveN = 1.5 + 0.8 + 2.0 + 1.2 + 1.0 = 6.5
     * 
     * WAVE 2 RESPONDENTS:
     * - Respondents: R11, R12, R13, R14, R15 (all Wave 2 valid respondents)
     * - incrementalN = 1.3 + 0.9 + 1.1 + 1.5 + 0.7 = 5.5
     * 
     * COMBINED STATE:
     * - effectiveN = 6.5 + 5.5 = 12.0
     * - This split includes ALL valid respondents from both waves
     * 
     * Approval breakdown:
     * - Strongly Approve: R1(1.5) + R5(1.0) + R13(1.1) = 3.6
     * - Somewhat Approve: R2(0.8) + R11(1.3) + R15(0.7) = 2.8
     * - Somewhat Disapprove: R4(1.2) + R12(0.9) = 2.1
     * - Strongly Disapprove: R3(2.0) + R14(1.5) = 3.5
     * Total: 3.6 + 2.8 + 2.1 + 3.5 = 12.0 ✓
     * 
     * Anger breakdown:
     * - none: R2(0.8) + R11(1.3) = 2.1
     * - irritated: R1(1.5) + R15(0.7) + R12(0.9) = 3.1
     * - hot: R4(1.2) + R5(1.0) + R13(1.1) = 3.3
     * - aflame: R3(2.0) + R14(1.5) = 3.5
     * Total: 2.1 + 3.1 + 3.3 + 3.5 = 12.0 ✓
     */
    "(all parties) × (all ages)": {
      wave1: {
        respondentIds: [1, 2, 3, 4, 5],
        effectiveN: 6.5,                        // Sum of all Wave 1 weights
        approval: {
          expanded: {
            "Strongly Approve": (1.5 + 1.0) / 6.5,         // R1 + R5
            "Somewhat Approve": 0.8 / 6.5,                 // R2
            "Somewhat Disapprove": 1.2 / 6.5,              // R4
            "Strongly Disapprove": 2.0 / 6.5,              // R3
          },
          collapsed: {
            "Approve": (1.5 + 0.8 + 1.0) / 6.5,            // R1 + R2 + R5
            "Disapprove": (2.0 + 1.2) / 6.5,               // R3 + R4
          },
        },
        anger: {
          expanded: {
            none: 0.8 / 6.5,                               // R2
            irritated: 1.5 / 6.5,                          // R1
            hot: (1.2 + 1.0) / 6.5,                        // R4 + R5
            aflame: 2.0 / 6.5,                             // R3
          },
          collapsed: {
            some: (1.5 + 0.8) / 6.5,                       // R1 + R2
            "a lot": (2.0 + 1.2 + 1.0) / 6.5,              // R3 + R4 + R5
          },
        },
      },
      wave2: {
        wave2RespondentIds: [11, 12, 13, 14, 15], // All Wave 2 valid respondents
        incrementalWeight: 5.5,                 // Sum of all Wave 2 weights
        weightedCounts: {
          approval: {
            expanded: {
              "Strongly Approve": 1.1,          // R13
              "Somewhat Approve": 1.3 + 0.7,    // R11 + R15 = 2.0
              "Somewhat Disapprove": 0.9,       // R12
              "Strongly Disapprove": 1.5,       // R14
            },
            collapsed: {
              "Approve": 1.1 + 1.3 + 0.7,       // R13 + R11 + R15 = 3.1
              "Disapprove": 0.9 + 1.5,          // R12 + R14 = 2.4
            },
          },
          anger: {
            expanded: {
              none: 1.3,                        // R11
              irritated: 0.7 + 0.9,             // R15 + R12 = 1.6
              hot: 1.1,                         // R13
              aflame: 1.5,                      // R14
            },
            collapsed: {
              some: 1.3 + 0.7 + 0.9,            // R11 + R15 + R12 = 2.9
              "a lot": 1.1 + 1.5,               // R13 + R14 = 2.6
            },
          },
        },
      },
      combined: {
        combinedRespondentIds: [1, 2, 3, 4, 5, 11, 12, 13, 14, 15],
        effectiveN: 12.0,                       // 6.5 + 5.5
        approval: {
          expanded: {
            "Strongly Approve": (1.5 + 1.0 + 1.1) / 12.0,          // = 3.6/12.0
            "Somewhat Approve": (0.8 + 1.3 + 0.7) / 12.0,          // = 2.8/12.0
            "Somewhat Disapprove": (1.2 + 0.9) / 12.0,             // = 2.1/12.0
            "Strongly Disapprove": (2.0 + 1.5) / 12.0,             // = 3.5/12.0
          },
          collapsed: {
            "Approve": (1.5 + 0.8 + 1.0 + 1.1 + 1.3 + 0.7) / 12.0, // = 6.4/12.0
            "Disapprove": (2.0 + 1.2 + 0.9 + 1.5) / 12.0,          // = 5.6/12.0
          },
        },
        anger: {
          expanded: {
            none: (0.8 + 1.3) / 12.0,                              // = 2.1/12.0
            irritated: (1.5 + 0.7 + 0.9) / 12.0,                   // = 3.1/12.0
            hot: (1.2 + 1.0 + 1.1) / 12.0,                         // = 3.3/12.0
            aflame: (2.0 + 1.5) / 12.0,                            // = 3.5/12.0
          },
          collapsed: {
            some: (1.5 + 0.8 + 1.3 + 0.7 + 0.9) / 12.0,            // = 5.2/12.0
            "a lot": (2.0 + 1.2 + 1.0 + 1.1 + 1.5) / 12.0,         // = 6.8/12.0
          },
        },
      },
    },
  },
} as const;
