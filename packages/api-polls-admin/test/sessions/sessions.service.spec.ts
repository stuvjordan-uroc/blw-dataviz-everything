import { SessionsService } from '../../src/sessions/sessions.service';
import type { SegmentVizConfig, SplitWithSegmentGroup } from 'shared-types';
import type { VisualizationLookupMaps } from 'shared-schemas';

/**
 * Unit Tests: SessionsService.buildLookupMaps
 * 
 * Tests the pre-computation of lookup maps that optimize response transformation.
 * These maps are critical for api-polls-public performance.
 * 
 * Tests realistic scenarios with:
 * - Multiple response groups
 * - Multiple grouping dimensions (age × gender)
 * - All possible demographic combinations
 */
describe('SessionsService - buildLookupMaps', () => {
  let service: SessionsService;
  let mockDb: any;

  // Test fixture: Questions
  const AGE_QUESTION = { varName: 'age', batteryName: 'demographics', subBattery: 'main' };
  const GENDER_QUESTION = { varName: 'gender', batteryName: 'demographics', subBattery: 'main' };
  const SATISFACTION_QUESTION = { varName: 'satisfaction', batteryName: 'feedback', subBattery: 'main' };

  // Test fixture: Visualization config with realistic demographic grouping
  const createTestVisualization = (): SegmentVizConfig => ({
    responseQuestion: {
      question: SATISFACTION_QUESTION,
      responseGroups: {
        expanded: [
          { label: 'Very Dissatisfied', values: [0] },
          { label: 'Dissatisfied', values: [1] },
          { label: 'Neutral', values: [2] },
          { label: 'Satisfied', values: [3] },
          { label: 'Very Satisfied', values: [4] },
        ],
        collapsed: [
          { label: 'Negative', values: [0, 1] },
          { label: 'Neutral', values: [2] },
          { label: 'Positive', values: [3, 4] },
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
            { label: '45-64', values: [2] },
            { label: '65+', values: [3] },
          ],
        },
      ],
      y: [
        {
          question: GENDER_QUESTION,
          responseGroups: [
            { label: 'Male', values: [0] },
            { label: 'Female', values: [1] },
            { label: 'Non-binary', values: [2] },
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

  // Test fixture: Basis splits representing all age × gender combinations
  // 4 age groups × 3 gender groups = 12 basis splits
  const createTestSplits = (): SplitWithSegmentGroup[] => {
    const splits: SplitWithSegmentGroup[] = [];
    const ageGroups = [
      { label: '18-29', values: [0] },
      { label: '30-44', values: [1] },
      { label: '45-64', values: [2] },
      { label: '65+', values: [3] },
    ];
    const genderGroups = [
      { label: 'Male', values: [0] },
      { label: 'Female', values: [1] },
      { label: 'Non-binary', values: [2] },
    ];

    let splitIdx = 0;
    for (let ageIdx = 0; ageIdx < ageGroups.length; ageIdx++) {
      for (let genderIdx = 0; genderIdx < genderGroups.length; genderIdx++) {
        splits.push({
          basisSplitIndices: [splitIdx],
          groups: [
            { question: AGE_QUESTION, responseGroup: ageGroups[ageIdx] },
            { question: GENDER_QUESTION, responseGroup: genderGroups[genderIdx] },
          ],
          totalWeight: 0,
          totalCount: 0,
          responseGroups: {
            collapsed: [],
            expanded: [],
          },
          segmentGroupBounds: { x: 0, y: 0, width: 100, height: 80 },
          points: [],
        });
        splitIdx++;
      }
    }

    return splits;
  };

  const TEST_BASIS_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  beforeEach(() => {
    mockDb = createMockDatabase();
    service = new SessionsService(mockDb);
  });

  describe('Complete lookup map generation', () => {
    it('should build both responseIndexToGroupIndex and profileToSplitIndex maps', () => {
      const vizConfig = createTestVisualization();
      const splits = createTestSplits();

      const result = service['buildLookupMaps'](vizConfig, splits, TEST_BASIS_INDICES);

      expect(result).toHaveProperty('responseIndexToGroupIndex');
      expect(result).toHaveProperty('profileToSplitIndex');
      expect(typeof result.responseIndexToGroupIndex).toBe('object');
      expect(typeof result.profileToSplitIndex).toBe('object');
    });
  });

  describe('responseIndexToGroupIndex map', () => {
    it('should map each satisfaction response index to its expanded group index', () => {
      const vizConfig = createTestVisualization();
      const splits = createTestSplits();

      const result = service['buildLookupMaps'](vizConfig, splits, TEST_BASIS_INDICES);

      // Very Dissatisfied (0) -> group 0
      expect(result.responseIndexToGroupIndex[0]).toBe(0);

      // Dissatisfied (1) -> group 1
      expect(result.responseIndexToGroupIndex[1]).toBe(1);

      // Neutral (2) -> group 2
      expect(result.responseIndexToGroupIndex[2]).toBe(2);

      // Satisfied (3) -> group 3
      expect(result.responseIndexToGroupIndex[3]).toBe(3);

      // Very Satisfied (4) -> group 4
      expect(result.responseIndexToGroupIndex[4]).toBe(4);
    });

    it('should handle response groups with multiple values', () => {
      // Create a config where one response group contains multiple indices
      const vizConfig: SegmentVizConfig = {
        ...createTestVisualization(),
        responseQuestion: {
          question: SATISFACTION_QUESTION,
          responseGroups: {
            expanded: [
              { label: 'Low', values: [0, 1] },      // Group 0 contains indices 0 and 1
              { label: 'Medium', values: [2] },      // Group 1 contains index 2
              { label: 'High', values: [3, 4, 5] },  // Group 2 contains indices 3, 4, 5
            ],
            collapsed: [
              { label: 'Not High', values: [0, 1, 2] },
              { label: 'High', values: [3, 4, 5] },
            ],
          },
        },
      };
      const splits = createTestSplits();

      const result = service['buildLookupMaps'](vizConfig, splits, TEST_BASIS_INDICES);

      // Both 0 and 1 should map to group 0
      expect(result.responseIndexToGroupIndex[0]).toBe(0);
      expect(result.responseIndexToGroupIndex[1]).toBe(0);

      // 2 maps to group 1
      expect(result.responseIndexToGroupIndex[2]).toBe(1);

      // 3, 4, 5 all map to group 2
      expect(result.responseIndexToGroupIndex[3]).toBe(2);
      expect(result.responseIndexToGroupIndex[4]).toBe(2);
      expect(result.responseIndexToGroupIndex[5]).toBe(2);
    });
  });

  describe('profileToSplitIndex map', () => {
    it('should map each demographic profile to its corresponding basis split', () => {
      const vizConfig = createTestVisualization();
      const splits = createTestSplits();

      const result = service['buildLookupMaps'](vizConfig, splits, TEST_BASIS_INDICES);

      // Profile format: "ageGroupIdx:genderGroupIdx"

      // 18-29 × Male (age group 0, gender group 0) -> split 0
      expect(result.profileToSplitIndex['0:0']).toBe(0);

      // 18-29 × Female (age group 0, gender group 1) -> split 1
      expect(result.profileToSplitIndex['0:1']).toBe(1);

      // 18-29 × Non-binary (age group 0, gender group 2) -> split 2
      expect(result.profileToSplitIndex['0:2']).toBe(2);

      // 30-44 × Male (age group 1, gender group 0) -> split 3
      expect(result.profileToSplitIndex['1:0']).toBe(3);

      // 30-44 × Female (age group 1, gender group 1) -> split 4
      expect(result.profileToSplitIndex['1:1']).toBe(4);

      // 45-64 × Non-binary (age group 2, gender group 2) -> split 8
      expect(result.profileToSplitIndex['2:2']).toBe(8);

      // 65+ × Female (age group 3, gender group 1) -> split 10
      expect(result.profileToSplitIndex['3:1']).toBe(10);
    });

    it('should create entries for all 12 demographic combinations', () => {
      const vizConfig = createTestVisualization();
      const splits = createTestSplits();

      const result = service['buildLookupMaps'](vizConfig, splits, TEST_BASIS_INDICES);

      // Should have exactly 12 profile mappings (4 age groups × 3 gender groups)
      expect(Object.keys(result.profileToSplitIndex).length).toBe(12);
    });

    it('should maintain consistent profile key format across all splits', () => {
      const vizConfig = createTestVisualization();
      const splits = createTestSplits();

      const result = service['buildLookupMaps'](vizConfig, splits, TEST_BASIS_INDICES);

      // All profile keys should be in format "number:number"
      const profileKeys = Object.keys(result.profileToSplitIndex);

      profileKeys.forEach(key => {
        expect(key).toMatch(/^\d+:\d+$/);
      });
    });

    it('should handle splits with null response groups', () => {
      const vizConfig = createTestVisualization();
      const splits = createTestSplits();

      // Create a split with a null gender group (respondent who skipped gender question)
      const splitWithNull: SplitWithSegmentGroup = {
        basisSplitIndices: [12],
        groups: [
          { question: AGE_QUESTION, responseGroup: { label: '18-29', values: [0] } },
          { question: GENDER_QUESTION, responseGroup: null }, // Null group
        ],
        totalWeight: 0,
        totalCount: 0,
        responseGroups: { collapsed: [], expanded: [] },
        segmentGroupBounds: { x: 0, y: 0, width: 100, height: 80 },
        points: [],
      };

      splits.push(splitWithNull);
      const basisIndices = [...TEST_BASIS_INDICES, 12];

      const result = service['buildLookupMaps'](vizConfig, splits, basisIndices);

      // Profile with null should use "null" in the key
      expect(result.profileToSplitIndex['0:null']).toBe(12);
    });
  });

  describe('Integration of both maps', () => {
    it('should produce lookup maps that enable O(1) respondent transformation', () => {
      const vizConfig = createTestVisualization();
      const splits = createTestSplits();

      const result = service['buildLookupMaps'](vizConfig, splits, TEST_BASIS_INDICES);

      // Simulate a respondent: 30-44 year old Female who is Satisfied
      // Age response index: 1 (30-44)
      // Gender response index: 1 (Female)  
      // Satisfaction response index: 3 (Satisfied)

      // Step 1: Map satisfaction response (3) to group index
      const satisfactionGroupIdx = result.responseIndexToGroupIndex[3];
      expect(satisfactionGroupIdx).toBe(3);

      // Step 2: Build profile from age and gender responses
      // Age index 1 -> age group 1, Gender index 1 -> gender group 1
      const profile = '1:1';

      // Step 3: Map profile to basis split
      const basisSplitIdx = result.profileToSplitIndex[profile];
      expect(basisSplitIdx).toBe(4); // 30-44 Female is split 4

      // Both lookups are O(1) - no searching required!
    });
  });
});
