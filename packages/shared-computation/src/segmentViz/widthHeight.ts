import type { SegmentVizConfig } from "./types";
import { Statistics } from "../statistics";
import { getQuestionKey } from "../utils";

export function getVizWidth(
  statsInstanceRef: Statistics,
  segmentVizConfig: SegmentVizConfig
) {
  let maxSegmentGroupsX = 0;
  const statsConfig = statsInstanceRef.getStatsConfig();
  for (const groupingQuestion of statsConfig.groupingQuestions) {
    const isX = segmentVizConfig.groupingQuestionKeys.x.find(
      (gqk) => gqk === getQuestionKey(groupingQuestion)
    );
    if (isX) {
      maxSegmentGroupsX += groupingQuestion.responseGroups.length;
    }
  }
  const maxResponseGroups = Math.max(
    1,
    ...statsConfig.responseQuestions.map(
      (rq) => rq.responseGroups.expanded.length
    )
  );
  return (
    (maxSegmentGroupsX - 1) * segmentVizConfig.groupGapX + //gaps between groups
    maxSegmentGroupsX * //groups
      ((maxResponseGroups - 1) * segmentVizConfig.responseGap + //gaps within groups between response groups
        maxResponseGroups * 2 + //minimum width of each response group (2 point radius units)
        segmentVizConfig.minGroupAvailableWidth) //minimum available width to distributed between response groups
  );
}

export function getVizHeight(
  statsInstanceRef: Statistics,
  segmentVizConfig: SegmentVizConfig
) {
  let maxSegmentGroupsY = 0;
  const statsConfig = statsInstanceRef.getStatsConfig();
  for (const groupingQuestion of statsConfig.groupingQuestions) {
    const isY = segmentVizConfig.groupingQuestionKeys.y.find(
      (gqk) => gqk === getQuestionKey(groupingQuestion)
    );
    if (isY) {
      maxSegmentGroupsY += groupingQuestion.responseGroups.length;
    }
  }
  return (
    (maxSegmentGroupsY - 1) * segmentVizConfig.groupGapY + //gaps between groups
    maxSegmentGroupsY * segmentVizConfig.minGroupHeight //heights of groups
  );
}
