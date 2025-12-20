import type { ResponseQuestion, GroupingQuestion } from "../../src/statistics/types"
export const responseQuestion: ResponseQuestion = {
  question: {
    batteryName: 'test',
    subBattery: 'test',
    varName: 'rq'
  },
  responseGroups: {
    expanded: [
      {
        label: "erg0",
        values: [0]
      },
      {
        label: "erg1",
        values: [1]
      },
      {
        label: "erg2",
        values: [2]
      },
      {
        label: "erg3",
        values: [3]
      }
    ],
    collapsed: [
      {
        label: "crg0",
        values: [0, 1]
      },
      {
        label: "crg1",
        values: [2, 3]
      }
    ]
  }
}

export const groupingQuestion0: GroupingQuestion = {
  question: {
    batteryName: "test",
    subBattery: "test",
    varName: "gq0"
  },
  responseGroups: [
    {
      label: "gq00",
      values: [0]
    },
    {
      label: "gq01",
      values: [1]
    }
  ]
}

export const groupingQuestion1: GroupingQuestion = {
  question: {
    batteryName: "test",
    subBattery: "test",
    varName: "gq1"
  },
  responseGroups: [
    {
      label: "gq10",
      values: [0]
    },
    {
      label: "gq11",
      values: [1]
    }
  ]
}

export const groupingQuestion2: GroupingQuestion = {
  question: {
    batteryName: "test",
    subBattery: "test",
    varName: "gq2"
  },
  responseGroups: [
    {
      label: "gq20",
      values: [0]
    },
    {
      label: "gq21",
      values: [1]
    }
  ]
}

export const groupingQuestion3: GroupingQuestion = {
  question: {
    batteryName: "test",
    subBattery: "test",
    varName: "gq3"
  },
  responseGroups: [
    {
      label: "gq30",
      values: [0]
    },
    {
      label: "gq31",
      values: [1]
    }
  ]
}