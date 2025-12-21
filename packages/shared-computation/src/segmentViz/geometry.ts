import { SegmentVizConfig, PointPosition, Point } from "./types";

export function getWidthHeight(config: SegmentVizConfig): [number, number] {
  const maxSegmentGroups = {
    x: config.groupingQuestions.x.map((gq) => gq.responseGroups.length).reduce((acc, curr) => acc * curr, 1),
    y: config.groupingQuestions.y.map((gq) => gq.responseGroups.length).reduce((acc, curr) => acc * curr, 1)
  }
  const maxResponseGroups = config.responseQuestion.responseGroups.expanded.length
  return ([
    (maxSegmentGroups.x - 1) * config.groupGapX + //gaps between groups
    maxSegmentGroups.x * //groups
    (
      (maxResponseGroups - 1) * config.responseGap + //gaps between response groups
      maxResponseGroups * config.baseSegmentWidth + //base widths
      config.minGroupAvailableWidth //width to be allocated
    ), //total width of any group
    (maxSegmentGroups.y - 1) * config.groupGapY + //gaps between groups
    maxSegmentGroups.y * config.minGroupHeight
  ])
}

/**
 * Compute the bounds (x, y, width, height) for a segment group in the visualization grid.
 * 
 * @param segmentGroupIndices - The x and y indices of this segment group in the grid
 * @param numSegmentGroups - Total number of segment groups along x and y axes
 * @param vizWidth - Total width of the visualization
 * @param vizHeight - Total height of the visualization
 * @param groupGapX - Horizontal gap between segment groups
 * @param groupGapY - Vertical gap between segment groups
 * @returns Bounds object with x, y, width, and height
 */
export function computeSegmentGroupBounds(
  segmentGroupIndices: { x: number; y: number },
  numSegmentGroups: { x: number; y: number },
  vizWidth: number,
  vizHeight: number,
  groupGapX: number,
  groupGapY: number
): { x: number; y: number; width: number; height: number } {
  const segmentGroupWidth = (vizWidth - ((numSegmentGroups.x - 1) * groupGapX)) / numSegmentGroups.x;
  const segmentGroupHeight = (vizHeight - ((numSegmentGroups.y - 1) * groupGapY)) / numSegmentGroups.y;

  return {
    x: segmentGroupIndices.x * (segmentGroupWidth + groupGapX),
    y: segmentGroupIndices.y * (segmentGroupHeight + groupGapY),
    width: segmentGroupWidth,
    height: segmentGroupHeight,
  };
}

/**
 * Compute bounds for segments within a segment group.
 * 
 * Distributes width among response groups based on their proportions,
 * accounting for gaps between segments and base width.
 * 
 * @param responseGroupsWithStats - Array of response groups with computed statistics
 * @param segmentGroupBounds - The bounds of the containing segment group
 * @param responseGap - Gap between adjacent segments
 * @returns Array of segment bounds with response group indices
 */
export function computeSegmentBounds<T extends { proportion: number }>(
  responseGroupsWithStats: T[],
  segmentGroupBounds: { x: number; y: number; width: number; height: number },
  responseGap: number,
  baseWidth: number,
): Array<{ x: number; y: number; width: number; height: number; responseGroupIndex: number }> {
  const widthToBeDistributed = (
    segmentGroupBounds.width
    - (responseGroupsWithStats.length - 1) * responseGap
    - responseGroupsWithStats.length * baseWidth
  );

  let currentX = 0;
  return responseGroupsWithStats.map((rg, rgIdx) => {
    const segmentBounds = {
      x: currentX,
      y: segmentGroupBounds.y,
      width: baseWidth + widthToBeDistributed * rg.proportion,
      height: segmentGroupBounds.height,
      responseGroupIndex: rgIdx
    };
    currentX += segmentBounds.width + responseGap;
    return segmentBounds;
  });
}

/**
 * Calculate Euclidean distance between two points.
 */
function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Position points within a segment using Poisson disk sampling for even distribution.
 * 
 * Uses a spatial grid and active list to efficiently generate non-overlapping
 * point positions with minimum distance constraints.
 * 
 * @param points - Array of point IDs to position
 * @param segmentBounds - The bounds of the segment containing the points
 * @returns Array of point positions with coordinates
 */
