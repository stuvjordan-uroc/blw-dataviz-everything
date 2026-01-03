/**
 * SessionVizClient: High-level orchestrator for session participant visualization viewing.
 * 
 * This class coordinates multiple components to provide a complete solution for
 * participants viewing live or final session visualizations:
 * 
 * - PollsApiClient: Handles HTTP/SSE communication with the server
 * - VizStateManager: Manages canonical + personal state for each of a session's visualizations
 * - Event coordination: Bridges SSE events to state updates
 * - Subscription management: Notifies external code (e.g., React) of changes
 * 
 * Architecture:
 * - Maintains a Map of VizStateManager instances, one for each visualization in the session
 * - Routes SSE updates to the correct visualization by visualizationId
 * - Notifies subscribers with visualizationId for targeted UI updates
 * 
 * Exports:
 * - SessionVizClient class with methods:
 *   - connect(slug): Initialize connection to a session with all its visualizations
 *   - subscribe(callback): Register for state change notifications
 *   - switchView(visualizationId, viewId): Change which questions are active for a specific viz
 *   - setDisplayMode(visualizationId, mode): Toggle collapsed/expanded display for a specific viz
 *   - getAllVisibleStates(): Get current state for all visualizations
 *   - disconnect(): Clean up SSE connection
 * 
 * This is the main entry point for UI code that wants to display visualizations.
 */

import { PollsApiClient } from 'api-polls-client';
import type {
  SessionResponse,
  VisualizationUpdateEvent,
  VisualizationSnapshotEvent,
  SessionStatusChangedEvent,
  VisualizationData,
} from 'shared-types';
import {
  VisualizationUpdateEventSchema,
  VisualizationSnapshotEventSchema,
  SessionStatusChangedEventSchema,
} from 'shared-types';
import { ZodError } from 'zod';

import { VizStateManager } from './VizStateManager';
import { loadAllSessionImages } from './sessionImages';
import type {
  ParticipantPointPositions,
  StateChangeResult,
  VizStateChangeCallback,
  SessionStatusCallback,
  ConnectionStatus,
  ConnectionStatusCallback,
  ViewState,
} from './types';

export class SessionVizClient {
  private apiClient: PollsApiClient;
  private vizManagers: Map<string, VizStateManager> = new Map();
  private eventSource: EventSource | null = null;
  private vizStateListeners: Set<VizStateChangeCallback> = new Set();
  private sessionStatusListeners: Set<SessionStatusCallback> = new Set();
  private connectionStatusListeners: Set<ConnectionStatusCallback> = new Set();
  private sessionData: SessionResponse | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private imageMap: Map<string, { image: HTMLImageElement; offsetToCenter: { x: number; y: number } }> | null = null;

