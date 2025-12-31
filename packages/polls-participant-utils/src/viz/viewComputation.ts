/**
 * Point position computation functions for participant-side visualization.
 * 
 * These functions manage the ParticipantPointPositions map, which stores
 * point positions for the current ServerState and ViewState combination.
 * 
 * Architecture:
 * - Point IDENTITIES (map keys) come from basis splits in ServerState
 * - Point POSITIONS (map values) come from view splits selected by ViewState
 * - Most functions mutate the passed map for efficiency
 * - Coordinates are transformed from segment-relative to canvas-relative
 * 
 * Coordinate System Transformation:
 * Server stores positions relative to segment bounds:
 *   - Segment group bounds: {x, y, width, height} origin for x, y is 0,0 of canvas
 *   - Segment bounds: {x, y, width, height} origin of for x,y is top left of segment group
 *   - Point positions: {x, y} relative to top left of segment
 * 
 * We transform to canvas-relative coordinates:
 *   - canvasX = segmentGroupBounds.x + segmentBounds.x + pointX
 *   - canvasY = segmentGroupBound.y + segmentBounds.y + pointY
 * 
 * Exports:
 * - initializePointPositions: Create new map with initial keys + positions
 * - updatePointIdentities: Add/remove points when ServerState changes
 * - updatePositionsForViewChange: Update positions when ViewState changes
 * - updatePositionsForServerChange: Update positions when ServerState changes
 * - computePointPositionsDiff: Compare two states for animation
 * - getPointKey: Generate unique identifier for a point
 */

import type {
  SplitWithSegmentGroupDiff,
  ViewMaps,
  ParticipantPointPositions,
  ParticipantPointPositionsDiff,
  ParticipantPointPosition,
  PointPositionChange,
  Point,
  ServerState,
  ViewState,
} from './types';

/**
 * Transform point position from segment-group-relative to canvas-relative coordinates.
 * 
 * Server coordinate system (after fixing computeSegmentBounds):
 * - segmentBounds: {x, y, width, height} all relative to segment group origin
 * - point positions: {x, y} relative to segment bounds
 * 
 * Therefore to get canvas coordinates:
 * - canvasX = segmentGroupBounds.x + segmentBounds.x + point.x
 * - canvasY = segmentGroupBounds.y + segmentBounds.y + point.y
 * 
 * 
 * 
 * @param point - Point position relative to segment bounds
 * @param segmentBounds - Bounds of the segment (relative to segment group)
 * @param segmentGroupBounds - Bounds of the segment group (relative to canvas)
 * @returns Point position with canvas-relative coordinates
 */
function transformPointToCanvas(
  point: ParticipantPointPosition,
  segmentBounds: { x: number; y: number; width: number; height: number },
  segmentGroupBounds: { x: number; y: number; width: number; height: number }
): ParticipantPointPosition {
  return {
    point: point.point,
    x: segmentGroupBounds.x + segmentBounds.x + point.x,
    y: segmentGroupBounds.y + segmentBounds.y + point.y
  };
}

/**
 * Initialize a new ParticipantPointPositions map from scratch.
 * 
 * Creates a new map with:
 * - Keys: All points from basis splits (canonical point set)
 * - Values: Positions of those points in the current view
 * 
 * This should only be called once during VizStateManager construction.
 * 
 * @param serverState - Server-side canonical state (splits, basisSplitIndices)
 * @param viewState - Participant's view preferences (viewId, displayMode)
 * @param viewMaps - Lookup maps for O(1) view-to-splits mapping
 * @returns New map with point identities and positions
 */
