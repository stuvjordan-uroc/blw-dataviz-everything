import { ResponseTransformer, RespondentResponses, TransformedResponse } from '../../src/responses/response-transformer.service';
import type { SegmentVizConfig, SplitWithSegmentGroup } from 'shared-types';
import type { VisualizationLookupMaps } from 'shared-schemas';

/**
 * Unit Tests: ResponseTransformer
 * 
 * Tests the main public method transformResponsesForVisualization with realistic data including:
 * - Respondents with complete answers
 * - Respondents who skip questions
 * - Respondents with answers outside defined response groups
 * - Various grouping profiles mapping to different basis splits
 */
describe('ResponseTransformer - transformResponsesForVisualization', () => {
  let transformer: ResponseTransformer;

  // Test fixture: Questions
  const AGE_QUESTION = { varName: 'age', batteryName: 'demographics', subBattery: 'main' };
  const GENDER_QUESTION = { varName: 'gender', batteryName: 'demographics', subBattery: 'main' };
  const SATISFACTION_QUESTION = { varName: 'satisfaction', batteryName: 'feedback', subBattery: 'main' };

  // Test fixture: Visualization config
  // Response question: satisfaction (0=Poor, 1=Fair, 2=Good, 3=Excellent)
  // Grouping by age (0=18-29, 1=30-44, 2=45+) and gender (0=Male, 1=Female, 2=Other)
  const createTestVisualization = (): SegmentVizConfig => ({
    responseQuestion: {
      question: SATISFACTION_QUESTION,
      responseGroups: {
        expanded: [
          { label: 'Poor', values: [0] },
          { label: 'Fair', values: [1] },
          { label: 'Good', values: [2] },
          { label: 'Excellent', values: [3] },
        ],
        collapsed: [
          { label: 'Negative', values: [0, 1] },
          { label: 'Positive', values: [2, 3] },
        ],
      },
    },
    groupingQuestions: {
      x: [
        {
          question: AGE_QUESTION,
          responseGroups: [
            { label: '18-29', values: [0] },
            { label: '30-44', values: [1] },
            { label: '45+', values: [2] },
          ],
        },
      ],
      y: [
        {
          question: GENDER_QUESTION,
          responseGroups: [
            { label: 'Male', values: [0] },
            { label: 'Female', values: [1] },
            { label: 'Other', values: [2] },
          ],
        },
      ],
    },
    minGroupAvailableWidth: 100,
    minGroupHeight: 80,
    groupGapX: 20,
    groupGapY: 20,
    responseGap: 5,
    baseSegmentWidth: 10,
  });

  // Test fixture: Lookup maps (pre-computed at session creation)
  // satisfaction question maps: Poor->0, Fair->1, Good->2, Excellent->3
  // Profile format: "ageGroup:genderGroup" maps to basis split index
  const createTestLookupMaps = (): VisualizationLookupMaps => ({
    responseIndexToGroupIndex: [0, 1, 2, 3], // Direct mapping for satisfaction
    profileToSplitIndex: {
      '0:0': 0, // 18-29 Male
      '0:1': 1, // 18-29 Female
      '0:2': 2, // 18-29 Other
      '1:0': 3, // 30-44 Male
      '1:1': 4, // 30-44 Female
      '1:2': 5, // 30-44 Other
      '2:0': 6, // 45+ Male
      '2:1': 7, // 45+ Female
      '2:2': 8, // 45+ Other
    },
  });

  // Test fixture: Mock splits (minimal - just need the structure)
  const createTestSplits = (): SplitWithSegmentGroup[] =>
    Array(9).fill(null).map((_, idx) => ({
      basisSplitIndices: [idx],
      groups: [],
      totalWeight: 0,
      totalCount: 0,
      responseGroups: {
        collapsed: [],
        expanded: [],
      },
      segmentGroupBounds: { x: 0, y: 0, width: 100, height: 80 },
      points: [],
    }));

  const TEST_BASIS_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  beforeEach(() => {
    transformer = new ResponseTransformer();
  });

  describe('Complete respondent answers', () => {
    it('should transform respondents with all questions answered', () => {
      const responses: RespondentResponses[] = [
        {
          respondentId: 1,
          answers: [
            { ...AGE_QUESTION, responseIndex: 0 },      // 18-29
            { ...GENDER_QUESTION, responseIndex: 0 },   // Male
            { ...SATISFACTION_QUESTION, responseIndex: 3 }, // Excellent
          ],
        },
        {
          respondentId: 2,
          answers: [
            { ...AGE_QUESTION, responseIndex: 1 },      // 30-44
            { ...GENDER_QUESTION, responseIndex: 1 },   // Female
            { ...SATISFACTION_QUESTION, responseIndex: 0 }, // Poor
          ],
        },
        {
          respondentId: 3,
          answers: [
            { ...AGE_QUESTION, responseIndex: 2 },      // 45+
            { ...GENDER_QUESTION, responseIndex: 2 },   // Other
            { ...SATISFACTION_QUESTION, responseIndex: 2 }, // Good
          ],
        },
      ];

      const result = transformer.transformResponsesForVisualization(
        responses,
        createTestVisualization(),
        createTestSplits(),
        TEST_BASIS_INDICES,
        createTestLookupMaps()
      );

      expect(result).toHaveLength(3);

      // Respondent 1: 18-29 Male (split 0), Excellent (group 3)
      expect(result[0]).toEqual({
        basisSplitIndex: 0,
        expandedResponseGroupIndex: 3,
        weight: 1,
      });

      // Respondent 2: 30-44 Female (split 4), Poor (group 0)
      expect(result[1]).toEqual({
        basisSplitIndex: 4,
        expandedResponseGroupIndex: 0,
        weight: 1,
      });

      // Respondent 3: 45+ Other (split 8), Good (group 2)
      expect(result[2]).toEqual({
        basisSplitIndex: 8,
        expandedResponseGroupIndex: 2,
        weight: 1,
      });
    });
  });

  describe('Respondents with skipped questions', () => {
    it('should exclude respondents who skip the response question', () => {
      const responses: RespondentResponses[] = [
        {
          respondentId: 1,
          answers: [
            { ...AGE_QUESTION, responseIndex: 0 },
            { ...GENDER_QUESTION, responseIndex: 0 },
            // Skipped satisfaction question
          ],
        },
        {
          respondentId: 2,
          answers: [
            { ...AGE_QUESTION, responseIndex: 0 },
            { ...GENDER_QUESTION, responseIndex: 0 },
            { ...SATISFACTION_QUESTION, responseIndex: 2 }, // Answered
          ],
        },
      ];

      const result = transformer.transformResponsesForVisualization(
        responses,
        createTestVisualization(),
        createTestSplits(),
        TEST_BASIS_INDICES,
        createTestLookupMaps()
      );

      // Only respondent 2 should be included
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        basisSplitIndex: 0,
        expandedResponseGroupIndex: 2,
        weight: 1,
      });
    });

    it('should exclude respondents who skip grouping questions', () => {
      const responses: RespondentResponses[] = [
        {
          respondentId: 1,
          answers: [
            { ...AGE_QUESTION, responseIndex: 0 },
            // Skipped gender question
            { ...SATISFACTION_QUESTION, responseIndex: 2 },
          ],
        },
        {
          respondentId: 2,
          answers: [
            // Skipped age question
            { ...GENDER_QUESTION, responseIndex: 1 },
            { ...SATISFACTION_QUESTION, responseIndex: 1 },
          ],
        },
        {
          respondentId: 3,
          answers: [
            { ...AGE_QUESTION, responseIndex: 1 },
            { ...GENDER_QUESTION, responseIndex: 0 },
            { ...SATISFACTION_QUESTION, responseIndex: 3 },
          ],
        },
      ];

      const result = transformer.transformResponsesForVisualization(
        responses,
        createTestVisualization(),
        createTestSplits(),
        TEST_BASIS_INDICES,
        createTestLookupMaps()
      );

      // Only respondent 3 should be included
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        basisSplitIndex: 3, // 30-44 Male
        expandedResponseGroupIndex: 3,
        weight: 1,
      });
    });
  });

  describe('Respondents with answers outside defined response groups', () => {
    it('should exclude respondents whose response answer is not in any response group', () => {
      const responses: RespondentResponses[] = [
        {
          respondentId: 1,
          answers: [
            { ...AGE_QUESTION, responseIndex: 0 },
            { ...GENDER_QUESTION, responseIndex: 0 },
            { ...SATISFACTION_QUESTION, responseIndex: 99 }, // Invalid response index
          ],
        },
        {
          respondentId: 2,
          answers: [
            { ...AGE_QUESTION, responseIndex: 0 },
            { ...GENDER_QUESTION, responseIndex: 0 },
            { ...SATISFACTION_QUESTION, responseIndex: 2 }, // Valid
          ],
        },
      ];

      const lookupMaps = createTestLookupMaps();
      lookupMaps.responseIndexToGroupIndex = [0, 1, 2, 3, -1]; // Index 99 would be out of bounds

      const result = transformer.transformResponsesForVisualization(
        responses,
        createTestVisualization(),
        createTestSplits(),
        TEST_BASIS_INDICES,
        lookupMaps
      );

      // Only respondent 2 should be included
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        basisSplitIndex: 0,
        expandedResponseGroupIndex: 2,
      });
    });

    it('should exclude respondents whose grouping answers do not match any basis split profile', () => {
      const responses: RespondentResponses[] = [
        {
          respondentId: 1,
          answers: [
            { ...AGE_QUESTION, responseIndex: 99 }, // Invalid age
            { ...GENDER_QUESTION, responseIndex: 0 },
            { ...SATISFACTION_QUESTION, responseIndex: 2 },
          ],
        },
        {
          respondentId: 2,
          answers: [
            { ...AGE_QUESTION, responseIndex: 0 },
            { ...GENDER_QUESTION, responseIndex: 99 }, // Invalid gender
            { ...SATISFACTION_QUESTION, responseIndex: 2 },
          ],
        },
        {
          respondentId: 3,
          answers: [
            { ...AGE_QUESTION, responseIndex: 1 },
            { ...GENDER_QUESTION, responseIndex: 1 },
            { ...SATISFACTION_QUESTION, responseIndex: 2 },
          ],
        },
      ];

      const result = transformer.transformResponsesForVisualization(
        responses,
        createTestVisualization(),
        createTestSplits(),
        TEST_BASIS_INDICES,
        createTestLookupMaps()
      );

      // Only respondent 3 should be included (respondents 1 and 2 have invalid grouping profiles)
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        basisSplitIndex: 4, // 30-44 Female
        expandedResponseGroupIndex: 2,
      });
    });
  });

  describe('Mixed scenarios with realistic data', () => {
    it('should correctly process a batch with complete, skipped, and invalid responses', () => {
      const responses: RespondentResponses[] = [
        // Valid: 18-29 Male, Excellent
        {
          respondentId: 1,
          answers: [
            { ...AGE_QUESTION, responseIndex: 0 },
            { ...GENDER_QUESTION, responseIndex: 0 },
            { ...SATISFACTION_QUESTION, responseIndex: 3 },
          ],
        },
        // Invalid: Skipped satisfaction
        {
          respondentId: 2,
          answers: [
            { ...AGE_QUESTION, responseIndex: 1 },
            { ...GENDER_QUESTION, responseIndex: 1 },
          ],
        },
        // Valid: 30-44 Female, Poor
        {
          respondentId: 3,
          answers: [
            { ...AGE_QUESTION, responseIndex: 1 },
            { ...GENDER_QUESTION, responseIndex: 1 },
            { ...SATISFACTION_QUESTION, responseIndex: 0 },
          ],
        },
        // Invalid: Skipped age
        {
          respondentId: 4,
          answers: [
            { ...GENDER_QUESTION, responseIndex: 2 },
            { ...SATISFACTION_QUESTION, responseIndex: 1 },
          ],
        },
        // Valid: 45+ Other, Good
        {
          respondentId: 5,
          answers: [
            { ...AGE_QUESTION, responseIndex: 2 },
            { ...GENDER_QUESTION, responseIndex: 2 },
            { ...SATISFACTION_QUESTION, responseIndex: 2 },
          ],
        },
        // Invalid: Response not in any group (out of range)
        {
          respondentId: 6,
          answers: [
            { ...AGE_QUESTION, responseIndex: 0 },
            { ...GENDER_QUESTION, responseIndex: 0 },
            { ...SATISFACTION_QUESTION, responseIndex: 999 },
          ],
        },
      ];

      const result = transformer.transformResponsesForVisualization(
        responses,
        createTestVisualization(),
        createTestSplits(),
        TEST_BASIS_INDICES,
        createTestLookupMaps()
      );

      // Should only include respondents 1, 3, and 5
      expect(result).toHaveLength(3);

      expect(result[0]).toEqual({
        basisSplitIndex: 0, // 18-29 Male
        expandedResponseGroupIndex: 3, // Excellent
        weight: 1,
      });

      expect(result[1]).toEqual({
        basisSplitIndex: 4, // 30-44 Female
        expandedResponseGroupIndex: 0, // Poor
        weight: 1,
      });

      expect(result[2]).toEqual({
        basisSplitIndex: 8, // 45+ Other
        expandedResponseGroupIndex: 2, // Good
        weight: 1,
      });
    });
  });

  describe('Edge cases', () => {
    it('should return empty array when no responses provided', () => {
      const result = transformer.transformResponsesForVisualization(
        [],
        createTestVisualization(),
        createTestSplits(),
        TEST_BASIS_INDICES,
        createTestLookupMaps()
      );

      expect(result).toEqual([]);
    });

    it('should handle all respondents being filtered out', () => {
      const responses: RespondentResponses[] = [
        {
          respondentId: 1,
          answers: [], // No answers
        },
        {
          respondentId: 2,
          answers: [{ ...AGE_QUESTION, responseIndex: 0 }], // Missing required questions
        },
      ];

      const result = transformer.transformResponsesForVisualization(
        responses,
        createTestVisualization(),
        createTestSplits(),
        TEST_BASIS_INDICES,
        createTestLookupMaps()
      );

      expect(result).toEqual([]);
    });
  });
});
