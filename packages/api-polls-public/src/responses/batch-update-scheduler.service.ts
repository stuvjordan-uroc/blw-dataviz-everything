import { Injectable, Logger, Inject } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { VisualizationCacheService } from "./visualization-cache.service";
import { ResponseTransformer, RespondentResponses } from "./response-transformer.service";
import { updateAllSplitsWithSegmentsFromResponses } from "shared-computation";
import type { SplitWithSegmentGroup, SplitWithSegmentGroupDiff } from "shared-computation";

/**
 * Injection token for batch update interval
 */
export const BATCH_INTERVAL_TOKEN = 'BATCH_UPDATE_INTERVAL_MS';

/**
 * Event emitted when visualizations are updated
 */
export interface VisualizationUpdatedEvent {
  sessionId: number;
  visualizationId: string;
  fromSequence: number;
  toSequence: number;
  splits: SplitWithSegmentGroup[];
  splitDiffs: SplitWithSegmentGroupDiff[];
  basisSplitIndices: number[];
  timestamp: Date;
}

/**
 * BatchUpdateScheduler queues incoming responses and triggers batch updates
 * at fixed intervals.
 * 
 * Features:
 * - Queues responses by session + visualization
 * - Triggers batch update every N seconds (default 3s)
 * - Emits events when visualizations are updated
 * - Handles update errors gracefully
 */
@Injectable()
export class BatchUpdateScheduler {
  private readonly logger = new Logger(BatchUpdateScheduler.name);

  // Queue: Map<sessionId, Map<visualizationId, responses[]>>
  private queue: Map<number, Map<string, RespondentResponses[]>> = new Map();

  // Batch update interval in milliseconds (configurable via BATCH_UPDATE_INTERVAL_MS env var, default: 3000)
  private readonly BATCH_INTERVAL: number;

  // Interval timer
  private batchTimer?: NodeJS.Timeout;

  constructor(
    private visualizationCache: VisualizationCacheService,
    private responseTransformer: ResponseTransformer,
    private eventEmitter: EventEmitter2,
    @Inject(BATCH_INTERVAL_TOKEN) batchInterval: number,
  ) {
    this.BATCH_INTERVAL = batchInterval;
    this.startBatchTimer();
  }

  /**
   * Manually trigger batch processing immediately.
   * Useful for testing without waiting for the timer.
   */
  async processBatchNow(): Promise<void> {
    return this.processBatch();
  }

  /**
   * Add responses to the queue
   * 
   * @param sessionId - The session ID
   * @param visualizationIds - Array of visualization IDs to update
   * @param responses - The respondent responses
   */
  queueResponses(
    sessionId: number,
    visualizationIds: string[],
    responses: RespondentResponses[]
  ): void {
    let sessionQueue = this.queue.get(sessionId);

    if (!sessionQueue) {
      sessionQueue = new Map();
      this.queue.set(sessionId, sessionQueue);
    }

    for (const vizId of visualizationIds) {
      let vizQueue = sessionQueue.get(vizId);

      if (!vizQueue) {
        vizQueue = [];
        sessionQueue.set(vizId, vizQueue);
      }

      vizQueue.push(...responses);
    }

    this.logger.debug(
      `Queued ${responses.length} responses for session ${sessionId}, ` +
      `${visualizationIds.length} visualizations`
    );
  }