export function initializePointPositions(
  serverState: ServerState,
  viewState: ViewState,
  viewMaps: ViewMaps
): ParticipantPointPositions {
  // Validate viewId
  const viewSplitIndices = viewMaps[viewState.viewId];
  if (viewSplitIndices === undefined) {
    const availableViewIds = Object.keys(viewMaps).sort();
    throw new Error(
      `Invalid viewId "${viewState.viewId}" not found in ViewMaps. ` +
      `UI code passed out-of-range or incorrectly ordered question indices to buildSegmentVizViewId(). ` +
      `Available viewIds: ${availableViewIds.length > 0 ? availableViewIds.join(', ') : '(none)'}`
    );
  }

  // Step 1: Build set of all point identities from basis splits
  const pointIdentities = new Set<string>();
  for (const basisSplitIdx of serverState.basisSplitIndices) {
    const basisSplit = serverState.splits[basisSplitIdx];
    for (const pointSet of basisSplit.points) {
      for (const point of pointSet) {
        pointIdentities.add(getPointKey(point));
      }
    }
  }

  // Step 2: Collect positions from view splits and transform to canvas coordinates
  const positionsMap = new Map<string, ParticipantPointPosition>();
  for (const viewSplitIdx of viewSplitIndices) {
    const viewSplit = serverState.splits[viewSplitIdx];
    const responseGroups = viewSplit.responseGroups[viewState.displayMode];
    const segmentGroupBounds = viewSplit.segmentGroupBounds;

    for (const responseGroup of responseGroups) {
      const segmentBounds = responseGroup.bounds;
      for (const pointPosition of responseGroup.pointPositions) {
        const key = getPointKey(pointPosition.point);
        if (pointIdentities.has(key)) {
          // Transform from segment-relative to canvas-relative coordinates
          const canvasPosition = transformPointToCanvas(
            pointPosition,
            segmentBounds,
            segmentGroupBounds
          );
          positionsMap.set(key, canvasPosition);
        }
      }
    }
  }

  return positionsMap;
}

/**
 * Update point identities (map keys) when server state changes.
 * 
 * Mutates the passed map by:
 * - Adding new points from serverDiff
 * - Removing deleted points from serverDiff
 * - Setting initial positions for new points based on current view
 * 
 * @param map - Map to mutate
 * @param serverDiff - Array of diffs for all splits
 * @param serverState - Updated server state (for positioning new points)
 * @param viewState - Current view state (for positioning new points)
 * @param viewMaps - View to splits mapping
 * @returns Object with arrays of added and removed points
 */
export function updatePointIdentities(
  map: ParticipantPointPositions,
  serverDiff: SplitWithSegmentGroupDiff[],
  serverState: ServerState,
  viewState: ViewState,
  viewMaps: ViewMaps
): { added: ParticipantPointPosition[], removed: ParticipantPointPosition[] } {
  const added: ParticipantPointPosition[] = [];
  const removed: ParticipantPointPosition[] = [];

  // Process each basis split's diff
  for (let i = 0; i < serverState.basisSplitIndices.length; i++) {
    const basisSplitIdx = serverState.basisSplitIndices[i];
    const diff = serverDiff[basisSplitIdx];
    if (!diff) continue;

    // Remove deleted points
    for (const pointSet of diff.points.removed) {
      for (const point of pointSet) {
        const key = getPointKey(point);
        const existing = map.get(key);
        if (existing) {
          map.delete(key);
          removed.push(existing);
        }
      }
    }

    // Add new points with positions from current view
    for (const pointSet of diff.points.added) {
      for (const point of pointSet) {
        const key = getPointKey(point);
        // Find position for this point in current view
        const position = findPointPositionInView(point, serverState, viewState, viewMaps);
        if (position) {
          map.set(key, position);
          added.push(position);
        }
      }
    }
  }

  return { added, removed };
}

/**
 * Update all positions in map when view state changes.
 * 
 * Mutates the passed map by updating the position (x, y) for each point
 * based on the new view. Keys (point identities) remain unchanged.
 * 
 * @param map - Map to mutate
 * @param serverState - Current server state
 * @param newViewState - New view state to use for positioning
 * @param viewMaps - View to splits mapping
 * @returns Diff of position changes
 */
