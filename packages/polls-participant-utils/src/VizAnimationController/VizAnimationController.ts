import { PointDisplay } from "../types";
import { AnimationConfig } from "../types";

/**
 * Animation plan describing what needs to animate and how.
 * Computed by planAnimation() based on diff between current and target states.
 */
interface AnimationPlan {
  // Points that need to appear (fade in or similar)
  appearing: Array<{
    key: string;
    point: PointDisplay;
  }>;

  // Points that need to disappear (fade out or similar)
  disappearing: Array<{
    key: string;
    point: PointDisplay;
  }>;

  // Points that need to move to new positions
  moving: Array<{
    key: string;
    point: PointDisplay;
    fromPosition: { x: number; y: number };
    toPosition: { x: number; y: number };
  }>;

  // Points that need to change images
  imageChanging: Array<{
    key: string;
    point: PointDisplay;
    fromImage: PointLoadedImage | undefined;
    toImage: PointLoadedImage | undefined;
  }>;

  // Total animation duration (max of all individual durations)
  totalDuration: number;
}

/**
 * VizAnimationController
 * 
 * Manages animated transitions between visualization states.
 * Encapsulates all animation planning, RAF loop management, and interpolation logic.
 * 
 * Responsibilities:
 * - Plan animations based on state diffs
 * - Execute animations via requestAnimationFrame
 * - Handle cancellation of ongoing animations
 * - Apply easing functions and interpolation
 * 
 * VizStateManager calls startAnimation() with current and target states.
 * Controller handles all the details and calls back with updated states.
 */
export class VizAnimationController {
  // RAF ID for tracking ongoing animation
  private animationFrameId: number | null = null;

  // Animation start time (for computing elapsed time)
  private startTime: number | null = null;

  // Resolved animation configuration (all durations are defined)
  private config: Required<AnimationConfig>;

  constructor(config: Required<AnimationConfig>) {
    this.config = config;
  }

  /**
   * Start an animation from current state to target state.
   * Cancels any ongoing animation before starting.
   * 
   * @param currentState - The current visible state of points (as Map)
   * @param targetState - The desired target state to animate towards (as Map)
   * @param config - Animation configuration (durations for different transition types)
   * @param onUpdate - Callback invoked each frame with updated visible state
   * @param onComplete - Optional callback invoked when animation completes
   */
  startAnimation(
    currentState: Map<string, PointDisplay>,
    targetState: Map<string, PointDisplay>,
    config: AnimationConfig | false,
    onUpdate: (newVisibleState: Map<string, PointDisplay>) => void,
    onComplete?: () => void
  ): void {
    // Cancel any ongoing animation
    this.cancel();

    // If animation is disabled, skip directly to target
    if (config === false) {
      onUpdate(targetState);
      onComplete?.();
      return;
    }

    // Plan the animation based on diff between states
    const plan = this.planAnimation(currentState, targetState);

    // If nothing needs to animate, skip directly to target
    if (plan.totalDuration === 0) {
      onUpdate(targetState);
      onComplete?.();
      return;
    }

    // Execute the animation plan
    this.executeAnimation(plan, currentState, targetState, onUpdate, onComplete);
  }

