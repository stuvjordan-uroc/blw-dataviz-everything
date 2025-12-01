import { GroupingQuestion } from "../types";
import { SegmentVizConfig, SegmentGroup, VizPoint } from "./types";
import { Statistics } from "../statistics";
import { getQuestionKey } from '../utils';
import { computeSegmentGroupBounds, positionPointsInSegment } from "./geometry";
import { getActiveQuestionsInSplit, getNumberSegmentGroups, getIndices, getIndicesOfBasisSplits } from "./splitAnalysis";
import { generatePoints } from "./pointGeneration";



export function initialize(statsInstanceRef: Statistics, segmentVizConfig: SegmentVizConfig, vizWidth: number, vizHeight: number) {
  //this will map each response question key to a visualization for that response question
  const vizMap: Map<string, { segmentGroups: SegmentGroup[], points: VizPoint[] }> = new Map();
  //we'll need the stats config for a bunch of the computations that follow
  const statsConfig = statsInstanceRef.getStatsConfig();
  for (const responseQuestion of statsConfig.responseQuestions) {

    //if this response question is not included in the viz config, go to the next one
    if (!(segmentVizConfig.responseQuestionKeys.includes(getQuestionKey(responseQuestion)))) {
      continue;
    }

    //construct the lists of x and y grouping questions that are included in the viz of this response question
    //It's critical that these list have the same ordering as the keys in segmentVizConfig groupingQuestionKeys.
    //That allows us to correctly order the segment groups along the x and y axes in the viz.
    const groupingQuestionsX: GroupingQuestion[] = [];
    for (const gqKey of segmentVizConfig.groupingQuestionKeys.x) {
      if (gqKey === getQuestionKey(responseQuestion)) {
        continue;
      }
      const fullQ = statsConfig.groupingQuestions.find((gq) => getQuestionKey(gq) === gqKey);
      if (fullQ) {
        groupingQuestionsX.push(fullQ)
      }
    }
    const groupingQuestionsY: GroupingQuestion[] = [];
    for (const gqKey of segmentVizConfig.groupingQuestionKeys.y) {
      if (gqKey === getQuestionKey(responseQuestion)) {
        continue;
      }
      const fullQ = statsConfig.groupingQuestions.find((gq) => getQuestionKey(gq) === gqKey);
      if (fullQ) {
        groupingQuestionsY.push(fullQ)
      }
    }

    //construct the list of grouping questions that are excluded from the viz
    const groupingQuestionsExcludedKeys = statsConfig.groupingQuestions
      .map((gq) => getQuestionKey(gq))
      .filter((gqKey) => (
        !groupingQuestionsX.map((gqX) => getQuestionKey(gqX)).includes(gqKey) &&
        !groupingQuestionsY.map((gqY) => getQuestionKey(gqY)).includes(gqKey)
      ))

    //get all the splits from the stats instance
    const allSplits = statsInstanceRef.getSplits()

    //initialize the points array for this response question.
    const points = generatePoints({
      responseQuestion: responseQuestion,
      allSplits: allSplits,
      groupingQuestionsExcludedKeys: groupingQuestionsExcludedKeys,
      groupingQuestionsX: groupingQuestionsX,
      groupingQuestionsY: groupingQuestionsY,
      syntheticSampleSize: segmentVizConfig.syntheticSampleSize
    })

    //initialize the segment groups

    //we're going to build an array of segment groups, one group in the array for each split.
    let splitIdx = -1;
    const segmentGroups: SegmentGroup[] = [];
    //loop through the splits
    for (const split of allSplits) {
      splitIdx++;

      //This split is needed for the current response question only if
      //it is null on all groupingQuestions excluded from this viz

      //get the grouping question keys that are null at this split
      const nullKeys = split.groups
        .filter((group) => group.responseGroup === null)
        .map((group) => getQuestionKey(group.question))
      //if any of the excluded grouping questions are NOT in the list of null questions on this split,
      //move on to the next split.
      if (groupingQuestionsExcludedKeys.some((gqKey) => !nullKeys.includes(gqKey))) {
        continue;
      }

      //get questions that are active at this split, along with the response group indices for
      //their response groups at this split
      const activeQuestions = getActiveQuestionsInSplit(split, groupingQuestionsX, groupingQuestionsY);

      //compute the number of segment groups in the view to which this split belongs along each axis
      const numSegmentGroups = getNumberSegmentGroups(activeQuestions);

      //compute the x- and y-indices of the segment group represented by this split in the view to which this group belongs
      const segmentGroupIndices = getIndices(activeQuestions)

      //compute the segment group bounds for this split
      const segmentGroup = computeSegmentGroupBounds(
        segmentGroupIndices,
        numSegmentGroups,
        vizWidth,
        vizHeight,
        segmentVizConfig.groupGapX,
        segmentVizConfig.groupGapY
      )

      //compute the segment bounds for this split
      //whether we specify segment bounds at this point depends on whether proportions
      //have been computed for the response groups for this split.
      //This is determined by the initializePoints function above.  It only
      //puts points into the points array corresponding to fully-specified splits for which there
      //is data required to compute proportions.
      //So the first thing we need to do is check whether there are points in the points
      //array that belong to this split.
      const basisSplitIndices = getIndicesOfBasisSplits(split, allSplits, groupingQuestionsExcludedKeys)
      const allBasisSplitsPopulated = basisSplitIndices.every((basisSplitIndex) => {
        let found = false;
        for (const point of points) {
          if (point.fullySpecifiedSplitIndex === basisSplitIndex) {
            found = true;
            break;
          }
        }
        return found;
      })
      //we also need to get the proportions for the current response group into order to compute segments
      const responseQuestionWithStats = split.responseQuestions.find((rq) => getQuestionKey(rq) === getQuestionKey(responseQuestion))
      if (allBasisSplitsPopulated && responseQuestionWithStats) {
        //get the response groups with stats
        const responseGroupsWithStats = responseQuestionWithStats.responseGroups;
        //get the points that need to be positioned within segments for this split.
        const pointsForSplit = points.filter((point) => basisSplitIndices.includes(point.fullySpecifiedSplitIndex))
        //collapsed segments - compute bounds and position points
        let currentX = 0;
        const segmentsCollapsed = responseGroupsWithStats.collapsed.map((rg, rgIdx) => {
          const pointsInSegment = pointsForSplit.filter((point: VizPoint) =>
            point.expandedResponseGroup.values.every((value: number) => rg.values.includes(value))
          );
          const widthToBeDistributed = (
            segmentGroup.width
            - (responseGroupsWithStats.collapsed.length - 1) * segmentVizConfig.responseGap
            - responseGroupsWithStats.collapsed.length * 2
          );
          const segmentBounds = {
            x: currentX,
            y: segmentGroup.y,
            width: 2 + widthToBeDistributed * rg.proportion,
            height: segmentGroup.height,
          };
          currentX += segmentBounds.width + segmentVizConfig.responseGap;
          return {
            ...segmentBounds,
            pointPositions: positionPointsInSegment(pointsInSegment, segmentBounds),
            responseGroupIndex: rgIdx
          };
        });

        //expanded segments - compute bounds and position points
        currentX = 0;
        const segmentsExpanded = responseGroupsWithStats.expanded.map((rg, rgIdx) => {
          const pointsInSegment = pointsForSplit.filter((point: VizPoint) => point.expandedResponseGroup.label === rg.label);
          const widthToBeDistributed = (
            segmentGroup.width
            - (responseGroupsWithStats.expanded.length - 1) * segmentVizConfig.responseGap
            - responseGroupsWithStats.expanded.length * 2
          );
          const segmentBounds = {
            x: currentX,
            y: segmentGroup.y,
            width: 2 + widthToBeDistributed * rg.proportion,
            height: segmentGroup.height,
          };
          currentX += segmentBounds.width + segmentVizConfig.responseGap;
          return {
            ...segmentBounds,
            pointPositions: positionPointsInSegment(pointsInSegment, segmentBounds),
            responseGroupIndex: rgIdx
          };
        })
        segmentGroups.push({
          splitIndex: splitIdx,
          segmentGroup: segmentGroup,
          segments: {
            collapsed: segmentsCollapsed,
            expanded: segmentsExpanded
          }
        })
      } else {
        segmentGroups.push({
          splitIndex: splitIdx,
          segmentGroup: segmentGroup,
          segments: null
        })
      }
    }
    vizMap.set(getQuestionKey(responseQuestion), {
      segmentGroups: segmentGroups,
      points: points
    })
  }
  return vizMap;
}

