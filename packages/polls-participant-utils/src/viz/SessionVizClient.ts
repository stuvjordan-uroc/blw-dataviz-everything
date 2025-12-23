/**
 * SessionVizClient: High-level orchestrator for participant visualization viewing.
 * 
 * This class coordinates multiple components to provide a complete solution for
 * participants viewing live or final session visualizations:
 * 
 * - PollsApiClient: Handles HTTP/SSE communication with the server
 * - ParticipantVizState: Manages canonical + personal state
 * - Event coordination: Bridges SSE events to state updates
 * - Subscription management: Notifies external code (e.g., React) of changes
 * 
 * Exports:
 * - SessionVizClient class with methods:
 *   - connect(slug): Initialize connection to a session
 *   - subscribe(callback): Register for state change notifications
 *   - switchView(viewId): Change which questions are active
 *   - setDisplayMode(mode): Toggle collapsed/expanded display
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
} from 'api-polls-client';

import { ParticipantVizState } from './ParticipantVizState';
import type {
  ParticipantVisibleState,
  ParticipantVisibleDiff,
  StateChangeCallback,
} from './types';

export class SessionVizClient {
  private apiClient: PollsApiClient;
  private vizState: ParticipantVizState | null = null;
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
   * 1. Fetches session configuration and initial viz state
   * 2. Initializes ParticipantVizState with canonical data
   * 3. Opens SSE connection for live updates
   * 4. Registers event handlers
   * 5. Returns initial visible state
   * 
   * @param slug - The session's unique slug
   * @returns Promise resolving to initial visible state
   */
  async connect(slug: string): Promise<ParticipantVisibleState> {
    // TODO: Implement connection logic
    // 1. this.sessionData = await this.apiClient.getSession(slug)
    // 2. this.vizState = new ParticipantVizState(...)
    // 3. this.eventSource = this.apiClient.createVisualizationStream(sessionId)
    // 4. this.attachEventHandlers()
    // 5. return this.vizState.getVisibleState()

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
   * Change which view the participant is looking at.
   * 
   * @param viewId - View identifier string (e.g., "0,1,3" or "")
   */
  switchView(viewId: string): void {
    if (!this.vizState) {
      throw new Error('Not connected to a session');
    }

    const result = this.vizState.setView(viewId);
    this.notifyListeners(result.endState, result.diff);
  }

  /**
   * Toggle between collapsed and expanded display modes.
   * 
   * @param mode - 'collapsed' or 'expanded'
   */
  setDisplayMode(mode: 'collapsed' | 'expanded'): void {
    if (!this.vizState) {
      throw new Error('Not connected to a session');
    }

    const result = this.vizState.setDisplayMode(mode);
    this.notifyListeners(result.endState, result.diff);
  }

  /**
   * Disconnect from the session and clean up resources.
   */
  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
    this.vizState = null;
    this.listeners.clear();
  }

  /**
   * Get current session data (metadata, config, etc.).
   */
  getSessionData(): SessionResponse | null {
    return this.sessionData;
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
   */
  private handleVisualizationUpdate(event: VisualizationUpdateEvent): void {
    if (!this.vizState) return;

    const result = this.vizState.applyServerUpdate(
      event.splits,
      event.splitDiffs
    );
    this.notifyListeners(result.endState, result.diff);
  }

  /**
   * Internal: Handle visualization snapshot events (initial state).
   */
  private handleVisualizationSnapshot(event: VisualizationSnapshotEvent): void {
    // TODO: Decide if we need to handle snapshots differently than updates
    // For now, treat same as update
    if (!this.vizState) return;

    const result = this.vizState.applyServerUpdate(event.splits);
    this.notifyListeners(result.endState, result.diff);
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
   * Internal: Notify all subscribers of a state change.
   */
  private notifyListeners(
    state: ParticipantVisibleState,
    diff?: ParticipantVisibleDiff
  ): void {
    this.listeners.forEach(callback => callback(state, diff));
  }
}
