/**
 * Type definitions for participant-side visualization state management.
 * 
 * This file contains types that bridge server-side visualization data with
 * participant-specific view preferences to produce renderable point positions.
 */

import type { SplitWithSegmentGroup, Point, ViewMaps, SplitWithSegmentGroupDiff } from 'shared-types';

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
  sequenceNumber: number;
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
 * A point that has moved from one position to another (for animation).
 */
export interface PointPositionChange {
  point: Point;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  dx: number;
  dy: number;
}

/**
 * The complete set of point positions for rendering in the participant's current view.
 * Stored as a Map keyed by point identifier for O(1) lookups during diff computation.
 * UI code can iterate with positions.values() or convert to array with Array.from(positions.values()).
 */
export type ParticipantPointPositions = Map<string, ParticipantPointPosition>;

/**
 * Describes what changed between two participant point position states (for animation).
 */
export interface ParticipantPointPositionsDiff {
  /** Points that were added (didn't exist before) */
  added: ParticipantPointPosition[];
  /** Points that were removed (no longer visible) */
  removed: ParticipantPointPosition[];
  /** Points that moved (with delta x/y from previous position) */
  moved: PointPositionChange[];
}

/**
 * Result of a state change operation (either from server update or participant view change).
 */
export interface StateChangeResult {
  endState: ParticipantPointPositions;
  diff: ParticipantPointPositionsDiff;
}

/**
 * Callback type for subscribers to visualization state changes.
 * Called when any visualization's point positions change.
 */
export type VizStateChangeCallback = (
  visualizationId: string,
  result: StateChangeResult
) => void;

/**
 * Callback type for subscribers to session status changes.
 * Called when the session's open/closed status changes.
 */
export type SessionStatusCallback = (
  isOpen: boolean,
  timestamp: Date | string
) => void;

/**
 * SSE connection status.
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

/**
 * Callback type for subscribers to connection status changes.
 * Called when the SSE connection state changes.
 */
export type ConnectionStatusCallback = (
  status: ConnectionStatus
) => void;

/**
 * Configuration for canvas visualization renderer.
 */
export interface VizRendererConfig {
  //to be determined
}

/**
 * Internal state for canvas visualization renderer.
 */
export interface VizRendererState {
  currentPositions: ParticipantPointPositions;
}

/**
 * Re-export types from shared packages for convenience
 */
export type { SplitWithSegmentGroup, Point, ViewMaps, SplitWithSegmentGroupDiff } from 'shared-types';
