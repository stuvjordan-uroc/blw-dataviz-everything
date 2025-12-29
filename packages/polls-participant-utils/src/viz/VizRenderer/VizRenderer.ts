/**
 * VizRenderer: Canvas-based renderer for participant visualizations.
 * 
 * This class encapsulates an HTMLCanvasElement and provides methods for
 * drawing and animating visualization states.
 * 
 * Auto-subscribes to SessionVizClient for state updates and handles
 * rendering automatically.
 * 
 * Architecture:
 * - Logical state: The "ground truth" from SessionVizClient (target state)
 * - Visual state: What's currently rendered (may be mid-animation)
 * - Animation: Gradually transitions visual state toward logical state
 * 
 * Animation logic is delegated to pure functions in the animation/ directory:
 * - animationPlanner: Computes what needs to animate
 * - animationExecutor: Updates visual state each frame
 */

import type { Point } from 'shared-types';
import type {
  VizRendererConfig,
  PointImage,
} from '../types';
import { computeCanvasHeight, scalePoint } from './scaling';
import { planTransition } from './animation/animationPlanner';
import { updateVisualStateForFrame } from './animation/animationExecutor';
import type { AnimationFrameData } from './animation/animationTypes';
import type { LogicalState, VisualState, VisualPointState, CanvasState } from './internalTypes';

export class VizRenderer {
  // Core state
  private logicalState: LogicalState;
  private visualState: VisualState;
  private canvas: CanvasState;
  private config: VizRendererConfig;

  // Visualization metadata
  private visualizationId: string;
  private unsubscribe: (() => void) | null = null;

  // Animation tracking (ephemeral, not state)
  private animationFrameId: number | null = null;

  constructor(config: VizRendererConfig) {
    this.config = config;
    this.visualizationId = config.visualizationId;

    // Initialize canvas state
    const ctx = config.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context from canvas');
    }
    this.canvas = {
      element: config.canvas,
      context: ctx,
      pixelWidth: 0,
      pixelHeight: 0,
    };

    // Get visualization dimensions from client
    const sessionData = config.client.getSessionData();
    if (!sessionData) {
      throw new Error('SessionVizClient is not connected');
    }

    const vizData = sessionData.visualizations.find(v => v.visualizationId === config.visualizationId);
    if (!vizData) {
      throw new Error(`Visualization ${config.visualizationId} not found in session`);
    }

    // Validate config
    if (!this.config.getImage && !(this.config.getImageKey && this.config.images)) {
      throw new Error('VizRendererConfig must provide either getImage or (getImageKey + images)');
    }

    // Initialize logical state (will be populated by first callback)
    this.logicalState = {
      result: {
        pointPositions: new Map(),
        pointPositionsDiff: { added: [], removed: [], moved: [] },
        viewState: { viewId: '', displayMode: 'expanded' },
        viewStateDiff: { viewIdChanged: false, displayModeChanged: false },
      },
      vizWidth: vizData.vizWidth,
      vizHeight: vizData.vizHeight,
    };

    // Initialize visual state (empty, will sync on first callback)
    this.visualState = {
      points: new Map(),
    };

