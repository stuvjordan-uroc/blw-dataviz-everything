import { GroupingQuestion, ResponseQuestion, Split, Group, ResponseGroupWithStats } from "shared-schemas";
import { SegmentVizConfig, VizPoint, PointPosition, SegmentGroup } from "./types";
import { Statistics } from "../statistics";
import { getQuestionKey } from '../utils';

function getActiveQuestionsInSplit(
  split: Split,
  groupingQuestionsX: GroupingQuestion[],
  groupingQuestionsY: GroupingQuestion[]
): { x: (GroupingQuestion & { rgIdx: number })[]; y: (GroupingQuestion & { rgIdx: number })[] } {
  const activeQuestionsX = [];
  gqLoop: for (const gq of groupingQuestionsX) {
    //search through the question sin the split to find a match...
    for (const group of split.groups) {
      if (
        getQuestionKey(group.question) === getQuestionKey(gq) &&
        group.responseGroup !== null
      ) {
        //found an active question that is a match!
        let rgIdx = 0;
        //search through the response groups on the current question
        for (const rg of gq.responseGroups) {
          if (rg.label === group.responseGroup.label) {
            //gq is an active question, and we've identified its response group in the split
            //add the question to the active questions array
            activeQuestionsX.push({
              ...gq,
              rgIdx: rgIdx
            })
            //now break to the next grouping question
            continue gqLoop;
          }
          //the current response group is not a match, so increment the index
          //because we're going to the next response group
          rgIdx++;
        }
      }
    }
  }
  const activeQuestionsY = [];
  gqLoop: for (const gq of groupingQuestionsY) {
    //search through the question sin the split to find a match...
    for (const group of split.groups) {
      if (
        getQuestionKey(group.question) === getQuestionKey(gq) &&
        group.responseGroup !== null
      ) {
        //found an active question that is a match!
        let rgIdx = 0;
        //search through the response groups on the current question
        for (const rg of gq.responseGroups) {
          if (rg.label === group.responseGroup.label) {
            //gq is an active question, and we've identified its response group in the split
            //add the question to the active questions array
            activeQuestionsY.push({
              ...gq,
              rgIdx: rgIdx
            })
            //now break to the next grouping question
            continue gqLoop;
          }
          //the current response group is not a match, so increment the index
          //because we're going to the next response group
          rgIdx++;
        }
      }
    }
  }
  return ({
    x: activeQuestionsX,
    y: activeQuestionsY
  })
}

/**
 * given an object with arrays of active grouping questions on the x and y axis,
 * returns the numbers of segment groups on each axis.
 * @param groupingQuestions 
 * @returns object with properties x -- number of segment groups on x axis -- and y -- number of segment groups on y axis.
 */
function getNumberSegmentGroups(groupingQuestions: { x: GroupingQuestion[], y: GroupingQuestion[] }): { x: number, y: number } {
  return ({
    x: groupingQuestions.x
      .map((gq) => gq.responseGroups.length)
      .reduce((acc, curr) => acc * Math.max(1, curr), 1),
    y: groupingQuestions.y
      .map((gq) => gq.responseGroups.length)
      .reduce((acc, curr) => acc * Math.max(1, curr), 1)
  })
}

/**
 * Computes the zero-based column and row indices for a cell in the segment group grid.
 * 
 * The grid is defined by the cartesian product of response groups along each axis.
 * Questions earlier in the array vary more slowly (outer dimensions),
 * while questions later in the array vary faster (inner dimensions).
 * 
 * @param activeQuestions - Active grouping questions on x and y axes with their response group indices
 * @returns Object with xIdx (column index) and yIdx (row index)
 */
function getIndices(activeQuestions: { x: (GroupingQuestion & { rgIdx: number })[]; y: (GroupingQuestion & { rgIdx: number })[] }): { x: number, y: number } {
  // Compute x index (column)
  let x = 0;
  for (const q of activeQuestions.x) {
    x = x * q.responseGroups.length + q.rgIdx;
  }

  // Compute y index (row)
  let y = 0;
  for (const q of activeQuestions.y) {
    y = y * q.responseGroups.length + q.rgIdx;
  }

  return { x, y };
}

