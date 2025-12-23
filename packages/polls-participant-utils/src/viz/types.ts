/**
 * Type definitions for participant-side visualization state management.
 * 
 * This file contains types that bridge server-side visualization data with
 * participant-specific view preferences to produce renderable point positions.
 */

import type { SplitWithSegmentGroup, Point, ViewMaps } from 'shared-computation';

/**
 * Defines which view a participant is looking at.
 * A view is determined by which questions are active (viewId) and how
 * response groups are displayed (collapsed vs expanded).
 */
export interface ViewState {
  /** View identifier - comma-separated indices of active questions (e.g., "0,1,3" or "" for base view) */
  viewId: string;
  /** Whether to show collapsed or expanded response groups */
  displayMode: 'collapsed' | 'expanded';
}

/**
 * Full canonical server-side state from the visualization stream.
 * This is the "ground truth" that all participants share.
 */
export interface ServerState {
  splits: SplitWithSegmentGroup[];
  basisSplitIndices: number[];
}

/**
 * A single point with its final rendered position for a participant's specific view.
 */
export interface ParticipantPointPosition {
  point: Point;
  x: number;
  y: number;
}

/**
 * The complete visible state for rendering: all points visible in the participant's current view.
 */
export interface ParticipantVisibleState {
  points: ParticipantPointPosition[];
}

/**
 * Describes what changed between two participant visible states (for animation).
 */
export interface ParticipantVisibleDiff {
  /** Points that were added (didn't exist before) */
  added: ParticipantPointPosition[];
  /** Points that were removed (no longer visible) */
  removed: ParticipantPointPosition[];
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
 * Result of a state change operation (either from server update or participant view change).
 */
export interface StateChangeResult {
  endState: ParticipantVisibleState;
  diff: ParticipantVisibleDiff;
}

/**
 * Callback type for subscribers to state changes.
 */
export type StateChangeCallback = (
  state: ParticipantVisibleState,
  diff?: ParticipantVisibleDiff
) => void;

/**
 * Re-export types from shared packages for convenience
 */
export type { SplitWithSegmentGroup, Point, ViewMaps } from 'shared-computation';
export type { SplitWithSegmentGroupDiff } from 'shared-computation';
