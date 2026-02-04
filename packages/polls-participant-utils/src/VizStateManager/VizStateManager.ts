import { VizData, VizLogicalState, StateChangeOrigin } from "./types";
import { PointDisplay, AnimationConfig, PointLoadedImage, VizRenderConfig } from "../types";
import { SplitWithSegmentGroup, VisualizationData } from "shared-types";
import { VizAnimationController } from "../VizAnimationController";
import { computeCanvasPixelDimensions } from "./canvasComputation";
import { computeSegmentDisplay, rescaleSegmentDisplay } from "./segmentDisplayComputation";
import { computeTargetVisibleState, rescaleVisibleState } from "./pointDisplayComputation";
import { scaleGridLabelsToCanvas, rescaleGridLabelsDisplay } from "./gridLabelsComputation";
import { VisualizationUpdateEvent, Question, ResponseGroup } from "shared-types";
import { SingleSplitCanvas } from "./SingleSplitCanvas";

export class VizStateManager {

  //viz data, fixed through the life of the session
  private vizData: VizData;

  //server-side visualization state as sent by server in snapshots and update, lengths and positions are in abstract units
  private serverState: SplitWithSegmentGroup[];
  //latest sequence number sent by server 
  private serverSequenceNumber: number;

  //canvases for which state is maintained and rendered:
  private canvases: Map<number, {
    canvas: {
      element: HTMLCanvasElement;
      context: CanvasRenderingContext2D;
      pixelWidth: number;
      pixelHeight: number;
      margin: {
        x: number;
        y: number;
      }
    };
    stateSubscribers: Map<number, (state: VizLogicalState, origin: StateChangeOrigin) => void>;
    nextSubscriberId: number;
    logicalState: VizLogicalState;
    currentVisibleState: Map<string, PointDisplay>;
    animation: Required<AnimationConfig>;
    animationController: VizAnimationController;
  }> = new Map()
  private nextCanvasId: number = 0;

  //focused canvases
  private singleSplitCanvases: Map<number, SingleSplitCanvas> = new Map();
  private nextSingleSplitCanvasId: number = 0;




  constructor(
    viz: VisualizationData,
    vizImages: Map<string, PointLoadedImage>
  ) {
    //populate the viz data
    this.vizData = {
      ...viz,
      loadedImages: vizImages
    }
    //initialize the server state
    this.serverState = viz.splits
    this.serverSequenceNumber = viz.sequenceNumber
  }

  /**
   * Returns a deep copy of the visualization data.
   * @returns A deep copy of the VizData
   */
  getVisualizationData(): VizData {
    return structuredClone(this.vizData);
  }

