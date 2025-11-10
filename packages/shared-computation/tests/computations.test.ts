import { describe, test, expect } from "@jest/globals";
import {
  buildRespondentRecords,
  generateSplits,
  populateSplitStatistics,
  computeSplitStatistics,
  updateSplitStatistics,
  createQuestionKey,
} from "../src/computations";
import {
  mockSessionConfig,
  getMockResponses,
  getAllMockResponses,
  getWave2MockResponses,
  getWave2MockResponsesUnweighted,
  getAllWavesMockResponses,
  getAllWavesMockResponsesUnweighted,
  mockWeightQuestion,
  expectedRespondentRecords,
  expectedSplits,
  expectedSplitStatistics,
  expectedUpdateResults,
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

  describe("updateSplitStatistics", () => {
    /**
     * Test data reference for incremental update testing:
     * 
     * WAVE 1 VALID RESPONDENTS (1-5) - Original Data:
     * | ID | Weight | Party      | Age    | Approval            | Anger     |
     * |----|--------|------------|--------|---------------------|-----------|
     * | 1  | 1.5    | Democrat   | 18-34  | Strongly Approve    | irritated |
     * | 2  | 0.8    | Democrat   | 35-54  | Somewhat Approve    | none      |
     * | 3  | 2.0    | Republican | 18-34  | Strongly Disapprove | aflame    |
     * | 4  | 1.2    | Republican | 55+    | Somewhat Disapprove | hot       |
     * | 5  | 1.0    | Democrat   | 55+    | Strongly Approve    | hot       |
     * 
     * WAVE 2 VALID RESPONDENTS (11-15) - New Data for Incremental Update:
     * | ID | Weight | Party      | Age    | Approval            | Anger     |
     * |----|--------|------------|--------|---------------------|-----------|
     * | 11 | 1.3    | Democrat   | 18-34  | Somewhat Approve    | none      |
     * | 12 | 0.9    | Republican | 55+    | Somewhat Disapprove | irritated |
     * | 13 | 1.1    | Democrat   | 35-54  | Strongly Approve    | hot       |
     * | 14 | 1.5    | Republican | 18-34  | Strongly Disapprove | aflame    |
     * | 15 | 0.7    | Democrat   | 55+    | Somewhat Approve    | irritated |
     * 
     * WAVE 2 INVALID RESPONDENTS (16-20) - Should be Filtered Out:
     * | ID | Weight | Party      | Age    | Approval            | Anger     | Issue          |
     * |----|--------|------------|--------|---------------------|-----------|----------------|
     * | 16 | null   | null       | 35-54  | Somewhat Approve    | none      | null responses |
     * | 17 | 1.2    | Republican | null   | Somewhat Disapprove | none      | null response  |
     * | 18 | 0.95   | Democrat   | 18-34  | 5 (invalid)         | irritated | invalid value  |
     * | 19 | 1.6    | MISSING    | 35-54  | Somewhat Approve    | none      | missing entry  |
     * | 20 | 1.4    | Republican | 35-54  | MISSING             | hot       | missing entry  |
     */

    describe("Invalid respondent filtering", () => {
      test("should filter out Wave 2 respondents with null responses", () => {
        /**
         * R16: null weight AND null party (null response elements exist)
         * R17: null age_group (null response element exists)
         * Both should be excluded from the update
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const wave2Responses = getWave2MockResponses();
        const result = updateSplitStatistics(
          wave1Stats.statistics,
          wave1Stats.totalWeight,
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        // Build respondent records from wave 2 to verify filtering
        const wave2Records = buildRespondentRecords(
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );
        const includedIds = wave2Records.map((r) => r.respondentId);

        // R16 and R17 should be filtered out
        expect(includedIds).not.toContain(16);
        expect(includedIds).not.toContain(17);

        // Should only include valid Wave 2 respondents
        expect(includedIds.sort()).toEqual(
          [...expectedUpdateResults.wave2Respondents.includedIds].sort()
        );
      });

      test("should filter out Wave 2 respondents with missing entries", () => {
        /**
         * R19: MISSING party (no response element created)
         * R20: MISSING approval (no response element created)
         * Both should be excluded from the update
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const wave2Responses = getWave2MockResponses();
        const wave2Records = buildRespondentRecords(
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );
        const includedIds = wave2Records.map((r) => r.respondentId);

        // R19 and R20 should be filtered out
        expect(includedIds).not.toContain(19);
        expect(includedIds).not.toContain(20);
      });

      test("should filter out Wave 2 respondents with invalid values", () => {
        /**
         * R18: approval=5, which is not in any valid response group [0,1,2,3]
         * Should be excluded from the update
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const wave2Responses = getWave2MockResponses();
        const wave2Records = buildRespondentRecords(
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );
        const includedIds = wave2Records.map((r) => r.respondentId);

        // R18 should be filtered out
        expect(includedIds).not.toContain(18);
      });

      test("should handle mixed invalid types in Wave 2 data", () => {
        /**
         * Comprehensive test verifying all Wave 2 exclusion types:
         * - Null responses: R16 (null weight & party), R17 (null age_group)
         * - Invalid value: R18 (approval=5)
         * - Missing entries: R19 (MISSING party), R20 (MISSING approval)
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const wave2Responses = getWave2MockResponses();
        const result = updateSplitStatistics(
          wave1Stats.statistics,
          wave1Stats.totalWeight,
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const wave2Records = buildRespondentRecords(
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );
        const includedIds = wave2Records.map((r) => r.respondentId);

        // Verify all invalid respondents are excluded
        for (const excludedId of expectedUpdateResults.wave2Respondents.excludedIds) {
          expect(includedIds).not.toContain(excludedId);
        }

        // Verify only valid respondents are included
        expect(includedIds.sort()).toEqual(
          [...expectedUpdateResults.wave2Respondents.includedIds].sort()
        );
        expect(wave2Records).toHaveLength(
          expectedUpdateResults.wave2Respondents.totalCount
        );
      });
    });

    describe("Edge cases", () => {
      test("should return unchanged statistics when newResponses is empty", () => {
        /**
         * When no new responses are provided, the function should:
         * - Return the original statistics unchanged
         * - Return the original total weight unchanged
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const emptyResponses: typeof wave1Responses = [];
        const result = updateSplitStatistics(
          wave1Stats.statistics,
          wave1Stats.totalWeight,
          emptyResponses,
          mockSessionConfig,
          mockWeightQuestion
        );

        // Statistics should be unchanged
        expect(result.updatedStatistics).toEqual(wave1Stats.statistics);
        expect(result.newTotalWeight).toBe(wave1Stats.totalWeight);
      });

      test("should return original statistics when all new respondents are invalid", () => {
        /**
         * When all Wave 2 respondents are invalid (R16-R20), the function should:
         * - Return the original statistics (no valid new data to add)
         * - Keep the original total weight (no valid new respondents)
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        // Get only the invalid Wave 2 respondents (16-20)
        const allWave2 = getWave2MockResponses();
        const invalidOnly = allWave2.filter((r) =>
          (expectedUpdateResults.wave2Respondents.excludedIds as readonly number[]).includes(r.respondentId)
        );

        const result = updateSplitStatistics(
          wave1Stats.statistics,
          wave1Stats.totalWeight,
          invalidOnly,
          mockSessionConfig,
          mockWeightQuestion
        );

        // Statistics should be unchanged
        expect(result.updatedStatistics).toEqual(wave1Stats.statistics);
        // Total weight should be unchanged (no valid new respondents)
        expect(result.newTotalWeight).toBe(wave1Stats.totalWeight);
      });

      test("should handle splits with no matching new respondents", () => {
        /**
         * Test specific split that receives NO Wave 2 respondents
         * The "Republican × 18-34 OR 35-54" split has R3 in Wave 1 and R14 in Wave 2
         * 
         * We'll create a scenario with only R12 (Republican × 55+) in Wave 2
         * to test a split that gets no new data but still needs proportion updates
         * due to changed total weight denominator
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        // Get only R12 from Wave 2 (Republican × 55+)
        const allWave2 = getWave2MockResponses();
        const onlyR12 = allWave2.filter((r) => r.respondentId === 12);

        const result = updateSplitStatistics(
          wave1Stats.statistics,
          wave1Stats.totalWeight,
          onlyR12,
          mockSessionConfig,
          mockWeightQuestion
        );

        // Find the "Republican × 18-34 OR 35-54" split
        const republicanYoungSplit = result.updatedStatistics.find(
          (s) =>
            s.groups[0].responseGroup?.label === "Republican" &&
            s.groups[1].responseGroup?.label === "18-34 OR 35-54"
        );

        expect(republicanYoungSplit).toBeDefined();

        // This split (Republican × 18-34 OR 35-54) contains only R3 from Wave 1
        // R12 is Republican × 55+, so it doesn't match this split
        // Therefore, this split gets NO new respondents, and its proportions should stay the same
        const approvalQ = republicanYoungSplit!.responseQuestions.find(
          (q) => q.varName === "approval"
        );

        // R3 has Strongly Disapprove with weight 2.0
        // Split totalWeight remains 2.0 (only R3, no new respondents added)
        // Proportion should remain 2.0 / 2.0 = 1.0 (unchanged from Wave 1)
        expect(approvalQ!.responseGroups.expanded[3].proportion).toBeCloseTo(
          2.0 / 2.0,
          10
        );

        // Verify the split's totalWeight didn't change
        expect(republicanYoungSplit!.totalWeight).toBeCloseTo(2.0, 10);
      });

      test("should handle zero weight in original statistics gracefully", () => {
        /**
         * Edge case: starting with empty/zero weight statistics
         * This tests the division by zero protection
         */
        const emptyStats = generateSplits(mockSessionConfig);
        const zeroWeight = 0;

        const wave2Responses = getWave2MockResponses();
        const result = updateSplitStatistics(
          emptyStats,
          zeroWeight,
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        // Should successfully compute with just Wave 2 data
        expect(result.newTotalWeight).toBe(
          expectedUpdateResults.totalWeight.wave2
        );
      });
    });

    describe("Incremental update correctness", () => {
      test("should match full recomputation for weighted statistics", () => {
        /**
         * CORE VERIFICATION: incremental update === full recomputation
         * 
         * Test approach:
         * 1. Compute Wave 1 statistics from R1-R5
         * 2. Update incrementally with Wave 2 R11-R15
         * 3. Compute fresh statistics from combined R1-R5 + R11-R15
         * 4. Verify incremental result === fresh result
         * 
         * This is the most important test - it verifies mathematical correctness
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const wave2Responses = getWave2MockResponses();
        const incrementalResult = updateSplitStatistics(
          wave1Stats.statistics,
          wave1Stats.totalWeight,
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        // Compute from scratch with all waves combined
        const allWavesResponses = getAllWavesMockResponses();
        const fullRecomputeResult = computeSplitStatistics(
          allWavesResponses,
          mockSessionConfig,
          mockWeightQuestion
        );

        // Total weights should match
        expect(incrementalResult.newTotalWeight).toBeCloseTo(
          fullRecomputeResult.totalWeight,
          10
        );

        // Every split's proportions should match
        for (let i = 0; i < incrementalResult.updatedStatistics.length; i++) {
          const incrementalSplit = incrementalResult.updatedStatistics[i];
          const fullSplit = fullRecomputeResult.statistics[i];

          // Check each response question
          for (let j = 0; j < incrementalSplit.responseQuestions.length; j++) {
            const incrementalQ = incrementalSplit.responseQuestions[j];
            const fullQ = fullSplit.responseQuestions[j];

            // Check expanded groups
            for (let k = 0; k < incrementalQ.responseGroups.expanded.length; k++) {
              expect(incrementalQ.responseGroups.expanded[k].proportion).toBeCloseTo(
                fullQ.responseGroups.expanded[k].proportion,
                10
              );
            }

            // Check collapsed groups
            for (let k = 0; k < incrementalQ.responseGroups.collapsed.length; k++) {
              expect(incrementalQ.responseGroups.collapsed[k].proportion).toBeCloseTo(
                fullQ.responseGroups.collapsed[k].proportion,
                10
              );
            }
          }
        }
      });

      test("should match full recomputation for unweighted statistics", () => {
        /**
         * Same as weighted test but without weight question
         * Verifies unweighted (count-based) incremental updates work correctly
         */
        const wave1Responses = getMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig
        );

        const wave2Responses = getWave2MockResponsesUnweighted();
        const incrementalResult = updateSplitStatistics(
          wave1Stats.statistics,
          wave1Stats.totalWeight,
          wave2Responses,
          mockSessionConfig
        );

        const allWavesResponses = getAllWavesMockResponsesUnweighted();
        const fullRecomputeResult = computeSplitStatistics(
          allWavesResponses,
          mockSessionConfig
        );

        // Total counts should match
        expect(incrementalResult.newTotalWeight).toBe(
          fullRecomputeResult.totalWeight
        );

        // Proportions should match
        for (let i = 0; i < incrementalResult.updatedStatistics.length; i++) {
          const incrementalSplit = incrementalResult.updatedStatistics[i];
          const fullSplit = fullRecomputeResult.statistics[i];

          for (let j = 0; j < incrementalSplit.responseQuestions.length; j++) {
            const incrementalQ = incrementalSplit.responseQuestions[j];
            const fullQ = fullSplit.responseQuestions[j];

            for (let k = 0; k < incrementalQ.responseGroups.expanded.length; k++) {
              expect(incrementalQ.responseGroups.expanded[k].proportion).toBeCloseTo(
                fullQ.responseGroups.expanded[k].proportion,
                10
              );
            }
          }
        }
      });

      test("should correctly update splits with single Wave 1 respondent", () => {
        /**
         * Test Case: Democrat × 55+
         * 
         * WAVE 1 STATE:
         * - Respondent: R5
         * - Weight: 1.0
         * - Total Weight: 1.0
         * - Approval: Strongly Approve (0)
         * - Proportions:
         *   * Strongly Approve: 1.0 / 1.0 = 1.0000 (100%)
         *   * Somewhat Approve: 0.0 / 1.0 = 0.0000 (0%)
         * 
         * WAVE 2 INCREMENTAL:
         * - New Respondent: R15
         * - Weight: 0.7
         * - Incremental Weight: 0.7
         * - Approval: Somewhat Approve (1)
         * - New Counts:
         *   * Strongly Approve: 0.0
         *   * Somewhat Approve: 0.7
         * 
         * INCREMENTAL UPDATE CALCULATION:
         * Step 1 - Convert Wave 1 proportions to counts:
         *   Strongly Approve count = 1.0000 × 1.0 = 1.0
         *   Somewhat Approve count = 0.0000 × 1.0 = 0.0
         * 
         * Step 2 - Add Wave 2 incremental counts:
         *   Strongly Approve = 1.0 + 0.0 = 1.0
         *   Somewhat Approve = 0.0 + 0.7 = 0.7
         * 
         * Step 3 - Update total weight:
         *   New Total = 1.0 + 0.7 = 1.7
         * 
         * Step 4 - Recompute proportions:
         *   Strongly Approve = 1.0 / 1.7 = 0.5882 (58.82%)
         *   Somewhat Approve = 0.7 / 1.7 = 0.4118 (41.18%)
         * 
         * EXPECTED RESULT:
         * - Respondents: R5, R15
         * - Total Weight: 1.7
         * - Strongly Approve: 58.82%
         * - Somewhat Approve: 41.18%
         * 
         * This tests edge case where original split has minimal data (n=1)
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const wave2Responses = getWave2MockResponses();
        const result = updateSplitStatistics(
          wave1Stats.statistics,
          wave1Stats.totalWeight,
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const democratOldSplit = result.updatedStatistics.find(
          (s) =>
            s.groups[0].responseGroup?.label === "Democrat" &&
            s.groups[1].responseGroup?.label === "55+"
        );

        expect(democratOldSplit).toBeDefined();

        const expected = expectedUpdateResults.splits["Democrat × 55+"];
        const approvalQ = democratOldSplit!.responseQuestions.find(
          (q) => q.varName === "approval"
        );

        // Verify updated proportions match expected
        expect(approvalQ!.responseGroups.expanded[0].proportion).toBeCloseTo(
          expected.combined.approval.expanded["Strongly Approve"],
          10
        );
        expect(approvalQ!.responseGroups.expanded[1].proportion).toBeCloseTo(
          expected.combined.approval.expanded["Somewhat Approve"],
          10
        );
      });

      test("should correctly update splits with multiple Wave 1 respondents", () => {
        /**
         * Test Case: Democrat × 18-34 OR 35-54
         * 
         * WAVE 1 STATE:
         * - Respondents: R1, R2
         * - Weights: 1.5, 0.8
         * - Total Weight: 2.3
         * - Approvals: Strongly Approve (R1), Somewhat Approve (R2)
         * - Proportions:
         *   * Strongly Approve: 1.5 / 2.3 = 0.6522 (65.22%)
         *   * Somewhat Approve: 0.8 / 2.3 = 0.3478 (34.78%)
         *   * Somewhat Disapprove: 0.0 / 2.3 = 0.0000 (0%)
         *   * Strongly Disapprove: 0.0 / 2.3 = 0.0000 (0%)
         * 
         * WAVE 2 INCREMENTAL:
         * - New Respondents: R11, R13
         * - Weights: 1.3, 1.1
         * - Incremental Weight: 2.4
         * - Approvals: Somewhat Approve (R11), Strongly Approve (R13)
         * - New Counts:
         *   * Strongly Approve: 1.1 (from R13)
         *   * Somewhat Approve: 1.3 (from R11)
         *   * Somewhat Disapprove: 0.0
         *   * Strongly Disapprove: 0.0
         * 
         * INCREMENTAL UPDATE CALCULATION:
         * Step 1 - Convert Wave 1 proportions to counts:
         *   Strongly Approve = 0.6522 × 2.3 = 1.5
         *   Somewhat Approve = 0.3478 × 2.3 = 0.8
         *   Somewhat Disapprove = 0.0000 × 2.3 = 0.0
         *   Strongly Disapprove = 0.0000 × 2.3 = 0.0
         * 
         * Step 2 - Add Wave 2 incremental counts:
         *   Strongly Approve = 1.5 + 1.1 = 2.6
         *   Somewhat Approve = 0.8 + 1.3 = 2.1
         *   Somewhat Disapprove = 0.0 + 0.0 = 0.0
         *   Strongly Disapprove = 0.0 + 0.0 = 0.0
         * 
         * Step 3 - Update total weight:
         *   New Total = 2.3 + 2.4 = 4.7
         * 
         * Step 4 - Recompute proportions:
         *   Strongly Approve = 2.6 / 4.7 = 0.5532 (55.32%)
         *   Somewhat Approve = 2.1 / 4.7 = 0.4468 (44.68%)
         *   Somewhat Disapprove = 0.0 / 4.7 = 0.0000 (0%)
         *   Strongly Disapprove = 0.0 / 4.7 = 0.0000 (0%)
         * 
         * EXPECTED RESULT:
         * - Respondents: R1, R2, R11, R13
         * - Total Weight: 4.7
         * - Strongly Approve: 55.32%
         * - Somewhat Approve: 44.68%
         * - Somewhat Disapprove: 0%
         * - Strongly Disapprove: 0%
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const wave2Responses = getWave2MockResponses();
        const result = updateSplitStatistics(
          wave1Stats.statistics,
          wave1Stats.totalWeight,
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const democratYoungSplit = result.updatedStatistics.find(
          (s) =>
            s.groups[0].responseGroup?.label === "Democrat" &&
            s.groups[1].responseGroup?.label === "18-34 OR 35-54"
        );

        expect(democratYoungSplit).toBeDefined();

        const expected = expectedUpdateResults.splits["Democrat × 18-34 OR 35-54"];
        const approvalQ = democratYoungSplit!.responseQuestions.find(
          (q) => q.varName === "approval"
        );
        const angerQ = democratYoungSplit!.responseQuestions.find(
          (q) => q.varName === "anger"
        );

        // Verify approval proportions
        expect(approvalQ!.responseGroups.expanded[0].proportion).toBeCloseTo(
          expected.combined.approval.expanded["Strongly Approve"],
          10
        );
        expect(approvalQ!.responseGroups.expanded[1].proportion).toBeCloseTo(
          expected.combined.approval.expanded["Somewhat Approve"],
          10
        );

        // Verify anger proportions
        expect(angerQ!.responseGroups.expanded[0].proportion).toBeCloseTo(
          expected.combined.anger.expanded.none,
          10
        );
        expect(angerQ!.responseGroups.expanded[1].proportion).toBeCloseTo(
          expected.combined.anger.expanded.irritated,
          10
        );
        expect(angerQ!.responseGroups.expanded[2].proportion).toBeCloseTo(
          expected.combined.anger.expanded.hot,
          10
        );
      });

      test("should correctly update the 'all groups' split", () => {
        /**
         * Test Case: (all parties) × (all ages)
         * 
         * WAVE 1 STATE:
         * - Respondents: R1, R2, R3, R4, R5
         * - Weights: 1.5, 0.8, 2.0, 1.2, 1.0
         * - Total Weight: 6.5
         * - Approvals: SA(R1, R5), SwA(R2), SwD(R4), SD(R3)
         *   where SA=Strongly Approve, SwA=Somewhat Approve,
         *         SwD=Somewhat Disapprove, SD=Strongly Disapprove
         * - Proportions:
         *   * Strongly Approve: (1.5 + 1.0) / 6.5 = 2.5 / 6.5 = 0.3846 (38.46%)
         *   * Somewhat Approve: 0.8 / 6.5 = 0.1231 (12.31%)
         *   * Somewhat Disapprove: 1.2 / 6.5 = 0.1846 (18.46%)
         *   * Strongly Disapprove: 2.0 / 6.5 = 0.3077 (30.77%)
         * 
         * WAVE 2 INCREMENTAL:
         * - New Respondents: R11, R12, R13, R14, R15
         * - Weights: 1.3, 0.9, 1.1, 1.5, 0.7
         * - Incremental Weight: 5.5
         * - Approvals: SwA(R11, R15), SwD(R12), SA(R13), SD(R14)
         * - New Counts:
         *   * Strongly Approve: 1.1 (from R13)
         *   * Somewhat Approve: 1.3 + 0.7 = 2.0 (from R11, R15)
         *   * Somewhat Disapprove: 0.9 (from R12)
         *   * Strongly Disapprove: 1.5 (from R14)
         * 
         * INCREMENTAL UPDATE CALCULATION:
         * Step 1 - Convert Wave 1 proportions to counts:
         *   Strongly Approve = 0.3846 × 6.5 = 2.5
         *   Somewhat Approve = 0.1231 × 6.5 = 0.8
         *   Somewhat Disapprove = 0.1846 × 6.5 = 1.2
         *   Strongly Disapprove = 0.3077 × 6.5 = 2.0
         * 
         * Step 2 - Add Wave 2 incremental counts:
         *   Strongly Approve = 2.5 + 1.1 = 3.6
         *   Somewhat Approve = 0.8 + 2.0 = 2.8
         *   Somewhat Disapprove = 1.2 + 0.9 = 2.1
         *   Strongly Disapprove = 2.0 + 1.5 = 3.5
         * 
         * Step 3 - Update total weight:
         *   New Total = 6.5 + 5.5 = 12.0
         * 
         * Step 4 - Recompute proportions:
         *   Strongly Approve = 3.6 / 12.0 = 0.3000 (30.00%)
         *   Somewhat Approve = 2.8 / 12.0 = 0.2333 (23.33%)
         *   Somewhat Disapprove = 2.1 / 12.0 = 0.1750 (17.50%)
         *   Strongly Disapprove = 3.5 / 12.0 = 0.2917 (29.17%)
         * 
         * EXPECTED RESULT:
         * - Respondents: R1, R2, R3, R4, R5, R11, R12, R13, R14, R15
         * - Total Weight: 12.0
         * - Strongly Approve: 30.00%
         * - Somewhat Approve: 23.33%
         * - Somewhat Disapprove: 17.50%
         * - Strongly Disapprove: 29.17%
         * 
         * This split includes ALL valid respondents from both waves,
         * making it the broadest possible aggregation.
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const wave2Responses = getWave2MockResponses();
        const result = updateSplitStatistics(
          wave1Stats.statistics,
          wave1Stats.totalWeight,
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const allGroupsSplit = result.updatedStatistics.find(
          (s) =>
            s.groups[0].responseGroup === null &&
            s.groups[1].responseGroup === null
        );

        expect(allGroupsSplit).toBeDefined();

        const expected = expectedUpdateResults.splits["(all parties) × (all ages)"];
        const approvalQ = allGroupsSplit!.responseQuestions.find(
          (q) => q.varName === "approval"
        );

        // Verify all approval proportions
        expect(approvalQ!.responseGroups.expanded[0].proportion).toBeCloseTo(
          expected.combined.approval.expanded["Strongly Approve"],
          10
        );
        expect(approvalQ!.responseGroups.expanded[1].proportion).toBeCloseTo(
          expected.combined.approval.expanded["Somewhat Approve"],
          10
        );
        expect(approvalQ!.responseGroups.expanded[2].proportion).toBeCloseTo(
          expected.combined.approval.expanded["Somewhat Disapprove"],
          10
        );
        expect(approvalQ!.responseGroups.expanded[3].proportion).toBeCloseTo(
          expected.combined.approval.expanded["Strongly Disapprove"],
          10
        );

        // Verify collapsed groups
        expect(approvalQ!.responseGroups.collapsed[0].proportion).toBeCloseTo(
          expected.combined.approval.collapsed["Approve"],
          10
        );
        expect(approvalQ!.responseGroups.collapsed[1].proportion).toBeCloseTo(
          expected.combined.approval.collapsed["Disapprove"],
          10
        );
      });
    });

    describe("Proportion math verification", () => {
      test("should correctly convert proportions back to counts", () => {
        /**
         * Verify: existing_count = existing_proportion × existingTotalWeight
         * 
         * Example from Democrat × 18-34 OR 35-54:
         * - Wave 1: proportion ≈ 0.6522, totalWeight = 2.3
         * - Should convert to: count = 1.5 (approximately)
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const democratYoungSplit = wave1Stats.statistics.find(
          (s) =>
            s.groups[0].responseGroup?.label === "Democrat" &&
            s.groups[1].responseGroup?.label === "18-34 OR 35-54"
        );

        const approvalQ = democratYoungSplit!.responseQuestions.find(
          (q) => q.varName === "approval"
        );

        // Get Wave 1 proportion for "Strongly Approve"
        const wave1Proportion = approvalQ!.responseGroups.expanded[0].proportion;
        const wave1TotalWeight = 2.3; // R1 + R2

        // Convert to count
        const convertedCount = wave1Proportion * wave1TotalWeight;

        // Should be approximately 1.5 (R1's weight)
        expect(convertedCount).toBeCloseTo(1.5, 10);
      });

      test("should correctly add incremental counts", () => {
        /**
         * Verify: new_count = existing_count + incremental_count
         * 
         * Using updateSplitStatistics and comparing to expected results
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const wave2Responses = getWave2MockResponses();
        const result = updateSplitStatistics(
          wave1Stats.statistics,
          wave1Stats.totalWeight,
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        // The update process should add Wave 2 counts to Wave 1 counts
        // Verify by comparing to full recomputation
        const allWavesResponses = getAllWavesMockResponses();
        const fullResult = computeSplitStatistics(
          allWavesResponses,
          mockSessionConfig,
          mockWeightQuestion
        );

        // Proportions should match (if count addition is correct)
        const incrementalSplit = result.updatedStatistics[0];
        const fullSplit = fullResult.statistics[0];

        expect(
          incrementalSplit.responseQuestions[0].responseGroups.expanded[0].proportion
        ).toBeCloseTo(
          fullSplit.responseQuestions[0].responseGroups.expanded[0].proportion,
          10
        );
      });

      test("should correctly recompute proportions with new total", () => {
        /**
         * Verify: new_proportion = new_count / newTotalWeight
         * 
         * Example: Democrat × 18-34 OR 35-54
         * - Combined count for "Strongly Approve" = 2.6
         * - New total weight = 4.7
         * - New proportion = 2.6/4.7 ≈ 0.5532
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const wave2Responses = getWave2MockResponses();
        const result = updateSplitStatistics(
          wave1Stats.statistics,
          wave1Stats.totalWeight,
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const democratYoungSplit = result.updatedStatistics.find(
          (s) =>
            s.groups[0].responseGroup?.label === "Democrat" &&
            s.groups[1].responseGroup?.label === "18-34 OR 35-54"
        );

        const approvalQ = democratYoungSplit!.responseQuestions.find(
          (q) => q.varName === "approval"
        );

        const expected = expectedUpdateResults.splits["Democrat × 18-34 OR 35-54"];

        // Verify the recomputed proportion
        expect(approvalQ!.responseGroups.expanded[0].proportion).toBeCloseTo(
          expected.combined.approval.expanded["Strongly Approve"],
          10
        );
      });

      test("should maintain sum of proportions ≈ 1.0 for mutually exclusive groups", () => {
        /**
         * For expanded approval groups (mutually exclusive):
         * sum of all proportions should ≈ 1.0 (within floating point tolerance)
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const wave2Responses = getWave2MockResponses();
        const result = updateSplitStatistics(
          wave1Stats.statistics,
          wave1Stats.totalWeight,
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        // Check each split
        for (const split of result.updatedStatistics) {
          for (const responseQ of split.responseQuestions) {
            // Sum expanded groups (mutually exclusive)
            const expandedSum = responseQ.responseGroups.expanded.reduce(
              (sum, group) => sum + group.proportion,
              0
            );

            // Should be very close to 1.0
            expect(expandedSum).toBeCloseTo(1.0, 5);
          }
        }
      });
    });

    describe("Total weight tracking", () => {
      test("should correctly sum weights from new valid respondents", () => {
        /**
         * Wave 2 valid: R11-R15
         * Weights: 1.3 + 0.9 + 1.1 + 1.5 + 0.7 = 5.5
         */
        const wave2Responses = getWave2MockResponses();
        const wave2Records = buildRespondentRecords(
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const wave2TotalWeight = wave2Records.reduce(
          (sum, record) => sum + record.weight,
          0
        );

        expect(wave2TotalWeight).toBeCloseTo(
          expectedUpdateResults.totalWeight.wave2,
          10
        );
      });

      test("should correctly compute updated total weight", () => {
        /**
         * Wave 1: 6.5 (R1-R5)
         * Wave 2: 5.5 (R11-R15)
         * Combined: 12.0
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const wave2Responses = getWave2MockResponses();
        const result = updateSplitStatistics(
          wave1Stats.statistics,
          wave1Stats.totalWeight,
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        expect(result.newTotalWeight).toBeCloseTo(
          expectedUpdateResults.totalWeight.combined,
          10
        );
      });

      test("should not include weights from filtered respondents", () => {
        /**
         * R16-R20 all invalid, their weights should not affect total
         */
        const wave1Responses = getAllMockResponses();
        const wave1Stats = computeSplitStatistics(
          wave1Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        const wave2Responses = getWave2MockResponses();
        const result = updateSplitStatistics(
          wave1Stats.statistics,
          wave1Stats.totalWeight,
          wave2Responses,
          mockSessionConfig,
          mockWeightQuestion
        );

        // Total should be 6.5 + 5.5 = 12.0 (not including invalid respondents)
        expect(result.newTotalWeight).toBeCloseTo(12.0, 10);

        // Verify that if we had included invalid weights, it would be different
        // Invalid respondents theoretical weights: null, 1.2, 0.95, 1.6, 1.4
        // If they were included, total would be higher
        // This test confirms they are NOT included
      });
    });
  });
});
