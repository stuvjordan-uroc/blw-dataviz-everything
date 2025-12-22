import type {
  SplitWithSegmentGroup,
  SplitWithSegmentGroupDiff,
  Point,
  PointPosition,
  ViewMaps,
} from 'shared-computation';

/**
 * Defines which view the user is looking at.
 * A view is determined by a viewId string (e.g., "0,1,3" or "" for base view).
 */
export interface ViewState {
  /** View identifier - comma-separated indices of active questions (e.g., "0,1,3" or "") */
  viewId: string;
  /** Whether to show collapsed or expanded response groups */
  displayMode: 'collapsed' | 'expanded';
}

/**
 * Full server-side state from the visualization stream.
 */
export interface ServerState {
  splits: SplitWithSegmentGroup[];
  basisSplitIndices: number[];
}

/**
 * The output state for rendering: points with their final positions.
 */
export interface VisiblePointsState {
  points: PointPosition[];
}

/**
 * Describes what changed between two states (for animation).
 */
export interface VisiblePointsDiff {
  /** Points that were added (didn't exist before) */
  added: PointPosition[];
  /** Points that were removed (no longer visible) */
  removed: PointPosition[];
  /** Points that moved (with delta x/y from previous position) */
  moved: Array<{
    point: Point;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    dx: number;
    dy: number;
  }>;
}

/**
 * Result of a state change operation.
 */
export interface StateChangeResult {
  endState: VisiblePointsState;
  diff: VisiblePointsDiff;
}

/**
 * VizStateController: Pure state transformer for visualization data.
 * 
 * Responsibilities:
 * - Store full server state (all splits with point positions)
 * - Store client view preferences (which questions are active, display mode)
 * - Filter and transform state to produce visible points for rendering
 * - Generate diffs for animation purposes
 * 
 * Does NOT handle:
 * - Scaling abstract-unit coordinates to pixel-units for any given canvas size.
 * - Animation/tween computation (handled by renderer)
 * - Frame timing or visual effects
 * - DOM or Canvas rendering
 */
export class VizStateController {
  private serverState: ServerState;
  private viewState: ViewState;
  private viewMaps: ViewMaps;
  private currentVisibleState: VisiblePointsState | null = null;

  constructor(
    initialSplits: SplitWithSegmentGroup[],
    basisSplitIndices: number[],
    viewMaps: ViewMaps,
    initialViewState?: Partial<ViewState>
  ) {
    this.serverState = {
      splits: initialSplits,
      basisSplitIndices: basisSplitIndices,
    };
    this.viewMaps = viewMaps;
    this.viewState = {
      viewId: initialViewState?.viewId ?? '', // Default to base view (no active questions)
      displayMode: initialViewState?.displayMode ?? 'collapsed',
    };
    this.currentVisibleState = this.computeVisiblePoints();
  }

  /**
   * Apply a server update (new responses received).
   * Server always sends both full snapshot and diff.
   * 
   * @param newSplits Complete updated splits array
   * @param serverDiff Optional diff from server (for future animation optimizations)
   * @returns End state and diff for visible points only
   */
  applyServerUpdate(
    newSplits: SplitWithSegmentGroup[],
    serverDiff?: SplitWithSegmentGroupDiff[]
  ): StateChangeResult {
    const oldState = this.currentVisibleState;
    this.serverState.splits = newSplits;
    const newState = this.computeVisiblePoints();
    this.currentVisibleState = newState;

    return {
      endState: newState,
      diff: this.computeDiff(oldState, newState),
    };
  }

  /**
   * Change which view is displayed.
   * 
   * @param viewId View identifier string (e.g., "0,1,3" or "" for base view)
   * @returns End state and diff for animation
   */
  setView(viewId: string): StateChangeResult {
    const oldState = this.currentVisibleState;
    this.viewState.viewId = viewId;
    const newState = this.computeVisiblePoints();
    this.currentVisibleState = newState;

    return {
      endState: newState,
      diff: this.computeDiff(oldState, newState),
    };
  }

