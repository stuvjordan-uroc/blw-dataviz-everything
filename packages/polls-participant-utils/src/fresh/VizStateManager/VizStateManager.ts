import { VisualizationData, VisualizationUpdateEvent } from "shared-types";
import { VizLogicalState, VizData } from "./types";
import { PointLoadedImage, VizRenderConfig, AnimationConfig, PointDisplay } from '../types';
import { computeTargetVisibleState } from "./pointDisplayComputation";
import { VizAnimationController } from '../VizAnimationController';

export class VizStateManager {

  //viz data, fixed throughout the lifetime of the session
  private vizData: VizData;

  //canvas to draw on
  private canvas: {
    element: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    pixelWidth: number;
    pixelHeight: number;
  };

  //complete representation of the current logical state of the viz,
  //driven by public setXXX methods,
  //includes logicalState.targetVisibleState towards which animations
  //converge
  private logicalState: VizLogicalState;

  //current visible state
  //equal to logicalState.targetVisibleState when animation completes
  private currentVisibleState: Map<string, PointDisplay> = new Map();

  private animation: Required<AnimationConfig>;

  private animationController: VizAnimationController;


  constructor(
    viz: VisualizationData,
    canvas: HTMLCanvasElement,
    vizImages: Map<string, PointLoadedImage>,
    vizRenderConfig: VizRenderConfig
  ) {

    //populate the viz data
    this.vizData = {
      ...viz,
      loadedImages: vizImages
    }

    // Initialize canvas state
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context from canvas');
    }
    this.canvas = {
      element: canvas,
      context: ctx,
      pixelWidth: Math.round(vizRenderConfig.initialCanvasWidth),
      pixelHeight: Math.round(vizRenderConfig.initialCanvasWidth * viz.vizHeight / viz.vizWidth),
    };
    //setting canvas width and height auto-clears canvas.
    this.canvas.element.width = this.canvas.pixelWidth;
    this.canvas.element.height = this.canvas.pixelHeight;

    //initialize logical state
    this.logicalState = {
      serverState: viz.splits,
      displayMode: vizRenderConfig.initialDisplayMode,
      viewId: "", //hardcoded default: the view in which no questions are active.
      targetVisibleState: computeTargetVisibleState(
        viz.splits,
        vizRenderConfig.initialDisplayMode,
        "",
        this.vizData,
        this.canvas
      )
    }

    //draw target state and sync currentVisibleState to target.
    this.syncToLogicalState()

    // Resolve animation config: use defaults, user config, or all 0s if disabled
    if (vizRenderConfig.animation === false) {
      this.animation = {
        appearDuration: 0,
        disappearDuration: 0,
        moveDuration: 0,
        imageChangeDuration: 0
      };
    } else {
      this.animation = {
        appearDuration: vizRenderConfig.animation?.appearDuration ?? 200,
        disappearDuration: vizRenderConfig.animation?.disappearDuration ?? 150,
        moveDuration: vizRenderConfig.animation?.moveDuration ?? 400,
        imageChangeDuration: vizRenderConfig.animation?.imageChangeDuration ?? 400
      };
    }

    // Always instantiate animation controller
    this.animationController = new VizAnimationController(this.animation);
  }

  /**
   * PRIVATE METHODS
   */

  private syncToLogicalState() {
    //TODO -- cancel any ongoing animation

    //set the currentVisibleState to the target
    this.currentVisibleState = this.logicalState.targetVisibleState;

    //draw the currentVisibleState
    this.drawVisibleState()
  }

  private drawVisibleState() {
    // Clear the entire canvas
    this.canvas.context.clearRect(0, 0, this.canvas.pixelWidth, this.canvas.pixelHeight);

    // Draw each point at its position
    for (const pointDisplay of this.currentVisibleState.values()) {
      if (!pointDisplay.image) {
        continue; // Skip points without images
      }

      // Calculate the top-left corner position by subtracting the offset to center
      const drawX = pointDisplay.position.x - pointDisplay.image.offsetToCenter.x;
      const drawY = pointDisplay.position.y - pointDisplay.image.offsetToCenter.y;

      // Draw the image at the calculated position
      this.canvas.context.drawImage(
        pointDisplay.image.image,
        drawX,
        drawY
      );
    }
  }


  /**
   * PUBLIC METHODS
   */

  //handle for client to set client-side view id
  setClientViewId(viewId: string) {
    //TODO
  }

  //handle for client to set client-side display mode
  setClientDisplayMode(displayMode: "expanded" | "collapsed") {
    //TODO
  }

  //set, for hooking into visualization.update events
  setServerState(vizUpdate: VisualizationUpdateEvent) {
    //TODO
  }

  //handle to client to set canvas width
  setCanvasWidth() {
    //TODO
    //Step 1: cancel any ongoing animations
    //Step 2: reset canvas dimensions (clears canvas automatically)
    //Step 3: update this.logicalState.targetVisibleState so that positions are scaled to new canvas dimensions
    //Step 4: call this.syncToLogicalState()
  }


}