  /**
   * 
   * + clears the canvas
   * + If VizStateManger is subscribed to a SessionVizClient, canvas will re-draw whenever server emits an update.
   * + creates and returns a FocusedCanvas instance
   * + FocusedCanvas exposes setClientDisplayMode and setCanvasWidth
   * + FocusedCanvas exposes subscribeToFocusedCanvasState
   * + once a canvas is attached, caller should never set width or height on the canvas directly.
   * + Instead, call focusedCanvas.setfocusedCanvasWidth.
   * 
   * @param canvas 
   * @param vizRenderConfig 
   * @param splitToFocus 
   * @returns Id for calling methods on focused canvas and cleanup function.
   */
  attachSingleSplitCanvas(
    canvas: HTMLCanvasElement,
    vizRenderConfig: Omit<VizRenderConfig, "initialViewId">,
    splitToFocus: number | Array<{
      question: Question;
      responseGroup: ResponseGroup | null;
    }>
  ): { singleSplitCanvasManager: SingleSplitCanvas, detachSingleSplitCanvas: () => void } | null {
    //get canvas context
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context from canvas');
    }
    //get split to focus
    let split: SplitWithSegmentGroup | undefined;
    let splitIndex: number | undefined;
    if (typeof splitToFocus === "number") {
      split = this.serverState[splitToFocus];
      splitIndex = split ? splitToFocus : undefined;
    } else {
      split = this.serverState.find((candidateSplit, candidateSplitIndex) => {
        let isSplitToFocus = true;
        splitIndex = candidateSplitIndex;
        for (const group of candidateSplit.groups) {
          const matchedGroup = splitToFocus.find(({ question, responseGroup }) => (
            question.batteryName === group.question.batteryName &&
            question.subBattery === group.question.subBattery &&
            question.varName === group.question.varName &&
            (
              (responseGroup === null && group.responseGroup === null) ||
              (responseGroup !== null && group.responseGroup !== null && responseGroup.label === group.responseGroup.label)
            )
          ))
          if (!matchedGroup) {
            isSplitToFocus = false;
            splitIndex = undefined;
            break;
          }
        }
        return isSplitToFocus
      })
    }
    //early return if the passed splitToFocus fails to match any splits in this viz
    if (!split || splitIndex === undefined) {
      return null
    }
    //instantiate the focused canvas
    const focusedCanvas = new SingleSplitCanvas(canvas, ctx, this.vizData.loadedImages, vizRenderConfig, split, splitIndex)
    //add the focused canvas to the map of focused canvases
    this.singleSplitCanvases.set(this.nextSingleSplitCanvasId, focusedCanvas)
    //increment nextSingleSplitCanvasId
    this.nextSingleSplitCanvasId++
    //return data to caller
    return ({
      singleSplitCanvasManager: focusedCanvas,
      detachSingleSplitCanvas: () => { this.detachSingleSplitCanvas(this.nextSingleSplitCanvasId - 1) }
    })

  }
  private detachSingleSplitCanvas(singleSplitCanvasId: number) {
    this.singleSplitCanvases.delete(singleSplitCanvasId)
  }

  /**
   * Attaches canvas to the VizStateManager this:
   * 
   * + clears the canvas
   * + creates an logical state for the viz attached to the canvas and draw that state on the canvas.
   * + immediately re-sizes and draws the canvas in response to setXXX(canvasId, newState) methods.
   * + If VizStateManger is subscribed to a SessionVizClient, canvas will re-draw whenever server emits an update.
   * + caller can cause-redraws from client side with VSM methods setClientViewId, setClientDisplayMode, setCanvasWidth.
   * + once a canvas is attached, caller should never set width or height on the canvas directly.
   * + Instead, call VSM.setCanvasWidth.
   * 
   * 
   * @param canvas 
   * @param vizRenderConfig 
   * @returns canvasId for referencing canvas in setXXX calls, cleanup callback to detach
   */
  attachCanvas(
    canvas: HTMLCanvasElement,
    vizRenderConfig: VizRenderConfig
  ): { canvasId: number, detachCanvas: () => void } {
    // Initialize canvas state
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context from canvas');
    }
    //compute canvas pixel width and height from requested initial canvas width
    const aspectRatio = this.vizData.vizHeight / this.vizData.vizWidth;
    const { shimmedPixelWidth, shimmedPixelHeight } = computeCanvasPixelDimensions(
      vizRenderConfig.initialCanvasWidth,
      aspectRatio
    );
    //setting canvas width and height auto-clears canvas.
    canvas.width = shimmedPixelWidth
    canvas.height = shimmedPixelHeight
    const canvasState = {
      element: canvas,
      context: ctx,
      pixelWidth: shimmedPixelWidth,
      pixelHeight: shimmedPixelHeight,
      margin: vizRenderConfig.margin
    }
    //initialize canvas's logical state
    const logicalState = {
      displayMode: vizRenderConfig.initialDisplayMode,
      viewId: vizRenderConfig.initialViewId,
      segmentDisplay: computeSegmentDisplay(
        this.serverState,
        vizRenderConfig.initialDisplayMode,
        vizRenderConfig.initialViewId,
        this.vizData,
        canvasState
      ),
      gridLabelsDisplay: scaleGridLabelsToCanvas(
        this.vizData.gridLabels[vizRenderConfig.initialViewId],
        this.vizData.vizWidth,
        this.vizData.vizHeight,
        canvasState
      ),
      targetVisibleState: computeTargetVisibleState(
        this.serverState,
        vizRenderConfig.initialDisplayMode,
        vizRenderConfig.initialViewId,
        this.vizData,
        canvasState
      )
    }
    //initialize canvas's visible state to logical state
    const visibleState = logicalState.targetVisibleState;

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

    // instantiate animation controller
    const animationController = new VizAnimationController(animation);

    //add the canvas to the canvases
    this.canvases.set(this.nextCanvasId, {
      canvas: canvasState,
      animation: animation,
      animationController: animationController,
      currentVisibleState: visibleState,
      logicalState: logicalState,
      nextSubscriberId: 0,
      stateSubscribers: new Map()
    })

    //draw visible state on canvas
    this.drawVisibleState(this.nextCanvasId)

    //increment the nextCanvasId
    this.nextCanvasId++;
    //return the assigned canvas id
    return ({
      canvasId: this.nextCanvasId - 1,
      detachCanvas: () => { this.detachCanvas(this.nextCanvasId - 1) }
    })
  }

  private detachCanvas(canvasId: number) {
    this.canvases.delete(canvasId);
  }


  private drawVisibleState(canvasId: number) {
    const canvasData = this.canvases.get(canvasId);
    if (canvasData) {
      // Clear the entire canvas
      canvasData.canvas.context.clearRect(0, 0, canvasData.canvas.pixelWidth, canvasData.canvas.pixelHeight);

      // Draw each point at its position
      for (const [pointKey, pointDisplay] of canvasData.currentVisibleState.entries()) {

        // Skip points with opacity 0 (fully transparent)
        if (pointDisplay.opacity !== undefined && pointDisplay.opacity <= 0) {
          continue;
        }

        // Set overall point opacity if specified
        if (pointDisplay.opacity !== undefined && pointDisplay.opacity < 1) {
          canvasData.canvas.context.globalAlpha = pointDisplay.opacity;
        }

        // Handle cross-fade animation if transitioning between images
        if (pointDisplay.transitioningFromImage && pointDisplay.crossFadeProgress !== undefined && pointDisplay.crossFadeProgress < 1) {
          // Draw the "from" image at fading-out opacity
          const fromDrawX = pointDisplay.position.x - pointDisplay.transitioningFromImage.offsetToCenter.x;
          const fromDrawY = pointDisplay.position.y - pointDisplay.transitioningFromImage.offsetToCenter.y;

          canvasData.canvas.context.globalAlpha = (pointDisplay.opacity ?? 1) * (1 - pointDisplay.crossFadeProgress);
          canvasData.canvas.context.drawImage(
            pointDisplay.transitioningFromImage.image,
            fromDrawX,
            fromDrawY
          );

          // Draw the "to" image at fading-in opacity (if it exists)
          if (pointDisplay.image) {
            const toDrawX = pointDisplay.position.x - pointDisplay.image.offsetToCenter.x;
            const toDrawY = pointDisplay.position.y - pointDisplay.image.offsetToCenter.y;

            canvasData.canvas.context.globalAlpha = (pointDisplay.opacity ?? 1) * pointDisplay.crossFadeProgress;
            canvasData.canvas.context.drawImage(
              pointDisplay.image.image,
              toDrawX,
              toDrawY
            );
          } else {
            console.warn(`no image found for point ${pointKey} in visualization with id ${this.vizData.visualizationId}.`)
          }

          // Reset alpha
          canvasData.canvas.context.globalAlpha = 1.0;
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
          canvasData.canvas.context.drawImage(
            pointDisplay.image.image,
            drawX,
            drawY
          );

          // Reset alpha if it was set
          if (pointDisplay.opacity !== undefined && pointDisplay.opacity < 1) {
            canvasData.canvas.context.globalAlpha = 1.0;
          }
        }
      }
    }
  }

  private syncToLogicalState(canvasId: number) {
    const canvasData = this.canvases.get(canvasId);
    if (canvasData) {
      //set the currentVisibleState to the target, clearing any transition fields
      canvasData.currentVisibleState = new Map(
        [...canvasData.logicalState.targetVisibleState.entries()].map(([key, pd]) => [
          key,
          {
            key: pd.key,
            point: pd.point,
            position: pd.position,
            image: pd.image,
            opacity: undefined,
            transitioningFromImage: undefined,
            crossFadeProgress: undefined
          }
        ])
      );

      //draw the currentVisibleState
      this.drawVisibleState(canvasId)
    }
  }

  /**
  * Notify all subscribers of a state change by sending them a copy of the logical state
  */
  private notifySubscribers(canvasId: number, origin: StateChangeOrigin) {
    const canvasData = this.canvases.get(canvasId);
    if (canvasData) {
      // Create a deep copy of the logical state
      const stateCopy = structuredClone(canvasData.logicalState);

      // Invoke all subscriber callbacks with the state copy and origin
      for (const callback of canvasData.stateSubscribers.values()) {
        callback(stateCopy, origin);
      }
    }
  }

  /**
     * PUBLIC METHODS
     */

  //getter for viewIdLookup
  getViewIdLookup() {
    return this.vizData.viewIdLookup;
  }

  //getter for grouping questions (flat array: x questions first, then y questions)
  getGroupingQuestions() {
    return [
      ...this.vizData.config.groupingQuestions.x,
      ...this.vizData.config.groupingQuestions.y
    ];
  }

  //handle for client to set client-side view id
  setClientViewId(canvasId: number, viewId: string) {
    const canvasData = this.canvases.get(canvasId);
    if (canvasData) {
      //no-op if the target state already has the same viewId
      //or if passed viewId is not in the lookup map
      if (canvasData.logicalState.viewId !== viewId && this.vizData.viewMaps[viewId] !== undefined) {

        //Step 1: update logicalState
        //NOTE: We are not bothering on incrementally compute
        //We can refine later if performance is bad.
        canvasData.logicalState.viewId = viewId;
        canvasData.logicalState.segmentDisplay = computeSegmentDisplay(
          this.serverState,
          canvasData.logicalState.displayMode,
          canvasData.logicalState.viewId,
          this.vizData,
          canvasData.canvas
        )
        canvasData.logicalState.targetVisibleState = computeTargetVisibleState(
          this.serverState,
          canvasData.logicalState.displayMode,
          canvasData.logicalState.viewId,
          this.vizData,
          canvasData.canvas
        )
        canvasData.logicalState.gridLabelsDisplay = scaleGridLabelsToCanvas(
          this.vizData.gridLabels[canvasData.logicalState.viewId],
          this.vizData.vizWidth,
          this.vizData.vizHeight,
          canvasData.canvas
        )

        //Step 2: start animation to new targetVisibleState
        canvasData.animationController.startAnimation(
          canvasData.currentVisibleState,
          canvasData.logicalState.targetVisibleState,
          canvasData.animation,
          (newVisibleState: Map<string, PointDisplay>) => {
            canvasData.currentVisibleState = newVisibleState;
            this.drawVisibleState(canvasId);
          },
          () => { }
        )

        //Step 3: notify subscribers of state change
        this.notifySubscribers(canvasId, "viewId");
      }
    }
  }

  //handle for client to set client-side display mode
  setClientDisplayMode(canvasId: number, displayMode: "expanded" | "collapsed") {

    const canvasData = this.canvases.get(canvasId);
    if (canvasData) {
      //no-op if the logical state display mode already matches
      if (canvasData.logicalState.displayMode !== displayMode) {
        //Step 1: update logicalState
        //NOTE: We are not bothering on incrementally compute
        //We can refine later if performance is bad.
        canvasData.logicalState.displayMode = displayMode;
        canvasData.logicalState.segmentDisplay = computeSegmentDisplay(
          this.serverState,
          canvasData.logicalState.displayMode,
          canvasData.logicalState.viewId,
          this.vizData,
          canvasData.canvas
        )
        canvasData.logicalState.targetVisibleState = computeTargetVisibleState(
          this.serverState,
          canvasData.logicalState.displayMode,
          canvasData.logicalState.viewId,
          this.vizData,
          canvasData.canvas
        )

        //Step 2: start animation to new targetVisibleState
        canvasData.animationController.startAnimation(
          canvasData.currentVisibleState,
          canvasData.logicalState.targetVisibleState,
          canvasData.animation,
          (newVisibleState: Map<string, PointDisplay>) => {
            canvasData.currentVisibleState = newVisibleState;
            this.drawVisibleState(canvasId);
          },
          () => { }
        )

        //Step 3: notify subscribers of state change
        this.notifySubscribers(canvasId, "displayMode");
      }
    }
  }

  //handle for hooking into visualization.update events
  setServerState(vizUpdate: VisualizationUpdateEvent) {

    //no-op if we're already ahead of this update
    if (vizUpdate.toSequence > this.serverSequenceNumber) {

      //NOTE: WE ARE NOT USING DIFFS SENT BY SERVER
      //We can refine this code to use diffs if we find performance is too slow.
      this.serverSequenceNumber = vizUpdate.toSequence;
      this.serverState = vizUpdate.splits;


      //update ALL attached canvases
      this.canvases.forEach((canvasData, canvasId) => {

        //Step 1: update logicalState
        //viewId and displayMode stay the same!
        canvasData.logicalState.segmentDisplay = computeSegmentDisplay(
          this.serverState,
          canvasData.logicalState.displayMode,
          canvasData.logicalState.viewId,
          this.vizData,
          canvasData.canvas
        )
        canvasData.logicalState.targetVisibleState = computeTargetVisibleState(
          this.serverState,
          canvasData.logicalState.displayMode,
          canvasData.logicalState.viewId,
          this.vizData,
          canvasData.canvas
        )


        //Step 2: start animation to new targetVisibleState
        canvasData.animationController.startAnimation(
          canvasData.currentVisibleState,
          canvasData.logicalState.targetVisibleState,
          canvasData.animation,
          (newVisibleState: Map<string, PointDisplay>) => {
            canvasData.currentVisibleState = newVisibleState;
            this.drawVisibleState(canvasId);
          },
          () => { }
        )

        //Step 3: notify subscribers of state change
        this.notifySubscribers(canvasId, "server");
      })

      //update all attached single state canvases
      this.singleSplitCanvases.forEach((singleSplitCanvas) => {
        const updatedSplit = vizUpdate.splits[singleSplitCanvas.getSplitIndex()]
        if (updatedSplit) {
          singleSplitCanvas.setServerState(updatedSplit)
        }
      })
    }
  }

  //handle for client to set canvas width
  setCanvasWidth(canvasId: number, requestedWidth: number) {

    const canvasData = this.canvases.get(canvasId)
    if (canvasData) {

      //Step 1: compute shimmed dimensions from requestedWidth
      const aspectRatio = this.vizData.vizHeight / this.vizData.vizWidth;
      const { shimmedPixelWidth, shimmedPixelHeight } = computeCanvasPixelDimensions(
        requestedWidth,
        aspectRatio
      );

      //no-op if we're already set
      if (canvasData.canvas.pixelWidth !== shimmedPixelWidth) {

        //Step 2: cancel any ongoing animations
        canvasData.animationController.cancel();

        //Step 3: rescale the logicalState.targetVisibleState lengths and coordinates to
        //the new canvas dimensions
        //note -- constructor guarantees that this.canvas.pixelWidth and this.canvas.pixelHeight are positive and finite.
        canvasData.logicalState.targetVisibleState = rescaleVisibleState(
          canvasData.logicalState.targetVisibleState,
          {
            pixelWidth: canvasData.canvas.pixelWidth,
            pixelHeight: canvasData.canvas.pixelHeight,
            margin: canvasData.canvas.margin
          },
          {
            pixelWidth: shimmedPixelWidth,
            pixelHeight: shimmedPixelHeight,
            margin: canvasData.canvas.margin
          }
        )

        //Step 4: rescale segmentDisplay lengths and coordinates to
        //the new canvas dimensions
        canvasData.logicalState.segmentDisplay = rescaleSegmentDisplay(
          canvasData.logicalState.segmentDisplay,
          {
            pixelWidth: canvasData.canvas.pixelWidth,
            pixelHeight: canvasData.canvas.pixelHeight,
            margin: canvasData.canvas.margin
          },
          {
            pixelWidth: shimmedPixelWidth,
            pixelHeight: shimmedPixelHeight,
            margin: canvasData.canvas.margin
          }
        )

        //Step 5: rescale gridLabelsDisplay lengths and coordinates to
        //the new canvas dimensions
        canvasData.logicalState.gridLabelsDisplay = rescaleGridLabelsDisplay(
          canvasData.logicalState.gridLabelsDisplay,
          {
            pixelWidth: canvasData.canvas.pixelWidth,
            pixelHeight: canvasData.canvas.pixelHeight,
            margin: canvasData.canvas.margin
          },
          {
            pixelWidth: shimmedPixelWidth,
            pixelHeight: shimmedPixelHeight,
            margin: canvasData.canvas.margin
          }
        )

        //Step 6: reset canvas dimensions (clears canvas automatically)
        canvasData.canvas.pixelWidth = shimmedPixelWidth;
        canvasData.canvas.pixelHeight = shimmedPixelHeight;
        canvasData.canvas.element.width = shimmedPixelWidth;
        canvasData.canvas.element.height = shimmedPixelHeight;

        //Step 7: call this.syncToLogicalState() to set visible state to new logical state and redraw canvas
        this.syncToLogicalState(canvasId)

        //Step 8: notify subscribers of state change
        this.notifySubscribers(canvasId, "canvas");
      }
    }
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
    canvasId: number,
    callback: (state: VizLogicalState, origin: StateChangeOrigin) => void
  ): (() => void) | undefined {
    const canvasData = this.canvases.get(canvasId)
    if (!canvasData) {
      return undefined;
    }

    // Generate a unique ID for this subscriber
    const subscriberId = canvasData.nextSubscriberId++;

    // Add the callback to the subscribers map
    canvasData.stateSubscribers.set(subscriberId, callback);

    // Immediately invoke the callback with current state
    const stateCopy = structuredClone(canvasData.logicalState);
    callback(stateCopy, "subscription");

    // Return unsubscribe function
    return () => {
      canvasData.stateSubscribers.delete(subscriberId);
    };
  }
}