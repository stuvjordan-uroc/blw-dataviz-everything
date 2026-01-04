/**
 * React hook that connects to a polling session,
 * and returns, for each visualization in the session...
 * 
 * + a canvas
 * + a visualization state manager for the canvas
 * + visualization metadata (does not change during the life of the visualization)
 * 
 * The canvas returned is wired to the stream of visualization updates from the server,
 * so that the points drawn on the canvas update automatically when the server
 * emits an update.
 * 
 * The state manager exposes methods that can be called to update the canvas to match
 * a client-side state.
 * 
 * 
 * Note, the drawing on the canvas should reflect a merging of a client-side and server-side state.
 * This hook hides the details connecting server-side state and canvas drawing.  The canvas comes
 * pre-wired so that it automatically updates whenever the server-side state updates.
 * 
 * Client-side-state, on the other hand, must be updated manually by the caller.  When the client uses the 
 * canvas state manager to update the client-side state, the visualization state manager computes the new coordinates
 * to be rendered to reflect the change, and automatically re-draws the canvas.
 */

import { useEffect, useState } from "react";
import { SessionVizClient } from "../SessionVizClient";
import { VizStateManager } from "../VizStateManager";
import { VisualizationData } from "shared-types";

export function useSessionViz(pollsApiUrl: string, pollsSessionSlug: string) {

  const [connectionStatus, setConnectionStatus] = useState({
    status: 'disconnected',
    info: ''
  })

  //TODO:  Should this be a ref?  state?  Or just a plain variable?
  const vizCanvases = new Map<string, {
    canvas: HTMLCanvasElement; //TODO: do we want to return the actual HTMLCanvasElement?  Or should we return a ref to it?
    vizManager: VizStateManager;
    vizData: VisualizationData;
  }>()

  useEffect(
    () => {

      //create the SessionVizClient
      const sessionVizClient = new SessionVizClient(pollsApiUrl)

      //connect the client to the session and get the session data
      sessionVizClient.connect(pollsSessionSlug)
        .then((sessionData) => {

          //set the connection status
          setConnectionStatus({
            status: 'connected',
            info: ''
          })

          //TODO 
          // wire the session to update the connectionStatus in response
          //to connection changes

          //loop through the visualizations, creating the canvas and state manager for each one
          for (const viz of sessionData.visualizations) {

            //create the canvas
            const canvas = document.createElement('canvas');

            //create a viz state manager, which wires visualization state to canvas
            //VizStateManager is TODO!!!
            const vizManager = new VizStateManager(viz, canvas)

            //subscribe the viz state manager to the visualization update events
            sessionVizClient.subscribeToVizUpdate((vizUpdate) => {
              if (vizUpdate.visualizationId === viz.visualizationId) {
                vizManager.updateServerState(vizUpdate);
              }
            })

            //add the wired-up objects to the map
            vizCanvases.set(viz.visualizationId, {
              canvas: canvas,
              vizManager: vizManager,
              vizData: viz
            })
          }

        })
        .catch((error: any) => { //TODO...how do I type the error parameter?
          setConnectionStatus({
            status: 'error',
            info: error
          })
        })

      //TODO:  What cleanup do we need to do on unmount?
      return () => { }
    },
    []//TODO:  I think we want the dependency array empty.  But do we?
  )

  return [connectionStatus, vizCanvases]

}