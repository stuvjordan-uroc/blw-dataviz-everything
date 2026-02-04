/**
 * SessionPage - Participant polling interface with real-time visualizations
 *
 * WORKFLOW:
 * 1. Load session data via REST API (questions, config, endpoints)
 * 2. Display poll form with questions
 * 3. Participant submits responses
 * 4. Connect to SSE stream for real-time visualization updates
 * 5. Display live visualizations showing aggregated results
 *
 * KEY ARCHITECTURAL COMPONENTS:
 *
 * - useSessionViz hook (polls-participant-utils):
 *   * Manages SSE connection to server
 *   * Loads and rasterizes SVG images for visualization points
 *   * Creates VizStateManager instances for each visualization
 *   * Auto-subscribes managers to server update events
 *   * Returns status maps and manager references
 *
 * - VizStateManager class (polls-participant-utils):
 *   * Maintains server state (point positions, segment bounds)
 *   * Handles canvas rendering and animations
 *   * Responds to server updates by recomputing layouts
 *   * Manages smooth transitions between states
 *
 * - SingleSplitViz component (polls-participant-utils):
 *   * Creates canvas element outside React's DOM
 *   * Attaches canvas to VizStateManager
 *   * Manually mounts canvas using appendChild
 *   * Cleans up on unmount
 *
 * REAL-TIME UPDATE FLOW:
 * 1. Another participant submits responses
 * 2. Server processes responses, updates visualization state
 * 3. Server broadcasts VisualizationUpdateEvent via SSE
 * 4. SessionVizClient receives event, calls vizManager.setServerState()
 * 5. VizStateManager recomputes point positions
 * 6. AnimationController smoothly animates points to new positions
 * 7. Canvas redraws automatically during animation
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { SessionResponse } from "shared-types";
import { useSessionViz, SingleSplitViz } from "polls-participant-utils";
import { useBreakpoint, vizConfig } from "ui-shared";
import { PollForm } from "../components/PollForm";
import * as styles from "./SessionPage.css";

function SessionPage() {
  const { slug } = useParams<{ slug: string }>();

  // Get current breakpoint for responsive canvas sizing
  const breakpoint = useBreakpoint();
  const currentVizConfig = vizConfig[breakpoint];
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  /**
   * VISUALIZATION HOOK - useSessionViz
   *
   * This hook manages the entire lifecycle of real-time visualization updates:
   *
   * 1. CONNECTION PHASE:
   *    - Calls GET /api/sessions/:slug to fetch initial session data
   *    - Opens Server-Sent Events (SSE) connection to visualization stream endpoint
   *    - Receives initial snapshot with current state of all visualizations
   *
   * 2. IMAGE LOADING PHASE (per visualization):
   *    - Extracts all unique SVG data URLs from visualization data
   *    - Rasterizes SVGs to HTMLImageElements in parallel
   *    - Creates a VizStateManager instance for each visualization
   *    - Status transitions: 'loading' -> 'ready' or 'error'
   *
   * 3. STREAMING PHASE:
   *    - Listens for 'visualization.updated' events on the SSE stream
   *    - When an update arrives, calls vizManager.setServerState(update)
   *    - VizStateManager automatically recomputes point positions and triggers canvas redraws
   *    - All attached canvases animate smoothly to the new state
   *
   * RETURNED VALUES:
   * - connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
   * - sessionStatus: { isOpen: boolean } - tracks if session is accepting responses
   * - vizStatuses: Map<vizId, 'loading' | 'ready' | 'error'> - status per visualization
   * - vizRefs: Map<vizId, { vizManager: VizStateManager, vizData: VisualizationData }>
   *
   *   The vizRefs map is the key to rendering visualizations. Each entry contains:
   *   - vizManager: Controls canvas rendering, handles server updates, manages animations
   *   - vizData: Immutable metadata (config, dimensions, loaded images, view mappings)
   */
  const { connectionStatus, vizStatuses, vizRefs } = useSessionViz(
    "/api", // Base API URL - could be from environment config
    slug || "", // Session slug from URL params
  );

  useEffect(() => {
    if (!slug) return;

    // Fetch session data from API
    fetch(`/api/sessions/${slug}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 404 ? "Session not found" : "Failed to load session",
          );
        }
        return res.json();
      })
      .then((data: SessionResponse) => {
        setSession(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className={styles.centerContent}>
        <p>Loading session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerContent}>
        <h1 className={styles.errorHeading}>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div>
      <h1 className={styles.heading}>
        {session.description || "Polling Session"}
      </h1>

      {!session.isOpen ? (
        <div className={styles.warningBox}>
          <p className={styles.noMargin}>
            This session is currently closed. Please check back later or contact
            your facilitator.
          </p>
        </div>
      ) : submitted ? (
        <>
          <div className={styles.successBox}>
            <h2 className={styles.successHeading}>Thank You!</h2>
            <p className={styles.noMargin}>
              Your responses have been submitted successfully.
            </p>
          </div>

          {/* 
            LIVE VISUALIZATIONS SECTION
            
            After the participant submits their responses, we display real-time
            visualizations showing how all participants have responded.
            
            ARCHITECTURE:
            - Each session has 1-N "response questions" (questions being visualized)
            - Each response question gets its own visualization with a unique ID
            - Session also has "grouping questions" that subdivide each visualization
            - We show one SingleSplitViz per response question in a stacked layout
            
            DATA FLOW:
            1. session.config.visualizations[] provides the configuration
            2. vizStatuses.get(vizId) tells us if images loaded successfully
            3. vizRefs.get(vizId).vizManager is the rendering engine
            4. vizManager.attachSingleSplitCanvas() connects canvas to server updates
            5. When server broadcasts updates, vizManager auto-redraws the canvas
          */}
          <div className={styles.visualizationsContainer}>
            <h2 className={styles.visualizationsHeading}>Live Results</h2>

            {/* Connection status indicator */}
            {connectionStatus !== "connected" && (
              <div className={styles.connectionStatus}>
                {connectionStatus === "reconnecting"
                  ? "Reconnecting to live updates..."
                  : "Connecting to live updates..."}
              </div>
            )}

            {/* 
              VISUALIZATION RENDERING LOOP
              
              We iterate over session.config.visualizations[] because it:
              - Preserves the order defined when the session was created
              - Includes the response question metadata we need for headings
              - Provides the visualization ID to look up rendering status
              
              For each visualization:
              1. Extract vizId from config
              2. Check vizStatus to see if images loaded
              3. Get vizRef containing vizManager and vizData
              4. Render SingleSplitViz component with proper configuration
            */}
            {session.config.visualizations.map((vizConfig, index) => {
              const vizId = vizConfig.id;
              const vizStatus = vizStatuses.get(vizId);
              const vizRef = vizRefs.get(vizId);

              // Find the corresponding question with full details (text) from questionOrder
              // Match by composite key: varName, batteryName, subBattery
              const responseQuestion = vizConfig.responseQuestion.question;
              const questionWithText = session.config.questionOrder.find(
                (q) =>
                  q.varName === responseQuestion.varName &&
                  q.batteryName === responseQuestion.batteryName &&
                  q.subBattery === responseQuestion.subBattery,
              );

              return (
                <div key={vizId} className={styles.vizSection}>
                  {/* Show the response question text as the section heading */}
                  <h3 className={styles.vizQuestionHeading}>
                    {questionWithText?.text ||
                      responseQuestion.varName ||
                      `Question ${index + 1}`}
                  </h3>

                  {/* Handle loading state - images are being rasterized */}
                  {vizStatus === "loading" && (
                    <div className={styles.vizLoading}>
                      Loading visualization...
                    </div>
                  )}

                  {/* Handle error state - image loading or setup failed */}
                  {vizStatus === "error" && (
                    <div className={styles.vizError}>
                      Failed to load visualization. Please refresh the page.
                    </div>
                  )}

                  {/* 
                    RENDER VISUALIZATION - when status is 'ready'
                    
                    SingleSplitViz component responsibilities:
                    - Creates an HTMLCanvasElement (not in React's DOM tree)
                    - Calls vizManager.attachSingleSplitCanvas(canvas, config, splitToFocus)
                    - vizManager sets up the rendering pipeline:
                      * Computes initial point positions and segment bounds
                      * Draws initial state on canvas
                      * Subscribes to server update events
                      * Triggers smooth animations when updates arrive
                    - Manually mounts canvas to DOM using ref + appendChild
                    - Returns cleanup function that detaches canvas on unmount
                    
                    CONFIGURATION PARAMETERS:
                    - vizManager: The rendering engine (from useSessionViz)
                    - vizRenderConfig: Canvas size, display mode, animations, margins
                      * initialCanvasWidth: Requested width on mount (height auto-computed from aspect ratio)
                      * initialDisplayMode: "expanded" shows all response groups separately
                      * animation: Durations for appear/disappear/move/image-change transitions
                      * margin: Internal padding INSIDE canvas for point positioning
                    - annotationMargin: Space OUTSIDE canvas for labels/legends (from vizConfig)
                    - canvasWidth: Current target width (from vizConfig, responsive to breakpoints)
                      * When breakpoint changes, SingleSplitViz calls setCanvasWidth() on the manager
                      * This efficiently resizes without remounting, preserving animations
                    - splitToFocus: Which split to render
                      * Determined from vizData.viewMaps[""] - the base view with no grouping active
                      * Base view contains split(s) showing all responses without demographic filtering
                      * Can be a number (split index) or array of grouping question selections
                  */}
                  {vizStatus === "ready" && vizRef && (
                    <div className={styles.vizWrapper}>
                      <SingleSplitViz
                        vizManager={vizRef.vizManager}
                        vizRenderConfig={{
                          initialCanvasWidth: currentVizConfig.canvasWidth,
                          initialDisplayMode: "expanded",
                          animation: {
                            appearDuration: 200, // New points fade in over 200ms
                            disappearDuration: 150, // Removed points fade out over 150ms
                            moveDuration: 400, // Points move to new positions over 400ms
                            imageChangeDuration: 400, // Cross-fade between images over 400ms
                          },
                          margin: { x: 20, y: 20 }, // Internal canvas padding for points
                        }}
                        annotationMargin={currentVizConfig.annotationMargin} // External space for labels (responsive)
                        canvasWidth={currentVizConfig.canvasWidth} // Responsive width from breakpoint system
                        splitToFocus={
                          vizRef.vizData.viewMaps[""][0] // Base view split index (empty string = no grouping questions active)
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div>
          <p className={styles.instruction}>
            Please answer the following questions:
          </p>

          <PollForm
            questions={session.config.questionOrder}
            sessionId={session.id}
            submitEndpoint={session.endpoints.submitResponse}
            onSuccess={() => setSubmitted(true)}
            onError={(errorMessage) => setError(errorMessage)}
          />
        </div>
      )}
    </div>
  );
}

export default SessionPage;
