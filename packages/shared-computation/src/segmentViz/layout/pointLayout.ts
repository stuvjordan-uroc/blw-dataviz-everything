import type { ResponseGroup } from 'shared-schemas';
import type { Point, PointPosition, SegmentWithPositions } from '../types';

/**
 * Position points within segments using Poisson Disk Sampling.
 * This creates a natural-looking, uniform distribution with minimal overlap.
 * 
 * Called after segment bounds are set to populate pointPositions for each segment.
 */
export function positionPointsInSegments(
  segments: SegmentWithPositions[],
  allPoints: Point[]
): void {
  for (const segment of segments) {
    // Find all points that belong to this segment
    const segmentPoints = allPoints.filter(point =>
      pointBelongsToSegment(point, segment)
    );

    if (segmentPoints.length === 0) {
      segment.pointPositions = [];
      continue;
    }

    // Position points using Poisson Disk Sampling
    segment.pointPositions = poissonDiskSampling(
      segment.bounds,
      segmentPoints
    );
  }
}

/**
 * Check if a point belongs to a segment based on response groups.
 * 
 * A point belongs to a segment if:
 * 1. The point's response on the response question matches the segment's response group
 * 2. The point's responses on all grouping questions match the segment's active groupings
 */
function pointBelongsToSegment(point: Point, segment: SegmentWithPositions): boolean {
  // Helper to check if a response group's values contain a specific value
  const groupContainsValue = (group: ResponseGroup, value: number | null): boolean => {
    if (value === null) return false;
    return group.values.includes(value);
  };

  // Check if point matches segment's response group on the response question
  // We need to find the point's group that corresponds to the response question
  // and check if its responseGroup (if not null) is included in the segment's response group values
  const pointResponseGroup = point.groups.find(g => {
    // This is a simplified check - we'd need to match the question properly
    // For now, we'll check if the point's responseGroup matches the segment's responseGroup
    if (!g.responseGroup) return false;
    return segment.responseGroup.values.some(value =>
      groupContainsValue(g.responseGroup!, value)
    );
  });

  if (!pointResponseGroup) return false;

  // Check if point matches all active groupings
  // activeGroupings is an array of ResponseGroup objects from grouping questions
  // We need to verify the point has a matching response for each active grouping
  for (const activeGrouping of segment.activeGroupings) {
    const pointMatchesGrouping = point.groups.some(g => {
      if (!g.responseGroup) return false;
      // Check if the point's response group matches this active grouping
      return activeGrouping.values.some(value =>
        groupContainsValue(g.responseGroup!, value)
      );
    });

    if (!pointMatchesGrouping) return false;
  }

  return true;
}

/**
 * Poisson Disk Sampling using Bridson's algorithm (2007).
 * 
 * Places points such that:
 * 1. No two points are closer than minDistance
 * 2. Points are approximately uniformly distributed
 * 3. Points appear randomly positioned
 * 
 * All dimensions in point radii units.
 * 
 * Uses spatial grid for O(n) performance instead of O(n²) brute force.
 * Grid cells are sized at minDistance/√2 so each point only needs to check
 * at most 9 neighboring cells for collisions.
 * 
 * Algorithm:
 * 1. Create spatial grid with cell size = minDistance / √2
 * 2. Maintain active list of points to spawn candidates around
 * 3. For each point to place, try to find valid position near an active point
 * 4. Use grid for O(1) collision detection
 * 5. Fall back to random placement if no valid position found
 */
function poissonDiskSampling(
  bounds: { x: number; y: number; width: number; height: number },
  points: Point[]
): PointPosition[] {
  const minDistance = 2.5; // Points must be at least 2.5 point radii apart
  const maxAttempts = 30;

  // Add some margin to keep points away from segment edges
  const margin = 1; // 1 point radius
  const innerBounds = {
    x: bounds.x + margin,
    y: bounds.y + margin,
    width: Math.max(0, bounds.width - 2 * margin),
    height: Math.max(0, bounds.height - 2 * margin)
  };

  // Handle empty or too-small bounds
  if (innerBounds.width <= 0 || innerBounds.height <= 0) {
    // Fall back to placing all points at center
    return points.map(p => ({
      id: p.id,
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
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

/**
 * Calculate Euclidean distance between two points.
 */
function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}
