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
