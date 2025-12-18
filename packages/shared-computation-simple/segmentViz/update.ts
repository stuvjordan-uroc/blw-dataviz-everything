import { Split } from "../statistics/types";
import { updateSplitFromBasisSplits, updateSplitFromResponses } from "../statistics/updateSplit";
import { getSyntheticCounts } from "./syntheticCounts";
import { SegmentVizConfig, SplitWithSegmentGroup, Point, SplitWithSegmentGroupDiff } from './types';
import { computeSegmentBounds, positionPointsInSegment, positionNewPointsAmongExisting } from "./geometry";


/**
 * Returns updates and diffs of each split in allSplits.  Does not mutate any split in allSplits.
 * 
 * This function does not validate that allSplits is complete, nor whether basisSplitIndices
 * is correct, given the ordering of allSplits.
 * 
 * @param allSplits 
 * @param basisSplitIndices 
 * @param responses 
 * @param segmentVizConfig 
 * @returns array of tuples [SplitWithSegmentGroup, SplitWithSegmentGroupDiff], one tuple for each split, in order of allSplits
 */
export function updateAllSplitsWithSegmentsFromResponses(
  allSplits: SplitWithSegmentGroup[],
  basisSplitIndices: number[],
  responses: { basisSplitIndex: number, expandedResponseGroupIndex: number, weight: number }[],
  segmentVizConfig: SegmentVizConfig
): [SplitWithSegmentGroup, SplitWithSegmentGroupDiff][] {
  //build a map that takes basis split indices to responses
  const responseMap: Map<number, { expandedResponseGroupIndex: number, weight: number }[]> = new Map()
  for (const response of responses) {
    const responsesAtIndex = responseMap.get(response.basisSplitIndex)
    if (responsesAtIndex) {
      responsesAtIndex.push(response)
    } else {
      responseMap.set(response.basisSplitIndex, [response])
    }
  }
  //generate the updated basis splits
  const updatedBasisSplitMap: Map<number, [SplitWithSegmentGroup, SplitWithSegmentGroupDiff]> = new Map()
  for (const basisSplitIndex of basisSplitIndices) {
    const responsesForSplit = responseMap.get(basisSplitIndex);
    if (responsesForSplit) {
      updatedBasisSplitMap.set(
        basisSplitIndex,
        updateBasisSplitWithSegmentsFromResponses(
          allSplits[basisSplitIndex],
          responsesForSplit,
          segmentVizConfig
        )
      )
    } else {
      updatedBasisSplitMap.set(
        basisSplitIndex,
        [allSplits[basisSplitIndex], generateNoChangeDiff(allSplits[basisSplitIndex])]
      )
    }
  }
  //update all the splits using the updated basis splits
  const updatedSplits: [SplitWithSegmentGroup, SplitWithSegmentGroupDiff][] = []
  allSplits.forEach((split, splitIdx) => {
    const isOwnBasisSplit = updatedBasisSplitMap.get(splitIdx)
    if (isOwnBasisSplit) {
      updatedSplits.push(isOwnBasisSplit)
    }
    else {
      const basisSplitUpdatesForSplit = Array
        .from(updatedBasisSplitMap.entries())
        .filter(([basisSplitIndex,]) => split.basisSplitIndices.includes(basisSplitIndex))
        .map(([_, basisSplitUpdate]) => basisSplitUpdate)
      updatedSplits.push(
        updateSplitWithSegmentsFromUpdatedBasisSplitsWithSegments(
          split,
          basisSplitUpdatesForSplit.map(([updatedBasisSplit]) => updatedBasisSplit),
          basisSplitUpdatesForSplit.map(([_, basisSplitDiff]) => basisSplitDiff),
          segmentVizConfig
        )
      )
    }
  })
  return updatedSplits
}

/**
 * Returns a diff representing no changes to the passed split.
 * 
 * @param split 
 * @returns SplitWithSegmentGroupDiff
 */
