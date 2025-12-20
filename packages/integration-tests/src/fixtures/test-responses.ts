import { testQuestions } from "./test-questions";

/**
 * Type for a respondent answer
 * Matches the RespondentAnswer interface from the public API
 */
export interface TestAnswer {
  varName: string;
  batteryName: string;
  subBattery: string;
  responseIndex: number | null;
}

/**
 * Valid complete response
 * 
 * Answers all questions in the session with valid response indices
 * that are within the range of the visualization's response groups.
 * 
 * Expected behavior:
 * - Inserts to polls.respondents and polls.responses
 * - Triggers visualization update
 * - Publishes update via visualization-stream service
 */
export const validCompleteResponse: TestAnswer[] = [
  {
    varName: testQuestions[0].varName, // satisfaction
    batteryName: testQuestions[0].batteryName,
    subBattery: testQuestions[0].subBattery ?? "",
    responseIndex: 3, // "Somewhat satisfied" - valid for visualization (0-4)
  },
  {
    varName: testQuestions[2].varName, // gender
    batteryName: testQuestions[2].batteryName,
    subBattery: testQuestions[2].subBattery ?? "",
    responseIndex: 0, // "Male" - valid for visualization
  },
  {
    varName: testQuestions[3].varName, // race
    batteryName: testQuestions[3].batteryName,
    subBattery: testQuestions[3].subBattery ?? "",
    responseIndex: 1, // "Black or African American" - valid for visualization
  },
  {
    varName: testQuestions[4].varName, // age
    batteryName: testQuestions[4].batteryName,
    subBattery: testQuestions[4].subBattery ?? "",
    responseIndex: 2, // "35-44" - valid for visualization
  },
];

/**
 * Out-of-range response
 * 
 * Answers all questions, but includes response indices that are
 * outside the range defined in the visualization's response groups.
 * 
 * For example, satisfaction has response index 5 ("Skipped"), which
 * is not included in any of the visualization's response groups (0-4).
 * 
 * Expected behavior:
 * - Inserts to polls.respondents and polls.responses
 * - Does NOT trigger visualization update (invalid response for viz)
 * - Does NOT publish update via visualization-stream service
 */
export const outOfRangeResponse: TestAnswer[] = [
  {
    varName: testQuestions[0].varName, // satisfaction
    batteryName: testQuestions[0].batteryName,
    subBattery: testQuestions[0].subBattery ?? "",
    responseIndex: 5, // "Skipped" - OUT OF RANGE for visualization (only 0-4 are valid)
  },
  {
    varName: testQuestions[2].varName, // gender
    batteryName: testQuestions[2].batteryName,
    subBattery: testQuestions[2].subBattery ?? "",
    responseIndex: 0, // "Male" - valid
  },
  {
    varName: testQuestions[3].varName, // race
    batteryName: testQuestions[3].batteryName,
    subBattery: testQuestions[3].subBattery ?? "",
    responseIndex: 1, // "Black or African American" - valid
  },
  {
    varName: testQuestions[4].varName, // age
    batteryName: testQuestions[4].batteryName,
    subBattery: testQuestions[4].subBattery ?? "",
    responseIndex: 2, // "35-44" - valid
  },
];

/**
 * Partial response
 * 
 * Answers only some of the questions in the session.
 * Missing answers to one or more questions.
 * 
 * Expected behavior:
 * - Inserts to polls.respondents and polls.responses (for answered questions)
 * - Does NOT trigger visualization update (incomplete grouping data)
 * - Does NOT publish update via visualization-stream service
 */
export const partialResponse: TestAnswer[] = [
  {
    varName: testQuestions[0].varName, // satisfaction
    batteryName: testQuestions[0].batteryName,
    subBattery: testQuestions[0].subBattery ?? "",
    responseIndex: 2, // "Neutral" - valid
  },
  {
    varName: testQuestions[2].varName, // gender
    batteryName: testQuestions[2].batteryName,
    subBattery: testQuestions[2].subBattery ?? "",
    responseIndex: 1, // "Female" - valid
  },
  // NOTE: Missing answers for race and age questions
  // This makes the response incomplete for visualization purposes
];

/**
 * Response with null answer
 * 
 * Answers most questions but omits one (effectively a partial response).
 * The omitted question is one of the grouping variables.
 * 
 * Expected behavior:
 * - Inserts to polls.respondents and polls.responses (for answered questions)
 * - Does NOT trigger visualization update (incomplete grouping data)
 * - Does NOT publish update via visualization-stream service
 */