  constructor(apiClient: PollsApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Connect to a session and begin receiving visualization updates.
   * 
   * This method:
   * 1. Fetches session configuration and initial viz state for all of the session's visualizations
   * 2. Initializes one VizStateManager per visualization
   * 3. Opens SSE connection for live updates
   * 4. Registers event handlers
   * 5. Returns map of initial point positions
   * 
   * @param slug - The session's unique slug
   * @returns Promise resolving to Map of initial point positions keyed by visualizationId
   */
  async connect(slug: string): Promise<Map<string, ParticipantPointPositions>> {

    //get session data
    this.sessionData = await this.apiClient.getSession(slug)

    //load and rasterize all images
    const sessionImages = await loadAllSessionImages(this.sessionData.visualizations);
    this.imageMap = sessionImages;

    //loop through the sessionData.visualization array.
    //for each visualization, create a VizStateManager
    for (const viz of this.sessionData.visualizations) {
      // Build expandedToCollapsedMap for this visualization
      const expandedToCollapsedMap = this.buildExpandedToCollapsedMap(viz);

      const vizState = new VizStateManager(
        viz.splits,
        viz.basisSplitIndices,
        viz.sequenceNumber,
        viz.viewMaps,
        sessionImages,
        expandedToCollapsedMap
      )
      this.vizManagers.set(viz.visualizationId, vizState)
    }

    //set up event source from session stream
    this.eventSource = this.apiClient.createVisualizationStream(this.sessionData.id)


    //call internal method to connect event handlers to event source
    this.attachEventHandlers();

    //return map of initial point positions
    const initialStates = new Map<string, ParticipantPointPositions>();
    this.vizManagers.forEach((vizManager, id) => {
      initialStates.set(id, vizManager.getVisibleState());
    });
    return initialStates;

  }

  /**
   * Subscribe to visualization state changes.
   * Callback will be invoked immediately with current state for all visualizations,
   * and then whenever point positions change (from server or participant view changes).
   * 
   * @param callback - Function to call on visualization state changes
   * @returns Unsubscribe function
   */
  subscribeToVizState(callback: VizStateChangeCallback): () => void {
    this.vizStateListeners.add(callback);

    // Immediately invoke callback with current state for all visualizations
    this.vizManagers.forEach((vizManager, vizId) => {
      const currentPositions = vizManager.getVisibleState();
      const currentViewState = vizManager.getViewState();
      callback(vizId, {
        pointPositions: currentPositions,
        pointPositionsDiff: { added: [], removed: [], moved: [] }, // Empty diff for initial state
        viewState: currentViewState,
        viewStateDiff: { viewIdChanged: false, displayModeChanged: false },
      });
    });

    return () => this.vizStateListeners.delete(callback);
  }

  /**
   * Subscribe to session status changes.
   * Callback will be invoked when the session opens or closes.
   * 
   * @param callback - Function to call on session status changes
   * @returns Unsubscribe function
   */
  subscribeToSessionStatus(callback: SessionStatusCallback): () => void {
    this.sessionStatusListeners.add(callback);
    return () => this.sessionStatusListeners.delete(callback);
  }

  /**
   * Subscribe to connection status changes.
   * Callback will be invoked when the SSE connection state changes.
   * 
   * @param callback - Function to call on connection status changes
   * @returns Unsubscribe function
   */
  subscribeToConnectionStatus(callback: ConnectionStatusCallback): () => void {
    this.connectionStatusListeners.add(callback);
    return () => this.connectionStatusListeners.delete(callback);
  }

  /**
   * Change which view the participant is looking at for a specific visualization.
   * 
   * @param visualizationId - The visualization to update
   * @param viewId - View identifier string (e.g., "0,1,3" or "")
   */
  switchView(visualizationId: string, viewId: string): void {
    const vizManager = this.vizManagers.get(visualizationId);
    if (!vizManager) {
      throw new Error(`Visualization ${visualizationId} not found`);
    }

    const result = vizManager.setView(viewId);
    this.notifyVizStateListeners(visualizationId, result);
  }

  /**
   * Toggle between collapsed and expanded display modes for a specific visualization.
   * 
   * @param visualizationId - The visualization to update
   * @param mode - 'collapsed' or 'expanded'
   */
  setDisplayMode(visualizationId: string, mode: 'collapsed' | 'expanded'): void {
    const vizManager = this.vizManagers.get(visualizationId);
    if (!vizManager) {
      throw new Error(`Visualization ${visualizationId} not found`);
    }

    const result = vizManager.setDisplayMode(mode);
    this.notifyVizStateListeners(visualizationId, result);
  }

  /**
   * Disconnect from the session and clean up resources.
   */
  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
    this.vizManagers.clear();
    this.vizStateListeners.clear();
    this.sessionStatusListeners.clear();
    this.connectionStatusListeners.clear();
    this.connectionStatus = 'disconnected';
  }

  /**
   * Get current session data (metadata, config, etc.).
   */
  getSessionData(): SessionResponse | null {
    return this.sessionData;
  }

  /**
   * Get current session open/closed status.
   * 
   * @returns true if session is open (accepting responses), false if closed, null if not connected
   */
  getSessionStatus(): boolean | null {
    return this.sessionData?.isOpen ?? null;
  }