export function generateNoChangeDiff(split: SplitWithSegmentGroup): SplitWithSegmentGroupDiff {
  return {
    stats: {
      totalCount: 0,
      totalWeight: 0,
      responseGroups: {
        collapsed: split.responseGroups.collapsed.map((crg) => ({
          ...crg,
          totalCount: 0,
          totalWeight: 0,
          proportion: 0
        })),
        expanded: split.responseGroups.expanded.map((erg) => ({
          ...erg,
          totalCount: 0,
          totalWeight: 0,
          proportion: 0
        }))
      }
    },
    points: {
      added: [],
      removed: []
    },
    segments: {
      collapsed: split.responseGroups.collapsed.map((_) => ({
        x: 0,
        y: 0,
        width: 0,
        height: 0
      })),
      expanded: split.responseGroups.expanded.map((_) => ({
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }))
    },
    pointPositions: {
      collapsed: split.responseGroups.collapsed.map((crg) => crg.pointPositions.map((point) => ({ point: point.point, x: 0, y: 0 }))),
      expanded: split.responseGroups.expanded.map((crg) => crg.pointPositions.map((point) => ({ point: point.point, x: 0, y: 0 })))
    }
  }
}

/**
 * returns an update of the passed split and a diff, given passed updates and diffs of that split's
 * basis split.
 * 
 * DOES NOT MUTATE THE PASSED SPLIT.
 * 
 * This function does not validate whether the basis splits passed the basis splits that actually 
 * are the basis splits for the passed splits.  If you pass it invalid data, it will return 
 * seemingly valid but actually invalid nonsense.
 * 
 * @param split 
 * @param updatedBasisSplits 
 * @param updatedBasisSplitDiffs 
 * @param segmentVizConfig 
 * @returns 
 */