function addSyntheticCounts(
  responseGroupsWithStats: ResponseGroupWithStats[],
  totalCount: number
): (ResponseGroupWithStats & { syntheticCount: number })[] {
  if (typeof totalCount !== 'number' || Number.isNaN(totalCount) || !Number.isFinite(totalCount)) {
    throw new Error('totalCount must be a finite number');
  }

  const totalCountFloor = Math.floor(totalCount);

  // If floor is not strictly positive, set syntheticCount = 0 for every element
  if (totalCountFloor <= 0) {
    return responseGroupsWithStats.map((rg) => ({ ...rg, syntheticCount: 0 }));
  }

  const n = responseGroupsWithStats.length;
  if (n === 0) return [];

  // Compute raw targets and floor them
  const rawTargets = responseGroupsWithStats.map((rg) => {
    const p = (typeof rg.proportion === 'number' && isFinite(rg.proportion) && rg.proportion >= 0) ? rg.proportion : 0;
    return p * totalCountFloor;
  });

  const floored = rawTargets.map((t) => Math.floor(t));
  let allocatedSum = floored.reduce((a, b) => a + b, 0);

  // If allocatedSum already equals target, return
  const remainder = totalCountFloor - allocatedSum;
  if (remainder === 0) {
    return responseGroupsWithStats.map((rg, i) => ({ ...rg, syntheticCount: floored[i] }));
  }

  // Compute fractional errors and sort by largest fractional part (descending).
  const fracInfo = rawTargets.map((t, i) => ({ i, frac: t - Math.floor(t), prop: responseGroupsWithStats[i].proportion || 0 }));
  // Sort by fractional part desc, tie-break by proportion desc, then index asc
  fracInfo.sort((a, b) => {
    if (b.frac !== a.frac) return b.frac - a.frac;
    if (b.prop !== a.prop) return b.prop - a.prop;
    return a.i - b.i;
  });

  // Distribute the remaining 1-by-1 to the items with largest fractional parts
  const resultCounts = floored.slice();
  for (let k = 0; k < remainder; k++) {
    const idx = fracInfo[k].i;
    resultCounts[idx] = resultCounts[idx] + 1;
  }

  return responseGroupsWithStats.map((rg, i) => ({ ...rg, syntheticCount: resultCounts[i] }));
}

interface InitializePointsProps {
  responseQuestion: ResponseQuestion;
  allSplits: Split[];
  groupingQuestionsExcludedKeys: string[];
  groupingQuestionsX: GroupingQuestion[];
  groupingQuestionsY: GroupingQuestion[];
  syntheticSampleSize?: number
}

