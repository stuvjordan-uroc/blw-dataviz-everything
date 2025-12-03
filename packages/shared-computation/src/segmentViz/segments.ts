import { ResponseQuestion, ResponseQuestionWithStats, Split } from "../types";
import { getQuestionKey } from '../utils';
import { computeSegmentBounds, positionPointsInSegment } from "./geometry";
import { PointSet, SegmentGroup, Segments } from "./types";

interface PopulateSegmentGroupSegmentsProps {
  responseQuestionWithStats: ResponseQuestionWithStats;
  basisPointSets: PointSet[];
  responseGap: number;
  segmentGroup: SegmentGroup;
}
export function populateSegmentGroupSegments({
  responseQuestionWithStats,
  basisPointSets,
  responseGap,
  segmentGroup
}: PopulateSegmentGroupSegmentsProps): Segments {
  const segments = {
    collapsed: computeSegmentBounds(
      responseQuestionWithStats.responseGroups.collapsed,
      segmentGroup.segmentGroup,
      responseGap
    ),
    expanded: computeSegmentBounds(
      responseQuestionWithStats.responseGroups.expanded,
      segmentGroup.segmentGroup,
      responseGap
    )
  }
  return ({
    expanded: segments.expanded.map((segmentBounds) => {
      const pointsInSegment = basisPointSets
        .filter((pointSet) => pointSet.responseGroupIndex.expanded === segmentBounds.responseGroupIndex)
        .flatMap((pointSet) => pointSet.currentIds)
      const pointPositions = positionPointsInSegment(pointsInSegment, segmentBounds)
      return ({
        ...segmentBounds,
        pointPositions: pointPositions
      })
    }),
    collapsed: segments.collapsed.map((segmentBounds) => {
      const pointsInSegment = basisPointSets
        .filter((pointSet) => pointSet.responseGroupIndex.collapsed === segmentBounds.responseGroupIndex)
        .flatMap((pointSet) => pointSet.currentIds)
      const pointPositions = positionPointsInSegment(pointsInSegment, segmentBounds)
      return ({
        ...segmentBounds,
        pointPositions: pointPositions
      })
    })
  })
}

interface PopulateSegmentsProps {
  responseQuestion: ResponseQuestion;
  responseGap: number;
  segmentGroups: SegmentGroup[];
  pointSets: PointSet[];
  allSplits: Split[];
}
export function populateVizSegments({
  responseQuestion,
  responseGap,
  segmentGroups,
  pointSets,
  allSplits
}: PopulateSegmentsProps): SegmentGroup[] {

  const hydratedSegmentGroups: SegmentGroup[] = [];

  //loop through the segment groups
  for (const segmentGroup of segmentGroups) {

    //segments in this segment group can be hydrated
    //only if all the basis splits have data
    const allBasisSplitsHaveData = allSplits
      .filter((_, splitIdx) => segmentGroup.basisSplitIndices.includes(splitIdx))
      .every((split) => {
        const matchedRQ = split.responseQuestions.find((rq) => getQuestionKey(rq) === getQuestionKey(responseQuestion))
        return (matchedRQ && matchedRQ.totalCount > 0)
      })

    //add to hydrated segment groups with segment field null
    //and skip if not all basis splits have data
    if (!allBasisSplitsHaveData) {
      hydratedSegmentGroups.push({
        ...segmentGroup,
        segments: null
      })
      continue;
    }

    //this segment group can be hydrated!

    //get the data for response question from the segment's split
    const responseQuestionWithStats = allSplits[segmentGroup.splitIndex]?.responseQuestions
      .find((rq) => getQuestionKey(rq) === getQuestionKey(responseQuestion))

    //get the pointSets from the segment's basis splits
    const basisPointSets = pointSets.filter((pointSet) =>
      segmentGroup.basisSplitIndices.includes(pointSet.fullySpecifiedSplitIndex)
    )

    if (responseQuestionWithStats && basisPointSets.length === segmentGroup.basisSplitIndices.length) {
      const populatedSegments = populateSegmentGroupSegments({
        responseQuestionWithStats: responseQuestionWithStats,
        basisPointSets: basisPointSets,
        responseGap: responseGap,
        segmentGroup: segmentGroup
      })
      hydratedSegmentGroups.push({
        ...segmentGroup,
        segments: populatedSegments
      })
      continue;
    }

    //if we get here, the segment group's basis splits are hydrated.
    //but we either
    //(1) can't find the segment's split
    //(2) couldn't find all the point sets for the segment group's basis splits.
    //either way, we don't have the data we need to hydrate the segments!
    hydratedSegmentGroups.push({
      ...segmentGroup,
      segments: null
    })
  }
  return hydratedSegmentGroups
}