  /**
   * Get current SSE connection status.
   * 
   * @returns Current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get current point positions for a specific visualization.
   * 
   * @param visualizationId - The visualization to get positions for
   * @returns Current point positions or null if visualization not found
   */
  getVisibleState(visualizationId: string): ParticipantPointPositions | null {
    const vizManager = this.vizManagers.get(visualizationId);
    return vizManager ? vizManager.getVisibleState() : null;
  }

  /**
   * Get current view state for a specific visualization.
   * 
   * @param visualizationId - The visualization to get view state for
   * @returns Current view state or null if visualization not found
   */
  getViewState(visualizationId: string): ViewState | null {
    const vizManager = this.vizManagers.get(visualizationId);
    return vizManager ? vizManager.getViewState() : null;
  }

  /**
   * Get point positions for all visualizations.
   * 
   * @returns Map of visualizationId to current point positions
   */
  getAllVisibleStates(): Map<string, ParticipantPointPositions> {
    const states = new Map<string, ParticipantPointPositions>();
    this.vizManagers.forEach((vizManager, id) => {
      states.set(id, vizManager.getVisibleState());
    });
    return states;
  }

  /**
   * Get list of available visualization IDs.
   * 
   * @returns Array of visualization IDs
   */
  getVisualizationIds(): string[] {
    return Array.from(this.vizManagers.keys());
  }

  /**
   * Internal: Attach event listeners to the SSE EventSource.
   */
  private attachEventHandlers(): void {
    if (!this.eventSource) return;

    // Listen to EventSource connection status events
    this.eventSource.addEventListener('open', () => {
      this.updateConnectionStatus('connected');
    });

    this.eventSource.addEventListener('error', () => {
      // EventSource will automatically attempt to reconnect
      // readyState: 0 = CONNECTING (reconnecting), 1 = OPEN, 2 = CLOSED
      if (this.eventSource?.readyState === EventSource.CONNECTING) {
        this.updateConnectionStatus('reconnecting');
      } else {
        this.updateConnectionStatus('disconnected');
      }
    });

    this.eventSource.addEventListener('visualization.updated', (event: Event) => {
      try {
        const rawData = JSON.parse((event as MessageEvent).data);
        const data = VisualizationUpdateEventSchema.parse(rawData);
        this.handleVisualizationUpdate(data);
      } catch (error) {
        this.handleUnknownPayload('visualization.updated', (event as MessageEvent).data, error);
      }
    });

    this.eventSource.addEventListener('visualization.snapshot', (event: Event) => {
      try {
        const rawData = JSON.parse((event as MessageEvent).data);
        const data = VisualizationSnapshotEventSchema.parse(rawData);
        this.handleVisualizationSnapshot(data);
      } catch (error) {
        this.handleUnknownPayload('visualization.snapshot', (event as MessageEvent).data, error);
      }
    });

    this.eventSource.addEventListener('session.statusChanged', (event: Event) => {
      try {
        const rawData = JSON.parse((event as MessageEvent).data);
        const data = SessionStatusChangedEventSchema.parse(rawData);
        this.handleSessionStatusChange(data);
      } catch (error) {
        this.handleUnknownPayload('session.statusChanged', (event as MessageEvent).data, error);
      }
    });
  }

  /**
   * Internal: Handle visualization update events from server.
   * Routes update to the specific visualization by ID.
   */
  private handleVisualizationUpdate(event: VisualizationUpdateEvent): void {
    const vizManager = this.vizManagers.get(event.visualizationId);
    if (!vizManager) return;

    const result = vizManager.applyServerUpdate(
      event.fromSequence,
      event.toSequence,
      event.splits,
      event.splitDiffs
    );
    this.notifyVizStateListeners(event.visualizationId, result);
  }