  /**
   * Start the batch update timer
   */
  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, this.BATCH_INTERVAL);

    this.logger.log(`Batch update timer started (interval: ${this.BATCH_INTERVAL}ms)`);
  }

  /**
   * Process all queued updates
   */
  private async processBatch(): Promise<void> {
    if (this.queue.size === 0) {
      return; // Nothing to process
    }

    this.logger.debug(`Processing batch with ${this.queue.size} sessions`);

    // Take a snapshot of the queue and clear it
    const queueSnapshot = new Map(this.queue);
    this.queue.clear();

    // Process each session's visualizations
    for (const [sessionId, sessionQueue] of queueSnapshot) {
      for (const [vizId, responses] of sessionQueue) {
        try {
          await this.processVisualizationUpdate(sessionId, vizId, responses);
        } catch (error) {
          this.logger.error(
            `Failed to process visualization ${vizId} for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error.stack : undefined
          );
        }
      }
    }
  }

  /**
   * Process updates for a single visualization
   * 
   * @param sessionId - The session ID
   * @param visualizationId - The visualization ID
   * @param responses - Queued responses
   */
  private async processVisualizationUpdate(
    sessionId: number,
    visualizationId: string,
    responses: RespondentResponses[]
  ): Promise<void> {
    this.logger.debug(
      `Processing ${responses.length} responses for viz ${visualizationId}, session ${sessionId}`
    );

    // Get current visualization state from cache
    const visualizations = await this.visualizationCache.getVisualizationsForSession(
      sessionId
    );

    const vizState = visualizations.get(visualizationId);
    if (!vizState) {
      this.logger.warn(
        `Visualization ${visualizationId} not found in session ${sessionId}`
      );
      return;
    }

    // Transform responses
    const transformedResponses = this.responseTransformer.transformResponsesForVisualization(
      responses,
      vizState.config,
      vizState.splits,
      vizState.basisSplitIndices,
      vizState.lookupMaps
    );

    if (transformedResponses.length === 0) {
      this.logger.debug(`No valid responses to process for viz ${visualizationId}`);
      return;
    }

    this.logger.debug(
      `Transformed ${transformedResponses.length}/${responses.length} responses`
    );

    // Capture current sequence before update
    const fromSequence = vizState.sequenceNumber;

    // Update visualizations
    const updatedSplitsWithDiffs = updateAllSplitsWithSegmentsFromResponses(
      vizState.splits,
      vizState.basisSplitIndices,
      transformedResponses,
      vizState.config
    );

    // Extract splits and diffs
    const updatedSplits = updatedSplitsWithDiffs.map(([split]) => split);
    const splitDiffs = updatedSplitsWithDiffs.map(([, diff]) => diff);

    // Update cache and get new sequence number
    const toSequence = this.visualizationCache.updateVisualization(
      sessionId,
      visualizationId,
      updatedSplits,
      vizState.basisSplitIndices
    );

    // Emit event with both full state and diffs
    this.eventEmitter.emit("visualization.updated", {
      sessionId,
      visualizationId,
      fromSequence,
      toSequence,
      splits: updatedSplits,
      splitDiffs,
      basisSplitIndices: vizState.basisSplitIndices,
      timestamp: new Date(),
    } as VisualizationUpdatedEvent);

    this.logger.log(
      `Updated visualization ${visualizationId} for session ${sessionId} ` +
      `with ${transformedResponses.length} responses`
    );
  }

  /**
   * Get queue statistics for monitoring
   */
  getQueueStats() {
    const stats: {
      totalSessions: number;
      sessions: Array<{
        sessionId: number;
        visualizations: Array<{ visualizationId: string; responseCount: number }>;
        totalResponses: number;
      }>;
      totalResponses: number;
    } = {
      totalSessions: this.queue.size,
      sessions: [],
      totalResponses: 0,
    };

    for (const [sessionId, sessionQueue] of this.queue) {
      const sessionStats = {
        sessionId,
        visualizations: [] as Array<{ visualizationId: string; responseCount: number }>,
        totalResponses: 0,
      };

      for (const [vizId, responses] of sessionQueue) {
        sessionStats.visualizations.push({
          visualizationId: vizId,
          responseCount: responses.length,
        });
        sessionStats.totalResponses += responses.length;
      }

      stats.sessions.push(sessionStats);
      stats.totalResponses += sessionStats.totalResponses;
    }

    return stats;
  }

  /**
   * Force immediate batch processing (useful for testing)
   */
  async forceProcessBatch(): Promise<void> {
    await this.processBatch();
  }

  /**
   * Cleanup on service destruction
   */
  onModuleDestroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.logger.log("Batch update timer stopped");
    }
  }
}
