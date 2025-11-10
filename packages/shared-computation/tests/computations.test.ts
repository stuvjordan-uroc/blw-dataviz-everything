import { describe, test, expect } from "@jest/globals";
import {
  buildRespondentRecords,
  generateSplits,
  populateSplitStatistics,
  createQuestionKey,
} from "../src/computations";
import {
  mockSessionConfig,
  getMockResponses,
  getAllMockResponses,
  mockWeightQuestion,
  expectedRespondentRecords,
  expectedSplits,
  expectedSplitStatistics,
} from "./fixtures/mock-data";

describe("computations", () => {
  describe("buildRespondentRecords", () => {
    /**
     * Test data reference (from mock-responses.csv):
     * 
     * VALID RESPONDENTS:
     * | ID | Weight | Party      | Age    | Approval            | Anger     |
     * |----|--------|------------|--------|---------------------|-----------|
     * | 1  | 1.5    | Democrat   | 18-34  | Strongly Approve    | irritated |
     * | 2  | 0.8    | Democrat   | 35-54  | Somewhat Approve    | none      |
     * | 3  | 2.0    | Republican | 18-34  | Strongly Disapprove | aflame    |
     * | 4  | 1.2    | Republican | 55+    | Somewhat Disapprove | hot       |
     * | 5  | 1.0    | Democrat   | 55+    | Strongly Approve    | hot       |
     * 
     * INVALID RESPONDENTS (null response elements exist):
     * | ID | Weight | Party      | Age    | Approval            | Anger     | Issue          |
     * |----|--------|------------|--------|---------------------|-----------|----------------|
     * | 6  | null   | null       | 18-34  | Somewhat Approve    | irritated | null responses |
     * | 7  | 1.1    | Democrat   | null   | Somewhat Approve    | none      | null response  |
     * | 8  | 0.9    | Republican | 35-54  | 5 (invalid)         | irritated | invalid value  |
     * 
     * INVALID RESPONDENTS (no response element created - MISSING):
     * | ID | Weight | Party      | Age    | Approval            | Anger     | Issue          |
     * |----|--------|------------|--------|---------------------|-----------|----------------|
     * | 9  | 1.4    | MISSING    | 35-54  | Somewhat Approve    | none      | missing entry  |
     * | 10 | 1.5    | Democrat   | 18-34  | MISSING             | irritated | missing entry  |
     */

    test("should filter out respondents with null response to a non-weight question", () => {
      const responses = getMockResponses(); // Excludes weight
      const records = buildRespondentRecords(responses, mockSessionConfig);

      // Respondent 7 has null age_group (response element exists with null value)
      const respondentIds = records.map((r) => r.respondentId);
      expect(respondentIds).not.toContain(7);

      // Should include all valid respondents
      expect(respondentIds).toEqual(
        expect.arrayContaining(expectedRespondentRecords.withoutWeight.includedIds as unknown as number[])
      );
      expect(records).toHaveLength(
        expectedRespondentRecords.withoutWeight.totalCount
      );
    });

    test("should filter out respondents with missing entry for a non-weight question", () => {
      /**
       * Testing MISSING entries (no ResponseData element created):
       * - Respondent 9: MISSING party (grouping question)
       * - Respondent 10: MISSING approval (response question)
       */
      const responses = getMockResponses(); // Excludes weight
      const records = buildRespondentRecords(responses, mockSessionConfig);

      const respondentIds = records.map((r) => r.respondentId);

      // Respondent 9 has no party element at all (MISSING in CSV)
      expect(respondentIds).not.toContain(9);

      // Respondent 10 has no approval element at all (MISSING in CSV)
      expect(respondentIds).not.toContain(10);

      // Should include only valid respondents
      expect(respondentIds).toEqual(
        expect.arrayContaining(expectedRespondentRecords.withoutWeight.includedIds as unknown as number[])
      );
      expect(records).toHaveLength(
        expectedRespondentRecords.withoutWeight.totalCount
      );
    });

    test("should filter out respondents with an invalid response to a non-weight question", () => {
      /**
       * Respondent 8 has approval=5, which is not in any valid response group [0,1,2,3]
       * This tests that invalid numeric values are properly filtered
       */
      const responses = getMockResponses();
      const records = buildRespondentRecords(responses, mockSessionConfig);

      // Respondent 8 has approval=5, which is not in any valid response group
      const respondentIds = records.map((r) => r.respondentId);
      expect(respondentIds).not.toContain(8);

      expect(records).toHaveLength(
        expectedRespondentRecords.withoutWeight.totalCount
      );
    });

    test("should filter out respondents with null weight when weightQuestion is defined", () => {
      /**
       * Respondent 6 has null weight (response element exists with null value)
       * When weight question is defined, null weight should exclude the respondent
       */
      const responses = getAllMockResponses(); // Includes weight
      const records = buildRespondentRecords(
        responses,
        mockSessionConfig,
        mockWeightQuestion
      );

      // Respondent 6 has null weight element
      const respondentIds = records.map((r) => r.respondentId);
      expect(respondentIds).not.toContain(6);

      expect(records).toHaveLength(
        expectedRespondentRecords.withWeight.totalCount
      );
    });

    test("should handle both null responses and missing entries correctly", () => {
      /**
       * Comprehensive test verifying all exclusion types:
       * - Null responses: 6 (null weight & party), 7 (null age_group)
       * - Invalid value: 8 (approval=5)
       * - Missing entries: 9 (MISSING party), 10 (MISSING approval)
       */
      const responses = getAllMockResponses();
      const records = buildRespondentRecords(
        responses,
        mockSessionConfig,
        mockWeightQuestion
      );

      const respondentIds = records.map((r) => r.respondentId);

      // Verify all invalid respondents are excluded
      expect(respondentIds).not.toContain(6);  // null weight & party
      expect(respondentIds).not.toContain(7);  // null age_group
      expect(respondentIds).not.toContain(8);  // invalid approval value
      expect(respondentIds).not.toContain(9);  // MISSING party entry
      expect(respondentIds).not.toContain(10); // MISSING approval entry

      // Verify only valid respondents are included
      expect(respondentIds.sort()).toEqual([1, 2, 3, 4, 5]);
      expect(records).toHaveLength(5);
    });

    test("should verify excluded respondents match expected results", () => {
      /**
       * Ensures that expectedRespondentRecords accurately reflects exclusions
       */
      const responses = getAllMockResponses();
      const records = buildRespondentRecords(
        responses,
        mockSessionConfig,
        mockWeightQuestion
      );

      // Verify excluded IDs
      const includedIds = records.map((r) => r.respondentId).sort();
      const expectedIncluded = [...expectedRespondentRecords.withWeight.includedIds].sort();
      const expectedExcluded = [...expectedRespondentRecords.withWeight.excludedIds];

      expect(includedIds).toEqual(expectedIncluded);

      // Verify none of the excluded IDs are present
      for (const excludedId of expectedExcluded) {
        expect(includedIds).not.toContain(excludedId);
      }

      // Verify only valid respondents are included
      expect(records).toHaveLength(
        expectedRespondentRecords.withWeight.totalCount
      );
    });

    test("should include all valid respondents when weightQuestion is undefined", () => {
      const responses = getMockResponses();
      const records = buildRespondentRecords(responses, mockSessionConfig);

      // Should include exactly the expected valid respondents
      const respondentIds = records.map((r) => r.respondentId).sort();
      expect(respondentIds).toEqual([...expectedRespondentRecords.withoutWeight.includedIds].sort());
      expect(records).toHaveLength(
        expectedRespondentRecords.withoutWeight.totalCount
      );

      // Each valid respondent should have all required responses
      for (const record of records) {
        const partyKey = createQuestionKey(mockSessionConfig.groupingQuestions[0]);
        const ageKey = createQuestionKey(mockSessionConfig.groupingQuestions[1]);
        const approvalKey = createQuestionKey(mockSessionConfig.responseQuestions[0]);
        const angerKey = createQuestionKey(mockSessionConfig.responseQuestions[1]);

        expect(record.responses.get(partyKey)).not.toBeNull();
        expect(record.responses.get(ageKey)).not.toBeNull();
        expect(record.responses.get(approvalKey)).not.toBeNull();
        expect(record.responses.get(angerKey)).not.toBeNull();
        expect(record.weight).toBe(1.0); // Default weight when no weight question
      }
    });

    test("should include all valid respondents when weightQuestion is defined", () => {
      const responses = getAllMockResponses();
      const records = buildRespondentRecords(
        responses,
        mockSessionConfig,
        mockWeightQuestion
      );

      // Should include exactly the expected valid respondents
      const respondentIds = records.map((r) => r.respondentId).sort();
      expect(respondentIds).toEqual([...expectedRespondentRecords.withWeight.includedIds].sort());
      expect(records).toHaveLength(
        expectedRespondentRecords.withWeight.totalCount
      );

      // Verify weights are correctly assigned
      // Expected weights: R1=1.5, R2=0.8, R3=2.0, R4=1.2, R5=1.0
      const expectedWeights: Record<number, number> = {
        1: 1.5,
        2: 0.8,
        3: 2.0,
        4: 1.2,
        5: 1.0,
      };

      for (const record of records) {
        expect(record.weight).toBe(expectedWeights[record.respondentId]);
      }
    });
  });

  describe("generateSplits", () => {
    /**
     * mockSessionConfig has:
     * - Party: [Democrat, Republican] (2 groups) + null = 3 options
     * - Age: [18-34 OR 35-54, 55+] (2 groups) + null = 3 options
     * 
     * Cartesian product: 3 × 3 = 9 total splits
     * 
     * Expected splits:
     * 1. Democrat × 18-34 OR 35-54
     * 2. Democrat × 55+
     * 3. Democrat × (all ages)
     * 4. Republican × 18-34 OR 35-54
     * 5. Republican × 55+
     * 6. Republican × (all ages)
     * 7. (all parties) × 18-34 OR 35-54
     * 8. (all parties) × 55+
     * 9. (all parties) × (all ages)
     */

    test("should produce the correct array of splits", () => {
      const splits = generateSplits(mockSessionConfig);

      // Should generate exactly 9 splits
      expect(splits).toHaveLength(expectedSplits.totalCount);

      // Each split should have 2 groups (one for party, one for age)
      for (const split of splits) {
        expect(split.groups).toHaveLength(2);

        // First group should be party question
        expect(split.groups[0].question.varName).toBe("party");

        // Second group should be age_group question
        expect(split.groups[1].question.varName).toBe("age_group");

        // responseQuestions should be empty (not yet populated)
        expect(split.responseQuestions).toEqual([]);
      }

      // Verify we have the expected combinations
      // Check for presence of key splits
      const hasAllPartiesAllAges = splits.some(
        (s) => s.groups[0].responseGroup === null && s.groups[1].responseGroup === null
      );
      expect(hasAllPartiesAllAges).toBe(true);

      const hasDemocrat18to54 = splits.some(
        (s) =>
          s.groups[0].responseGroup?.label === "Democrat" &&
          s.groups[1].responseGroup?.label === "18-34 OR 35-54"
      );
      expect(hasDemocrat18to54).toBe(true);

      const hasRepublican55Plus = splits.some(
        (s) =>
          s.groups[0].responseGroup?.label === "Republican" &&
          s.groups[1].responseGroup?.label === "55+"
      );
      expect(hasRepublican55Plus).toBe(true);
    });
  });

  describe("populateSplitStatistics", () => {
    /**
     * Valid respondent data (used for all calculations):
     * | ID | Weight | Party      | Age    | Approval            | Anger     |
     * |----|--------|------------|--------|---------------------|-----------|
     * | 1  | 1.5    | Democrat   | 18-34  | Strongly Approve    | irritated |
     * | 2  | 0.8    | Democrat   | 35-54  | Somewhat Approve    | none      |
     * | 3  | 2.0    | Republican | 18-34  | Strongly Disapprove | aflame    |
     * | 4  | 1.2    | Republican | 55+    | Somewhat Disapprove | hot       |
     * | 5  | 1.0    | Democrat   | 55+    | Strongly Approve    | hot       |
     */

    test("should compute the correct proportions on any given split when weightQuestion is undefined", () => {
      const responses = getMockResponses();
      const records = buildRespondentRecords(responses, mockSessionConfig);
      const splits = generateSplits(mockSessionConfig);

      /**
       * Test Case: Democrat × 18-34 OR 35-54
       * Matching respondents: 1, 2
       * 
       * UNWEIGHTED calculation:
       * - n = 2
       * - Approval:
       *   - Strongly Approve: 1/2 = 0.5 (R1)
       *   - Somewhat Approve: 1/2 = 0.5 (R2)
       *   - Approve (collapsed): 2/2 = 1.0 (R1+R2)
       * - Anger:
       *   - none: 1/2 = 0.5 (R2)
       *   - irritated: 1/2 = 0.5 (R1)
       *   - some (collapsed): 2/2 = 1.0 (R1+R2)
       */
      const democrat18to54Split = splits.find(
        (s) =>
          s.groups[0].responseGroup?.label === "Democrat" &&
          s.groups[1].responseGroup?.label === "18-34 OR 35-54"
      );
      expect(democrat18to54Split).toBeDefined();

      const populatedSplit = populateSplitStatistics(
        democrat18to54Split!,
        records,
        mockSessionConfig
      );

      // Verify approval question statistics
      const approvalQuestion = populatedSplit.responseQuestions.find(
        (q) => q.varName === "approval"
      );
      expect(approvalQuestion).toBeDefined();

      const expected = expectedSplitStatistics["Democrat × 18-34 OR 35-54"].unweighted;

      // Check expanded approval proportions
      expect(approvalQuestion!.responseGroups.expanded[0].proportion).toBeCloseTo(
        expected.approval.expanded["Strongly Approve"], 10
      );
      expect(approvalQuestion!.responseGroups.expanded[1].proportion).toBeCloseTo(
        expected.approval.expanded["Somewhat Approve"], 10
      );

      // Check collapsed approval proportions
      expect(approvalQuestion!.responseGroups.collapsed[0].proportion).toBeCloseTo(
        expected.approval.collapsed["Approve"], 10
      );

      // Verify anger question statistics
      const angerQuestion = populatedSplit.responseQuestions.find(
        (q) => q.varName === "anger"
      );
      expect(angerQuestion).toBeDefined();

      // Check expanded anger proportions
      expect(angerQuestion!.responseGroups.expanded[0].proportion).toBeCloseTo(
        expected.anger.expanded.none, 10
      );
      expect(angerQuestion!.responseGroups.expanded[1].proportion).toBeCloseTo(
        expected.anger.expanded.irritated, 10
      );

      // Check collapsed anger proportions
      expect(angerQuestion!.responseGroups.collapsed[0].proportion).toBeCloseTo(
        expected.anger.collapsed.some, 10
      );
    });

    test("should compute the correct proportions on any given split when weightQuestion is defined", () => {
      const responses = getAllMockResponses();
      const records = buildRespondentRecords(
        responses,
        mockSessionConfig,
        mockWeightQuestion
      );
      const splits = generateSplits(mockSessionConfig);

      /**
       * Test Case: Democrat × 18-34 OR 35-54
       * Matching respondents: 1, 2
       * Weights: R1=1.5, R2=0.8
       * 
       * WEIGHTED calculation:
       * - effectiveN = 1.5 + 0.8 = 2.3
       * - Approval:
       *   - Strongly Approve: 1.5/2.3 ≈ 0.6522 (R1)
       *   - Somewhat Approve: 0.8/2.3 ≈ 0.3478 (R2)
       *   - Approve (collapsed): 2.3/2.3 = 1.0 (R1+R2)
       * - Anger:
       *   - none: 0.8/2.3 ≈ 0.3478 (R2)
       *   - irritated: 1.5/2.3 ≈ 0.6522 (R1)
       *   - some (collapsed): 2.3/2.3 = 1.0 (R1+R2)
       */
      const democrat18to54Split = splits.find(
        (s) =>
          s.groups[0].responseGroup?.label === "Democrat" &&
          s.groups[1].responseGroup?.label === "18-34 OR 35-54"
      );
      expect(democrat18to54Split).toBeDefined();

      const populatedSplit = populateSplitStatistics(
        democrat18to54Split!,
        records,
        mockSessionConfig,
        mockWeightQuestion
      );

      const expected = expectedSplitStatistics["Democrat × 18-34 OR 35-54"].weighted;

      // Verify approval question statistics
      const approvalQuestion = populatedSplit.responseQuestions.find(
        (q) => q.varName === "approval"
      );
      expect(approvalQuestion).toBeDefined();

      // Check expanded approval proportions
      expect(approvalQuestion!.responseGroups.expanded[0].proportion).toBeCloseTo(
        expected.approval.expanded["Strongly Approve"], 10
      );
      expect(approvalQuestion!.responseGroups.expanded[1].proportion).toBeCloseTo(
        expected.approval.expanded["Somewhat Approve"], 10
      );

      // Check collapsed approval proportions
      expect(approvalQuestion!.responseGroups.collapsed[0].proportion).toBeCloseTo(
        expected.approval.collapsed["Approve"], 10
      );

      // Verify anger question statistics
      const angerQuestion = populatedSplit.responseQuestions.find(
        (q) => q.varName === "anger"
      );
      expect(angerQuestion).toBeDefined();

      // Check expanded anger proportions
      expect(angerQuestion!.responseGroups.expanded[0].proportion).toBeCloseTo(
        expected.anger.expanded.none, 10
      );
      expect(angerQuestion!.responseGroups.expanded[1].proportion).toBeCloseTo(
        expected.anger.expanded.irritated, 10
      );

      // Check collapsed anger proportions
      expect(angerQuestion!.responseGroups.collapsed[0].proportion).toBeCloseTo(
        expected.anger.collapsed.some, 10
      );
    });
  });
});