export function updateSplitWithSegmentsFromUpdatedBasisSplitsWithSegments(
  split: SplitWithSegmentGroup,
  updatedBasisSplits: SplitWithSegmentGroup[],
  updatedBasisSplitDiffs: SplitWithSegmentGroupDiff[],
  segmentVizConfig: SegmentVizConfig
): [SplitWithSegmentGroup, SplitWithSegmentGroupDiff] {
  //update the statistics on the split
  const [splitStatsUpdated, splitDiff] = updateSplitFromBasisSplits(split, updatedBasisSplits)
  //update the points.  Since this not a basis splits, points are left empty
  const pointsUpdated = {
    added: [],
    removed: []
  }
  const pointsDiff = {
    added: [],
    removed: []
  }
  //update the segment bounds
  const segmentBoundsUpdated = {
    collapsed: computeSegmentBounds(
      splitStatsUpdated.responseGroups.collapsed,
      split.segmentGroupBounds,
      segmentVizConfig.responseGap,
      segmentVizConfig.baseSegmentWidth
    ),
    expanded: computeSegmentBounds(
      splitStatsUpdated.responseGroups.expanded,
      split.segmentGroupBounds,
      segmentVizConfig.responseGap,
      segmentVizConfig.baseSegmentWidth
    )
  }
  //create the segment bounds diff
  const segmentBoundsDiff = {
    collapsed: segmentBoundsUpdated.collapsed.map((seg, segIdx) => {
      const previous = split.responseGroups.collapsed[segIdx].bounds,
      return ({
        x: seg.x - previous.x,
        y: seg.y - previous.y,
        width: seg.width - previous.width,
        height: seg.height - previous.height
      })
    }),
    expanded: segmentBoundsUpdated.expanded.map((seg, segIdx) => {
      const previous = split.responseGroups.expanded[segIdx].bounds,
      return ({
        x: seg.x - previous.x,
        y: seg.y - previous.y,
        width: seg.width - previous.width,
        height: seg.height - previous.height
      })
    })
  }
  //update the point positions
  //create the merged point sets
  const mergedPoints: Point[][] = [];
  for (const basisSplit of updatedBasisSplits) {
    basisSplit.points.forEach((pointSet, pointSetIdx) => {
      if (!mergedPoints[pointSetIdx]) {
        mergedPoints[pointSetIdx] = [];
      }
      mergedPoints[pointSetIdx].push(...pointSet);
    });
  }
  //map expanded response group indices to collapsed response group indices
  const rgMap: Map<number, number | undefined> = new Map()
  for (let ergIdx = 0; ergIdx < segmentVizConfig.responseQuestion.responseGroups.expanded.length; ergIdx++) {
    rgMap.set(
      ergIdx,
      segmentVizConfig.responseQuestion.responseGroups.collapsed.findIndex((crg) => (
        segmentVizConfig.responseQuestion.responseGroups.expanded[ergIdx].values.every((ev) =>
          crg.values.includes(ev)
        )
      ))
    )
  }
  //construct the updated point positions
  const pointPositionsUpdated = {
    expanded: splitStatsUpdated.responseGroups.expanded.map((_, ergIdx) => {
      const oldBounds = split.responseGroups.expanded[ergIdx].bounds;
      const widthChangePercent = Math.abs(segmentBoundsDiff.expanded[ergIdx].width) / oldBounds.width;

      // Collect added and removed points for this response group
      const addedPoints: Point[] = [];
      const removedPoints: Point[] = [];
      for (const basisSplitDiff of updatedBasisSplitDiffs) {
        if (basisSplitDiff.points.added[ergIdx]) {
          addedPoints.push(...basisSplitDiff.points.added[ergIdx]);
        }
        if (basisSplitDiff.points.removed[ergIdx]) {
          removedPoints.push(...basisSplitDiff.points.removed[ergIdx]);
        }
      }

      const hasPointsChanged = addedPoints.length > 0 || removedPoints.length > 0;
      const hasSignificantWidthChange = widthChangePercent > 0.1;

      if (hasSignificantWidthChange) {
        // Width changed by >10%, do full recomputation
        return positionPointsInSegment(mergedPoints[ergIdx], segmentBoundsUpdated.expanded[ergIdx]);
      } else if (hasPointsChanged) {
        // Width changed by ≤10% but points changed, use incremental update
        return positionNewPointsAmongExisting(
          split.responseGroups.expanded[ergIdx].pointPositions,
          removedPoints,
          addedPoints,
          segmentBoundsUpdated.expanded[ergIdx]
        );
      }
      // No change, return the same point positions
      return split.responseGroups.expanded[ergIdx].pointPositions;
    }),
    collapsed: splitStatsUpdated.responseGroups.collapsed.map((_, crgIdx) => {
      //get the required expanded response groups
      const ergIndices: number[] = [];
      rgMap.forEach((candCrgIdx, ergIdx) => {
        if (candCrgIdx && candCrgIdx === crgIdx) {
          ergIndices.push(ergIdx);
        }
      });

      const oldBounds = split.responseGroups.collapsed[crgIdx].bounds;
      const widthChangePercent = Math.abs(segmentBoundsDiff.collapsed[crgIdx].width) / oldBounds.width;

      // Collect added and removed points for all expanded response groups in this collapsed group
      const addedPoints: Point[] = [];
      const removedPoints: Point[] = [];
      for (const ergIdx of ergIndices) {
        for (const basisSplitDiff of updatedBasisSplitDiffs) {
          if (basisSplitDiff.points.added[ergIdx]) {
            addedPoints.push(...basisSplitDiff.points.added[ergIdx]);
          }
          if (basisSplitDiff.points.removed[ergIdx]) {
            removedPoints.push(...basisSplitDiff.points.removed[ergIdx]);
          }
        }
      }

      const hasPointsChanged = addedPoints.length > 0 || removedPoints.length > 0;
      const hasSignificantWidthChange = widthChangePercent > 0.1;

      if (hasSignificantWidthChange) {
        // Width changed by >10%, do full recomputation
        return positionPointsInSegment(
          ergIndices.flatMap((ergIdx) => mergedPoints[ergIdx]),
          segmentBoundsUpdated.collapsed[crgIdx]
        );
      } else if (hasPointsChanged) {
        // Width changed by ≤10% but points changed, use incremental update
        return positionNewPointsAmongExisting(
          split.responseGroups.collapsed[crgIdx].pointPositions,
          removedPoints,
          addedPoints,
          segmentBoundsUpdated.collapsed[crgIdx]
        );
      }
      // No change, return the same point positions
      return split.responseGroups.collapsed[crgIdx].pointPositions;
    })
  }

  const pointPositionsDiff = {
    expanded: pointPositionsUpdated.expanded.map((pointPositions, segIdx) =>
      pointPositions.map((point) => {
        const oldPosition = split.responseGroups.expanded[segIdx].pointPositions.find((cp) => cp.point.id === point.point.id)
        return (oldPosition) ? { point: point.point, x: point.x - oldPosition.x, y: point.y - oldPosition.y } : null
      })
    ),
    collapsed: pointPositionsUpdated.collapsed.map((pointPositions, segIdx) =>
      pointPositions.map((point) => {
        const oldPosition = split.responseGroups.collapsed[segIdx].pointPositions.find((cp) => (cp.point.id === point.point.id && cp.point.expandedResponseGroupIdx === point.point.expandedResponseGroupIdx))
        return (oldPosition) ? { point: point.point, x: point.x - oldPosition.x, y: point.y - oldPosition.y } : null
      })
    )
  }

  return [
    {
      ...splitStatsUpdated,
      segmentGroupBounds: split.segmentGroupBounds,
      points: [],
      responseGroups: {
        collapsed: splitStatsUpdated.responseGroups.collapsed.map((crg, crgIdx) => ({
          ...crg,
          bounds: segmentBoundsUpdated.collapsed[crgIdx],
          pointPositions: pointPositionsUpdated.collapsed[crgIdx]
        })),
        expanded: splitStatsUpdated.responseGroups.collapsed.map((erg, ergIdx) => ({
          ...erg,
          bounds: segmentBoundsUpdated.collapsed[ergIdx],
          pointPositions: pointPositionsUpdated.collapsed[ergIdx]
        }))
      }
    },
    {
      stats: splitDiff,
      points: { added: [], removed: [] },
      segments: segmentBoundsDiff,
      pointPositions: pointPositionsDiff
    }
  ]
}

