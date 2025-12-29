/**
 * Animation planning logic.
 * 
 * This module contains pure functions for computing what animations are needed
 * when transitioning from current visual state to new logical state.
 */

import type { PointImage, VizRendererAnimationConfig } from '../../types';
import type { Point } from 'shared-types';
import type { TransitionPlan } from './animationTypes';
import type { VisualState, LogicalState } from '../internalTypes';

/**
 * Image lookup function type.
 */
export type GetImageForPoint = (
  point: Point,
  viewState: LogicalState['result']['viewState']
) => PointImage;

/**
 * Compute a transition plan from state change.
 * 
 * This is a pure function that determines what animations are needed by comparing
 * the current visual state against the target logical state. This approach handles
 * interrupted animations correctly - if an animation is in progress when a new
 * state arrives, we animate from the current visual position to the new target,
 * not from the old logical state described in the diff.
 * 
 * @param logicalState - New logical state (target)
 * @param visualState - Current visual state (starting point)
 * @param animationConfig - Animation configuration (durations, etc.)
 * @param getImageForPoint - Function to get image for a point
 * @returns Complete transition plan
 */
export function planTransition(
  logicalState: LogicalState,
  visualState: VisualState,
  animationConfig: VizRendererAnimationConfig | false | undefined,
  getImageForPoint: GetImageForPoint
): TransitionPlan {
  const { viewIdChanged, displayModeChanged } = logicalState.result.viewStateDiff;

  // We'll build these collections by comparing visual state vs logical state
  const removingPoints = new Set<string>();
  const addingPoints = new Map<string, { x: number; y: number }>();
  const movingPoints = new Map<string, { fromX: number; fromY: number; toX: number; toY: number }>();
  const imageChangingPoints = new Map<string, { fromImage: PointImage; toImage: PointImage }>();

  // Step 1: Check each point in current visual state
  // Points in visual state but NOT in target logical state need to be removed
  // Points in both states may need position updates (movement animations) or image changes
  for (const [id, visualPoint] of visualState.points) {
    const logicalPosition = logicalState.result.pointPositions.get(id);

    if (!logicalPosition) {
      // Point exists visually but not in target logical state -> remove it
      removingPoints.add(id);
    } else {
      // Point exists in both states -> check if position changed
      // Note: We use current visual position as fromX/fromY (not the old logical state)
      // This ensures smooth transitions even if we're interrupting a previous animation
      const positionChanged =
        visualPoint.x !== logicalPosition.x ||
        visualPoint.y !== logicalPosition.y;

      if (positionChanged) {
        movingPoints.set(id, {
          fromX: visualPoint.x,
          fromY: visualPoint.y,
          toX: logicalPosition.x,
          toY: logicalPosition.y,
        });
      }

      // Check if image changed (due to view change)
      if (viewIdChanged || displayModeChanged) {
        const toImage = getImageForPoint(
          logicalPosition.point,
          logicalState.result.viewState
        );
        if (toImage.image !== visualPoint.image.image) {
          imageChangingPoints.set(id, {
            fromImage: visualPoint.image,
            toImage,
          });
        }
      }
    }
  }

  // Step 2: Check each point in target logical state
  // Points in logical state but NOT in current visual state need to be added
  for (const [id, logicalPosition] of logicalState.result.pointPositions) {
    if (!visualState.points.has(id)) {
      // Point exists in target logical state but not visually -> add it
      addingPoints.set(id, {
        x: logicalPosition.x,
        y: logicalPosition.y
      });
    }
  }

  // Get animation durations from config (with defaults)
  const config = animationConfig === false ? undefined : animationConfig;
  const disappearDuration = config?.disappearDuration ?? 150;
  const moveDuration = config?.moveDuration ?? 400;
  // Optimize: skip expensive cross-fade rendering if no image changes needed
  let imageChangeDuration = config?.imageChangeDuration ?? 250;
  if (imageChangingPoints.size === 0) {
    imageChangeDuration = 0;
  }
  const appearDuration = config?.appearDuration ?? 200;

  // Calculate total duration of animation sequence
  const totalDuration = Math.max(
    disappearDuration,
    disappearDuration + moveDuration,
    disappearDuration + imageChangeDuration,
    disappearDuration + moveDuration + appearDuration
  );

  return {
    removingPoints,
    addingPoints,
    movingPoints,
    imageChangingPoints,
    durations: {
      disappearDuration,
      moveDuration,
      imageChangeDuration,
      appearDuration,
    },
    totalDuration,
  };
}