function initializePoints(
  {
    responseQuestion,
    allSplits,
    groupingQuestionsExcludedKeys,
    groupingQuestionsX,
    groupingQuestionsY,
    syntheticSampleSize
  }: InitializePointsProps
): VizPoint[] {
  const points: VizPoint[] = [];
  let splitIdx = -1;
  for (const split of allSplits) {
    splitIdx++;
    //get the grouping question keys that are null at this split
    const nullKeys = split.groups
      .filter((group) => group.responseGroup === null)
      .map((group) => getQuestionKey(group.question))


    //if any of the excluded grouping questions are NOT in the list of null questions on this split,
    //move on to the next split.
    if (groupingQuestionsExcludedKeys.some((gqKey) => !nullKeys.includes(gqKey))) {
      continue;
    }

    //This split is needed for initializing the points array only if it is not null
    //on every grouping question included in this viz

    if (
      groupingQuestionsX.some((gqX) => nullKeys.includes(getQuestionKey(gqX))) ||
      groupingQuestionsX.some((gqY) => nullKeys.includes(getQuestionKey(gqY)))
    ) {
      continue;
    }

    //We now know that this split should be used in populating the points array

    //here we need to branch depending on whether a synthetic sample has been requested
    if (syntheticSampleSize) {
      //find the responseQuestion in the split
      const splitRQ = split.responseQuestions.find((rq) => getQuestionKey(rq) === getQuestionKey(responseQuestion))
      if (splitRQ && splitRQ.totalCount > 0) {
        //in this case, we know the synthetic sample size, and we have the data required to allocate points 
        // across response groups

        //compute the synthetic counts for the response groups
        const responseGroupsWithSyntheticCounts = addSyntheticCounts(splitRQ.responseGroups.expanded, syntheticSampleSize)

        //add points to the points array for each expanded response group, using the synthetic counts
        let lastId = points.length > 0 ? points[points.length - 1].id : 0;
        responseGroupsWithSyntheticCounts.forEach((rg) => {
          points.push(
            ...(Array(rg.syntheticCount)).map((_, idx) => ({
              id: lastId + 1 + idx,
              expandedResponseGroup: rg,
              splitGroups: split.groups.filter((group) => (
                groupingQuestionsX.map((gqX) => getQuestionKey(gqX)).includes(getQuestionKey(group.question)) ||
                groupingQuestionsY.map((gqY) => getQuestionKey(gqY)).includes(getQuestionKey(group.question))
              )),
              fullySpecifiedSplitIndex: splitIdx
            }))
          )
        })
      }

      //Note...if we cannot identify splitRQ or if the totalCount is not positive
      //There is no data to inform how to allocate points across response groups on the response
      //question, so we do not allocate any points for this split.
    } else {
      //here, there is no synthetic sample requested.
      //so the points will represent actual responses from the data.

      //find the responseQuestion in the split
      const splitRQ = split.responseQuestions.find((rq) => getQuestionKey(rq) === getQuestionKey(responseQuestion))

      if (splitRQ && splitRQ.totalCount > 0) {

        //this is the only case where we have data that will allow us to allocate points.


        //get the id number of the last assigned point
        let lastId = points.length > 0 ? points[points.length - 1].id : 0;
        //loop through the expanded responses of the response group
        splitRQ.responseGroups.expanded.forEach((rg) => {
          points.push(
            ...(Array(rg.totalCount)).map((_, idx) => ({
              id: lastId + 1 + idx,
              expandedResponseGroup: rg,
              splitGroups: split.groups.filter((group) => (
                groupingQuestionsX.map((gqX) => getQuestionKey(gqX)).includes(getQuestionKey(group.question)) ||
                groupingQuestionsY.map((gqY) => getQuestionKey(gqY)).includes(getQuestionKey(group.question))
              )),
              fullySpecifiedSplitIndex: splitIdx
            }))
          )
          lastId = lastId + rg.totalCount;
        })
      }

      //Note...if we cannot identify splitRQ or if the totalCount is not positive
      //There is no data to inform how to allocate points across response groups on the response
      //question, so we do not allocate any points for this split.
    }
  }
  return points;
}

function getIndicesOfBasisSplits(split: Split, allSplits: Split[], excludedQuestionKeys: string[]): number[] {
  // Build a map of the split's groups for quick lookup by question key
  const parentGroupMap: Map<string, Group> = new Map();
  for (const g of split.groups) {
    parentGroupMap.set(getQuestionKey(g.question), g);
  }

  // Relevant keys are those present on the split that are NOT excluded
  const relevantKeys = Array.from(parentGroupMap.keys()).filter((k) => !excludedQuestionKeys.includes(k));

  const indices: number[] = [];

  allSplits.forEach((candidateSplit, idx) => {
    // Build a map for the candidate split
    const candMap: Map<string, Group> = new Map();
    for (const g of candidateSplit.groups) {
      candMap.set(getQuestionKey(g.question), g);
    }

    // Candidate must be fully specified (no nulls) for every relevant key
    let isBasis = true;
    for (const key of relevantKeys) {
      const parentG = parentGroupMap.get(key);
      const candG = candMap.get(key);

      // Candidate must have this grouping question
      if (!candG) {
        isBasis = false;
        break;
      }

      // Candidate must be fully specified for this question
      if (candG.responseGroup === null) {
        isBasis = false;
        break;
      }

      // If the parent split specifies a particular responseGroup (not null),
      // the candidate must match that same responseGroup label to be contained.
      if (parentG && parentG.responseGroup !== null) {
        if (parentG.responseGroup.label !== candG.responseGroup!.label) {
          isBasis = false;
          break;
        }
      }
      // If parentG.responseGroup is null, candidate can be any response (already
      // ensured it's specified), so that key is fine.
    }

    if (isBasis) indices.push(idx);
  });

  return indices;
}

/**
 * Calculate Euclidean distance between two points.
 */