export const responseWithNull: TestAnswer[] = [
  {
    varName: testQuestions[0].varName, // satisfaction
    batteryName: testQuestions[0].batteryName,
    subBattery: testQuestions[0].subBattery ?? "",
    responseIndex: 4, // "Very satisfied" - valid
  },
  {
    varName: testQuestions[2].varName, // gender
    batteryName: testQuestions[2].batteryName,
    subBattery: testQuestions[2].subBattery ?? "",
    responseIndex: 2, // "Non-binary" - valid
  },
  // NOTE: Omitting race question (would prevent visualization update)
  {
    varName: testQuestions[4].varName, // age
    batteryName: testQuestions[4].batteryName,
    subBattery: testQuestions[4].subBattery ?? "",
    responseIndex: 5, // "65+" - valid
  },
];

/**
 * Multiple valid responses for testing batch updates
 * 
 * An array of 5 valid complete responses with different answer combinations.
 * Useful for testing that multiple responses properly update the visualization.
 */
export const multipleValidResponses: TestAnswer[][] = [
  // Response 1: Very dissatisfied, Male, White, 18-24
  [
    { varName: testQuestions[0].varName, batteryName: testQuestions[0].batteryName, subBattery: testQuestions[0].subBattery ?? "", responseIndex: 0 },
    { varName: testQuestions[2].varName, batteryName: testQuestions[2].batteryName, subBattery: testQuestions[2].subBattery ?? "", responseIndex: 0 },
    { varName: testQuestions[3].varName, batteryName: testQuestions[3].batteryName, subBattery: testQuestions[3].subBattery ?? "", responseIndex: 0 },
    { varName: testQuestions[4].varName, batteryName: testQuestions[4].batteryName, subBattery: testQuestions[4].subBattery ?? "", responseIndex: 0 },
  ],
  // Response 2: Very satisfied, Female, Asian, 25-34
  [
    { varName: testQuestions[0].varName, batteryName: testQuestions[0].batteryName, subBattery: testQuestions[0].subBattery ?? "", responseIndex: 4 },
    { varName: testQuestions[2].varName, batteryName: testQuestions[2].batteryName, subBattery: testQuestions[2].subBattery ?? "", responseIndex: 1 },
    { varName: testQuestions[3].varName, batteryName: testQuestions[3].batteryName, subBattery: testQuestions[3].subBattery ?? "", responseIndex: 2 },
    { varName: testQuestions[4].varName, batteryName: testQuestions[4].batteryName, subBattery: testQuestions[4].subBattery ?? "", responseIndex: 1 },
  ],
  // Response 3: Neutral, Non-binary, Hispanic, 45-54
  [
    { varName: testQuestions[0].varName, batteryName: testQuestions[0].batteryName, subBattery: testQuestions[0].subBattery ?? "", responseIndex: 2 },
    { varName: testQuestions[2].varName, batteryName: testQuestions[2].batteryName, subBattery: testQuestions[2].subBattery ?? "", responseIndex: 2 },
    { varName: testQuestions[3].varName, batteryName: testQuestions[3].batteryName, subBattery: testQuestions[3].subBattery ?? "", responseIndex: 3 },
    { varName: testQuestions[4].varName, batteryName: testQuestions[4].batteryName, subBattery: testQuestions[4].subBattery ?? "", responseIndex: 3 },
  ],
  // Response 4: Somewhat satisfied, Male, Two or more races, 55-64
  [
    { varName: testQuestions[0].varName, batteryName: testQuestions[0].batteryName, subBattery: testQuestions[0].subBattery ?? "", responseIndex: 3 },
    { varName: testQuestions[2].varName, batteryName: testQuestions[2].batteryName, subBattery: testQuestions[2].subBattery ?? "", responseIndex: 0 },
    { varName: testQuestions[3].varName, batteryName: testQuestions[3].batteryName, subBattery: testQuestions[3].subBattery ?? "", responseIndex: 5 },
    { varName: testQuestions[4].varName, batteryName: testQuestions[4].batteryName, subBattery: testQuestions[4].subBattery ?? "", responseIndex: 4 },
  ],
  // Response 5: Somewhat dissatisfied, Female, Black, 65+
  [
    { varName: testQuestions[0].varName, batteryName: testQuestions[0].batteryName, subBattery: testQuestions[0].subBattery ?? "", responseIndex: 1 },
    { varName: testQuestions[2].varName, batteryName: testQuestions[2].batteryName, subBattery: testQuestions[2].subBattery ?? "", responseIndex: 1 },
    { varName: testQuestions[3].varName, batteryName: testQuestions[3].batteryName, subBattery: testQuestions[3].subBattery ?? "", responseIndex: 1 },
    { varName: testQuestions[4].varName, batteryName: testQuestions[4].batteryName, subBattery: testQuestions[4].subBattery ?? "", responseIndex: 5 },
  ],
];
