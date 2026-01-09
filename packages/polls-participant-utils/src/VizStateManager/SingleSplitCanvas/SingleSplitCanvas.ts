import { PointLoadedImage, PointDisplay, AnimationConfig, VizRenderConfig } from "../../types";
import { SplitWithSegmentGroup } from "shared-types";
import { VizLogicalState, SegmentGroupDisplay, StateChangeOrigin } from "../types";
import { VizAnimationController } from "../../VizAnimationController";
import { computeCanvasPixelDimensions } from "../canvasComputation";
import { computeSingleSplitSegmentDisplay } from './computeSegmentDisplay';
import { computeSingleSplitTVS } from "./computeTargetVisibleState";
import { rescaleVisibleState } from "../pointDisplayComputation";


export class SingleSplitCanvas {

  //===============================
  // FIELDS
  //===============================

  //canvas details
  private canvas: {
    element: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    pixelWidth: number;
    pixelHeight: number;
  }

  //loadedImages
  private loadedImages: Map<string, PointLoadedImage>;

  //server state
  private serverState: SplitWithSegmentGroup;
  //split index
  private splitIndex: number;

  //logical state
  private logicalState: Omit<VizLogicalState, "viewId" | "segmentDisplay"> & { segmentDisplay: SegmentGroupDisplay }

  //state subscribers
  private stateSubscribers: Map<number, (state: Omit<VizLogicalState, "viewId" | "segmentDisplay"> & { segmentDisplay: SegmentGroupDisplay }, origin: StateChangeOrigin) => void> = new Map();
  private nextSubscriberId: number = 0;

  //visible state
  private currentVisibleState: Map<string, PointDisplay>;

  //animation
  private animation: Required<AnimationConfig>;
  private animationController: VizAnimationController;

  //===============================
  // CONSTRUCTOR
  //===============================

  constructor(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    loadedImages: Map<string, PointLoadedImage>,
    vizRenderConfig: Omit<VizRenderConfig, "initialViewId">,
    split: SplitWithSegmentGroup,
    splitIndex: number
  ) {

    //set up canvas dimensions and resize canvas
    const aspectRatio = split.segmentGroupBounds.width / split.segmentGroupBounds.height
    const { shimmedPixelWidth, shimmedPixelHeight } = computeCanvasPixelDimensions(vizRenderConfig.initialCanvasWidth, aspectRatio)
    canvas.width = shimmedPixelWidth;
    canvas.height = shimmedPixelHeight;
    //canvas now cleared!
    this.canvas = {
      element: canvas,
      context: context,
      pixelWidth: shimmedPixelWidth,
      pixelHeight: shimmedPixelHeight
    }

    //set loaded images
    this.loadedImages = loadedImages

    //set server state
    this.serverState = split;
    this.splitIndex = splitIndex;

    //set logical state
    this.logicalState = {
      displayMode: vizRenderConfig.initialDisplayMode,
      segmentDisplay: computeSingleSplitSegmentDisplay(
        this.serverState,
        vizRenderConfig.initialDisplayMode,
        this.canvas
      ),
      targetVisibleState: computeSingleSplitTVS(
        this.serverState,
        vizRenderConfig.initialDisplayMode,
        this.loadedImages,
        this.canvas
      )
    }

    //initialize visible state to logical state
    this.currentVisibleState = this.logicalState.targetVisibleState;

    // Resolve animation config: use defaults, user config, or all 0s if disabled
    let animation = {
      appearDuration: 0,
      disappearDuration: 0,
      moveDuration: 0,
      imageChangeDuration: 0
    };
    if (vizRenderConfig.animation !== false) {
      animation = {
        appearDuration: vizRenderConfig.animation?.appearDuration ?? 200,
        disappearDuration: vizRenderConfig.animation?.disappearDuration ?? 150,
        moveDuration: vizRenderConfig.animation?.moveDuration ?? 400,
        imageChangeDuration: vizRenderConfig.animation?.imageChangeDuration ?? 400
      };
    }
    this.animation = animation

    //set animation controller
    this.animationController = new VizAnimationController(animation);

    //draw visible state on canvas
    this.drawVisibleState()
  }

  //======================================
  // PRIVATE METHODS
  //=====================================
  private drawVisibleState() {

    // Clear the entire canvas
    this.canvas.context.clearRect(0, 0, this.canvas.pixelWidth, this.canvas.pixelHeight);

    // Draw each point at its position
    for (const [pointKey, pointDisplay] of this.currentVisibleState.entries()) {

      // Skip points with opacity 0 (fully transparent)
      if (pointDisplay.opacity !== undefined && pointDisplay.opacity <= 0) {
        continue;
      }

      // Set overall point opacity if specified
      if (pointDisplay.opacity !== undefined && pointDisplay.opacity < 1) {
        this.canvas.context.globalAlpha = pointDisplay.opacity;
      }

      // Handle cross-fade animation if transitioning between images
      if (pointDisplay.transitioningFromImage && pointDisplay.crossFadeProgress !== undefined && pointDisplay.crossFadeProgress < 1) {
        // Draw the "from" image at fading-out opacity
        const fromDrawX = pointDisplay.position.x - pointDisplay.transitioningFromImage.offsetToCenter.x;
        const fromDrawY = pointDisplay.position.y - pointDisplay.transitioningFromImage.offsetToCenter.y;

        this.canvas.context.globalAlpha = (pointDisplay.opacity ?? 1) * (1 - pointDisplay.crossFadeProgress);
        this.canvas.context.drawImage(
          pointDisplay.transitioningFromImage.image,
          fromDrawX,
          fromDrawY
        );

        // Draw the "to" image at fading-in opacity (if it exists)
        if (pointDisplay.image) {
          const toDrawX = pointDisplay.position.x - pointDisplay.image.offsetToCenter.x;
          const toDrawY = pointDisplay.position.y - pointDisplay.image.offsetToCenter.y;

          this.canvas.context.globalAlpha = (pointDisplay.opacity ?? 1) * pointDisplay.crossFadeProgress;
          this.canvas.context.drawImage(
            pointDisplay.image.image,
            toDrawX,
            toDrawY
          );
        } else {
          console.warn(`no image found for point ${pointKey} in visualization with id ${this.vizData.visualizationId}.`)
        }

        // Reset alpha
        this.canvas.context.globalAlpha = 1.0;
      } else {
        // Normal rendering (no cross-fade)
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

        // Reset alpha if it was set
        if (pointDisplay.opacity !== undefined && pointDisplay.opacity < 1) {
          this.canvas.context.globalAlpha = 1.0;
        }
      }
    }
  }