function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function positionPointsInSegment(
  points: VizPoint[],
  segmentBounds: { x: number, y: number, width: number, height: number }
): PointPosition[] {
  const minDistance = 2.5; // Points must be at least 2.5 point radii apart
  const maxAttempts = 30;

  // Add some margin to keep points away from segment edges
  const margin = 1; // 1 point radius
  const innerBounds = {
    x: segmentBounds.x + margin,
    y: segmentBounds.y + margin,
    width: Math.max(0, segmentBounds.width - 2 * margin),
    height: Math.max(0, segmentBounds.height - 2 * margin)
  };

  // Handle empty or too-small bounds
  if (innerBounds.width <= 0 || innerBounds.height <= 0) {
    // Fall back to placing all points at center
    return points.map(p => ({
      id: p.id,
      x: segmentBounds.x + segmentBounds.width / 2,
      y: segmentBounds.y + segmentBounds.height / 2
    }));
  }

  // Create spatial grid for O(1) collision detection
  // Cell size is minDistance/√2 to ensure we only need to check 3×3 neighborhood
  const cellSize = minDistance / Math.sqrt(2);
  const grid = new Map<string, PointPosition>();

  // Helper to get grid cell key
  const getCellKey = (x: number, y: number): string => {
    const col = Math.floor((x - innerBounds.x) / cellSize);
    const row = Math.floor((y - innerBounds.y) / cellSize);
    return `${col},${row}`;
  };

  // Helper to check if position is valid (no nearby points within minDistance)
  const isValidPosition = (x: number, y: number): boolean => {
    // Check if position is within bounds
    if (x < innerBounds.x || x >= innerBounds.x + innerBounds.width ||
      y < innerBounds.y || y >= innerBounds.y + innerBounds.height) {
      return false;
    }

    // Get grid cell coordinates
    const col = Math.floor((x - innerBounds.x) / cellSize);
    const row = Math.floor((y - innerBounds.y) / cellSize);

    // Check 3×3 neighborhood of cells (including diagonals)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighborKey = `${col + dx},${row + dy}`;
        const neighbor = grid.get(neighborKey);

        if (neighbor && distance(neighbor, { x, y }) < minDistance) {
          return false;
        }
      }
    }

    return true;
  };

  // Active list for Bridson's algorithm
  const activeList: PointPosition[] = [];
  const positions: PointPosition[] = [];

  // Place first point randomly
  if (points.length > 0) {
    const firstPos: PointPosition = {
      id: points[0].id,
      x: innerBounds.x + Math.random() * innerBounds.width,
      y: innerBounds.y + Math.random() * innerBounds.height
    };
    positions.push(firstPos);
    activeList.push(firstPos);
    grid.set(getCellKey(firstPos.x, firstPos.y), firstPos);
  }

  // Process remaining points
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    let placed = false;

    // Try to place near an active point
    while (activeList.length > 0 && !placed) {
      // Pick random active point
      const activeIndex = Math.floor(Math.random() * activeList.length);
      const activePoint = activeList[activeIndex];

      // Try to generate valid candidate in annulus around active point
      // Annulus: radius between minDistance and 2*minDistance
      let foundCandidate = false;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Generate random point in annulus
        const angle = Math.random() * 2 * Math.PI;
        const radius = minDistance + Math.random() * minDistance; // [minDistance, 2*minDistance]
        const candidate = {
          x: activePoint.x + radius * Math.cos(angle),
          y: activePoint.y + radius * Math.sin(angle)
        };

        if (isValidPosition(candidate.x, candidate.y)) {
          const newPos: PointPosition = {
            id: point.id,
            x: candidate.x,
            y: candidate.y
          };
          positions.push(newPos);
          activeList.push(newPos);
          grid.set(getCellKey(newPos.x, newPos.y), newPos);
          placed = true;
          foundCandidate = true;
          break;
        }
      }

      // If no valid candidate found around this active point, remove it from active list
      if (!foundCandidate) {
        activeList.splice(activeIndex, 1);
      }
    }

    // Fallback: if couldn't place near active points, try random placement
    if (!placed) {
      let fallbackPlaced = false;

      for (let attempt = 0; attempt < maxAttempts * 2; attempt++) {
        const candidate = {
          x: innerBounds.x + Math.random() * innerBounds.width,
          y: innerBounds.y + Math.random() * innerBounds.height
        };

        if (isValidPosition(candidate.x, candidate.y)) {
          const newPos: PointPosition = {
            id: point.id,
            x: candidate.x,
            y: candidate.y
          };
          positions.push(newPos);
          activeList.push(newPos);
          grid.set(getCellKey(newPos.x, newPos.y), newPos);
          fallbackPlaced = true;
          break;
        }
      }

      // Last resort: place anyway even if overlapping
      if (!fallbackPlaced) {
        const newPos: PointPosition = {
          id: point.id,
          x: innerBounds.x + Math.random() * innerBounds.width,
          y: innerBounds.y + Math.random() * innerBounds.height
        };
        positions.push(newPos);
        grid.set(getCellKey(newPos.x, newPos.y), newPos);
      }
    }
  }

  return positions;
}