/**
 * Takes a basisSplit, an array of responses, and a segmentVizConfig.
 * updates the basis split, given the passed responses, using
 * the segementVizConfig for segment lengths and synthetic sample size.
 * 
 * Note that this does not validate that the passed split is a basis split.
 * If you pass it a partial split, this function silently returns
 * an invalid result
 * 
 * DOES NOT MUTATE THE PASSED BASIS SPLIT
 * 
 * @param basisSplit 
 * @param responses 
 * @param segmentVizConfig 
 * @returns [SplitWithSegmentGroup, SplitWithSegmentGroupDiff]
 */
export function updateBasisSplitWithSegmentsFromResponses(
  basisSplit: SplitWithSegmentGroup,
  responses: { expandedResponseGroupIndex: number, weight: number }[],
  segmentVizConfig: SegmentVizConfig
): [SplitWithSegmentGroup, SplitWithSegmentGroupDiff] {
  //update the statistics
  //note this returns a deep copy, not updating the split
  const [newSplitStats, statsDiff] = updateSplitFromResponses(basisSplit, responses)

  //update points
  //does not mutate the passed array of points.
  const [newPoints, pointsDiff] = updateBasisSplitPoints(basisSplit.points, newSplitStats, segmentVizConfig.syntheticSampleSize)

  //within each response group...
  //(1) update the segment bounds
  const segmentsUpdated = {
    collapsed: computeSegmentBounds(
      newSplitStats.responseGroups.collapsed,
      basisSplit.segmentGroupBounds,
      segmentVizConfig.responseGap,
      segmentVizConfig.baseSegmentWidth
    ),
    expanded: computeSegmentBounds(
      newSplitStats.responseGroups.expanded,
      basisSplit.segmentGroupBounds,
      segmentVizConfig.responseGap,
      segmentVizConfig.baseSegmentWidth
    )
  }
  const segmentsDiff = {
    collapsed: segmentsUpdated.collapsed.map((seg, segIdx) => {
      const previous = basisSplit.responseGroups.collapsed[segIdx].bounds;
      return ({
        x: seg.x - previous.x,
        y: seg.y - previous.y,
        width: seg.width - previous.width,
        height: seg.height - previous.height
      })
    }),
    expanded: segmentsUpdated.expanded.map((seg, segIdx) => {
      const previous = basisSplit.responseGroups.expanded[segIdx].bounds;
      return ({
        x: seg.x - previous.x,
        y: seg.y - previous.y,
        width: seg.width - previous.width,
        height: seg.height - previous.height
      })
    })
  }
  //(2) update the point positions within each segment

  //we need a map that takes expanded response group indices
  //to collapsed response group indices
  const rgMap: Map<number, number | undefined> = new Map()
  for (let ergIdx = 0; ergIdx < segmentVizConfig.responseQuestion.responseGroups.expanded.length; ergIdx++) {
    rgMap.set(
      ergIdx,
      segmentVizConfig.responseQuestion.responseGroups.collapsed.findIndex((crg) => (
        segmentVizConfig.responseQuestion.responseGroups.expanded[ergIdx].values.every((ev) =>
          crg.values.includes(ev)
        )
      ))
    )
  }

  const pointPositionsUpdated = {
    expanded: segmentsUpdated.expanded.map((seg, segIdx) => {
      const oldBounds = basisSplit.responseGroups.expanded[segIdx].bounds;
      const widthChangePercent = Math.abs(segmentsDiff.expanded[segIdx].width) / oldBounds.width;

      const hasPointsChanged = pointsDiff.added[segIdx].length > 0 || pointsDiff.removed[segIdx].length > 0;
      const hasSignificantWidthChange = widthChangePercent > 0.1;

      if (hasSignificantWidthChange) {
        // Width changed by >10%, do full recomputation
        return positionPointsInSegment(newPoints[segIdx], seg);
      } else if (hasPointsChanged) {
        // Width changed by ≤10% but points changed, use incremental update
        return positionNewPointsAmongExisting(
          basisSplit.responseGroups.expanded[segIdx].pointPositions,
          pointsDiff.removed[segIdx],
          pointsDiff.added[segIdx],
          seg
        );
      }
      // No change, return the same point positions
      return basisSplit.responseGroups.expanded[segIdx].pointPositions;
    }),
    collapsed: segmentsUpdated.collapsed.map((seg, segIdx) => {
      //get expanded response group indices for this collapsed response group
      const ergIndices: number[] = [];
      rgMap.forEach((crgIdx, ergIdx) => {
        if (segIdx === crgIdx) {
          ergIndices.push(ergIdx);
        }
      });

      const oldBounds = basisSplit.responseGroups.collapsed[segIdx].bounds;
      const widthChangePercent = Math.abs(segmentsDiff.collapsed[segIdx].width) / oldBounds.width;

      // Collect added and removed points for all expanded response groups in this collapsed group
      const addedPoints = ergIndices.flatMap((ergIdx) => pointsDiff.added[ergIdx]);
      const removedPoints = ergIndices.flatMap((ergIdx) => pointsDiff.removed[ergIdx]);

      const hasPointsChanged = addedPoints.length > 0 || removedPoints.length > 0;
      const hasSignificantWidthChange = widthChangePercent > 0.1;

      if (hasSignificantWidthChange) {
        // Width changed by >10%, do full recomputation
        return positionPointsInSegment(
          ergIndices.flatMap((ergIdx) => newPoints[ergIdx]),
          seg
        );
      } else if (hasPointsChanged) {
        // Width changed by ≤10% but points changed, use incremental update
        return positionNewPointsAmongExisting(
          basisSplit.responseGroups.collapsed[segIdx].pointPositions,
          removedPoints,
          addedPoints,
          seg
        );
      }
      // No change, return the same point positions
      return basisSplit.responseGroups.collapsed[segIdx].pointPositions;
    })
  }

  const pointPositionsDiff = {
    expanded: pointPositionsUpdated.expanded.map((pointPositions, segIdx) =>
      pointPositions.map((point) => {
        const oldPosition = basisSplit.responseGroups.expanded[segIdx].pointPositions.find((cp) => cp.point.id === point.point.id)
        return (oldPosition) ? { point: point.point, x: point.x - oldPosition.x, y: point.y - oldPosition.y } : null
      })
    ),
    collapsed: pointPositionsUpdated.collapsed.map((pointPositions, segIdx) =>
      pointPositions.map((point) => {
        const oldPosition = basisSplit.responseGroups.collapsed[segIdx].pointPositions.find((cp) => (cp.point.id === point.point.id && cp.point.expandedResponseGroupIdx === point.point.expandedResponseGroupIdx))
        return (oldPosition) ? { point: point.point, x: point.x - oldPosition.x, y: point.y - oldPosition.y } : null
      })
    )
  }

  return [
    {
      ...newSplitStats,
      segmentGroupBounds: basisSplit.segmentGroupBounds,
      points: newPoints,
      responseGroups: {
        collapsed: newSplitStats.responseGroups.collapsed.map((crg, crgIdx) => ({
          ...crg,
          bounds: segmentsUpdated.collapsed[crgIdx],
          pointPositions: pointPositionsUpdated.collapsed[crgIdx]
        })),
        expanded: newSplitStats.responseGroups.expanded.map((erg, ergIdx) => ({
          ...erg,
          bounds: segmentsUpdated.expanded[ergIdx],
          pointPositions: pointPositionsUpdated.expanded[ergIdx]
        }))
      }
    },
    {
      stats: statsDiff,
      points: pointsDiff,
      segments: segmentsDiff,
      pointPositions: pointPositionsDiff
    }
  ]
}

