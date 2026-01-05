import { VisualizationData } from "shared-types";
import { VizLogicalState, PointDisplay, VizData } from "./types";

export class VizStateManager {

  //viz data, fixed throughout the lifetime of the session
  private vizData: VizData;

  //complete representation of the current logical state of the viz,
  //driven by public setXXX methods,
  //includes logicalState.targetVisibleState towards which animations
  //converge
  private logicalState: VizLogicalState;

  //current visible state
  //equal to logicalState.targetVisibleState when animation completes
  private currentVisibleState: PointDisplay[]


  constructor(viz: VisualizationData, canvas: HTMLCanvasElement) {
    //TODO
  }

  //handle for client to set client-side view id
  setClientViewId() {
    //TODO
  }

  //handle for client to set client-side display mode
  setClientDisplayMode() {
    //TODO
  }

  //handle to client to set canvas width
  setCanvasWidth() {
    //TODO
  }

  //set, for hooking into visualization.update events
  setServerState() {
    //TODO
  }
}