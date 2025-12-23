/**
 * ParticipantVizState: Manages the participant-specific visualization state.
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
  ParticipantVisibleState,
  StateChangeResult,
} from './types';

import {
  computeVisiblePoints,
  computeVisiblePointsDiff,
} from './viewComputation';

export class ParticipantVizState {
  private serverState: ServerState;
  private viewState: ViewState;
  private viewMaps: ViewMaps;
  private currentVisible: ParticipantVisibleState | null = null;

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
    this.currentVisible = this.computeCurrentVisibleState();
  }

  /**
   * Apply a server update (new responses received).
   * Server always sends both full snapshot and diff.
   * 
   * @param newSplits - Complete updated splits array
   * @param serverDiff - Optional diff from server (for future animation optimizations)
   * @returns End state and diff for visible points only
   */
  applyServerUpdate(
    newSplits: SplitWithSegmentGroup[],
    serverDiff?: SplitWithSegmentGroupDiff[]
  ): StateChangeResult {
    const oldVisible = this.currentVisible;
    this.serverState.splits = newSplits;
    const newVisible = this.computeCurrentVisibleState();
    this.currentVisible = newVisible;

    return {
      endState: newVisible,
      diff: computeVisiblePointsDiff(oldVisible, newVisible),
    };
  }

  /**
   * Change which view is displayed.
   * 
   * @param viewId - View identifier string (e.g., "0,1,3" or "" for base view)
   * @returns End state and diff for animation
   */
  setView(viewId: string): StateChangeResult {
    const oldVisible = this.currentVisible;
    this.viewState.viewId = viewId;
    const newVisible = this.computeCurrentVisibleState();
    this.currentVisible = newVisible;

    return {
      endState: newVisible,
      diff: computeVisiblePointsDiff(oldVisible, newVisible),
    };
  }

  /**
   * Toggle between collapsed and expanded display modes.
   * 
   * @param mode - 'collapsed' or 'expanded'
   * @returns End state and diff for animation
   */
  setDisplayMode(mode: 'collapsed' | 'expanded'): StateChangeResult {
    const oldVisible = this.currentVisible;
    this.viewState.displayMode = mode;
    const newVisible = this.computeCurrentVisibleState();
    this.currentVisible = newVisible;

    return {
      endState: newVisible,
      diff: computeVisiblePointsDiff(oldVisible, newVisible),
    };
  }

  /**
   * Get current visible points without changing state.
   */
  getVisibleState(): ParticipantVisibleState {
    return this.currentVisible ?? this.computeCurrentVisibleState();
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
    };
  }

  /**
   * Internal helper: Compute current visible state using pure functions.
   */
  private computeCurrentVisibleState(): ParticipantVisibleState {
    return computeVisiblePoints(
      this.serverState.splits,
      this.viewState.viewId,
      this.viewState.displayMode,
      this.viewMaps
    );
  }
}
