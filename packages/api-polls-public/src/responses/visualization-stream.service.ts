import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Response } from "express";
import { VisualizationUpdatedEvent } from "./batch-update-scheduler.service";

/**
 * Event emitted when a session's open/closed status changes
 */
export interface SessionStatusChangedEvent {
  sessionId: number;
  isOpen: boolean;
  timestamp: Date;
}

/**
 * Represents a connected SSE client
 */
interface StreamClient {
  sessionId: number;
  response: Response;
  clientId: string;
}

/**
 * VisualizationStreamService manages Server-Sent Events (SSE) connections
 * for real-time visualization updates.
 * 
 * Features:
 * - Clients connect and receive initial visualization snapshot
 * - Streams visualization updates as responses are processed
 * - Automatic cleanup on client disconnect
 */
@Injectable()
export class VisualizationStreamService {
  private readonly logger = new Logger(VisualizationStreamService.name);

  // Map of session ID to set of connected clients
  private clients: Map<number, Set<StreamClient>> = new Map();

  /**
   * Register a new SSE client for a session
   * 
   * @param sessionId - The session ID to subscribe to
   * @param res - Express Response object for SSE
   * @returns Client ID for tracking
   */
  addClient(sessionId: number, res: Response): string {
    const clientId = this.generateClientId();

    // Configure SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    const client: StreamClient = {
      sessionId,
      response: res,
      clientId,
    };

    // Add to session's client set
    if (!this.clients.has(sessionId)) {
      this.clients.set(sessionId, new Set());
    }
    this.clients.get(sessionId)!.add(client);

    this.logger.log(
      `Client ${clientId} connected to session ${sessionId} ` +
      `(${this.clients.get(sessionId)!.size} total clients)`
    );

    // Handle client disconnect
    res.on("close", () => {
      this.removeClient(sessionId, clientId);
    });

    return clientId;
  }

  /**
   * Remove a disconnected client
   * 
   * @param sessionId - The session ID
   * @param clientId - The client ID to remove
   */
  private removeClient(sessionId: number, clientId: string): void {
    const sessionClients = this.clients.get(sessionId);
    if (!sessionClients) return;

    // Find and remove the client
    for (const client of sessionClients) {
      if (client.clientId === clientId) {
        sessionClients.delete(client);
        this.logger.log(
          `Client ${clientId} disconnected from session ${sessionId} ` +
          `(${sessionClients.size} remaining)`
        );
        break;
      }
    }

    // Clean up empty session
    if (sessionClients.size === 0) {
      this.clients.delete(sessionId);
      this.logger.log(`No more clients for session ${sessionId}, cleaned up`);
    }
  }

  /**
   * Send initial visualization snapshot to a client
   * 
   * @param clientId - The client ID
   * @param data - Visualization data to send
   */
  sendSnapshot(clientId: string, data: unknown): void {
    const client = this.findClient(clientId);
    if (!client) {
      this.logger.warn(`Cannot send snapshot: client ${clientId} not found`);
      return;
    }

    this.sendEvent(client.response, "visualization.snapshot", data);
    this.logger.debug(`Sent snapshot to client ${clientId}`);
  }

  /**
   * Listen for visualization.updated events and broadcast to subscribed clients
   * 
   * @param event - The visualization update event
   */
  @OnEvent("visualization.updated")
  handleVisualizationUpdate(event: VisualizationUpdatedEvent): void {
    const sessionClients = this.clients.get(event.sessionId);
    if (!sessionClients || sessionClients.size === 0) {
      return; // No clients subscribed to this session
    }

    this.logger.debug(
      `Broadcasting update for viz ${event.visualizationId} in session ${event.sessionId} ` +
      `to ${sessionClients.size} clients`
    );

    // Broadcast to all clients for this session
    for (const client of sessionClients) {
      this.sendEvent(client.response, "visualization.updated", {
        visualizationId: event.visualizationId,
        fromSequence: event.fromSequence,
        toSequence: event.toSequence,
        splits: event.splits,
        splitDiffs: event.splitDiffs,
        basisSplitIndices: event.basisSplitIndices,
        timestamp: event.timestamp,
      });
    }
  }

  /**
   * Listen for session.statusChanged events and broadcast to subscribed clients
   * 
   * @param event - The session status change event
   */
  @OnEvent("session.statusChanged")
  handleSessionStatusChange(event: SessionStatusChangedEvent): void {
    const sessionClients = this.clients.get(event.sessionId);
    if (!sessionClients || sessionClients.size === 0) {
      return; // No clients subscribed to this session
    }

    this.logger.log(
      `Session ${event.sessionId} status changed to ${event.isOpen ? 'open' : 'closed'}. ` +
      `Notifying ${sessionClients.size} connected clients`
    );

    // Broadcast to all clients for this session
    for (const client of sessionClients) {
      this.sendEvent(client.response, "session.statusChanged", {
        isOpen: event.isOpen,
        timestamp: event.timestamp,
      });

      // If session was closed, close the client connection
      if (!event.isOpen) {
        this.logger.debug(`Closing connection for client ${client.clientId} (session closed)`);
        client.response.end();
      }
    }

    // If session was closed, remove all clients from memory
    if (!event.isOpen) {
      this.clients.delete(event.sessionId);
      this.logger.log(`Removed all clients for closed session ${event.sessionId}`);
    }
  }

  /**
   * Send an SSE event to a client
   * 
   * @param res - Express Response object
   * @param eventName - Name of the event
   * @param data - Data to send (will be JSON stringified)
   */
  private sendEvent(res: Response, eventName: string, data: unknown): void {
    try {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      this.logger.error(
        `Failed to send event ${eventName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Find a client by ID across all sessions
   * 
   * @param clientId - The client ID to find
   * @returns The client or undefined
   */
  private findClient(clientId: string): StreamClient | undefined {
    for (const sessionClients of this.clients.values()) {
      for (const client of sessionClients) {
        if (client.clientId === clientId) {
          return client;
        }
      }
    }
    return undefined;
  }

  /**
   * Generate a unique client ID
   * 
   * @returns Random client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get statistics about connected clients
   */
  getStats() {
    const stats = {
      totalClients: 0,
      sessions: [] as Array<{ sessionId: number; clientCount: number }>,
    };

    for (const [sessionId, sessionClients] of this.clients.entries()) {
      stats.totalClients += sessionClients.size;
      stats.sessions.push({
        sessionId,
        clientCount: sessionClients.size,
      });
    }

    return stats;
  }
}
