import type { SegmentVizConfig } from 'shared-computation';

/**
 * Test fixture: Segment visualization configuration and response data.
 * 
 * Structure:
 * - 2 x-axis grouping questions (age, gender)
 * - 1 y-axis grouping question (region)
 * - 1 response question with 2 response groups
 * 
 * This produces 2^3 = 8 views and 2×2×2 = 8 basis splits.
 */

export const testSegmentVizConfig: SegmentVizConfig = {
  groupingQuestions: {
    x: [
      {
        question: {
          varName: 'age',
          batteryName: 'demographics',
          subBattery: '',
        },
        responseGroups: [
          { label: 'Young', values: [0, 1] },
          { label: 'Old', values: [2, 3] },
        ],
      },
      {
        question: {
          varName: 'gender',
          batteryName: 'demographics',
          subBattery: '',
        },
        responseGroups: [
          { label: 'Male', values: [0] },
          { label: 'Female', values: [1] },
        ],
      },
    ],
    y: [
      {
        question: {
          varName: 'region',
          batteryName: 'demographics',
          subBattery: '',
        },
        responseGroups: [
          { label: 'North', values: [0, 1] },
          { label: 'South', values: [2, 3] },
        ],
      },
    ],
  },
  responseQuestion: {
    question: {
      varName: 'satisfaction',
      batteryName: 'survey',
      subBattery: '',
    },
    responseGroups: {
      collapsed: [
        { label: 'Satisfied', values: [0, 1] },
      ],
      expanded: [
        { label: 'Very Satisfied', values: [0] },
        { label: 'Somewhat Satisfied', values: [1] },
      ],
    },
  },
  minGroupAvailableWidth: 100,
  minGroupHeight: 100,
  groupGapX: 10,
  groupGapY: 10,
  responseGap: 2,
  baseSegmentWidth: 5,
};

/**
 * First batch of responses - 10 respondents.
 * 
 * Format: { basisSplitIndex, expandedResponseGroupIndex, weight }
 * 
 * Basis split mapping (all 8 combinations where all grouping questions are active):
 * 0: Young × Male × North
 * 1: Young × Male × South
 * 2: Young × Female × North
 * 3: Young × Female × South
 * 4: Old × Male × North
 * 5: Old × Male × South
 * 6: Old × Female × North
 * 7: Old × Female × South
 * 
 * Expanded response groups:
 * 0: Very Satisfied
 * 1: Somewhat Satisfied
 */
export const firstBatchResponses: {
  basisSplitIndex: number;
  expandedResponseGroupIndex: number;
  weight: number;
}[] = [
    // 2 responses in Young × Male × North, both very satisfied
    { basisSplitIndex: 0, expandedResponseGroupIndex: 0, weight: 1 },
    { basisSplitIndex: 0, expandedResponseGroupIndex: 0, weight: 1 },

    // 1 response in Young × Male × South, somewhat satisfied
    { basisSplitIndex: 1, expandedResponseGroupIndex: 1, weight: 1 },

    // 2 responses in Young × Female × North
    { basisSplitIndex: 2, expandedResponseGroupIndex: 0, weight: 1 },
    { basisSplitIndex: 2, expandedResponseGroupIndex: 1, weight: 1 },

    // 1 response in Young × Female × South
    { basisSplitIndex: 3, expandedResponseGroupIndex: 0, weight: 1 },

    // 1 response in Old × Male × North
    { basisSplitIndex: 4, expandedResponseGroupIndex: 1, weight: 1 },

    // 1 response in Old × Male × South
    { basisSplitIndex: 5, expandedResponseGroupIndex: 0, weight: 1 },

    // 1 response in Old × Female × North
    { basisSplitIndex: 6, expandedResponseGroupIndex: 1, weight: 1 },

    // 1 response in Old × Female × South
    { basisSplitIndex: 7, expandedResponseGroupIndex: 0, weight: 1 },
  ];

/**
 * Second batch of responses - 5 additional respondents.
 * 
 * Simulates a server update with new data.
 */
export const secondBatchResponses: {
  basisSplitIndex: number;
  expandedResponseGroupIndex: number;
  weight: number;
}[] = [
    // 2 more in Young × Male × North
    { basisSplitIndex: 0, expandedResponseGroupIndex: 1, weight: 1 },
    { basisSplitIndex: 0, expandedResponseGroupIndex: 1, weight: 1 },

    // 1 more in Old × Male × North
    { basisSplitIndex: 4, expandedResponseGroupIndex: 0, weight: 1 },

    // 2 more in Old × Female × South
    { basisSplitIndex: 7, expandedResponseGroupIndex: 1, weight: 1 },
    { basisSplitIndex: 7, expandedResponseGroupIndex: 1, weight: 1 },
  ];
