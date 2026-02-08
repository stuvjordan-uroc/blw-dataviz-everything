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
      y: 0,  // Relative to segment group top edge (all segments align to top)
      width: baseWidth + widthToBeDistributed * rg.proportion,
      height: segmentGroupBounds.height,
      responseGroupIndex: rgIdx
    };
    currentX += segmentBounds.width + responseGap;
    return segmentBounds;
  });
}

/**
 * Position points within a segment using jittered grid sampling for
 * approximately uniform distribution across the entire segment area.
 * 
 * Divides the segment into a grid with one cell per point, then places
 * each point at a random position within its cell. This ensures points
 * are spread across the full segment regardless of count, while still
 * looking organic (not a rigid grid).
 * 
 * @param points - Array of point IDs to position
 * @param segmentBounds - The bounds of the segment containing the points
 * @returns Array of point positions with coordinates relative to segment origin (0,0)
 */
export function positionPointsInSegment(
  points: Point[],
  segmentBounds: { x: number; y: number; width: number; height: number }
): PointPosition[] {
  if (points.length === 0) return [];

  // Margin to keep points away from segment edges
  const margin = 3;
  const innerWidth = Math.max(0, segmentBounds.width - 2 * margin);
  const innerHeight = Math.max(0, segmentBounds.height - 2 * margin);

  // Handle empty or too-small bounds
  if (innerWidth <= 0 || innerHeight <= 0) {
    return points.map(point => ({
      point,
      x: segmentBounds.width / 2,
      y: segmentBounds.height / 2
    }));
  }

  // Compute grid dimensions that best fill the rectangle.
  // Choose cols/rows so cell aspect ratio ≈ segment aspect ratio.
  const n = points.length;
  const aspect = innerWidth / innerHeight;
  let cols = Math.max(1, Math.round(Math.sqrt(n * aspect)));
  let rows = Math.max(1, Math.ceil(n / cols));
  // Rebalance: if we have too many cells, reduce cols
  while (cols > 1 && (cols - 1) * rows >= n) cols--;

  const cellWidth = innerWidth / cols;
  const cellHeight = innerHeight / rows;

  // Jitter margin inside each cell (keep points away from cell edges slightly)
  const jitterPad = Math.min(cellWidth, cellHeight) * 0.1;

  const positions: PointPosition[] = [];
  for (let i = 0; i < points.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const cellX = margin + col * cellWidth;
    const cellY = margin + row * cellHeight;

    // Random position within the cell, with a small padding
    const x = cellX + jitterPad + Math.random() * (cellWidth - 2 * jitterPad);
    const y = cellY + jitterPad + Math.random() * (cellHeight - 2 * jitterPad);

    positions.push({ point: points[i], x, y });
  }

  return positions;
}

/**
 * Position new points among existing points.
 * 
 * Since jittered grid layout depends on total point count, we re-layout
 * all points (retained + added) to maintain uniform distribution.
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
  // Remove positions for removed points
  const removedIds = new Set(removedPoints.map(p => p.id));
  const retainedPositions = existingPositions.filter(pos => !removedIds.has(pos.point.id));

  // If no changes, return as-is
  if (addedPoints.length === 0 && removedPoints.length === 0) {
    return retainedPositions;
  }

  // Collect all points and re-layout with jittered grid
  const allPoints = [
    ...retainedPositions.map(p => p.point),
    ...addedPoints,
  ];

  return positionPointsInSegment(allPoints, segmentBounds);
}
