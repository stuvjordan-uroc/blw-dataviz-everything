import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ResponsesService, SubmitResponsesDto } from "./responses.service";
import { BatchUpdateScheduler } from "./batch-update-scheduler.service";
import { VisualizationCacheService } from "./visualization-cache.service";

/**
 * ResponsesController handles HTTP endpoints for poll responses.
 * 
 * No authentication required - this is a public API for poll submissions.
 */
@Controller("responses")
export class ResponsesController {
  constructor(
    private readonly responsesService: ResponsesService,
    private readonly batchScheduler: BatchUpdateScheduler,
    private readonly visualizationCache: VisualizationCacheService
  ) { }

  /**
   * Submit responses for a poll session
   * 
   * POST /responses
   * 
   * @param dto - The submission data
   * @returns The respondent ID
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async submitResponses(@Body() dto: SubmitResponsesDto) {
    return this.responsesService.submitResponses(dto);
  }

  /**
   * Get all responses for a session
   * 
   * GET /responses/session/:sessionId
   * 
   * @param sessionId - The session ID
   * @returns Array of respondent responses
   */
  @Get("session/:sessionId")
  async getSessionResponses(
    @Param("sessionId", ParseIntPipe) sessionId: number
  ) {
    return this.responsesService.getSessionResponses(sessionId);
  }

  /**
   * Get session statistics
   * 
   * GET /responses/session/:sessionId/stats
   * 
   * @param sessionId - The session ID
   * @returns Session statistics
   */
  @Get("session/:sessionId/stats")
  async getSessionStats(
    @Param("sessionId", ParseIntPipe) sessionId: number
  ) {
    return this.responsesService.getSessionStats(sessionId);
  }

  /**
   * Get current visualization data for a session
   * 
   * GET /responses/session/:sessionId/visualizations
   * 
   * @param sessionId - The session ID
   * @returns Visualization data
   */
  @Get("session/:sessionId/visualizations")
  async getVisualizationData(
    @Param("sessionId", ParseIntPipe) sessionId: number
  ) {
    return this.responsesService.getVisualizationData(sessionId);
  }

  /**
   * Get batch update queue statistics (for monitoring)
   * 
   * GET /responses/monitoring/queue-stats
   * 
   * @returns Queue statistics
   */
  @Get("monitoring/queue-stats")
  async getQueueStats() {
    return this.batchScheduler.getQueueStats();
  }

  /**
   * Get visualization cache statistics (for monitoring)
   * 
   * GET /responses/monitoring/cache-stats
   * 
   * @returns Cache statistics
   */
  @Get("monitoring/cache-stats")
  async getCacheStats() {
    return this.visualizationCache.getCacheStats();
  }

  /**
   * Force immediate batch processing (for testing/debugging)
   * 
   * POST /responses/monitoring/force-batch
   */
  @Post("monitoring/force-batch")
  @HttpCode(HttpStatus.OK)
  async forceBatchProcessing() {
    await this.batchScheduler.forceProcessBatch();
    return { message: "Batch processing triggered" };
  }

  /**
   * Force a session to sleep (for testing/debugging)
   * 
   * POST /responses/monitoring/force-sleep/:sessionId
   * 
   * @param sessionId - The session ID
   */
  @Post("monitoring/force-sleep/:sessionId")
  @HttpCode(HttpStatus.OK)
  async forceSleep(@Param("sessionId", ParseIntPipe) sessionId: number) {
    await this.visualizationCache.forceSleep(sessionId);
    return { message: `Session ${sessionId} put to sleep` };
  }
}
