import { Injectable, Inject, Logger } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../database/database.providers";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { sessionVisualizations, sessions } from "shared-schemas";
import type { SplitWithSegmentGroup, SegmentVizConfig, ViewMaps, VisualizationLookupMaps } from "shared-types";

import type { GridLabelsDisplay, ViewIdLookup } from "shared-types";

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
  gridLabels: Record<string, GridLabelsDisplay>; // Grid labels per viewId
  viewIdLookup: ViewIdLookup; // Map from active questions to viewId
  vizWidth: number; // Canvas width in abstract units
  vizHeight: number; // Canvas height in abstract units
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

    // DEBUG: Verify incoming splits before caching
    const hasNullsInUpdate = splits.some(split =>
      split.points.some(pointGroup => pointGroup.some(p => p === null))
    );

    this.logger.debug(
      `[CACHE->UPDATE] Updating viz ${visualizationId} in cache: hasNulls=${hasNullsInUpdate}`
    );

    if (hasNullsInUpdate) {
      this.logger.error(
        `[CACHE->UPDATE] RECEIVING SPLITS WITH NULL POINTS FOR CACHING! ` +
        `First split sample: ${JSON.stringify(splits[0]?.points.map(pg => pg.slice(0, 2)))}`
      );
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

      // DEBUG: Verify loaded splits structure from DB
      const loadedSplits = vizDbData.splits || [];
      this.logger.debug(`[DB->LOAD] Loaded viz ${viz.id} from DB for session ${sessionId}`);

      // Check if DB persisted nulls (which shouldn't happen)

      if (loadedSplits.length > 0) {
        const firstSplit = loadedSplits[0];
        const pointsContainsNull = firstSplit.points?.some(pg => pg?.some(p => p === null));

        this.logger.debug(
          `[DB->LOAD] First split structure: ${JSON.stringify({
            hasPoints: !!firstSplit.points,
            pointsArrayLength: firstSplit.points?.length,
            pointsPerGroup: firstSplit.points?.map(pg => pg?.length),
            samplePoints: firstSplit.points?.map(pg => pg?.[0] || null),
            pointsContainsNull
          }, null, 2)}`
        );

        if (pointsContainsNull) {
          this.logger.error(`[DB->LOAD] LOADED SPLITS WITH NULL POINTS FROM DATABASE!`);
          this.logger.debug(`[DB->LOAD] Cleaned ${loadedSplits.length} splits to remove nulls`);
        }

        // Check responseGroups.expanded pointPositions
        if (firstSplit.responseGroups?.expanded) {
          firstSplit.responseGroups.expanded.forEach((rg, idx) => {
            if (rg.pointPositions && rg.pointPositions.length > 0) {
              const firstPos = rg.pointPositions[0];
              this.logger.debug(
                `[DB->LOAD] Expanded group ${idx} first pointPosition: ${JSON.stringify({
                  hasPoint: !!firstPos?.point,
                  pointFields: firstPos?.point ? Object.keys(firstPos.point) : null,
                  point: firstPos?.point
                })}`
              );
            }
          });
        }
      }

      visualizations.set(viz.id, {
        visualizationId: viz.id,
        config,
        basisSplitIndices: vizDbData.basisSplitIndices || [],
        splits: loadedSplits,
        lookupMaps: vizDbData.lookupMaps || {
          responseIndexToGroupIndex: {},
          profileToSplitIndex: {},
        },
        viewMaps: vizDbData.viewMaps || {},
        gridLabels: (vizDbData.gridLabels as Record<string, GridLabelsDisplay> | null) || {},
        viewIdLookup: (vizDbData.viewIdLookup as ViewIdLookup | null) || [],
        vizWidth: vizDbData.vizWidth,
        vizHeight: vizDbData.vizHeight,
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
   * Clean null Points from splits data loaded from JSONB.
   * PostgreSQL JSONB serialization can introduce nulls where undefined values existed.
   * 
   * @param splits - Raw splits data from database
   * @returns Cleaned splits with null Points filtered out
   */
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
          // DEBUG: Check what we're about to persist
          const hasNulls = vizState.splits.some(split =>
            split.points.some(pointGroup => pointGroup.some(p => p === null))
          );

          this.logger.debug(
            `[CACHE->DB] About to persist viz ${vizId}: hasNulls=${hasNulls}`
          );

          if (hasNulls) {
            this.logger.error(
              `[CACHE->DB] PERSISTING SPLITS WITH NULL POINTS! ` +
              `Session ${sessionId}, Viz ${vizId}`
            );
          }

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
