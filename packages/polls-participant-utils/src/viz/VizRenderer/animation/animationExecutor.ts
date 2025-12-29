/**
 * Animation frame execution logic.
 * 
 * This module contains pure functions for updating visual state during animation.
 * Each frame, the visual state is mutated to move closer to the logical state
 * based on elapsed time and easing functions.
 */

import type { AnimationFrameData } from './animationTypes';
import type { VisualState, LogicalState } from '../internalTypes';

/**
 * Update visual state for one animation frame.
 * 
 * This is a pure function (modifies visualState in place, but has no other side effects).
 * It calculates progress for each animation phase and updates visual point properties
 * (opacity, position, imageCrossFadeProgress) accordingly.
 * 
 * @param visualState - Visual state to update (mutated in place)
 * @param logicalState - Logical state (for target positions)
 * @param frameData - Animation frame data (plan + timing)
 */
export function updateVisualStateForFrame(
  visualState: VisualState,
  logicalState: LogicalState,
  frameData: AnimationFrameData
): void {
  const { plan, startTime, currentTime } = frameData;
  const { removingPoints, addingPoints, movingPoints, imageChangingPoints, durations } = plan;
  const { disappearDuration, moveDuration, imageChangeDuration, appearDuration } = durations;

  // Calculate elapsed time since animation start
  const elapsed = currentTime - startTime;

  // Calculate phase timing (sequential: disappear → move/image → appear)
  const disappearStart = 0;
  const disappearEnd = disappearDuration;
  const moveStart = disappearEnd;
  const moveEnd = moveStart + moveDuration;
  const imageChangeStart = disappearEnd;
  const imageChangeEnd = imageChangeStart + imageChangeDuration;
  const appearStart = Math.max(moveEnd, imageChangeEnd);
  const appearEnd = appearStart + appearDuration;

  // Easing functions (applied to linear 0-1 time)
  const easeIn = (t: number): number => t * t; // Quadratic acceleration
  const easeOut = (t: number): number => 1 - (1 - t) * (1 - t); // Quadratic deceleration
  const easeInOut = (t: number): number =>
    t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t); // Smooth both ends

  // Calculate progress for each phase (0 = not started, 0-1 = in progress, 1 = complete)
  const disappearProgress = elapsed >= disappearStart && elapsed < disappearEnd
    ? easeIn((elapsed - disappearStart) / disappearDuration)
    : elapsed >= disappearEnd ? 1 : 0;

  const moveProgress = elapsed >= moveStart && elapsed < moveEnd
    ? easeInOut((elapsed - moveStart) / moveDuration)
    : elapsed >= moveEnd ? 1 : 0;

  const imageChangeProgress = elapsed >= imageChangeStart && elapsed < imageChangeEnd
    ? easeInOut((elapsed - imageChangeStart) / imageChangeDuration)
    : elapsed >= imageChangeEnd ? 1 : 0;

  const appearProgress = elapsed >= appearStart && elapsed < appearEnd
    ? easeOut((elapsed - appearStart) / appearDuration)
    : elapsed >= appearEnd ? 1 : 0;

  // Linear interpolation helper
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // Update visual state for each point
  for (const [id, visualPoint] of visualState.points) {
    // Handle disappearing points (mutually exclusive with all others except image change,
    // but disappearing points skip image changes anyway)
    if (removingPoints.has(id)) {
      visualPoint.opacity = 1 - disappearProgress;
      continue;
    }

    // Handle appearing points (mutually exclusive with moving and can't have image changes)
    if (addingPoints.has(id)) {
      visualPoint.opacity = appearProgress;
      continue;
    }

    // Handle moving points (may also have image change)
    const moveData = movingPoints.get(id);
    if (moveData) {
      visualPoint.x = lerp(moveData.fromX, moveData.toX, moveProgress);
      visualPoint.y = lerp(moveData.fromY, moveData.toY, moveProgress);
      // Check for image change as well
      if (imageChangingPoints.has(id)) {
        visualPoint.imageCrossFadeProgress = imageChangeProgress;
      }
      continue;
    }

    // Handle stationary points with only image changes
    if (imageChangingPoints.has(id)) {
      visualPoint.imageCrossFadeProgress = imageChangeProgress;
    }
  }
}

