import type { SessionConfig } from 'shared-schemas';
import { testQuestions } from './test-questions';

/**
 * Valid session configuration for testing
 * Uses questions from test-questions.ts with a single visualization
 */
export const validSessionConfig: Omit<SessionConfig, 'visualizations'> & {
  visualizations: Omit<SessionConfig['visualizations'][0], 'id'>[];
} = {
  questionOrder: [
    {
      varName: testQuestions[0].varName, // satisfaction
      batteryName: testQuestions[0].batteryName,
      subBattery: testQuestions[0].subBattery ?? '',
    },
    {
      varName: testQuestions[2].varName, // gender
      batteryName: testQuestions[2].batteryName,
      subBattery: testQuestions[2].subBattery ?? '',
    },
    {
      varName: testQuestions[3].varName, // race
      batteryName: testQuestions[3].batteryName,
      subBattery: testQuestions[3].subBattery ?? '',
    },
    {
      varName: testQuestions[4].varName, // age
      batteryName: testQuestions[4].batteryName,
      subBattery: testQuestions[4].subBattery ?? '',
    },
  ],
  visualizations: [
    {
      responseQuestion: {
        question: {
          varName: testQuestions[0].varName, // satisfaction
          batteryName: testQuestions[0].batteryName,
          subBattery: testQuestions[0].subBattery ?? '',
        },
        responseGroups: {
          expanded: [
            { label: 'Very dissatisfied', values: [0] },
            { label: 'Somewhat dissatisfied', values: [1] },
            { label: 'Neutral', values: [2] },
            { label: 'Somewhat satisfied', values: [3] },
            { label: 'Very satisfied', values: [4] },
          ],
          collapsed: [
            { label: 'Dissatisfied', values: [0, 1] },
            { label: 'Neutral', values: [2] },
            { label: 'Satisfied', values: [3, 4] },
          ],
        },
      },
      groupingQuestions: {
        x: [
          {
            question: {
              varName: testQuestions[2].varName, // gender
              batteryName: testQuestions[2].batteryName,
              subBattery: testQuestions[2].subBattery ?? '',
            },
            responseGroups: [
              { label: 'Male', values: [0] },
              { label: 'Female', values: [1] },
              { label: 'Non-binary/Other', values: [2, 3] },
            ],
          },
          {
            question: {
              varName: testQuestions[3].varName, // race
              batteryName: testQuestions[3].batteryName,
              subBattery: testQuestions[3].subBattery ?? '',
            },
            responseGroups: [
              { label: 'White', values: [0] },
              { label: 'Black/African American', values: [1] },
              { label: 'Asian/Pacific Islander', values: [2, 4] },
              { label: 'Hispanic/Latino', values: [3] },
              { label: 'Other/Multiracial', values: [5, 6] },
            ],
          },
        ],
        y: [
          {
            question: {
              varName: testQuestions[4].varName, // age
              batteryName: testQuestions[4].batteryName,
              subBattery: testQuestions[4].subBattery ?? '',
            },
            responseGroups: [
              { label: '18-34', values: [0, 1] },
              { label: '35-54', values: [2, 3] },
              { label: '55+', values: [4, 5] },
            ],
          },
        ],
      },
      minGroupAvailableWidth: 200,
      minGroupHeight: 150,
      groupGapX: 20,
      groupGapY: 20,
      responseGap: 5,
      baseSegmentWidth: 10,
    },
  ],
};

/**
 * Invalid session configuration - references a question in visualization
 * that is NOT in questionOrder (violates the service validation)
 */
export const invalidSessionConfig: Omit<SessionConfig, 'visualizations'> & {
  visualizations: Omit<SessionConfig['visualizations'][0], 'id'>[];
} = {
  questionOrder: [
    {
      varName: testQuestions[0].varName, // satisfaction
      batteryName: testQuestions[0].batteryName,
      subBattery: testQuestions[0].subBattery ?? '',
    },
    // Note: gender and age are NOT in questionOrder
  ],
  visualizations: [
    {
      responseQuestion: {
        question: {
          varName: testQuestions[0].varName, // satisfaction
          batteryName: testQuestions[0].batteryName,
          subBattery: testQuestions[0].subBattery ?? '',
        },
        responseGroups: {
          expanded: [
            { label: 'Very dissatisfied', values: [0] },
            { label: 'Somewhat dissatisfied', values: [1] },
            { label: 'Neutral', values: [2] },
            { label: 'Somewhat satisfied', values: [3] },
            { label: 'Very satisfied', values: [4] },
          ],
          collapsed: [
            { label: 'Dissatisfied', values: [0, 1] },
            { label: 'Neutral', values: [2] },
            { label: 'Satisfied', values: [3, 4] },
          ],
        },
      },
      groupingQuestions: {
        x: [
          {
            question: {
              varName: testQuestions[2].varName, // gender - NOT in questionOrder!
              batteryName: testQuestions[2].batteryName,
              subBattery: testQuestions[2].subBattery ?? '',
            },
            responseGroups: [
              { label: 'Male', values: [0] },
              { label: 'Female', values: [1] },
              { label: 'Non-binary/Other', values: [2, 3] },
            ],
          },
        ],
        y: [
          {
            question: {
              varName: testQuestions[4].varName, // age - NOT in questionOrder!
              batteryName: testQuestions[4].batteryName,
              subBattery: testQuestions[4].subBattery ?? '',
            },
            responseGroups: [
              { label: '18-34', values: [0, 1] },
              { label: '35-54', values: [2, 3] },
              { label: '55+', values: [4, 5] },
            ],
          },
        ],
      },
      minGroupAvailableWidth: 200,
      minGroupHeight: 150,
      groupGapX: 20,
      groupGapY: 20,
      responseGap: 5,
      baseSegmentWidth: 10,
    },
  ],
};