  /**
   * Internal: Handle visualization snapshot events (initial state).
   * Updates all visualizations from the snapshot.
   * Used when reconnecting to an already-initialized stream.
   */
  private handleVisualizationSnapshot(event: VisualizationSnapshotEvent): void {
    // Process each visualization in the snapshot
    for (const viz of event.visualizations) {
      // Get existing manager or create new one
      let vizManager = this.vizManagers.get(viz.visualizationId);
      let result: StateChangeResult;

      if (!vizManager) {
        // Create new VizStateManager if it doesn't exist
        const expandedToCollapsedMap = this.buildExpandedToCollapsedMap(viz);
        vizManager = new VizStateManager(
          viz.splits,
          viz.basisSplitIndices,
          viz.sequenceNumber,
          viz.viewMaps,
          // imageMap is guaranteed non-null: connect() awaits loadAllSessionImages() 
          // before attachEventHandlers(), so no events can fire until images are loaded
          this.imageMap!,
          expandedToCollapsedMap
        );
        this.vizManagers.set(viz.visualizationId, vizManager);

        // For initial creation, all points are "added"
        const visibleState = vizManager.getVisibleState();
        result = {
          endState: visibleState,
          diff: { added: Array.from(visibleState.values()), removed: [], moved: [] },
        };
      } else {
        // Apply full state update to existing manager
        // Use fromSequence = sequenceNumber - 1 to indicate a full snapshot replacement
        result = vizManager.applyServerUpdate(
          viz.sequenceNumber - 1,
          viz.sequenceNumber,
          viz.splits
        );
      }

      // Notify listeners with the actual result (preserves real diffs)
      this.notifyVizStateListeners(viz.visualizationId, result);
    }
  }

  /**
   * Internal: Handle session status changes (open/closed).
   */
  private handleSessionStatusChange(event: SessionStatusChangedEvent): void {
    // Update session data (guaranteed non-null since events only flow after connect())
    this.sessionData!.isOpen = event.isOpen;

    // Notify all session status listeners
    this.notifySessionStatusListeners(event.isOpen, event.timestamp);

    // Note: Server will close the SSE connection when session closes,
    // so we don't need to manually close it here
  }

  /**
   * Internal: Handle messages with unknown/invalid payload structure.
   * Logs diagnostic information to help debug malformed server messages.
   */
  private handleUnknownPayload(eventType: string, rawData: string, error: unknown): void {
    console.warn(
      `[SessionVizClient] Received message with unknown payload shape`,
      {
        eventType,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionData?.id,
        sessionSlug: this.sessionData?.slug,
        rawDataPreview: rawData.substring(0, 200), // First 200 chars
        rawDataLength: rawData.length,
        error: error instanceof ZodError
          ? {
            name: 'ZodError',
            issues: error.issues.map(issue => ({
              path: issue.path.join('.'),
              message: issue.message,
              code: issue.code,
            }))
          }
          : error instanceof Error
            ? { name: error.name, message: error.message }
            : String(error),
      }
    );
  }

  /**
   * Internal: Notify all subscribers of a visualization state change.
   */
  private notifyVizStateListeners(
    visualizationId: string,
    result: StateChangeResult
  ): void {
    this.vizStateListeners.forEach(callback => callback(visualizationId, result));
  }

  /**
   * Internal: Build mapping from expanded response group index to collapsed response group index.
   * 
   * For each expanded response group, finds which collapsed response group contains it
   * by checking if the collapsed group's values array includes the first value from
   * the expanded group's values array.
   */
  private buildExpandedToCollapsedMap(viz: VisualizationData): number[] {
    const expandedGroups = viz.config.responseQuestion.responseGroups.expanded;
    const collapsedGroups = viz.config.responseQuestion.responseGroups.collapsed;

    return expandedGroups.map((expandedGroup) => {
      const collapsedIdx = collapsedGroups.findIndex((collapsedGroup) =>
        collapsedGroup.values.includes(expandedGroup.values[0])
      );

      if (collapsedIdx === -1) {
        throw new Error(
          `Expanded response group "${expandedGroup.label}" not found in any collapsed group`
        );
      }

      return collapsedIdx;
    });
  }

  /**
   * Internal: Notify all subscribers of a session status change.
   */
  private notifySessionStatusListeners(
    isOpen: boolean,
    timestamp: Date | string
  ): void {
    this.sessionStatusListeners.forEach(callback => callback(isOpen, timestamp));
  }

  /**
   * Internal: Update connection status and notify listeners.
   */
  private updateConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.connectionStatusListeners.forEach(callback => callback(status));
    }
  }
}