export function updatePositionsForViewChange(
  map: ParticipantPointPositions,
  serverState: ServerState,
  newViewState: ViewState,
  viewMaps: ViewMaps
): ParticipantPointPositionsDiff {
  const viewSplitIndices = viewMaps[newViewState.viewId];
  if (viewSplitIndices === undefined) {
    const availableViewIds = Object.keys(viewMaps).sort();
    throw new Error(
      `Invalid viewId "${newViewState.viewId}" not found in ViewMaps. ` +
      `Available viewIds: ${availableViewIds.length > 0 ? availableViewIds.join(', ') : '(none)'}`
    );
  }

  // Build lookup of new positions and transform to canvas coordinates
  const newPositions = new Map<string, ParticipantPointPosition>();
  for (const viewSplitIdx of viewSplitIndices) {
    const viewSplit = serverState.splits[viewSplitIdx];
    const responseGroups = viewSplit.responseGroups[newViewState.displayMode];
    const segmentGroupBounds = viewSplit.segmentGroupBounds;

    for (const responseGroup of responseGroups) {
      const segmentBounds = responseGroup.bounds;
      for (const pointPosition of responseGroup.pointPositions) {
        const key = getPointKey(pointPosition.point);
        // Transform from segment-relative to canvas-relative coordinates
        const canvasPosition = transformPointToCanvas(
          pointPosition,
          segmentBounds,
          segmentGroupBounds
        );
        newPositions.set(key, canvasPosition);
      }
    }
  }

  // Track changes and update map
  const moved: ParticipantPointPositionsDiff['moved'] = [];

  for (const [key, oldPos] of map) {
    const newPos = newPositions.get(key);
    if (newPos) {
      // Update position if it changed
      if (oldPos.x !== newPos.x || oldPos.y !== newPos.y) {
        moved.push({
          point: newPos.point,
          fromX: oldPos.x,
          fromY: oldPos.y,
          toX: newPos.x,
          toY: newPos.y,
          dx: newPos.x - oldPos.x,
          dy: newPos.y - oldPos.y,
        });
        map.set(key, newPos);
      }
    }
  }

  return { added: [], removed: [], moved };
}

/**
 * Update positions in map when server state changes (incremental).
 * 
 * Mutates the passed map by applying position deltas from serverDiff.
 * 
 * IMPORTANT: The serverDiff.pointPositions structure:
 * - Contains an array of position deltas for each response group
 * - Each entry is either:
 *   - {point, x: deltaX, y: deltaY} for existing points that moved
 *   - null for newly added points (already handled by updatePointIdentities)
 * - This means we can safely skip null entries without double-counting additions
 * 
 * COORDINATE SYSTEM:
 * - Server sends deltas in segment-relative coordinates
 * - We store positions in canvas-relative coordinates
 * - However, deltas are INVARIANT to coordinate system because:
 *   - Server delta = (newSegmentX + newPointX) - (oldSegmentX + oldPointX)
 *   - Canvas delta = (sgbX + newSegmentX + newPointX) - (sgbX + oldSegmentX + oldPointX)
 *   - Canvas delta = Server delta (sgbX cancels out)
 * - Therefore, we can apply server deltas directly to our canvas positions
 * 
 * @param map - Map to mutate
 * @param serverDiff - Array of diffs for all splits
 * @param serverState - Updated server state
 * @param viewState - Current view state
 * @param viewMaps - View to splits mapping
 * @returns Array of position changes (images don't change for server updates with stable view)
 */
export function updatePositionsForServerChange(
  map: ParticipantPointPositions,
  serverDiff: SplitWithSegmentGroupDiff[],
  serverState: ServerState,
  viewState: ViewState,
  viewMaps: ViewMaps
): { point: Point; fromX: number; fromY: number; toX: number; toY: number; dx: number; dy: number }[] {
  const viewSplitIndices = viewMaps[viewState.viewId];
  const moved: { point: Point; fromX: number; fromY: number; toX: number; toY: number; dx: number; dy: number }[] = [];

  // For each split in current view, check if it has position changes
  for (const viewSplitIdx of viewSplitIndices) {
    const diff = serverDiff[viewSplitIdx];
    if (!diff) continue; // No changes to this split

    // Get position deltas for this split's response groups
    const positionDiffs = diff.pointPositions[viewState.displayMode];

    // Process each response group's position changes
    for (let rgIdx = 0; rgIdx < positionDiffs.length; rgIdx++) {
      const rgPositionDeltas = positionDiffs[rgIdx];

      // Iterate through the position delta array
      // Note: Array length matches the NEW point count (after adds/removes)
      for (const positionDelta of rgPositionDeltas) {
        // Skip null entries - these are newly added points
        // (their positions were already set by updatePointIdentities)
        if (positionDelta === null) continue;

        const key = getPointKey(positionDelta.point);
        const currentPos = map.get(key);

        // Only update if point exists and has a non-zero delta
        if (currentPos && (positionDelta.x !== 0 || positionDelta.y !== 0)) {
          const newX = currentPos.x + positionDelta.x;
          const newY = currentPos.y + positionDelta.y;

          moved.push({
            point: positionDelta.point,
            fromX: currentPos.x,
            fromY: currentPos.y,
            toX: newX,
            toY: newY,
            dx: positionDelta.x,
            dy: positionDelta.y,
          });

          // Update the map with new position
          map.set(key, {
            point: currentPos.point,
            x: newX,
            y: newY,
          });
        }
      }
    }
  }

  return moved;
}

