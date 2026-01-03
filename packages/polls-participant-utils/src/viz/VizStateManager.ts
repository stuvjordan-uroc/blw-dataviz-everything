/**
 * VizStateManager: Manages the participant-specific visualization state.
 * 
 * This class integrates two sources of state:
 * 1. Canonical server state (shared by all participants)
 * 2. Participant's view preferences (personal to each participant)
 * 
 * It uses pure computation functions from viewComputation.ts to transform
 * the canonical state into participant-visible points.
 * 
 * Responsibilities:
 * - Store canonical server state (splits, basisSplitIndices)
 * - Store participant's view preferences (viewId, displayMode)
 * - Compute visible points by combining both
 * - Track state changes and generate diffs for animation
 * 
 * Does NOT:
 * - Manage SSE connections
 * - Make API calls
 * - Handle rendering or animation
 */

import type {
  SplitWithSegmentGroup,
  SplitWithSegmentGroupDiff,
  ViewMaps,
  ViewState,
  ServerState,
  ParticipantPointPositions,
  StateChangeResult,
} from './types';

import {
  initializePointPositions,
  computePointPositionsDiff,
  updatePointIdentities,
  updatePositionsForViewChange,
  updatePositionsForServerChange,
} from './viewComputation';

export class VizStateManager {
  private serverState: ServerState;
  private viewState: ViewState;
  private viewMaps: ViewMaps;
  private imageMap: Map<string, { image: HTMLImageElement; offsetToCenter: { x: number; y: number } }>;
  private expandedToCollapsedMap: number[];
  private currentPositions: ParticipantPointPositions | null = null;

  constructor(
    initialSplits: SplitWithSegmentGroup[],
    basisSplitIndices: number[],
    initialSequenceNumber: number,
    viewMaps: ViewMaps,
    imageMap: Map<string, { image: HTMLImageElement; offsetToCenter: { x: number; y: number } }>,
    expandedToCollapsedMap: number[],
    initialViewState?: Partial<ViewState>
  ) {
    this.serverState = {
      splits: initialSplits,
      basisSplitIndices: basisSplitIndices,
      sequenceNumber: initialSequenceNumber,
    };
    this.viewMaps = viewMaps;
    this.imageMap = imageMap;
    this.expandedToCollapsedMap = expandedToCollapsedMap;
    this.viewState = {
      viewId: initialViewState?.viewId ?? '', // Default to base view (no active questions)
      displayMode: initialViewState?.displayMode ?? 'expanded',
    };
    // TODO: Replace with initializePointData(serverState, viewState, viewMaps, imageMap)
    this.currentPositions = initializePointPositions(
      this.serverState,
      this.viewState,
      this.viewMaps
    );
  }

  /**
   * Apply a server update (new responses received).
   * Server always sends both full snapshot and diff.
   * 
   * @param fromSequence - Starting sequence number (should match current sequence)
   * @param toSequence - Ending sequence number (new sequence after update)
   * @param newSplits - Complete updated splits array
   * @param serverDiff - Optional diff from server (for future animation optimizations)
   * @returns End state and diff of points
   */
  applyServerUpdate(
    fromSequence: number,
    toSequence: number,
    newSplits: SplitWithSegmentGroup[],
    serverDiff?: SplitWithSegmentGroupDiff[]
  ): StateChangeResult {
    const positions = this.currentPositions;

    // Early exit: If we're already at or ahead of this sequence, nothing to do
    // This commonly happens when receiving a snapshot that matches the state from GET /sessions/:slug
    // Only take early exit if we have a current visible state to return
    if (toSequence <= this.serverState.sequenceNumber && positions) {
      return {
        pointPositions: positions,
        pointPositionsDiff: { added: [], removed: [], moved: [] },
        viewState: this.viewState,
        viewStateDiff: { viewIdChanged: false, displayModeChanged: false },
      };
    }

    // Update server state with new data
    // Note: We always update the splits reference (O(1)) rather than mutating in place
    this.serverState.splits = newSplits;
    this.serverState.sequenceNumber = toSequence;

    // Choose computation path based on whether we have usable diff
    if (fromSequence === this.serverState.sequenceNumber - 1 && serverDiff && positions) {
      // Incremental path: update points and positions based on server diff
      // Step 1: Add/remove points (mutates positions, which is this.currentPositions)
      const identityChanges = updatePointIdentities(
        positions,
        serverDiff,
        this.serverState,
        this.viewState,
        this.viewMaps,
        this.imageMap,
        this.expandedToCollapsedMap
      );

      // Step 2: Update positions for existing points that moved (mutates positions)
      const movedPoints = updatePositionsForServerChange(
        positions,
        serverDiff,
        this.serverState,
        this.viewState,
        this.viewMaps
      );

      // Assemble full diff from identity changes (added/removed) + position changes (moved)
      return {
        pointPositions: positions,
        pointPositionsDiff: {
          added: identityChanges.added,
          removed: identityChanges.removed,
          moved: movedPoints,
        },
        viewState: this.viewState,
        viewStateDiff: { viewIdChanged: false, displayModeChanged: false },
      };
    } else {
      // Full recomputation path: snapshot or sequence gap
      // Need full rebuild because we don't have a valid diff or sequential update
      // TODO: Replace with initializePointData(serverState, viewState, viewMaps, imageMap)
      const newPositions = initializePointPositions(
        this.serverState,
        this.viewState,
        this.viewMaps
      );
      const diff = computePointPositionsDiff(positions, newPositions);
      this.currentPositions = newPositions;

      return {
        pointPositions: newPositions,
        pointPositionsDiff: diff,
        viewState: this.viewState,
        viewStateDiff: { viewIdChanged: false, displayModeChanged: false },
      };
    }
  }

