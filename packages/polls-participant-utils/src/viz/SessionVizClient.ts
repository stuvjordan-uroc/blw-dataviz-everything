/**
 * SessionVizClient: High-level orchestrator for participant visualization viewing.
 * 
 * This class coordinates multiple components to provide a complete solution for
 * participants viewing live or final session visualizations:
 * 
 * - PollsApiClient: Handles HTTP/SSE communication with the server
 * - ParticipantVizState: Manages canonical + personal state for EACH visualization
 * - Event coordination: Bridges SSE events to state updates
 * - Subscription management: Notifies external code (e.g., React) of changes
 * 
 * Architecture:
 * - Maintains a Map of ParticipantVizState instances, one per visualization
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

import { ParticipantVizState } from './ParticipantVizState';
import type {
  ParticipantVisibleState,
  ParticipantVisibleDiff,
  StateChangeCallback,
} from './types';

export class SessionVizClient {
  private apiClient: PollsApiClient;
  private vizStates: Map<string, ParticipantVizState> = new Map();
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
   * 1. Fetches session configuration and initial viz state for ALL visualizations
   * 2. Initializes one ParticipantVizState per visualization
   * 3. Opens SSE connection for live updates
   * 4. Registers event handlers
   * 5. Returns map of initial visible states
   * 
   * @param slug - The session's unique slug
   * @returns Promise resolving to Map of initial visible states keyed by visualizationId
   */
  async connect(slug: string): Promise<Map<string, ParticipantVisibleState>> {
    // TODO: Implement connection logic
    // 1. this.sessionData = await this.apiClient.getSession(slug)
    // 2. Loop through sessionData.visualizations array:
    //    for each viz in visualizations:
    //      const vizState = new ParticipantVizState(
    //        viz.splits,
    //        viz.basisSplitIndices,
    //        viz.sequenceNumber,
    //        viz.viewMaps
    //      )
    //      this.vizStates.set(viz.visualizationId, vizState)
    // 3. this.eventSource = this.apiClient.createVisualizationStream(sessionId)
    // 4. this.attachEventHandlers()
    // 5. return Map of visualizationId -> vizState.getVisibleState()

    throw new Error('Not implemented');
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
    const vizState = this.vizStates.get(visualizationId);
    if (!vizState) {
      throw new Error(`Visualization ${visualizationId} not found`);
    }

    const result = vizState.setView(viewId);
    this.notifyListeners(visualizationId, result.endState, result.diff);
  }

  /**
   * Toggle between collapsed and expanded display modes for a specific visualization.
   * 
   * @param visualizationId - The visualization to update
   * @param mode - 'collapsed' or 'expanded'
   */
  setDisplayMode(visualizationId: string, mode: 'collapsed' | 'expanded'): void {
    const vizState = this.vizStates.get(visualizationId);
    if (!vizState) {
      throw new Error(`Visualization ${visualizationId} not found`);
    }

    const result = vizState.setDisplayMode(mode);
    this.notifyListeners(visualizationId, result.endState, result.diff);
  }

  /**
   * Disconnect from the session and clean up resources.
   */
  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
    this.vizStates.clear();
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
    const vizState = this.vizStates.get(visualizationId);
    return vizState ? vizState.getVisibleState() : null;
  }

  /**
   * Get visible states for all visualizations.
   * 
   * @returns Map of visualizationId to current visible state
   */
  getAllVisibleStates(): Map<string, ParticipantVisibleState> {
    const states = new Map<string, ParticipantVisibleState>();
    this.vizStates.forEach((vizState, id) => {
      states.set(id, vizState.getVisibleState());
    });
    return states;
  }

  /**
   * Get list of available visualization IDs.
   * 
   * @returns Array of visualization IDs
   */
  getVisualizationIds(): string[] {
    return Array.from(this.vizStates.keys());
  }

  /**
   * Internal: Attach event listeners to the SSE EventSource.
   */
  private attachEventHandlers(): void {
    // TODO: Implement event handler registration
    // this.eventSource.addEventListener('visualization.updated', ...)
    // this.eventSource.addEventListener('visualization.snapshot', ...)
    // this.eventSource.addEventListener('session.statusChanged', ...)
  }

  /**
   * Internal: Handle visualization update events from server.
   * Routes update to the specific visualization by ID.
   */
  private handleVisualizationUpdate(event: VisualizationUpdateEvent): void {
    const vizState = this.vizStates.get(event.visualizationId);
    if (!vizState) return;

    const result = vizState.applyServerUpdate(
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
    //   - Get or create ParticipantVizState for viz.visualizationId
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