/**
 * Compute the diff between two participant point position states for animation.
 * 
 * This is useful when you have two separate maps to compare (e.g., after
 * full recomputation). For incremental updates, the update functions
 * return diffs directly.
 * 
 * @param oldState - Previous point positions (null if this is first state)
 * @param newState - New point positions to compare against
 * @returns Categorized changes for animation
 */
export function computePointPositionsDiff(
  oldState: ParticipantPointPositions | null,
  newState: ParticipantPointPositions
): ParticipantPointPositionsDiff {
  if (!oldState) {
    return {
      added: Array.from(newState.values()),
      removed: [],
      moved: [],
    };
  }

  const added: ParticipantPointPosition[] = [];
  const moved: ParticipantPointPositionsDiff['moved'] = [];

  for (const [key, newPos] of newState) {
    const oldPos = oldState.get(key);

    if (!oldPos) {
      added.push(newPos);
    } else if (oldPos.x !== newPos.x || oldPos.y !== newPos.y) {
      moved.push({
        point: newPos.point,
        fromX: oldPos.x,
        fromY: oldPos.y,
        toX: newPos.x,
        toY: newPos.y,
        dx: newPos.x - oldPos.x,
        dy: newPos.y - oldPos.y,
      });
    }
  }

  const removed: ParticipantPointPosition[] = [];
  for (const [key, oldPos] of oldState) {
    if (!newState.has(key)) {
      removed.push(oldPos);
    }
  }

  return { added, removed, moved };
}

/**
 * Helper: Find the position of a specific point in the current view.
 * Used when adding new points to get their initial position.
 * 
 * @param point - Point to find position for
 * @param serverState - Current server state
 * @param viewState - Current view state
 * @param viewMaps - View to splits mapping
 * @returns Point position if found, undefined otherwise
 */
function findPointPositionInView(
  point: Point,
  serverState: ServerState,
  viewState: ViewState,
  viewMaps: ViewMaps
): ParticipantPointPosition | undefined {
  const viewSplitIndices = viewMaps[viewState.viewId];
  const key = getPointKey(point);

  for (const viewSplitIdx of viewSplitIndices) {
    const viewSplit = serverState.splits[viewSplitIdx];
    const responseGroups = viewSplit.responseGroups[viewState.displayMode];
    const segmentGroupBounds = viewSplit.segmentGroupBounds;

    for (const responseGroup of responseGroups) {
      const segmentBounds = responseGroup.bounds;
      for (const pointPosition of responseGroup.pointPositions) {
        if (getPointKey(pointPosition.point) === key) {
          // Transform from segment-relative to canvas-relative coordinates
          return transformPointToCanvas(
            pointPosition,
            segmentBounds,
            segmentGroupBounds
          );
        }
      }
    }
  }

  return undefined;
}

/**
 * Generate a unique key for a point.
 * Points are uniquely identified by their splitIdx, expandedResponseGroupIdx, and id.
 * 
 * @param point - The point to generate a key for
 * @returns Unique string key
 */
export function getPointKey(point: Point): string {
  return `${point.splitIdx}-${point.expandedResponseGroupIdx}-${point.id}`;
}
