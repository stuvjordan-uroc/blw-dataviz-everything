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
} from 'shared-types';

import { VizStateManager } from './VizStateManager';
import type {
  ParticipantVisibleState,
  ParticipantVisibleDiff,
  StateChangeCallback,
} from './types';

export class SessionVizClient {
  private apiClient: PollsApiClient;
  private vizManagers: Map<string, VizStateManager> = new Map();
  private eventSource: EventSource | null = null;
  private listeners: Set<StateChangeCallback> = new Set();
  private sessionData: SessionResponse | null = null;

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
   * 5. Returns map of initial visible states
   * 
   * @param slug - The session's unique slug
   * @returns Promise resolving to Map of initial visible states keyed by visualizationId
   */
  async connect(slug: string): Promise<Map<string, ParticipantVisibleState>> {

    //get session data
    this.sessionData = await this.apiClient.getSession(slug)

    //loop through the sessionData.visualization array.
    //for each visualization, create a VizStateManager
    for (const viz of this.sessionData.visualizations) {
      const vizState = new VizStateManager(
        viz.splits,
        viz.basisSplitIndices,
        viz.sequenceNumber,
        viz.viewMaps
      )
      this.vizManagers.set(viz.visualizationId, vizState)
    }

    //set up event source from session stream
    this.eventSource = this.apiClient.createVisualizationStream(this.sessionData.id)


    //call internal method to connect event handlers to event source
    this.attachEventHandlers();

    //return map of initial visible states
    const initialStates = new Map<string, ParticipantVisibleState>();
    this.vizManagers.forEach((vizManager, id) => {
      initialStates.set(id, vizManager.getVisibleState());
    });
    return initialStates;

  }

  /**
   * Subscribe to state changes.
   * Callback will be invoked whenever visible state changes (from server or participant).
   * 
   * @param callback - Function to call on state changes
   * @returns Unsubscribe function
   */
  subscribe(callback: StateChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
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
    this.notifyListeners(visualizationId, result.endState, result.diff);
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
    this.notifyListeners(visualizationId, result.endState, result.diff);
  }

  /**
   * Disconnect from the session and clean up resources.
   */
  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
    this.vizManagers.clear();
    this.listeners.clear();
  }

  /**
   * Get current session data (metadata, config, etc.).
   */
  getSessionData(): SessionResponse | null {
    return this.sessionData;
  }

  /**
   * Get visible state for a specific visualization.
   * 
   * @param visualizationId - The visualization to get state for
   * @returns Current visible state or null if visualization not found
   */
  getVisibleState(visualizationId: string): ParticipantVisibleState | null {
    const vizManager = this.vizManagers.get(visualizationId);
    return vizManager ? vizManager.getVisibleState() : null;
  }

  /**
   * Get visible states for all visualizations.
   * 
   * @returns Map of visualizationId to current visible state
   */
  getAllVisibleStates(): Map<string, ParticipantVisibleState> {
    const states = new Map<string, ParticipantVisibleState>();
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

    this.eventSource.addEventListener('visualization.updated', (event: Event) => {
      // TODO: Add runtime validation using VisualizationUpdateEventSchema from shared-types
      // Example: const data = VisualizationUpdateEventSchema.parse(JSON.parse((event as MessageEvent).data));
      const data = JSON.parse((event as MessageEvent).data) as VisualizationUpdateEvent;
      this.handleVisualizationUpdate(data);
    });

    this.eventSource.addEventListener('visualization.snapshot', (event: Event) => {
      // TODO: Add runtime validation using VisualizationSnapshotEventSchema from shared-types
      // Example: const data = VisualizationSnapshotEventSchema.parse(JSON.parse((event as MessageEvent).data));
      const data = JSON.parse((event as MessageEvent).data) as VisualizationSnapshotEvent;
      this.handleVisualizationSnapshot(data);
    });

    this.eventSource.addEventListener('session.statusChanged', (event: Event) => {
      // TODO: Add runtime validation using SessionStatusChangedEventSchema from shared-types
      // Example: const data = SessionStatusChangedEventSchema.parse(JSON.parse((event as MessageEvent).data));
      const data = JSON.parse((event as MessageEvent).data) as SessionStatusChangedEvent;
      this.handleSessionStatusChange(data);
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
    this.notifyListeners(event.visualizationId, result.endState, result.diff);
  }

  /**
   * Internal: Handle visualization snapshot events (initial state).
   * Updates all visualizations from the snapshot.
   */
  private handleVisualizationSnapshot(event: VisualizationSnapshotEvent): void {
    // TODO: Handle snapshot event with multiple visualizations
    // This event handler is used if reconnecting to an already-initialized stream
    // For each viz in event.visualizations:
    //   - Get or create VizStateManager for viz.visualizationId
    //   - Apply full state update with viz.splits, viz.sequenceNumber
    //   - Notify listeners for that specific visualizationId
  }

  /**
   * Internal: Handle session status changes (open/closed).
   */
  private handleSessionStatusChange(event: SessionStatusChangedEvent): void {
    // TODO: Decide what to do when session closes
    // - Notify UI?
    // - Close EventSource?
    // - Keep showing final state?
  }

  /**
   * Internal: Notify all subscribers of a state change for a specific visualization.
   */
  private notifyListeners(
    visualizationId: string,
    state: ParticipantVisibleState,
    diff?: ParticipantVisibleDiff
  ): void {
    this.listeners.forEach(callback => callback(visualizationId, state, diff));
  }
}