  /**
   * Cancel any ongoing animation.
   * Safe to call even if no animation is running.
   */
  cancel(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      this.startTime = null;
    }
  }

  /**
   * Plan an animation based on the diff between current and target states.
   * 
   * Analyzes the differences between states and determines:
   * - Which points are appearing (in target but not current)
   * - Which points are disappearing (in current but not target)
   * - Which points are moving (in both but different positions)
   * - Which points are changing images (in both but different images)
   * 
   * @param currentState - Current visible state (as Map for O(1) lookups)
   * @param targetState - Target visible state (as Map for O(1) lookups)
   * @returns Animation plan describing what to animate
   */
  private planAnimation(
    currentState: Map<string, PointDisplay>,
    targetState: Map<string, PointDisplay>
  ): AnimationPlan {
    const appearing: AnimationPlan['appearing'] = [];
    const disappearing: AnimationPlan['disappearing'] = [];
    const moving: AnimationPlan['moving'] = [];
    const imageChanging: AnimationPlan['imageChanging'] = [];

    // Loop 1: Iterate through target state to find appearing and moving/imageChanging points
    targetState.forEach((targetPoint, key) => {
      const currentPoint = currentState.get(key);

      if (!currentPoint) {
        // Point exists in target but not in current → appearing
        appearing.push({
          key,
          point: targetPoint
        });
      } else {
        // Point exists in both → check for position or image changes

        // Check if position changed
        if (currentPoint.position.x !== targetPoint.position.x ||
          currentPoint.position.y !== targetPoint.position.y) {
          moving.push({
            key,
            point: targetPoint,
            fromPosition: { x: currentPoint.position.x, y: currentPoint.position.y },
            toPosition: { x: targetPoint.position.x, y: targetPoint.position.y }
          });
        }

        // Check if image changed
        if (currentPoint.image !== targetPoint.image) {
          imageChanging.push({
            key,
            point: targetPoint,
            fromImage: currentPoint.image,
            toImage: targetPoint.image
          });
        }
      }
    });

    // Loop 2: Iterate through current state to find disappearing points
    currentState.forEach((currentPoint, key) => {
      if (!targetState.has(key)) {
        // Point exists in current but not in target → disappearing
        disappearing.push({
          key,
          point: currentPoint
        });
      }
    });

    // Calculate total duration as max of all animation type durations (only if that type has animations)
    const totalDuration = Math.max(
      appearing.length > 0 ? this.config.appearDuration : 0,
      disappearing.length > 0 ? this.config.disappearDuration : 0,
      moving.length > 0 ? this.config.moveDuration : 0,
      imageChanging.length > 0 ? this.config.imageChangeDuration : 0
    );

    return {
      appearing,
      disappearing,
      moving,
      imageChanging,
      totalDuration
    };
  }

  /**
   * Execute an animation plan using requestAnimationFrame.
   * 
   * This method contains the generic RAF loop and interpolation logic.
   * It computes intermediate states based on elapsed time and the plan,
   * then calls onUpdate with the interpolated state each frame.
   * 
   * @param plan - The animation plan to execute
   * @param currentState - Starting state (as Map)
   * @param targetState - Ending state (as Map)
   * @param onUpdate - Callback for each frame update
   * @param onComplete - Callback when animation completes
   */
  private executeAnimation(
    plan: AnimationPlan,
    currentState: Map<string, PointDisplay>,
    targetState: Map<string, PointDisplay>,
    onUpdate: (newVisibleState: Map<string, PointDisplay>) => void,
    onComplete?: () => void
  ): void {
    this.startTime = performance.now();

    const animate = (timestamp: number) => {
      if (this.startTime === null) return; // Animation was cancelled

      const elapsed = timestamp - this.startTime;
      const progress = Math.min(elapsed / plan.totalDuration, 1);

      // TODO: Compute interpolated state based on progress and plan
      // For now, just use linear interpolation as placeholder
      const interpolatedState = this.interpolateState(
        currentState,
        targetState,
        plan,
        progress
      );

      // Update visible state
      onUpdate(interpolatedState);

      // Continue animation or complete
      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
        this.startTime = null;
        onComplete?.();
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Interpolate between current and target states based on progress.
   * 
   * Handles:
   * - Appearing points (fade in via opacity)
   * - Disappearing points (fade out via opacity)
   * - Moving points (lerp position)
   * - Image changing points (cross-fade via transitioningFromImage and imageOpacity)
   * 
   * @param currentState - Starting state (as Map)
   * @param targetState - Ending state (as Map)
   * @param plan - Animation plan describing transitions
   * @param progress - Animation progress (0 to 1)
   * @returns Interpolated state for current frame (as Map)
   */
  private interpolateState(
    currentState: Map<string, PointDisplay>,
    targetState: Map<string, PointDisplay>,
    plan: AnimationPlan,
    progress: number
  ): Map<string, PointDisplay> {
    // Compute per-animation-type progress based on individual durations
    const appearProgress = plan.totalDuration > 0
      ? this.applyEasing(Math.min(progress * plan.totalDuration / this.config.appearDuration, 1))
      : 1;
    const disappearProgress = plan.totalDuration > 0
      ? this.applyEasing(Math.min(progress * plan.totalDuration / this.config.disappearDuration, 1))
      : 1;
    const moveProgress = plan.totalDuration > 0
      ? this.applyEasing(Math.min(progress * plan.totalDuration / this.config.moveDuration, 1))
      : 1;
    const imageChangeProgress = plan.totalDuration > 0
      ? this.applyEasing(Math.min(progress * plan.totalDuration / this.config.imageChangeDuration, 1))
      : 1;

    // Start with a copy of target state (all points that should ultimately be visible)
    const result = new Map<string, PointDisplay>();

    // Add all points from target state
    for (const [key, targetPoint] of targetState) {
      result.set(key, { ...targetPoint });
    }

    // Handle appearing points (fade in)
    for (const item of plan.appearing) {
      const point = result.get(item.key);
      if (point) {
        point.opacity = appearProgress;
      }
    }

    // Handle disappearing points (fade out, must be added to result)
    // Skip if fully disappeared (opacity would be 0)
    if (disappearProgress < 1) {
      for (const item of plan.disappearing) {
        const currentPoint = currentState.get(item.key);
        if (currentPoint) {
          result.set(item.key, {
            ...currentPoint,
            opacity: 1 - disappearProgress
          });
        }
      }
    }

    // Handle moving points (interpolate position)
    // Skip if already at final position
    if (moveProgress < 1) {
      for (const item of plan.moving) {
        const point = result.get(item.key);
        if (point) {
          point.position = {
            x: item.fromPosition.x + (item.toPosition.x - item.fromPosition.x) * moveProgress,
            y: item.fromPosition.y + (item.toPosition.y - item.fromPosition.y) * moveProgress
          };
        }
      }
    }

    // Handle image changing points (cross-fade)
    // Skip if cross-fade is complete
    if (imageChangeProgress < 1) {
      for (const item of plan.imageChanging) {
        const point = result.get(item.key);
        if (point) {
          point.transitioningFromImage = item.fromImage;
          point.crossFadeProgress = imageChangeProgress;
        }
      }
    }

    return result;
  }

  /**
   * Apply easing function to progress value.
   * 
   * @param t - Linear progress (0 to 1)
   * @param easingFunction - Name of easing function to apply
   * @returns Eased progress value
   */
  private applyEasing(t: number, easingFunction: 'linear' | 'easeInOut' | 'easeOut' = 'easeInOut'): number {
    switch (easingFunction) {
      case 'linear':
        return t;
      case 'easeOut':
        return 1 - Math.pow(1 - t, 3); // Cubic ease-out
      case 'easeInOut':
        return t < 0.5
          ? 4 * t * t * t // Ease in
          : 1 - Math.pow(-2 * t + 2, 3) / 2; // Ease out
      default:
        return t;
    }
  }
}