/**
 * Takes an array of points, a split assumed to hold updated statistics
 * and an optional synthetic sample size.  Updates the array of points
 * and generates a diff of the updated points.
 * 
 * DOES NOT MUTATE THE PASSED ARRAY OF POINTS.
 * 
 * @param currentPoints 
 * @param updatedSplitStats 
 * @param syntheticSampleSize 
 * @returns [Points[][], {added: Point[][], removed: Point[][]}]
 */
export function updateBasisSplitPoints(
  currentPoints: Point[][],
  updatedSplitStats: Split,
  syntheticSampleSize?: number
): [Point[][], { added: Point[][], removed: Point[][] }] {
  //get the updated counts
  const updatedCounts = (syntheticSampleSize) ?
    getSyntheticCounts({ responseGroups: updatedSplitStats.responseGroups.expanded, syntheticSampleSize: syntheticSampleSize }) :
    updatedSplitStats.responseGroups.expanded.map((rg) => rg.totalCount)
  //create the new points and diff
  const newPoints: Point[][] = [];
  const diff = {
    added: [] as Point[][],
    removed: [] as Point[][]
  }
  updatedCounts.forEach((count, ergIdx) => {
    //get the existing point set for the current response group
    const existing = currentPoints[ergIdx] ?? [];
    const existingLength = existing.length;
    if (existingLength < count) {
      const lastExistingId = (existingLength > 0) ? existing[existingLength - 1].id : -1
      const additionalPoints = Array(count - existing.length).map((_, idx) => ({
        splitIdx: updatedSplitStats.basisSplitIndices[0],
        expandedResponseGroupIdx: ergIdx,
        id: lastExistingId + 1 + idx
      }))
      newPoints.push([
        ...existing,
        ...additionalPoints
      ])
      diff.added.push(additionalPoints)
      diff.removed.push([])
    }
    if (existingLength > count) {
      const retainedPoints = existing.slice(0, count);
      newPoints.push([...retainedPoints]);
      diff.added.push([]);
      diff.removed.push(existing.slice(count))
    }
    if (existingLength === count) {
      newPoints.push(existing);
      diff.added.push([]);
      diff.removed.push([]);
    }
  })
  return [newPoints, diff]
}