  /**
   * Toggle between collapsed and expanded display modes.
   * 
   * @param mode 'collapsed' or 'expanded'
   * @returns End state and diff for animation
   */
  setDisplayMode(mode: 'collapsed' | 'expanded'): StateChangeResult {
    const oldState = this.currentVisibleState;
    this.viewState.displayMode = mode;
    const newState = this.computeVisiblePoints();
    this.currentVisibleState = newState;

    return {
      endState: newState,
      diff: this.computeDiff(oldState, newState),
    };
  }

  /**
   * Get current visible points without changing state.
   */
  getVisiblePoints(): VisiblePointsState {
    return this.currentVisibleState ?? this.computeVisiblePoints();
  }

  /**
   * Get current view state.
   */
  getViewState(): ViewState {
    return { ...this.viewState };
  }

  /**
   * Core filtering logic: compute which points should be visible.
   * 
   * Strategy:
   * 1. Filter splits that match the current view (active questions)
   * 2. Extract point positions from matching splits based on display mode
   * 3. Return as flat array of PointPosition
   */
  private computeVisiblePoints(): VisiblePointsState {
    const matchingSplits = this.filterSplitsByView();
    const points = this.extractPointPositions(matchingSplits);
    return { points };
  }

  /**
   * Filter splits to only those matching the current view.
   * 
   * Uses O(1) lookup via viewMaps for efficient view switching.
   */
  private filterSplitsByView(): SplitWithSegmentGroup[] {
    // Look up split indices for this view
    const splitIndices = this.viewMaps[this.viewState.viewId];

    // If viewId not found in viewMaps, return empty array
    if (!splitIndices) {
      return [];
    }

    // Map indices to actual splits - O(k) where k = splits in this view
    return splitIndices.map(idx => this.serverState.splits[idx]);
  }

  /**
   * Extract point positions from the given splits based on display mode.
   * 
   * For each split, get all points from either collapsed or expanded response groups.
   */
  private extractPointPositions(
    splits: SplitWithSegmentGroup[]
  ): PointPosition[] {
    const allPoints: PointPosition[] = [];

    for (const split of splits) {
      const responseGroups =
        this.viewState.displayMode === 'collapsed'
          ? split.responseGroups.collapsed
          : split.responseGroups.expanded;

      for (const group of responseGroups) {
        allPoints.push(...group.pointPositions);
      }
    }

    return allPoints;
  }

  /**
   * Compute the diff between old and new visible states.
   * 
   * Identifies:
   * - Added points (in new, not in old)
   * - Removed points (in old, not in new)
   * - Moved points (in both, but different positions)
   */
  private computeDiff(
    oldState: VisiblePointsState | null,
    newState: VisiblePointsState
  ): VisiblePointsDiff {
    if (!oldState) {
      // Everything is added
      return {
        added: newState.points,
        removed: [],
        moved: [],
      };
    }

    const oldPointMap = new Map<string, PointPosition>();
    for (const pp of oldState.points) {
      const key = this.getPointKey(pp.point);
      oldPointMap.set(key, pp);
    }

    const newPointMap = new Map<string, PointPosition>();
    for (const pp of newState.points) {
      const key = this.getPointKey(pp.point);
      newPointMap.set(key, pp);
    }

    const added: PointPosition[] = [];
    const moved: VisiblePointsDiff['moved'] = [];

    for (const [key, newPP] of newPointMap) {
      const oldPP = oldPointMap.get(key);
      if (!oldPP) {
        added.push(newPP);
      } else if (oldPP.x !== newPP.x || oldPP.y !== newPP.y) {
        moved.push({
          point: newPP.point,
          fromX: oldPP.x,
          fromY: oldPP.y,
          toX: newPP.x,
          toY: newPP.y,
          dx: newPP.x - oldPP.x,
          dy: newPP.y - oldPP.y,
        });
      }
    }

    const removed: PointPosition[] = [];
    for (const [key, oldPP] of oldPointMap) {
      if (!newPointMap.has(key)) {
        removed.push(oldPP);
      }
    }

    return { added, removed, moved };
  }

  /**
   * Generate a unique key for a point.
   * Points are uniquely identified by their splitIdx, expandedResponseGroupIdx, and id.
   */
  private getPointKey(point: Point): string {
    return `${point.splitIdx}-${point.expandedResponseGroupIdx}-${point.id}`;
  }
}
