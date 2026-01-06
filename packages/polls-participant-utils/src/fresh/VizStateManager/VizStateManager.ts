import { VisualizationData, VisualizationUpdateEvent } from "shared-types";
import { VizLogicalState, VizData } from "./types";
import { PointLoadedImage, VizRenderConfig, AnimationConfig, PointDisplay } from '../types';
import { computeTargetVisibleState, rescaleVisibleState } from "./pointDisplayComputation";
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

    //compute canvas pixel width and height from requested initial canvas width
    const { shimmedPixelWidth, shimmedPixelHeight } = this.computeCanvasPixelDimensions(vizRenderConfig.initialCanvasWidth)
    this.canvas = {
      element: canvas,
      context: ctx,
      pixelWidth: shimmedPixelWidth,
      pixelHeight: shimmedPixelHeight,
    };
    //setting canvas width and height auto-clears canvas.
    this.canvas.element.width = this.canvas.pixelWidth;
    this.canvas.element.height = this.canvas.pixelHeight;

    //initialize logical state
    this.logicalState = {
      serverState: viz.splits,
      serverSequenceNumber: viz.sequenceNumber,
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

  /**
   * set visible state to target state and
   * draw target state immediately, with no animation.
   */
  private syncToLogicalState() {

    //set the currentVisibleState to the target
    this.currentVisibleState = this.logicalState.targetVisibleState;

    //draw the currentVisibleState
    this.drawVisibleState()
  }

  /**
   * Takes a requested width for the canvas.  Computes pixel width and pixel height
   * to match aspect ratio of viz, given by vizData.vizWidth:vizData.vizHeight.
   * 
   * Shims the requested with to guarantee that computed pixel width and height are 
   * each greater than or equal to 1.
   * 
   * Returned width and height are in whole numbers.
   * 
   * @param width 
   * @returns shimmed width
   */
  private computeCanvasPixelDimensions(requestedWidth: number): { shimmedPixelWidth: number, shimmedPixelHeight: number } {
    /**
     * Given the input width, we would compute pixelWidth
     * and pixelHeight with no shim as follows:
     * 
     * pixelWidth = Math.round(width)
     * pixelHeight = Math.round(Math.round(width) * this.vizData.vizHeight / this.vizData.vizWidth)
     * 
     * But this could result in a pixelHeight or pixelWidth less than 1!
     * 
     * So we shim as follows...
     */

    //first compute the aspect ratio

    const aspectRatio = this.vizData.vizHeight / this.vizData.vizWidth

    /**
     * Find the minimum value of RPW such that
     * 
     * Math.round( RPW * aspectRatio) >= 1
     * 
     * A sufficient condition is RPW * aspectRatio >= 1
     * 
     * Thus RPW >= 1/aspectRatio
     */

    const minRPW = 1 / aspectRatio

    /**
     * If pixelWidth >= minRPW, then computed pixelHeight is 
     * guaranteed to be at least 1.
     * 
     * So we just need to set pixelWidth to a whole number
     * greater than or equal to the larger of minRPW and 1 
     */

    const pixelWidth = Math.round(requestedWidth) >= Math.max(minRPW, 1) ? Math.round(requestedWidth) : Math.ceil(Math.max(minRPW, 1))
    const pixelHeight = Math.round(pixelWidth * aspectRatio)

    if (pixelWidth > Math.round(requestedWidth)) {
      console.warn(`Canvas width requested ${requestedWidth} for viz with id ${this.vizData.visualizationId} too narrow.  Padded to ${pixelWidth} pixels.`)
    }
    return { shimmedPixelWidth: pixelWidth, shimmedPixelHeight: pixelHeight };
  }

  /**
   * Draw visible state immediately
   */
  private drawVisibleState() {
    // Clear the entire canvas
    this.canvas.context.clearRect(0, 0, this.canvas.pixelWidth, this.canvas.pixelHeight);

    // Draw each point at its position
    for (const [pointKey, pointDisplay] of this.currentVisibleState.entries()) {
      if (!pointDisplay.image) {
        console.warn(`no image found for point ${pointKey} in visualization with id ${this.vizData.visualizationId}.`)
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

    //Step 1: update logicalState
    //NOTE: We are no bothering on incrementally compute
    //We can refine later if performance is bad.
    this.logicalState.viewId = viewId;
    this.logicalState.targetVisibleState = computeTargetVisibleState(
      this.logicalState.serverState,
      this.logicalState.displayMode,
      this.logicalState.viewId,
      this.vizData,
      this.canvas
    )

    //Step 2: start animation to new targetVisibleState
    this.animationController.startAnimation(
      this.currentVisibleState,
      this.logicalState.targetVisibleState,
      this.animation,
      (newVisibleState: Map<string, PointDisplay>) => {
        this.currentVisibleState = newVisibleState;
        this.drawVisibleState();
      },
      () => { }
    )
  }

  //handle for client to set client-side display mode
  setClientDisplayMode(displayMode: "expanded" | "collapsed") {

    //Step 1: update logicalState
    //NOTE: We are no bothering on incrementally compute
    //We can refine later if performance is bad.
    this.logicalState.displayMode = displayMode;
    this.logicalState.targetVisibleState = computeTargetVisibleState(
      this.logicalState.serverState,
      this.logicalState.displayMode,
      this.logicalState.viewId,
      this.vizData,
      this.canvas
    )

    //Step 2: start animation to new targetVisibleState
    this.animationController.startAnimation(
      this.currentVisibleState,
      this.logicalState.targetVisibleState,
      this.animation,
      (newVisibleState: Map<string, PointDisplay>) => {
        this.currentVisibleState = newVisibleState;
        this.drawVisibleState();
      },
      () => { }
    )

  }

  //handle for hooking into visualization.update events
  setServerState(vizUpdate: VisualizationUpdateEvent) {

    //Step 1: update logicalState
    //NOTE: WE ARE NOT USING DIFFS SENT BY SERVER
    //We can refine this code to use diffs if we find performance is too slow.
    this.logicalState.serverSequenceNumber = vizUpdate.toSequence;
    this.logicalState.serverState = vizUpdate.splits;
    //viewId and displayMode stay the same!
    this.logicalState.targetVisibleState = computeTargetVisibleState(
      this.logicalState.serverState,
      this.logicalState.displayMode,
      this.logicalState.viewId,
      this.vizData,
      this.canvas
    )


    //Step 2: start animation to new targetVisibleState
    this.animationController.startAnimation(
      this.currentVisibleState,
      this.logicalState.targetVisibleState,
      this.animation,
      (newVisibleState: Map<string, PointDisplay>) => {
        this.currentVisibleState = newVisibleState;
        this.drawVisibleState();
      },
      () => { }
    )
  }

  //handle for client to set canvas width
  setCanvasWidth(requestedWidth: number) {

    //Step 1: cancel any ongoing animations
    this.animationController.cancel();

    //Step 2: compute shimmed dimensions from requestedWidth
    const { shimmedPixelWidth, shimmedPixelHeight } = this.computeCanvasPixelDimensions(requestedWidth);

    //Step 3: rescale the logicalState.targetVisibleState lengths and coordinates to
    //the new canvas dimensions
    //note -- constructor guarantees that this.canvas.pixelWidth and this.canvas.pixelHeight are positive and finite.
    this.logicalState.targetVisibleState = rescaleVisibleState(
      this.logicalState.targetVisibleState,
      {
        pixelWidth: this.canvas.pixelWidth,
        pixelHeight: this.canvas.pixelHeight
      },
      {
        pixelWidth: shimmedPixelWidth,
        pixelHeight: shimmedPixelHeight
      }
    )

    //Step 4: reset canvas dimensions (clears canvas automatically)
    this.canvas.pixelWidth = shimmedPixelWidth;
    this.canvas.pixelHeight = shimmedPixelHeight;

    //Step 5: call this.syncToLogicalState() to set visible state to new logical state and redraw canvas
    this.syncToLogicalState()


  }


}