import type { SegmentVizConfig } from '../../src/segmentViz/types';
import type { ResponseQuestion, GroupingQuestion } from '../../src/statistics/types';

/**
 * Create a test SegmentVizConfig with specified dimensional parameters.
 * 
 * This helper isolates the key dimensions that affect visualization size:
 * 1. Number of expanded response groups (affects segment group base width)
 * 2. X-axis response groups array: length = number of x-axis grouping questions,
 *    each element = number of response groups for that question
 *    (affects response group product via cartesian product)
 * 3. minGroupAvailableWidth (additional width per segment group)
 * 4. Y-axis response groups array: length = number of y-axis grouping questions,
 *    each element = number of response groups for that question
 *    (affects response group product via cartesian product)
 */
export function createSegmentVizConfig(params: {
  numResponseGroupsExpanded: number;
  xAxisResponseGroups: number[];
  minGroupAvailableWidth: number;
  yAxisResponseGroups: number[];
  groupGapX?: number;
  groupGapY?: number;
  responseGap?: number;
  baseSegmentWidth?: number;
  minGroupHeight?: number;
}): SegmentVizConfig {
  const {
    numResponseGroupsExpanded,
    xAxisResponseGroups,
    minGroupAvailableWidth,
    yAxisResponseGroups,
    groupGapX = 10,
    groupGapY = 10,
    responseGap = 2,
    baseSegmentWidth = 5,
    minGroupHeight = 80
  } = params;

  // Create response question with specified number of expanded response groups
  const responseQuestion: ResponseQuestion = {
    question: {
      varName: 'responseQ',
      batteryName: 'response',
      subBattery: 'main'
    },
    responseGroups: {
      expanded: Array.from({ length: numResponseGroupsExpanded }, (_, i) => ({
        label: `Response ${i}`,
        values: [i]
      })),
      collapsed: [{
        label: 'All Responses',
        values: Array.from({ length: numResponseGroupsExpanded }, (_, i) => i)
      }]
    }
  };

  // Create x-axis grouping questions
  const xAxisGroupingQuestions: GroupingQuestion[] = xAxisResponseGroups.map(
    (numResponseGroups, qIdx) => ({
      question: {
        varName: `xGroupingQ${qIdx}`,
        batteryName: 'xGrouping',
        subBattery: 'main'
      },
      responseGroups: Array.from({ length: numResponseGroups }, (_, i) => ({
        label: `Group ${i}`,
        values: [i]
      }))
    })
  );

  // Create y-axis grouping questions
  const yAxisGroupingQuestions: GroupingQuestion[] = yAxisResponseGroups.map(
    (numResponseGroups, qIdx) => ({
      question: {
        varName: `yGroupingQ${qIdx}`,
        batteryName: 'yGrouping',
        subBattery: 'main'
      },
      responseGroups: Array.from({ length: numResponseGroups }, (_, i) => ({
        label: `Group ${i}`,
        values: [i]
      }))
    })
  );

  return {
    responseQuestion,
    groupingQuestions: {
      x: xAxisGroupingQuestions,
      y: yAxisGroupingQuestions
    },
    minGroupAvailableWidth,
    minGroupHeight,
    groupGapX,
    groupGapY,
    responseGap,
    baseSegmentWidth
  };
}
