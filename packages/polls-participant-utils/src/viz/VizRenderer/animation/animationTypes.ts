/**
 * Animation system type definitions.
 * 
 * This module defines the core data structures for the animation system:
 * - TransitionPlan: Data required to initiate a transition
 * - AnimationFrameData: Data required by each animation frame callback
 */

import type { PointImage } from '../../types';

/**
 * Data required to initiate a transition from current visual state to new logical state.
 * 
 * This plan categorizes points by what animations they need and specifies timing.
 * It is computed once when a transition begins and remains constant throughout the animation.
 */
export interface TransitionPlan {
  /**
   * Points that need to disappear (fade out).
   * Set contains serialized point IDs (from getPointKey).
   */
  removingPoints: Set<string>;

  /**
   * Points that need to appear (fade in).
   * Map from serialized point ID to target position where they should appear.
   */
  addingPoints: Map<string, { x: number; y: number }>;

  /**
   * Points that need to move (position interpolation).
   * Map from serialized point ID to initial and target positions.
   */
  movingPoints: Map<string, { fromX: number; fromY: number; toX: number; toY: number }>;

  /**
   * Points that need image changes (cross-fade).
   * Map from serialized point ID to initial and target images.
   */
  imageChangingPoints: Map<string, { fromImage: PointImage; toImage: PointImage }>;

  /**
   * Animation phase durations in milliseconds.
   * These are resolved from config with defaults applied.
   */
  durations: {
    /** Duration for disappear phase (fade out) */
    disappearDuration: number;
    /** Duration for move phase (position interpolation) */
    moveDuration: number;
    /** Duration for image change phase (cross-fade), 0 if no changes needed */
    imageChangeDuration: number;
    /** Duration for appear phase (fade in) */
    appearDuration: number;
  };

  /**
   * Total duration of the entire animation sequence.
   * Pre-computed to avoid recalculating every frame.
   */
  totalDuration: number;
}

/**
 * Data passed to each animation frame callback.
 * 
 * Contains the transition plan plus timing information for the current frame.
 */
export interface AnimationFrameData {
  /** The transition plan (what needs to animate) */
  plan: TransitionPlan;

  /** When the animation started (from performance.now()) */
  startTime: number;

  /** Current timestamp (from requestAnimationFrame) */
  currentTime: number;
}
