# Multiple canvases

**DONE**

# New segmentDisplay property

1.  **DONE** Add segmentDisplay property to logical state, which holds bounds and top-left coordinates for segment groups and segments in the current view+displaymode+serverstate (scaled to the canvas).
2.  **DONE** Add segmentDisplayComputation.ts and pure function in that file that computes segmentDisplay from serverState, displayMode, viewId
3.  **DONE** Update constructor to compute initial segmentDisplay from initial state.
4.  **DONE** Update setXXX methods to update segmentDisplay as part of computing new state and new canvas dimensions
5.  **DONE** New unit test...point coordinates in targetVisibleState should be positioned WITHIN appropriate segment and segment group bounds in segmentDisplay after constructor is called, and after any update. Essentially, this is an integration test checking whether the separate computations for those two properties are consistent with one another.

# subscribeToStateUpdate

1.  **DONE** Add a stateSubscribers field which is ((state: VizLogicalState) => void())[].
2.  **DONE** Update constructor to initialize stateSubscribers to [].
3.  **DONE** For each setXXX method, invoke all the methods in stateSubscribers with COPY OF new this.logicalState after this.logicalState is updated. (copy, because we do NOT want to allow subscribers to mutate this.logicalState!)
4.  **DONE** Add subscribeToStateUpdate public method that takes a callback (state: VizLogicalState) => void, pushes callback to this.stateSubscribers, immediately invokes the callback with the this.logicalState. (What needs to be returned to unsubscribe...how can we locate the callback if all callbacks are stored in an array that will mutate as subscribers are added and deleted????)

# filtered views

1.  **DONE** Add a filter property to VizLogicalState which is an array of (Question & {includedResponseGroups: ResponseGroup[]}),
2.  **DONE** Update VizRenderConfig to have an initial filter.
3.  **DONE** Update attachCanvas to initialize filter property.
4.  Add filteredSplits property to VizLogicalState...keep in sync with filter and viewId via...
5.  Write function to compute filtered splits. Use it
6.  Update setCanvasWidth to use filter in computing aspect ratio.
7.  Update computeTargetVisible to take filter as a parameter.
8.  Update computeSegmentDisplay to take filter as a parameter.
9.  Update setClientViewId, setClientDisplayMode, and setServerState to use new computeTargetVisible and computSegmentDisplay signatures.
10. Add public setClientFilter method. recomputes logical state, clears canvas, re-computes and resets canvas dimensions, redraws canvas using syncToLogicalState.

# Caches

(tentative...not sure how to implement)

Cache computed values of logicalState.targetVisibleState and logicalState.segmentDisplay for different values of viewId, displayMode, and filter, so that client-state switches are faster after the initial switch.
