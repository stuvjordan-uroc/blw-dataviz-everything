/**
 * Type definitions for participant-side visualization state management.
 * 
 * This file contains types that bridge server-side visualization data with
 * participant-specific view preferences to produce renderable point positions.
 */

import type { SplitWithSegmentGroup, Point, ViewMaps, SplitWithSegmentGroupDiff } from 'shared-types';
import type { SessionVizClient } from './SessionVizClient';

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
 * Describes what changed in ViewState (for animating image transitions).
 */
export interface ViewStateDiff {
  /** Whether the viewId changed */
  viewIdChanged: boolean;
  /** Previous viewId (if it changed) */
  previousViewId?: string;
  /** Whether the displayMode changed */
  displayModeChanged: boolean;
  /** Previous displayMode (if it changed) */
  previousDisplayMode?: 'collapsed' | 'expanded';
}

/**
 * Result of a state change operation (either from server update or participant view change).
 */
export interface StateChangeResult {
  pointPositions: ParticipantPointPositions;
  pointPositionsDiff: ParticipantPointPositionsDiff;
  viewState: ViewState;
  viewStateDiff: ViewStateDiff;
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
 * Image data for rendering a point.
 */
export interface PointImage {
  /** The image element to draw */
  image: HTMLImageElement;

  /** X offset to center image on point (defaults to image.width / 2) */
  offsetX?: number;

  /** Y offset to center image on point (defaults to image.height / 2) */
  offsetY?: number;
}

/**
 * Animation configuration for VizRenderer.
 * 
 * Controls timing for different types of state transitions.
 * Easing functions are hard-coded per animation type:
 * - Appear: ease-out (decelerating)
 * - Disappear: ease-in (accelerating)
 * - Move: ease-in-out (smooth)
 * - Image change: ease-in-out (smooth, synced with move)
 * 
 * Sequencing is hard-coded: disappear → (move + imageChange) → appear
 */
export interface VizRendererAnimationConfig {
  /** Duration for points appearing (fade in). Default: 200ms */
  appearDuration?: number;

  /** Duration for points disappearing (fade out). Default: 150ms */
  disappearDuration?: number;

  /** Duration for points moving to new positions. Default: 400ms */
  moveDuration?: number;

  /** Duration for point images changing (cross-fade). Default: matches moveDuration */
  imageChangeDuration?: number;

  /** Set to false to disable all animations. Default: true */
  enabled?: boolean;
}

/**
 * Configuration for canvas visualization renderer.
 */
export interface VizRendererConfig {
  /** The canvas element to render on */
  canvas: HTMLCanvasElement;

  /** Desired canvas width in pixels */
  canvasWidth: number;

  /** The SessionVizClient managing the session */
  client: SessionVizClient;

  /** The visualization ID to render */
  visualizationId: string;

  /**
   * Option 1: Direct image selection function.
   * Return image and optional offset for centering.
   */
  getImage?: (point: Point, viewState: ViewState) => PointImage;

  /**
   * Option 2: Key-based image selection.
   * Provide both getImageKey and images map.
   */
  getImageKey?: (point: Point, viewState: ViewState) => string;
  images?: Map<string, PointImage>;

  /**
   * Animation configuration. Pass false to disable all animations.
   * Default: enabled with default durations (200/150/400ms)
   */
  animation?: VizRendererAnimationConfig | false;
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
