import { ResponseQuestionChange, SplitDelta } from "../statistics";
import { ResponseQuestion, ResponseQuestionWithStats, Split } from "../types";
import { getQuestionKey } from '../utils';
import { computeSegmentBounds, positionPointsInSegment } from "./geometry";
import { PointSet, SegmentGroup, Segments, SegmentGroupSegmentsDelta, SegmentBoundsDelta, SegmentPointsDelta } from './types';

interface PopulateSegmentGroupSegmentsProps {
  responseQuestionWithStats: ResponseQuestionWithStats;
  basisPointSets: PointSet[];
  responseGap: number;
  baseWidth: number;
  segmentGroup: SegmentGroup;
}
export function populateSegmentGroupSegments({
  responseQuestionWithStats,
  basisPointSets,
  responseGap,
  baseWidth,
  segmentGroup
}: PopulateSegmentGroupSegmentsProps): Segments {
  const segments = {
    collapsed: computeSegmentBounds(
      responseQuestionWithStats.responseGroups.collapsed,
      segmentGroup.segmentGroup,
      responseGap,
      baseWidth
    ),
    expanded: computeSegmentBounds(
      responseQuestionWithStats.responseGroups.expanded,
      segmentGroup.segmentGroup,
      responseGap,
      baseWidth
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

interface PopulateVizSegmentsProps {
  responseQuestion: ResponseQuestion;
  responseGap: number;
  baseWidth: number;
  segmentGroups: SegmentGroup[];
  pointSets: PointSet[];
  allSplits: Split[];
}
export function populateVizSegments({
  responseQuestion,
  responseGap,
  baseWidth,
  segmentGroups,
  pointSets,
  allSplits
}: PopulateVizSegmentsProps): SegmentGroup[] {

  const hydratedSegmentGroups: SegmentGroup[] = [];

  //loop through the segment groups
  for (const segmentGroup of segmentGroups) {

    //segments in this segment group can be hydrated
    //only if AT LEAST ONE  basis split has data
    const atLeastOneBasisSplitHasData = allSplits
      .filter((_, splitIdx) => segmentGroup.basisSplitIndices.includes(splitIdx))
      .some((split) => {
        const matchedRQ = split.responseQuestions.find((rq) => getQuestionKey(rq) === getQuestionKey(responseQuestion))
        return (matchedRQ && matchedRQ.totalCount > 0)
      })

    //add to hydrated segment groups with segment field null
    //and skip if not all basis splits have data
    if (!atLeastOneBasisSplitHasData) {
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


    if (responseQuestionWithStats) {
      const populatedSegments = populateSegmentGroupSegments({
        responseQuestionWithStats: responseQuestionWithStats,
        basisPointSets: basisPointSets,
        responseGap: responseGap,
        baseWidth: baseWidth,
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

interface UpdateSegmentGroupsProps {
  responseQuestion: ResponseQuestion;
  staleSegmentGroups: SegmentGroup[];
  updatedPointSets: PointSet[];
  splitDeltas: SplitDelta[];
  allSplits: Split[];
  responseGap: number;
  baseWidth: number;
}
export function updateSegmentGroups({
  responseQuestion,
  staleSegmentGroups,
  updatedPointSets,
  splitDeltas,
  allSplits,
  responseGap
  ,
  baseWidth
}: UpdateSegmentGroupsProps): Array<{
  segmentGroup: SegmentGroup;
  delta: SegmentGroupSegmentsDelta | null;
}> {

  //compute the response question key
  const rqKey = getQuestionKey(responseQuestion)

  //filter the split deltas to those that affect the response question
  //and get only the deltas for the responseQuestion

  const rqSplitDeltas = splitDeltas
    .map((splitDelta) => ({
      splitIndex: splitDelta.splitIndex,
      rqChange: splitDelta.responseQuestionChanges.find((rqc) => rqc.responseQuestionKey === rqKey)
    }))
    .filter((rqc) => rqc.rqChange !== undefined) as {
      splitIndex: number;
      rqChange: ResponseQuestionChange
    }[]

  //If there are no changes at the current response question, return the staleSegmentGroups with null deltas
  if (rqSplitDeltas.length === 0) {
    return staleSegmentGroups.map(sg => ({
      segmentGroup: sg,
      delta: null
    }));
  }

  //If we get here, there are changes to the response question on some splits

  //create the array that will receive the results
  const results: Array<{
    segmentGroup: SegmentGroup;
    delta: SegmentGroupSegmentsDelta | null;
  }> = []

  //loop through the stale segment groups
  for (const staleSegmentGroup of staleSegmentGroups) {

    //from among the split delta where the response question changed,
    //find the one for this segment group
    const splitDelta = rqSplitDeltas.find((splitDelta) => splitDelta.splitIndex === staleSegmentGroup.splitIndex);

    //if the split for this segment group is not found in the list of split deltas
    //for this response question,
    //push the stale segment group unchanged with null delta and move to the next group.
    if (!splitDelta) {
      results.push({
        segmentGroup: staleSegmentGroup,
        delta: null
      });
      continue;
    }

    //get the updated basis point sets for this split
    const updatedBasisPointSets = updatedPointSets.filter((pointSet) =>
      staleSegmentGroup.basisSplitIndices.includes(pointSet.fullySpecifiedSplitIndex)
    )

    //get the updated response question with stats from the split
    const updatedResponseQuestionWithStats = allSplits[staleSegmentGroup.splitIndex]?.responseQuestions
      .find((rq) => getQuestionKey(rq) === getQuestionKey(responseQuestion));

    //if we can't find the response question in the split, push the stale segment group unchanged with null delta
    if (!updatedResponseQuestionWithStats) {
      results.push({
        segmentGroup: staleSegmentGroup,
        delta: null
      });
      continue;
    }

    const { updatedSegmentGroup, segmentGroupDelta } = updateSegmentGroupSegments({
      staleSegmentGroup: staleSegmentGroup,
      updatedResponseQuestionWithStats: updatedResponseQuestionWithStats,
      updatedBasisPointSets: updatedBasisPointSets,
      responseGap: responseGap,
      baseWidth: baseWidth
    })

    //push the updated segment group and delta to the results
    results.push({
      segmentGroup: updatedSegmentGroup,
      delta: segmentGroupDelta
    });
  }

  return results;

}

interface UpdateSegmentGroupSegmentsProps {
  staleSegmentGroup: SegmentGroup;
  updatedResponseQuestionWithStats: ResponseQuestionWithStats;
  updatedBasisPointSets: PointSet[];
  responseGap: number
  baseWidth: number;
}
export function updateSegmentGroupSegments({
  staleSegmentGroup,
  updatedResponseQuestionWithStats,
  updatedBasisPointSets,
  responseGap
  ,
  baseWidth
}: UpdateSegmentGroupSegmentsProps): {
  updatedSegmentGroup: SegmentGroup,
  segmentGroupDelta: SegmentGroupSegmentsDelta
} {

  // 1. Handle the case where segments were null (split was unpopulated)
  // Check if the split is now populated
  const splitIsNowPopulated = updatedResponseQuestionWithStats.totalCount > 0;

  if (staleSegmentGroup.segments === null) {
    if (!splitIsNowPopulated) {
      // Split was unpopulated and remains unpopulated
      return ({
        updatedSegmentGroup: staleSegmentGroup,
        segmentGroupDelta: {
          collapsed: {
            boundsDelta: [],
            pointsDelta: []
          },
          expanded: {
            boundsDelta: [],
            pointsDelta: []
          }
        }
      })
    }

    // Split is NEWLY POPULATED - create segments for the first time
    const newSegments = populateSegmentGroupSegments({
      responseQuestionWithStats: updatedResponseQuestionWithStats,
      basisPointSets: updatedBasisPointSets,
      responseGap: responseGap,
      baseWidth: baseWidth,
      segmentGroup: staleSegmentGroup
    });

    // Create deltas showing all segments and points as "added" (empty before state)
    const collapsedBoundsDelta: SegmentBoundsDelta[] = newSegments.collapsed.map(seg => ({
      responseGroupIndex: seg.responseGroupIndex,
      xBefore: 0,
      xAfter: seg.x,
      widthBefore: 0,
      widthAfter: seg.width
    }));

    const expandedBoundsDelta: SegmentBoundsDelta[] = newSegments.expanded.map(seg => ({
      responseGroupIndex: seg.responseGroupIndex,
      xBefore: 0,
      xAfter: seg.x,
      widthBefore: 0,
      widthAfter: seg.width
    }));

    const collapsedPointsDelta: SegmentPointsDelta[] = newSegments.collapsed.map(seg => ({
      responseGroupIndex: seg.responseGroupIndex,
      addedPoints: seg.pointPositions.map(pp => ({
        id: pp.id,
        x: pp.x,
        y: pp.y
      })),
      removedPoints: [],
      movedPoints: []
    }));

    const expandedPointsDelta: SegmentPointsDelta[] = newSegments.expanded.map(seg => ({
      responseGroupIndex: seg.responseGroupIndex,
      addedPoints: seg.pointPositions.map(pp => ({
        id: pp.id,
        x: pp.x,
        y: pp.y
      })),
      removedPoints: [],
      movedPoints: []
    }));

    return {
      updatedSegmentGroup: {
        ...staleSegmentGroup,
        segments: newSegments
      },
      segmentGroupDelta: {
        collapsed: {
          boundsDelta: collapsedBoundsDelta,
          pointsDelta: collapsedPointsDelta
        },
        expanded: {
          boundsDelta: expandedBoundsDelta,
          pointsDelta: expandedPointsDelta
        }
      }
    };
  }

  // 2. Extract the updated response groups from updatedResponseQuestionWithStats
  const updatedResponseGroups = {
    collapsed: updatedResponseQuestionWithStats.responseGroups.collapsed,
    expanded: updatedResponseQuestionWithStats.responseGroups.expanded
  }

  // 3. Compute new segment bounds for both collapsed and expanded using computeSegmentBounds
  // Pass the updated response groups, segment group bounds, and response gap
  // This is analogous to what populateSegmentGroupSegments does
  const newSegmentBounds = {
    collapsed: computeSegmentBounds(
      updatedResponseGroups.collapsed,
      staleSegmentGroup.segmentGroup,
      responseGap,
      baseWidth
    ),
    expanded: computeSegmentBounds(
      updatedResponseGroups.expanded,
      staleSegmentGroup.segmentGroup,
      responseGap,
      baseWidth
    )
  }

  // Initialize segments with bounds and empty point positions
  // We'll populate the point positions in the loop below
  const updatedSegments: Segments = {
    collapsed: newSegmentBounds.collapsed.map(bounds => ({
      ...bounds,
      pointPositions: []
    })),
    expanded: newSegmentBounds.expanded.map(bounds => ({
      ...bounds,
      pointPositions: []
    }))
  };

  const collapsedBoundsDelta: SegmentBoundsDelta[] = [];
  const collapsedPointsDelta: SegmentPointsDelta[] = [];
  const expandedBoundsDelta: SegmentBoundsDelta[] = [];
  const expandedPointsDelta: SegmentPointsDelta[] = [];

  // 4. For each view (collapsed and expanded)...
  for (const view of ["collapsed", "expanded"] as const) {
    const viewKey = view as "collapsed" | "expanded";

    //    a. Get the delta arrays for this view
    const boundsDelta = viewKey === "collapsed" ? collapsedBoundsDelta : expandedBoundsDelta;
    const pointsDelta = viewKey === "collapsed" ? collapsedPointsDelta : expandedPointsDelta;

    //    b. Loop through each segment to populate point positions and compute deltas
    updatedSegments[viewKey].forEach((segment) => {
      // Step b1
      // - Find the old segment bounds (from stale segments)
      const oldSegmentBounds = staleSegmentGroup.segments![viewKey][segment.responseGroupIndex];
      // - Create a SegmentBoundsDelta comparing old vs new x and width
      const segmentBoundsDelta: SegmentBoundsDelta = {
        responseGroupIndex: segment.responseGroupIndex,
        xBefore: oldSegmentBounds.x,
        xAfter: segment.x,
        widthBefore: oldSegmentBounds.width,
        widthAfter: segment.width
      };
      boundsDelta.push(segmentBoundsDelta);

      // Step b2       
      // - Get points that should be in this segment from updatedBasisPointSets
      //   (filter by responseGroupIndex for this view)
      const pointsInSegment = updatedBasisPointSets
        .filter((pointSet) => pointSet.responseGroupIndex[viewKey] === segment.responseGroupIndex)
        .flatMap((pointSet) => pointSet.currentIds);

      // Step b3
      // - Identify added points: points in updatedBasisPointSets.addedIds for this response group
      // - Identify removed points: points in updatedBasisPointSets.removedIds for this response group
      // - Identify persisted points: points that were in old segment and still in new segment
      const addedIds = updatedBasisPointSets
        .filter((pointSet) => pointSet.responseGroupIndex[viewKey] === segment.responseGroupIndex)
        .flatMap((pointSet) => pointSet.addedIds);

      const removedIds = updatedBasisPointSets
        .filter((pointSet) => pointSet.responseGroupIndex[viewKey] === segment.responseGroupIndex)
        .flatMap((pointSet) => pointSet.removedIds);

      const persistedIds = pointsInSegment.filter((id) => !addedIds.includes(id));

      // Step b4
      // - Position the added points in the new segment bounds using positionPointsInSegment
      // - For persisted points, get their old positions from stale segments
      // - Reposition ALL points (added + persisted) together in new segment bounds
      // - Compare old vs new positions to identify which points moved

      // Get old positions for persisted points from stale segments
      const oldPointPositions = oldSegmentBounds.pointPositions;
      const persistedOldPositions = new Map(
        persistedIds.map((id) => {
          const oldPos = oldPointPositions.find((pp) => pp.id === id);
          return [id, oldPos];
        }).filter(([, pos]) => pos !== undefined) as [string, typeof oldPointPositions[0]][]
      );

      // Position all points (added + persisted) in the new segment bounds
      const allNewPointPositions = positionPointsInSegment(pointsInSegment, segment);

      // Compare old vs new positions to identify moved points
      const movedPoints = persistedIds
        .map((id) => {
          const oldPos = persistedOldPositions.get(id);
          const newPos = allNewPointPositions.find((pp) => pp.id === id);
          if (oldPos && newPos && (oldPos.x !== newPos.x || oldPos.y !== newPos.y)) {
            return {
              id,
              xBefore: oldPos.x,
              yBefore: oldPos.y,
              xAfter: newPos.x,
              yAfter: newPos.y
            };
          }
          return null;
        })
        .filter((mp) => mp !== null) as {
          id: string;
          xBefore: number;
          yBefore: number;
          xAfter: number;
          yAfter: number;
        }[];

      // Get added and removed point positions
      const addedPoints = allNewPointPositions.filter((pp) => addedIds.includes(pp.id));
      const removedPoints = oldPointPositions.filter((pp) => removedIds.includes(pp.id));

      // Step b5
      // - Build SegmentPointsDelta with addedPoints, removedPoints, and movedPoints
      const segmentPointsDelta: SegmentPointsDelta = {
        responseGroupIndex: segment.responseGroupIndex,
        addedPoints: addedPoints,
        removedPoints: removedPoints,
        movedPoints: movedPoints
      };
      pointsDelta.push(segmentPointsDelta);

      // Populate the point positions for this segment
      segment.pointPositions = allNewPointPositions;
    });

  }

  // Updated segments are now complete with all bounds and point positions

  // 5. Create the updated SegmentGroup with new segments
  const updatedSegmentGroup: SegmentGroup = {
    ...staleSegmentGroup,
    segments: updatedSegments
  };

  // 6. Assemble and return the SegmentGroupSegmentsDelta with all bounds and points deltas
  const segmentGroupDelta: SegmentGroupSegmentsDelta = {
    collapsed: {
      boundsDelta: collapsedBoundsDelta,
      pointsDelta: collapsedPointsDelta
    },
    expanded: {
      boundsDelta: expandedBoundsDelta,
      pointsDelta: expandedPointsDelta
    }
  };

  // 7. Return both updatedSegmentGroup and segmentGroupSegmentsDelta
  return {
    updatedSegmentGroup,
    segmentGroupDelta
  };

}