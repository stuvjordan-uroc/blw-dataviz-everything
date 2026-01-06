/**
 * SessionVizClient
 * 
 * This class can connect to a session's event stream
 * and allows callers to subscribe to events from the stream.
 * 
 * 
 */

import { PollsApiClient } from "api-polls-client";
import {
  SessionResponse,
  VisualizationUpdateEvent,
  VisualizationUpdateEventSchema,
  SessionStatusChangedEventSchema,
  SessionStatusChangedEvent,
  VisualizationSnapshotEvent,
  VisualizationSnapshotEventSchema,
  VisualizationData
} from 'shared-types';
import { ConnectionStatus, SessionStatusCallback, ConnectionStatusCallback, VizUpdateCallback } from "./types";
import { ZodError } from "zod";


export class SessionVizClient {

  //================================================
  // FIELDS
  //================================================

  //polls api client
  private apiClient: PollsApiClient;


  //connection status
  private connectionStatus: ConnectionStatus = 'disconnected';

  //session meta data (returned from initial GET SESSION BY SLUG request)
  private sessionData: SessionResponse | null = null;

  //event source for streaming updates to session state
  private eventSource: EventSource | null = null;

  //buffered visualization states - always contains the latest known state for each viz
  //updated from snapshot and subsequent updates to prevent race conditions
  private latestVizStates: Map<string, VisualizationData> = new Map();

  //listeners for session status and connection state
  //and for viz state changes
  private sessionStatusListeners: Set<SessionStatusCallback> = new Set();
  private connectionStatusListeners: Set<ConnectionStatusCallback> = new Set();
  private vizUpdateListeners: Set<VizUpdateCallback> = new Set();




  //============================================
  // CONSTRUCTOR
  //============================================

  constructor(pollsApiUrl: string) {

    this.apiClient = new PollsApiClient(pollsApiUrl)

  }

  //============================================
  // CONNECT METHOD
  //============================================

  async connect(pollsSessionSlug: string) {

    //get session data
    this.sessionData = await this.apiClient.getSession(pollsSessionSlug)


    //set up event source from session stream
    this.eventSource = this.apiClient.createVisualizationStream(this.sessionData.id)

    //call internal method to attach event handlers
    this.attachEventHandlers();

    //set session and connection status
    this.connectionStatus = 'connected';

    //return session data to caller
    return this.sessionData;

  }

  //=============================================
  // DISCONNECT
  //=============================================
  disconnect(): void {
    this.eventSource?.close();
    this.vizUpdateListeners.clear();
    this.sessionStatusListeners.clear();
    this.connectionStatusListeners.clear();
    this.latestVizStates.clear();
  }


  //=============================================
  // SUBSCRIPTION METHODS
  //=============================================

  // session status
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

  // connection status
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

  // viz state

  /**
     * Subscribe to visualization updates.
     * 
     * The callback is immediately invoked with synthetic updates representing
     * the current buffered state for all visualizations. This ensures subscribers
     * always start with the most recent state, preventing race conditions.
     * 
     * Subsequent calls to the callback deliver real-time updates.
     * 
     * @param callback - Function to call on visualization state changes
     * @returns Unsubscribe function
     */
  subscribeToVizUpdate(callback: VizUpdateCallback): () => void {
    this.vizUpdateListeners.add(callback);

    // Immediately invoke callback with current buffered states as synthetic updates
    for (const [vizId, vizData] of this.latestVizStates.entries()) {
      const syntheticUpdate: VisualizationUpdateEvent = {
        visualizationId: vizId,
        fromSequence: 0, // Synthetic - doesn't represent a diff
        toSequence: vizData.sequenceNumber,
        splits: vizData.splits,
        basisSplitIndices: vizData.basisSplitIndices,
        timestamp: vizData.lastUpdated
      };
      callback(syntheticUpdate);
    }

    return () => this.vizUpdateListeners.delete(callback);
  }

  //==============================================
  // ATTACH EVENT HANDLERS METHOD
  //===============================================

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

    this.eventSource.addEventListener('visualization.snapshot', (event: Event) => {
      try {
        const rawData = JSON.parse((event as MessageEvent).data);
        const data = VisualizationSnapshotEventSchema.parse(rawData);
        this.handleVisualizationSnapshot(data);
      } catch (error) {
        this.handleUnknownPayload('visualization.snapshot', (event as MessageEvent).data, error);
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

  //EVENT HANDLERS
  private updateConnectionStatus(status: 'connected' | 'disconnected' | 'reconnecting'): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.connectionStatusListeners.forEach(callback => callback(status));
    }
  }

  private handleVisualizationSnapshot(snapshot: VisualizationSnapshotEvent): void {
    // Buffer all visualization states from snapshot
    for (const viz of snapshot.visualizations) {
      this.latestVizStates.set(viz.visualizationId, viz);
    }
  }

  private handleVisualizationUpdate(vizUpdate: VisualizationUpdateEvent): void {
    // Update buffered state with new data
    let bufferedState = this.latestVizStates.get(vizUpdate.visualizationId);

    if (bufferedState) {
      // Update existing buffered state
      bufferedState.sequenceNumber = vizUpdate.toSequence;
      bufferedState.lastUpdated = vizUpdate.timestamp;
      bufferedState.splits = vizUpdate.splits;
    } else {
      // Not in latestVizStates yet - check if it's in session data
      // This handles race condition where update arrives before snapshot
      const vizMetadata = this.sessionData?.visualizations.find(
        v => v.visualizationId === vizUpdate.visualizationId
      );

      if (vizMetadata) {
        // Create entry by combining metadata from session data with update
        bufferedState = {
          ...vizMetadata,
          sequenceNumber: vizUpdate.toSequence,
          lastUpdated: vizUpdate.timestamp,
          splits: vizUpdate.splits
        };
        this.latestVizStates.set(vizUpdate.visualizationId, bufferedState);
      } else {
        console.warn(`Received update for unknown visualization ${vizUpdate.visualizationId}`);
      }
    }

    // Broadcast to all subscribers
    this.vizUpdateListeners.forEach(callback => callback(vizUpdate))
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

  private handleSessionStatusChange(event: SessionStatusChangedEvent): void {
    // Update session data (guaranteed non-null since events only flow after connect())
    this.sessionData!.isOpen = event.isOpen;

    this.sessionStatusListeners.forEach(callback => callback(event.isOpen))

    // Note: Server will close the SSE connection when session closes,
    // so we don't need to manually close it here
  }



}