    // Auto-subscribe to state updates
    // Callback fires immediately with current state, then on future updates
    this.unsubscribe = config.client.subscribeToVizState((vizId, result) => {
      if (vizId === this.visualizationId) {
        // Update logical state
        this.logicalState.result = result;

        // Handle first callback: set canvas dimensions and sync visual to logical
        if (this.canvas.pixelWidth === 0) {
          this.setCanvasWidth(config.canvasWidth);
          this.syncVisualToLogical();
          this.drawVisualState();
        } else {
          // Subsequent updates: transition visual state toward logical state
          this.transitionToLogical();
        }
      }
    });
    // Note: At this point, callback has already fired and canvas is drawn
  }

  /**
   * Clean up resources and unsubscribe from client.
   * Should be called when the renderer is no longer needed.
   */
  destroy(): void {
    // Cancel any ongoing animation
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Unsubscribe from client
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Set canvas width and compute/set height to maintain aspect ratio.
   * Mutates the canvas element's width and height properties.
   * Browser automatically clears the canvas when dimensions change.
   * 
   * @param width - Desired canvas width in pixels
   */
  setCanvasWidth(width: number): void {
    this.canvas.pixelWidth = width;
    this.canvas.pixelHeight = computeCanvasHeight(
      this.logicalState.vizWidth,
      this.logicalState.vizHeight,
      width
    );

    // Mutate canvas dimensions (browser auto-clears)
    this.canvas.element.width = this.canvas.pixelWidth;
    this.canvas.element.height = this.canvas.pixelHeight;
  }

  /**
   * Synchronize visual state to match logical state instantly (no animation).
   * Used for initial render and when animations are disabled.
   */
  private syncVisualToLogical(): void {
    const newPoints = new Map<string, VisualPointState>();

    // Create visual state for each logical point
    for (const [id, position] of this.logicalState.result.pointPositions) {
      const image = this.getImageForPoint(position.point, this.logicalState.result.viewState);

      newPoints.set(id, {
        point: position.point,
        x: position.x,
        y: position.y,
        opacity: 1,
        image,
      });
    }

    this.visualState.points = newPoints;
  }

  /**
   * Start transition from current visual state to logical state.
   * 
   * If animations are disabled, syncs immediately.
   * Otherwise, computes a transition plan and starts the animation.
   */
  private transitionToLogical(): void {
    const animationEnabled = this.config.animation !== false;

    if (!animationEnabled) {
      // No animation: instant sync
      this.syncVisualToLogical();
      this.drawVisualState();
      return;
    }

    // Cancel any ongoing animation
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Compute transition plan using animation planner
    const plan = planTransition(
      this.logicalState,
      this.visualState,
      this.config.animation,
      (point, viewState) => this.getImageForPoint(point, viewState)
    );

    // Step 3: Prepare visual state for animation
    // Add appearing points to visual state with opacity=0 (they'll fade in during appear phase)
    for (const [id, position] of plan.addingPoints) {
      const point = this.logicalState.result.pointPositions.get(id)!.point;
      const image = this.getImageForPoint(point, this.logicalState.result.viewState);
      this.visualState.points.set(id, {
        point,
        x: position.x,
        y: position.y,
        opacity: 0,
        image,
      });
    }

    // Set up image cross-fade for points that need it
    for (const [id, { fromImage, toImage }] of plan.imageChangingPoints) {
      const visualPoint = this.visualState.points.get(id)!;
      visualPoint.previousImage = fromImage;
      visualPoint.image = toImage;
      visualPoint.imageCrossFadeProgress = 0;
    }

    // Start the animation
    const animationStartTime = performance.now();
    this.animationFrameId = requestAnimationFrame((currentTime) =>
      this.animateFrame({
        plan,
        startTime: animationStartTime,
        currentTime,
      })
    );
  }

  /**
   * Animation frame callback - runs every frame to update visual state.
   * 
   * Delegates to animationExecutor for state updates, handles rendering
   * and animation lifecycle (continue or complete).
   * 
   * @param frameData - Animation frame data (plan + timing)
   */
  private animateFrame(frameData: AnimationFrameData): void {
    // Update visual state for this frame
    updateVisualStateForFrame(
      this.visualState,
      this.logicalState,
      frameData
    );

    // Render the updated visual state
    this.drawVisualState();

    // Check if animation should continue
    const elapsed = frameData.currentTime - frameData.startTime;

    if (elapsed < frameData.plan.totalDuration) {
      // Animation still in progress - schedule next frame
      this.animationFrameId = requestAnimationFrame((nextTime) =>
        this.animateFrame({
          ...frameData,
          currentTime: nextTime,
        })
      );
    } else {
      // Animation complete: clean up
      this.animationFrameId = null;
      // Sync visual to logical to ensure exact final state
      this.syncVisualToLogical();
      this.drawVisualState();
    }
  }

  /**
   * Draw the current visual state on the canvas.
   * Pure rendering function - does not modify state.
   */
  private drawVisualState(): void {
    // Clear canvas
    this.canvas.context.clearRect(0, 0, this.canvas.pixelWidth, this.canvas.pixelHeight);

    // Draw each point in visual state
    for (const visualPoint of this.visualState.points.values()) {
      // Scale abstract coordinates to pixels
      const { x: pixelX, y: pixelY } = scalePoint(
        visualPoint.x,
        visualPoint.y,
        this.logicalState.vizWidth,
        this.logicalState.vizHeight,
        this.canvas.pixelWidth,
        this.canvas.pixelHeight
      );

      // Apply opacity if not fully opaque
      const ctx = this.canvas.context;
      const needsOpacity = visualPoint.opacity < 1;

      if (needsOpacity) {
        ctx.globalAlpha = visualPoint.opacity;
      }

      // Handle cross-fade if transitioning between images
      if (visualPoint.previousImage && visualPoint.imageCrossFadeProgress !== undefined) {
        // Draw previous image with inverted opacity
        const prevOpacity = 1 - visualPoint.imageCrossFadeProgress;
        ctx.globalAlpha = (needsOpacity ? visualPoint.opacity : 1) * prevOpacity;

        const prevOffsetX = visualPoint.previousImage.offsetX ?? visualPoint.previousImage.image.width / 2;
        const prevOffsetY = visualPoint.previousImage.offsetY ?? visualPoint.previousImage.image.height / 2;

        ctx.drawImage(
          visualPoint.previousImage.image,
          pixelX - prevOffsetX,
          pixelY - prevOffsetY
        );

        // Draw current image with fade-in opacity
        ctx.globalAlpha = (needsOpacity ? visualPoint.opacity : 1) * visualPoint.imageCrossFadeProgress;
      }

      // Draw current image
      const { image, offsetX, offsetY } = visualPoint.image;
      const finalOffsetX = offsetX ?? image.width / 2;
      const finalOffsetY = offsetY ?? image.height / 2;

      ctx.drawImage(
        image,
        pixelX - finalOffsetX,
        pixelY - finalOffsetY
      );

      // Reset opacity
      if (needsOpacity || visualPoint.previousImage) {
        ctx.globalAlpha = 1;
      }
    }
  }

  /**
   * Get image data for a specific point, applying default offsets if needed.
   * 
   * @param point - The point to get image data for
   * @param viewState - The view state (for image selection)
   * @returns PointImage with image and offsets (defaults applied)
   */
  private getImageForPoint(point: Point, viewState: typeof this.logicalState.result.viewState): PointImage {
    let pointImage: PointImage;

    if (this.config.getImageKey && this.config.images) {
      // Key-based lookup (preferred if both methods provided)
      const key = this.config.getImageKey(point, viewState);
      const imageData = this.config.images.get(key);
      if (!imageData) {
        throw new Error(`No image found for key: ${key}`);
      }
      pointImage = imageData;
    } else if (this.config.getImage) {
      // Direct function
      pointImage = this.config.getImage(point, viewState);
    } else {
      throw new Error('Invalid config state');
    }

    // Apply defaults for offsets if not specified
    return {
      image: pointImage.image,
      offsetX: pointImage.offsetX ?? pointImage.image.width / 2,
      offsetY: pointImage.offsetY ?? pointImage.image.height / 2,
    };
  }
}