export function positionPointsInSegment(
  points: Point[],
  segmentBounds: { x: number; y: number; width: number; height: number }
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
    return points.map(point => ({
      point: point,
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
      point: points[0],
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
            point: point,
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
            point: point,
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
          point: point,
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

/**
 * Position new points among existing points using spatial constraints.
 * Preserves existing point positions and uses Poisson disk sampling for new points.
 * Similar to full Poisson disk sampling but treats existing points as fixed samples.
 * 
 * @param existingPositions - Current point positions to preserve
 * @param removedPoints - Points that have been removed
 * @param addedPoints - New points to position
 * @param segmentBounds - The bounds of the segment
 * @returns Updated array of point positions
 */
export function positionNewPointsAmongExisting(
  existingPositions: PointPosition[],
  removedPoints: Point[],
  addedPoints: Point[],
  segmentBounds: { x: number; y: number; width: number; height: number }
): PointPosition[] {
  const minDistance = 2.5;
  const maxAttempts = 30;

  // Remove positions for removed points
  const removedIds = new Set(removedPoints.map(p => p.id));
  const retainedPositions = existingPositions.filter(pos => !removedIds.has(pos.point.id));

  // If no new points, we're done
  if (addedPoints.length === 0) {
    return retainedPositions;
  }

  // Add margin to keep points away from edges
  const margin = 1;
  const innerBounds = {
    x: segmentBounds.x + margin,
    y: segmentBounds.y + margin,
    width: Math.max(0, segmentBounds.width - 2 * margin),
    height: Math.max(0, segmentBounds.height - 2 * margin)
  };

  if (innerBounds.width <= 0 || innerBounds.height <= 0) {
    return [...retainedPositions, ...addedPoints.map(point => ({
      point: point,
      x: segmentBounds.x + segmentBounds.width / 2,
      y: segmentBounds.y + segmentBounds.height / 2
    }))];
  }

  // Build spatial grid with existing positions
  const cellSize = minDistance / Math.sqrt(2);
  const grid = new Map<string, PointPosition>();

  const getCellKey = (x: number, y: number): string => {
    const col = Math.floor((x - innerBounds.x) / cellSize);
    const row = Math.floor((y - innerBounds.y) / cellSize);
    return `${col},${row}`;
  };

  const isValidPosition = (x: number, y: number): boolean => {
    if (x < innerBounds.x || x >= innerBounds.x + innerBounds.width ||
      y < innerBounds.y || y >= innerBounds.y + innerBounds.height) {
      return false;
    }

    const col = Math.floor((x - innerBounds.x) / cellSize);
    const row = Math.floor((y - innerBounds.y) / cellSize);

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

  // Add all retained positions to grid
  for (const pos of retainedPositions) {
    grid.set(getCellKey(pos.x, pos.y), pos);
  }

  const newPositions: PointPosition[] = [];
  const activeList = [...retainedPositions]; // Existing points serve as seeds

  // Position each new point
  for (const point of addedPoints) {
    let placed = false;

    // Try to place near an active point
    while (activeList.length > 0 && !placed) {
      const activeIndex = Math.floor(Math.random() * activeList.length);
      const activePoint = activeList[activeIndex];
      let foundCandidate = false;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const angle = Math.random() * 2 * Math.PI;
        const radius = minDistance + Math.random() * minDistance;
        const candidate = {
          x: activePoint.x + radius * Math.cos(angle),
          y: activePoint.y + radius * Math.sin(angle)
        };

        if (isValidPosition(candidate.x, candidate.y)) {
          const newPos: PointPosition = { point, x: candidate.x, y: candidate.y };
          newPositions.push(newPos);
          activeList.push(newPos);
          grid.set(getCellKey(newPos.x, newPos.y), newPos);
          placed = true;
          foundCandidate = true;
          break;
        }
      }

      if (!foundCandidate) {
        activeList.splice(activeIndex, 1);
      }
    }

    // Fallback: random placement
    if (!placed) {
      let fallbackPlaced = false;

      for (let attempt = 0; attempt < maxAttempts * 2; attempt++) {
        const candidate = {
          x: innerBounds.x + Math.random() * innerBounds.width,
          y: innerBounds.y + Math.random() * innerBounds.height
        };

        if (isValidPosition(candidate.x, candidate.y)) {
          const newPos: PointPosition = { point, x: candidate.x, y: candidate.y };
          newPositions.push(newPos);
          activeList.push(newPos);
          grid.set(getCellKey(newPos.x, newPos.y), newPos);
          fallbackPlaced = true;
          break;
        }
      }

      // Last resort: place anyway even if overlapping
      if (!fallbackPlaced) {
        const newPos: PointPosition = {
          point,
          x: innerBounds.x + Math.random() * innerBounds.width,
          y: innerBounds.y + Math.random() * innerBounds.height
        };
        newPositions.push(newPos);
        grid.set(getCellKey(newPos.x, newPos.y), newPos);
      }
    }
  }

  return [...retainedPositions, ...newPositions];
}
