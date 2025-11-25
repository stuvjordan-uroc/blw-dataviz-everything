import type { SessionConfig } from 'shared-schemas';
import type { VizConfigSegments } from 'shared-computation';

export const sessionConfig: SessionConfig = {
  responseQuestions: [
    {
      batteryName: "test",
      subBattery: "test",
      varName: "mood",
      responseGroups: {
        collapsed: [
          {
            label: "sad",
            values: [0, 1]
          },
          {
            label: "happy",
            values: [2, 3]
          }
        ],
        expanded: [
          {
            label: "very sad",
            values: [0]
          },
          {
            label: "sad",
            values: [1]
          },
          {
            label: "happy",
            values: [2]
          },
          {
            label: "very happy",
            values: [3]
          }
        ]
      }
    }
  ],
  groupingQuestions: [
    {
      batteryName: "test",
      subBattery: "test",
      varName: "gender",
      responseGroups: [
        {
          label: "male",
          values: [0]
        },
        {
          label: "female",
          values: [1]
        }
      ]
    },
    {
      batteryName: "test",
      subBattery: "test",
      varName: "height",
      responseGroups: [
        {
          label: "short",
          values: [0]
        },
        {
          label: "tall",
          values: [1]
        }
      ]
    }
  ]
};

//one grouping question on each axis.
export const vizConfig_oneEach: VizConfigSegments = {
  groupGapHorizontal: 10,
  groupGapVertical: 10,
  groupingQuestionsHorizontal: [
    {
      batteryName: "test",
      subBattery: "test",
      varName: "height"
    },
  ],
  groupingQuestionsVertical: [
    {
      batteryName: "test",
      subBattery: "test",
      varName: "gender"
    }
  ],
  responseGap: 5,
  minGroupAvailableWidth: 100,
  minGroupHeight: 30
};

// Same numeric values as above but both grouping questions placed horizontally
export const vizConfig_bothHorizontally: VizConfigSegments = {
  groupGapHorizontal: 10,
  groupGapVertical: 10,
  groupingQuestionsHorizontal: [
    {
      batteryName: "test",
      subBattery: "test",
      varName: "height"
    },
    {
      batteryName: "test",
      subBattery: "test",
      varName: "gender"
    }
  ],
  groupingQuestionsVertical: [],
  responseGap: 5,
  minGroupAvailableWidth: 100,
  minGroupHeight: 30
};

// Same numeric values as above but both grouping questions placed vertically
export const vizConfig_bothVertically: VizConfigSegments = {
  groupGapHorizontal: 10,
  groupGapVertical: 10,
  groupingQuestionsHorizontal: [],
  groupingQuestionsVertical: [
    {
      batteryName: "test",
      subBattery: "test",
      varName: "height"
    },
    {
      batteryName: "test",
      subBattery: "test",
      varName: "gender"
    }
  ],
  responseGap: 5,
  minGroupAvailableWidth: 100,
  minGroupHeight: 30
};

// Same numeric values but no grouping questions (both arrays empty)
export const vizConfig_noGroupings: VizConfigSegments = {
  groupGapHorizontal: 10,
  groupGapVertical: 10,
  groupingQuestionsHorizontal: [],
  groupingQuestionsVertical: [],
  responseGap: 5,
  minGroupAvailableWidth: 100,
  minGroupHeight: 30
};
