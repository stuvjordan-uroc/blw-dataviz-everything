import { Injectable, Inject, Logger } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../database/database.providers";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { sessionVisualizations, sessions, VisualizationLookupMaps } from "shared-schemas";
import type { SplitWithSegmentGroup, SegmentVizConfig, ViewMaps } from "shared-computation";

/**
 * State for a single visualization in memory
 */
interface VisualizationState {
  visualizationId: string;
  config: SegmentVizConfig;
  basisSplitIndices: number[];
  splits: SplitWithSegmentGroup[];
  lookupMaps: VisualizationLookupMaps;
  viewMaps: ViewMaps; // Precomputed view mappings for client-side view switching
  sequenceNumber: number;
  lastUpdated: Date;
}

/**
 * State for all visualizations in a session
 */
interface SessionVizState {
  sessionId: number;
  visualizations: Map<string, VisualizationState>;
  inactivityTimer?: NodeJS.Timeout;
}

/**
 * VisualizationCacheService manages in-memory visualization state for active sessions.
 * 
 * Features:
 * - Wake-up: Loads visualization data from DB on first access
 * - Sleep: Persists data to DB and clears memory after inactivity
 * - Inactivity timeout: Configurable period (default 60s)
 */
@Injectable()
export class VisualizationCacheService {
  private readonly logger = new Logger(VisualizationCacheService.name);
  private sessions: Map<number, SessionVizState> = new Map();

  // Configurable inactivity timeout in milliseconds (default: 60 seconds)
  private readonly INACTIVITY_TIMEOUT = 60000;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: ReturnType<typeof drizzle>
  ) { }

  /**
   * Get visualizations for a session. Loads from DB if not in memory.
   * Resets inactivity timer.
   * 
   * @param sessionId - The session ID
   * @returns Map of visualization ID to visualization state
   */
  async getVisualizationsForSession(
    sessionId: number
  ): Promise<Map<string, VisualizationState>> {
    let sessionState = this.sessions.get(sessionId);

    if (!sessionState) {
      // Wake up: load from database
      this.logger.log(`Waking up session ${sessionId} visualizations`);
      sessionState = await this.loadSessionFromDB(sessionId);
      this.sessions.set(sessionId, sessionState);
    }

    // Reset inactivity timer
    this.resetInactivityTimer(sessionId);

    return sessionState.visualizations;
  }

  /**
   * Update visualization state in memory
   * 
   * @param sessionId - The session ID
   * @param visualizationId - The visualization ID
   * @param splits - Updated splits
   * @param basisSplitIndices - Updated basis split indices
   * @returns New sequence number after update
   */
  updateVisualization(
    sessionId: number,
    visualizationId: string,
    splits: SplitWithSegmentGroup[],
    basisSplitIndices: number[]
  ): number {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      this.logger.warn(
        `Attempted to update visualization ${visualizationId} for session ${sessionId} which is not in cache`
      );
      return;
    }

    const vizState = sessionState.visualizations.get(visualizationId);
    if (!vizState) {
      this.logger.warn(
        `Visualization ${visualizationId} not found in session ${sessionId}`
      );
      return;
    }

    vizState.splits = splits;
    vizState.basisSplitIndices = basisSplitIndices;
    vizState.sequenceNumber++;
    vizState.lastUpdated = new Date();

    this.resetInactivityTimer(sessionId);
    return vizState.sequenceNumber;
  }

  /**
   * Load session visualizations from database
   * 
   * @param sessionId - The session ID
   * @returns Session visualization state
   */
  private async loadSessionFromDB(
    sessionId: number
  ): Promise<SessionVizState> {
    // Load session config to get visualization configs
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!session || !session.sessionConfig) {
      throw new Error(`Session ${sessionId} not found or has no config`);
    }

    // Load visualization data from DB
    const vizData = await this.db
      .select()
      .from(sessionVisualizations)
      .where(eq(sessionVisualizations.sessionId, sessionId));

    const visualizations = new Map<string, VisualizationState>();

    for (const viz of session.sessionConfig.visualizations) {
      const vizDbData = vizData.find(
        (v) => v.visualizationId === viz.id
      );

      if (!vizDbData) {
        this.logger.warn(
          `Visualization ${viz.id} not found in DB for session ${sessionId}`
        );
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...config } = viz;
      visualizations.set(viz.id, {
        visualizationId: viz.id,
        config,
        basisSplitIndices: vizDbData.basisSplitIndices || [],
        splits: vizDbData.splits || [],
        lookupMaps: vizDbData.lookupMaps || {
          responseIndexToGroupIndex: {},
          profileToSplitIndex: {},
        },
        viewMaps: vizDbData.viewMaps || {},
        sequenceNumber: 0,
        lastUpdated: vizDbData.computedAt || new Date(),
      });
    }

    return {
      sessionId,
      visualizations,
    };
  }

  /**
   * Reset the inactivity timer for a session
   * 
   * @param sessionId - The session ID
   */
  private resetInactivityTimer(sessionId: number): void {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) return;

    // Clear existing timer
    if (sessionState.inactivityTimer) {
      clearTimeout(sessionState.inactivityTimer);
    }

    // Set new timer
    sessionState.inactivityTimer = setTimeout(() => {
      this.sleepSession(sessionId);
    }, this.INACTIVITY_TIMEOUT);
  }

  /**
   * Persist session visualizations to DB and clear from memory
   * 
   * @param sessionId - The session ID
   */
  private async sleepSession(sessionId: number): Promise<void> {
    this.logger.log(`Putting session ${sessionId} to sleep`);

    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) return;

    // Clear timer
    if (sessionState.inactivityTimer) {
      clearTimeout(sessionState.inactivityTimer);
    }

    try {
      // Persist all visualizations to DB
      await this.db.transaction(async (tx) => {
        for (const [vizId, vizState] of sessionState.visualizations) {
          await tx
            .update(sessionVisualizations)
            .set({
              basisSplitIndices: vizState.basisSplitIndices,
              splits: vizState.splits,
              computedAt: new Date(),
            })
            .where(
              eq(sessionVisualizations.sessionId, sessionId) &&
              eq(sessionVisualizations.visualizationId, vizId)
            );
        }
      });

      this.logger.log(`Successfully persisted session ${sessionId} to DB`);
    } catch (error) {
      this.logger.error(
        `Failed to persist session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined
      );
    } finally {
      // Remove from memory regardless of persistence success
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Manually force a session to sleep (useful for testing or manual cleanup)
   * 
   * @param sessionId - The session ID
   */
  async forceSleep(sessionId: number): Promise<void> {
    await this.sleepSession(sessionId);
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      activeSessions: this.sessions.size,
      sessions: Array.from(this.sessions.entries()).map(([id, state]) => ({
        sessionId: id,
        visualizationCount: state.visualizations.size,
        visualizations: Array.from(state.visualizations.values()).map((v) => ({
          id: v.visualizationId,
          lastUpdated: v.lastUpdated,
          splitCount: v.splits.length,
        })),
      })),
    };
  }
}
