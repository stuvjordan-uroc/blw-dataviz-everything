import { VisualizationData } from "shared-types";

export class VizStateManager {


  constructor(viz: VisualizationData, canvas: HTMLCanvasElement) {
    //TODO
  }

  //handle for client to update client-side view id
  updateClientViewId() {
    //TODO
  }

  //handle for client to update client-side display mode
  updateClientDisplayMode() {
    //TODO
  }

  //handle to client to set canvas width
  setCanvasWidth() {

  }

  //server state update, for hooking into visualization.update events
  updateServerState() {
    //TODO
  }
}