  /**
   * Change which view is displayed.
   * 
   * @param viewId - View identifier string (e.g., "0,1,3" or "" for base view)
   * @returns End state and diff for animation
   */
  setView(viewId: string): StateChangeResult {
    // No-op if view hasn't changed
    if (this.viewState.viewId === viewId) {
      return {
        pointPositions: this.currentPositions!,
        pointPositionsDiff: { added: [], removed: [], moved: [] },
        viewState: this.viewState,
        viewStateDiff: { viewIdChanged: false, displayModeChanged: false },
      };
    }

    // currentPositions is guaranteed non-null after constructor runs
    const positions = this.currentPositions!;
    const oldViewState = this.viewState;
    this.viewState = { ...oldViewState, viewId };

    const diff = updatePositionsForViewChange(
      positions,
      this.serverState,
      this.viewState,
      this.viewMaps
    );

    return {
      pointPositions: positions,
      pointPositionsDiff: diff,
      viewState: this.viewState,
      viewStateDiff: {
        viewIdChanged: true,
        previousViewId: oldViewState.viewId,
        displayModeChanged: false,
      },
    };
  }

  /**
   * Toggle between collapsed and expanded display modes.
   * 
   * @param mode - 'collapsed' or 'expanded'
   * @returns End state and diff for animation
   */
  setDisplayMode(mode: 'collapsed' | 'expanded'): StateChangeResult {
    // No-op if display mode hasn't changed
    if (this.viewState.displayMode === mode) {
      return {
        pointPositions: this.currentPositions!,
        pointPositionsDiff: { added: [], removed: [], moved: [] },
        viewState: this.viewState,
        viewStateDiff: { viewIdChanged: false, displayModeChanged: false },
      };
    }

    // currentPositions is guaranteed non-null after constructor runs
    const positions = this.currentPositions!;
    const oldViewState = this.viewState;
    this.viewState = { ...oldViewState, displayMode: mode };

    const diff = updatePositionsForViewChange(
      positions,
      this.serverState,
      this.viewState,
      this.viewMaps
    );

    return {
      pointPositions: positions,
      pointPositionsDiff: diff,
      viewState: this.viewState,
      viewStateDiff: {
        viewIdChanged: false,
        displayModeChanged: true,
        previousDisplayMode: oldViewState.displayMode,
      },
    };
  }

  /**
   * Get current point positions without changing state.
   */
  getVisibleState(): ParticipantPointPositions {
    return this.currentPositions!;
  }

  /**
   * Get current view state.
   */
  getViewState(): ViewState {
    return { ...this.viewState };
  }

  /**
   * Get current canonical server state.
   */
  getServerState(): ServerState {
    return {
      splits: this.serverState.splits,
      basisSplitIndices: this.serverState.basisSplitIndices,
      sequenceNumber: this.serverState.sequenceNumber,
    };
  }
}