export function initialize(statsInstanceRef: Statistics, segmentVizConfig: SegmentVizConfig, vizWidth: number, vizHeight: number) {
  //this will map each response question key to a visualization for that response question
  const vizMap: Map<string, { segmentGroups: SegmentGroup[], points: VizPoint[] }> = new Map();
  //we'll need the stats config for a bunch of the computations that follow
  const statsConfig = statsInstanceRef.getSessionConfig();
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
    const groupingQuestionsExcludedKeys = statsInstanceRef.getSessionConfig().groupingQuestions
      .map((gq) => getQuestionKey(gq))
      .filter((gqKey) => (
        !groupingQuestionsX.map((gqX) => getQuestionKey(gqX)).includes(gqKey) &&
        !groupingQuestionsY.map((gqY) => getQuestionKey(gqY)).includes(gqKey)
      ))

    //get all the splits from the stats instance
    const allSplits = statsInstanceRef.getSplits()

    //initialize the points array for this response question.
    const points = initializePoints({
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

      //compute the width of each segment group in the view to which this split belongs
      const segmentGroupWidth = (vizWidth - ((numSegmentGroups.x - 1) * segmentVizConfig.groupGapX)) / numSegmentGroups.x

      //compute the height of each segment group in the view to which this split belongs
      const segmentGroupHeight = (vizHeight - ((numSegmentGroups.y - 1) * segmentVizConfig.groupGapY)) / numSegmentGroups.y

      //compute the segment group bounds for this split
      const segmentGroup = {
        x: segmentGroupIndices.x * (segmentGroupWidth + segmentVizConfig.groupGapX),
        y: segmentGroupIndices.y * (segmentGroupHeight + segmentVizConfig.groupGapY),
        width: segmentGroupWidth,
        height: segmentGroupHeight,
      }

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
        //compute the width-to-be-distributed
        const widthToBeDistributed = {
          collapsed: (
            segmentGroupWidth //total width
            - (responseGroupsWithStats.collapsed.length - 1) * segmentVizConfig.responseGap //response gaps
            - responseGroupsWithStats.collapsed.length * 2 //base width of each response group
          ),
          expanded: (
            segmentGroupWidth //total width
            - (responseGroupsWithStats.expanded.length - 1) * segmentVizConfig.responseGap) //response gaps
            - responseGroupsWithStats.expanded.length * 2 //base width of each response group
        }
        //collapsed segments
        let currentX = 0
        const segmentsCollapsed = responseGroupsWithStats.collapsed.map((rg, rgIdx) => {
          const pointsInSegment = pointsForSplit.filter((point) => point.expandedResponseGroup.values.every((value) => rg.values.includes(value)))
          const segmentBounds = {
            x: currentX,
            y: segmentGroup.y,
            width: (
              2 //base width
              + widthToBeDistributed.collapsed * rg.proportion //width allocated by proportion
            ),
            height: segmentGroupHeight,
          }
          currentX = currentX + segmentBounds.width + segmentVizConfig.responseGap
          return {
            ...segmentBounds,
            pointPositions: positionPointsInSegment(pointsInSegment, segmentBounds),
            responseGroupIndex: rgIdx
          }
        })
        //expanded segments
        currentX = 0
        const segmentsExpanded = responseGroupsWithStats.expanded.map((rg, rgIdx) => {
          const pointsInSegment = pointsForSplit.filter((point) => point.expandedResponseGroup.label === rg.label)
          const segmentBounds = {
            x: currentX,
            y: segmentGroup.y,
            width: (
              2 //base width
              + widthToBeDistributed.expanded * rg.proportion //width allocated by proportion
            ),
            height: segmentGroupHeight,
          }
          currentX = currentX + segmentBounds.width + segmentVizConfig.responseGap
          return {
            ...segmentBounds,
            pointPositions: positionPointsInSegment(pointsInSegment, segmentBounds),
            responseGroupIndex: rgIdx
          }
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