  private notifySubscribers(origin: StateChangeOrigin) {
    //deep copy the logical state
    const stateCopy = structuredClone(this.logicalState);

    //invoke all subscriber callbacks with the state copy and origin
    for (const callback of this.stateSubscribers.values()) {
      callback(stateCopy, origin)
    }
  }

  //========================================
  // PUBLIC METHODS
  //========================================

  getSplitIndex() {
    return this.splitIndex
  }

  setClientDisplayMode(displayMode: "expanded" | "collapsed") {
    //no-op if the new displayMode is the same as the old
    if (this.logicalState.displayMode !== displayMode) {

      //Step 1: update logicalState
      this.logicalState.displayMode = displayMode;
      this.logicalState.segmentDisplay = computeSingleSplitSegmentDisplay(
        this.serverState,
        displayMode,
        this.canvas
      )
      this.logicalState.targetVisibleState = computeSingleSplitTVS(
        this.serverState,
        displayMode,
        this.loadedImages,
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

      //Step 3: notify subscribers of state change
      this.notifySubscribers("displayMode")
    }
  }

  setCanvasWidth(requestedWidth: number) {


    //Step 1: compute shimmed dimensions from requestedWidth
    const { shimmedPixelWidth, shimmedPixelHeight } = computeCanvasPixelDimensions(
      requestedWidth,
      this.serverState.segmentGroupBounds.width / this.serverState.segmentGroupBounds.height
    );

    //no-op if we're already set
    if (this.canvas.pixelWidth !== shimmedPixelWidth) {

      //Step 2: cancel any ongoing animations
      this.animationController.cancel();

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

      //Step 4: rescale segmentDisplay lengths and coordinates to
      //the new canvas dimensions
      this.logicalState.segmentDisplay = {
        ...this.logicalState.segmentDisplay,
        segmentGroupBounds: {
          x: 0,
          y: 0,
          width: shimmedPixelWidth,
          height: shimmedPixelHeight
        },
        responseGroups: this.logicalState.segmentDisplay.responseGroups.map((rg) => ({
          ...rg,
          bounds: {
            x: Math.round(shimmedPixelWidth * rg.bounds.x / this.canvas.pixelWidth),
            y: Math.round(shimmedPixelHeight * rg.bounds.y / this.canvas.pixelHeight),
            width: Math.round(shimmedPixelWidth * rg.bounds.width / this.canvas.pixelWidth),
            height: Math.round(shimmedPixelHeight * rg.bounds.height / this.canvas.pixelHeight)
          }
        }))
      }

      //Step 5: reset canvas dimensions (clears canvas automatically)
      this.canvas.pixelWidth = shimmedPixelWidth;
      this.canvas.pixelHeight = shimmedPixelHeight;
      this.canvas.element.width = shimmedPixelWidth;
      this.canvas.element.height = shimmedPixelHeight;

      //Step 5: set visible state to new logical state and redraw canvas
      this.currentVisibleState = this.logicalState.targetVisibleState;
      this.drawVisibleState();

      //Step 6: notify subscribers of state change
      this.notifySubscribers("canvas");
    }
  }

  setServerState(updatedState: SplitWithSegmentGroup) {

    //Step 1: update the server state
    this.serverState = updatedState;

    //Step 2: update the logical state
    this.logicalState.segmentDisplay = computeSingleSplitSegmentDisplay(
      this.serverState,
      this.logicalState.displayMode,
      this.canvas
    )
    this.logicalState.targetVisibleState = computeSingleSplitTVS(
      this.serverState,
      this.logicalState.displayMode,
      this.loadedImages,
      this.canvas
    )

    //Step 3: start animation to new targetVisibleState
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

    //Step 4: notify subscribers
    this.notifySubscribers("server")
  }
  /**
  * Subscribe to state updates.
  * The callback will be invoked immediately with the current state,
  * and then again whenever the logical state changes.
  * 
  * @param canvasId - id of canvas on which to subscribe to updates
  * @param callback - Function to call with state updates and change origin
  * @returns Unsubscribe function that removes the subscription
  */
  subscribeToStateUpdate(
    callback: (state: Omit<VizLogicalState, "viewId" | "segmentDisplay"> & { segmentDisplay: SegmentGroupDisplay }, origin: StateChangeOrigin) => void
  ): (() => void) | undefined {

    // Generate a unique ID for this subscriber
    const subscriberId = this.nextSubscriberId++;

    // Add the callback to the subscribers map
    this.stateSubscribers.set(subscriberId, callback);

    // Immediately invoke the callback with current state
    const stateCopy = structuredClone(this.logicalState);
    callback(stateCopy, "subscription");

    // Return unsubscribe function
    return () => {
      this.stateSubscribers.delete(subscriberId);
    };
  }


}