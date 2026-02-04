import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Res,
  NotFoundException,
} from "@nestjs/common";
import { Response } from "express";
import { VisualizationStreamService } from "./visualization-stream.service";
import { ResponsesService } from "./responses.service";

/**
 * VisualizationStreamController handles SSE endpoints for real-time
 * visualization updates.
 * 
 * Clients connect to the stream endpoint and receive:
 * 1. Initial snapshot of current visualization state
 * 2. Ongoing updates as responses are processed
 */
@Controller("visualizations")
export class VisualizationStreamController {
  constructor(
    private readonly streamService: VisualizationStreamService,
    private readonly responsesService: ResponsesService
  ) { }

  /**
   * Establish SSE connection for visualization updates
   * 
   * GET /visualizations/session/:sessionId/stream
   * 
   * @param sessionId - The session ID to subscribe to
   * @param res - Express Response (kept open for SSE)
   */
  @Get("session/:sessionId/stream")
  async streamVisualizationUpdates(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Res() res: Response
  ): Promise<void> {
    // Validate session exists and get current visualization data
    let visualizationData;
    let session;
    try {
      visualizationData = await this.responsesService.getVisualizationData(sessionId, true);
      session = await this.responsesService.getSession(sessionId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: `Session ${sessionId} not found` });
        return;
      }
      throw error;
    }

    // Register client for SSE streaming
    const clientId = this.streamService.addClient(sessionId, res);

    // Send initial snapshot with isOpen flag
    this.streamService.sendSnapshot(clientId, {
      sessionId,
      isOpen: session.isOpen,
      visualizations: visualizationData,
      timestamp: new Date(),
    });

    // If session is closed, close the connection after sending snapshot
    if (!session.isOpen) {
      res.write(":closing - session is closed\n\n");
      res.end();
      return;
    }

    // Keep connection alive with periodic heartbeat (only for open sessions)
    const heartbeat = setInterval(() => {
      res.write(":heartbeat\n\n");
    }, 30000); // Every 30 seconds

    // Cleanup on disconnect
    res.on("close", () => {
      clearInterval(heartbeat);
    });
  }

  /**
   * Get statistics about connected clients (for monitoring)
   * 
   * GET /visualizations/stream/stats
   */
  @Get("stream/stats")
  getStreamStats() {
    return this.streamService.getStats();
  }
}
