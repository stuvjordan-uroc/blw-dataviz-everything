/**
 * React hook that connects to a polling session,
 * and returns, for each visualization in the session...
 * 
 * 
 * + a visualization state manager
 * + visualization metadata (does not change during the life of the visualization)
 * 
 * The visualization manager returned is wired
 * to the stream of visualization updates from the server, so that 
 * the manager's internal representation of the server state  updates
 * automatically when the server emits an update.
 * 
 * Caller can attach a canvas to the vizStateManager via
 * 
 * vizStateManager.attachCanvas(canvas, vizRenderConfig)
 * 
 * This causes the canvas to be wired to (i.e. to redraw in response to) server updates on the viz
 * 
 * Also, caller can do VSM.setClientViewId(), VSM.setClientDisplayMode, VSM.setCanvasWidth, VSM.subscribeToStateUpdate
 * 
 * 
 * RE-RENDER PATTERN:
 * The hook returns vizStatuses (state) and vizRefs (ref).
 * 
 * - First render: connectionStatus = 'disconnected', vizStatuses = empty Map
 * - After connection: ALL visualization IDs are added to vizStatuses with 'loading' status in ONE render
 * - Subsequent renders: Individual visualizations transition from 'loading' to 'ready' or 'error'
 * 
 * This pattern ensures callers can distinguish between:
 * 1. Initial population (vizStatuses goes from empty to containing all viz IDs)
 * 2. Status transitions (viz IDs already present, only status values change)
 * 
 * The vizRefs map is populated asynchronously as each visualization completes loading.
 * It never triggers re-renders, so callers should check vizStatuses to know when to access vizRefs.
 */

import { useEffect, useState, useRef } from "react";
import { SessionVizClient } from "../SessionVizClient";
import { VizStateManager } from "../VizStateManager";
import { VisualizationData } from "shared-types";
import { loadVizImages } from "../loadVizImages";

export function useSessionViz(pollsApiUrl: string, pollsSessionSlug: string) {

  //connection and session statuses
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected')
  const [sessionStatus, setSessionStatus] = useState<{ isOpen: boolean }>({ isOpen: false })

  // Visualization statuses - triggers re-renders when status changes
  const [vizStatuses, setVizStatuses] = useState(new Map<string, 'loading' | 'ready' | 'error'>())

  // Visualization references - holds stable references, never triggers re-renders
  const vizRefs = useRef(new Map<string, {
    vizManager: VizStateManager;
    vizData: VisualizationData;
  }>())

  useEffect(
    () => {
      // Track cleanup functions from subscriptions
      let unsubscribeConnectionStatus: (() => void) | null = null;
      let unsubscribeSessionStatus: (() => void) | null = null;
      const unsubscribeVizUpdates: Array<() => void> = [];
      let sessionVizClient: SessionVizClient | null = null;

      const initializeSession = async () => {
        try {
          //create the SessionVizClient
          sessionVizClient = new SessionVizClient(pollsApiUrl)

          //connect the client to the session and get the session data
          const sessionData = await sessionVizClient.connect(pollsSessionSlug)

          //set the connection status
          setConnectionStatus('connected')

          //wire the session to update the connectionStatus in response
          //to connection changes
          unsubscribeConnectionStatus = sessionVizClient.subscribeToConnectionStatus((status) => {
            setConnectionStatus(status)
          })

          //wire the session to update the sessionStatus in response to
          //session status changes
          unsubscribeSessionStatus = sessionVizClient.subscribeToSessionStatus((isOpen) => {
            setSessionStatus({ isOpen: isOpen })
          })

          //Initialize all visualization statuses to 'loading' in a single batch
          //This ensures all viz IDs appear in one render, making it clear to callers
          //that subsequent renders are only status transitions, not new entries
          setVizStatuses(new Map(
            sessionData.visualizations.map(viz => [viz.visualizationId, 'loading' as const])
          ))

          //loop through the visualizations, creating the state manager for each one
          //Create an array of promises for parallel processing
          const vizPromises = sessionData.visualizations.map(async (viz) => {
            try {
              //note ... loadVizImages can throw errors that will be caught in the
              //catch block below
              const vizImages = await loadVizImages(viz.splits)


              //create a viz state manager, which wires visualization state to canvas
              //VizStateManager is TODO!!!
              const vizManager = new VizStateManager(viz, vizImages)

              //Subscribe to visualization updates
              //The callback is immediately invoked with the current buffered state,
              //then receives real-time updates. This prevents any race conditions.
              const unsubscribe = sessionVizClient!.subscribeToVizUpdate((vizUpdate) => {
                if (vizUpdate.visualizationId === viz.visualizationId) {
                  vizManager.setServerState(vizUpdate);
                }
              })

              //collect unsubscribe function for cleanup
              unsubscribeVizUpdates.push(unsubscribe)

              //add the wired-up objects to the ref map
              vizRefs.current.set(viz.visualizationId, {
                vizManager: vizManager,
                vizData: viz
              })

              //viz is ready.  set the status accordingly
              setVizStatuses(prev => new Map(prev).set(viz.visualizationId, 'ready'))


            } catch (error: unknown) {
              //error loading images or setting up VizStateManager.  
              // set vizStatus accordingly
              console.error(
                `[useSessionViz] Failed to initialize visualization ${viz.visualizationId}:`,
                error instanceof Error ? error.message : String(error)
              );
              setVizStatuses(prev => new Map(prev).set(viz.visualizationId, 'error'))
            }
          });

          //Wait for all visualizations to complete processing (in parallel)
          await Promise.allSettled(vizPromises);

        } catch (error: unknown) {
          console.error(
            '[useSessionViz] Failed to connect to session:',
            error instanceof Error ? error.message : String(error)
          );
          setConnectionStatus('disconnected')
        }
      };

      initializeSession();

      //Cleanup function - called when component unmounts
      return () => {
        // Unsubscribe from all callbacks to prevent memory leaks
        // and setState calls on unmounted components
        unsubscribeConnectionStatus?.();
        unsubscribeSessionStatus?.();
        unsubscribeVizUpdates.forEach(unsubscribe => unsubscribe());

        // Disconnect and close the EventSource connection
        sessionVizClient?.disconnect();
      }
    },
    //reload everything if the pollsAPIUrl or pollsSessionSlug changes!
    [pollsApiUrl, pollsSessionSlug]
  )

  return {
    connectionStatus,
    sessionStatus,
    vizStatuses,
    vizRefs: vizRefs.current
  }

}