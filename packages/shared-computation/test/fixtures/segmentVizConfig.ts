import type { SegmentVizConfig } from "../../src/segmentViz/types";
import { responseQuestion, groupingQuestion0, groupingQuestion1 } from "./questions";

/**
 * A minimal SegmentVizConfig for testing initializeSplitsWithSegments.
 * 
 * Uses:
 * - responseQuestion with 4 expanded groups and 2 collapsed groups
 * - groupingQuestion0 on the x-axis (2 response groups)
 * - groupingQuestion1 on the y-axis (2 response groups)
 * 
 * This will generate:
 * - 4 views total (2^1 for x-axis * 2^1 for y-axis)
 * - Within each view, varying numbers of splits based on active questions
 * - 4 basis splits (where all questions are active)
 */
export const segmentVizConfig: SegmentVizConfig = {
  responseQuestion: responseQuestion,
  groupingQuestions: {
    x: [groupingQuestion0],
    y: [groupingQuestion1]
  },
  minGroupAvailableWidth: 100,
  minGroupHeight: 80,
  groupGapX: 10,
  groupGapY: 10,
  responseGap: 2,
  baseSegmentWidth: 5
};
