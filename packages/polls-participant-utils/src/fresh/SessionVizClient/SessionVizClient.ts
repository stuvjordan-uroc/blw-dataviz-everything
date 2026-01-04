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
  SessionStatusChangedEvent
} from 'shared-types';
import { ConnectionStatus, SessionStatus, SessionStatusCallback, ConnectionStatusCallback, VizUpdateCallback } from "./types";
import { ZodError } from "zod";


export class SessionVizClient {

  //================================================
  // FIELDS
  //================================================

  //polls api client
  private apiClient: PollsApiClient;

  //session status
  private sessionStatus: SessionStatus = 'closed';

  //connection status
  private connectionStatus: ConnectionStatus = 'disconnected';

  //session meta data (returned from initial GET SESSION BY SLUG request)
  private sessionData: SessionResponse | null = null;

  //event source for streaming updates to session state
  private eventSource: EventSource | null = null;

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
    this.sessionStatus = this.sessionData.isOpen ? 'open' : 'closed';
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
     * Callback will be invoked immediately with current state for all visualizations,
     * and then whenever there is a published change of a viz.
     * 
     * @param callback - Function to call on visualization state changes
     * @returns Unsubscribe function
     */
  subscribeToVizUpdate(callback: VizUpdateCallback): () => void {
    this.vizUpdateListeners.add(callback);
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

  private handleVisualizationUpdate(vizUpdate: VisualizationUpdateEvent): void {
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

    this.sessionStatusListeners.forEach(callback => callback(event.isOpen ? 'open' : 'closed'))

    // Note: Server will close the SSE connection when session closes,
    // so we don't need to manually close it here
  }



}