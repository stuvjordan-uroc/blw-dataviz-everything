import {
  Injectable,
  Inject,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DATABASE_CONNECTION } from "../database/database.providers";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import {
  sessions,
  pollQuestions,
  respondents,
  responses,
  sessionVisualizations,
} from "shared-schemas";
import type { InferSelectModel } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { initializeSplitsWithSegments } from "shared-computation";
import type {
  SegmentVizConfig,
  SplitWithSegmentGroup,
  CreateSessionDto,
  Session,
  GetAllSessionsResponse,
  VisualizationLookupMaps,
} from "shared-types";
import { validateSessionConfig } from "./validate-session-config";

/**
 * Type definitions for database operations
 * These are automatically inferred from the Drizzle schema
 */
type DbSession = InferSelectModel<typeof sessions>;

/**
 * SessionsService handles all business logic for poll sessions
 *
 * @Injectable() makes this class available for dependency injection.
 * Other classes can request this service in their constructor.
 *
 * This service:
 * - Creates new poll sessions with configuration
 * - Retrieves sessions (all or by ID)
 * - Updates existing sessions
 * - Deletes sessions
 */
@Injectable()
export class SessionsService {
  /**
   * Constructor with dependency injection
   *
   * @Inject(DATABASE_CONNECTION) tells NestJS to inject the database
   * that we set up in DatabaseModule.
   *
   * The 'private' keyword makes it available as this.db throughout the class
   */
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: ReturnType<typeof drizzle>,
    private eventEmitter: EventEmitter2
  ) { }

  /**
   * Generate a unique URL-friendly slug for a session
   * Uses nanoid with URL-safe characters (lowercase letters and numbers)
   *
   * @returns A unique 10-character slug
   */
  private generateSlug(): string {
    // Use only lowercase letters and numbers for clean URLs
    const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);
    return nanoid();
  }

  /**
   * Generate a unique ID for a visualization
   * Uses nanoid with URL-safe characters
   *
   * @returns A unique 8-character visualization ID with viz_ prefix
   */
  private generateVizId(): string {
    const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);
    return `viz_${nanoid()}`;
  }

  /**
   * Create a new poll session
   *
   * @param dto - The session configuration and metadata
   * @returns The newly created session with its ID and generated slug
   */
  async create(dto: CreateSessionDto): Promise<Session> {
    return await this.db.transaction(async (tx) => {
      // Generate a unique slug if not provided
      const slug = dto.slug || this.generateSlug();

      // Extract configuration (store Question keys as-is, don't expand)
      const questionOrder = dto.sessionConfig.questionOrder;
      const visualizationsInput = dto.sessionConfig.visualizations;

      // Generate IDs for visualizations
      const visualizations = visualizationsInput.map((viz) => ({
        id: this.generateVizId(),
        ...viz,
      }));

      // Validate the session configuration (consolidated validation)
      await validateSessionConfig(
        { questionOrder, visualizations },
        tx
      );

      // Insert the session with generated slug and updated config with visualization IDs
      const [dbSession] = await tx
        .insert(sessions)
        .values({
          description: dto.description,
          slug,
          sessionConfig: {
            questionOrder,
            visualizations,
          },
          isOpen: true, // New sessions start as open by default
        })
        .returning();

      // Populate polls.questions with all questions for this session
      if (questionOrder.length > 0) {
        const pollQuestionsData = questionOrder.map((q, index) => ({
          sessionId: dbSession.id,
          varName: q.varName,
          batteryName: q.batteryName,
          subBattery: q.subBattery,
          orderingIndex: index,
        }));

        await tx.insert(pollQuestions).values(pollQuestionsData);
      }

      // Initialize and store visualizations
      for (const viz of visualizations) {
        const { id, ...vizConfig } = viz;

        // Initialize the visualization with empty data
        const { basisSplitIndices, splits, viewMaps, vizWidth, vizHeight } = initializeSplitsWithSegments(vizConfig);

        // Build pre-computed lookup maps for efficient response transformation
        const lookupMaps = this.buildLookupMaps(vizConfig, splits, basisSplitIndices);


        // Store the initialized visualization with lookup maps and view maps
        await tx.insert(sessionVisualizations).values({
          sessionId: dbSession.id,
          visualizationId: id,
          basisSplitIndices,
          splits,
          viewMaps,
          lookupMaps,
          vizWidth,
          vizHeight,
        });
      }

      // Map database session to API contract Session type
      return this.mapDbSessionToSession(dbSession);
    });
  }

  /**
   * Get all sessions
   *
   * @returns All sessions response with array of sessions
   */
  async findAll(): Promise<GetAllSessionsResponse> {
    const dbSessions = await this.db.select().from(sessions);
    return {
      sessions: dbSessions.map(s => this.mapDbSessionToSession(s)),
    };
  }

  /**
   * Get a specific session by ID
   *
   * @param id - The session ID
   * @returns The session if found
   * @throws NotFoundException if session doesn't exist
   */
  async findOne(id: number): Promise<Session> {
    const [dbSession] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id));

    if (!dbSession) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    return this.mapDbSessionToSession(dbSession);
  }

  /**
   * Delete a session and all associated data
   *
   * Cascades delete to:
   * - polls.session_statistics
   * - polls.responses (via respondents)
   * - polls.respondents
   * - polls.questions
   *
   * @param id - The session ID to delete
   * @throws NotFoundException if session doesn't exist
   */
  async remove(id: number): Promise<void> {
    // First check if session exists
    await this.findOne(id);

    // Delete session and all associated data in a transaction
    await this.db.transaction(async (tx) => {
      // 1. Delete session visualizations (references sessions.id)
      await tx
        .delete(sessionVisualizations)
        .where(eq(sessionVisualizations.sessionId, id));

      // 2. Get all respondent IDs for this session
      const sessionRespondents = await tx
        .select({ id: respondents.id })
        .from(respondents)
        .where(eq(respondents.sessionId, id));

      const respondentIds = sessionRespondents.map((r) => r.id);

      // 3. Delete responses (references respondents.id)
      if (respondentIds.length > 0) {
        await tx
          .delete(responses)
          .where(inArray(responses.respondentId, respondentIds));
      }

      // 4. Delete respondents (references sessions.id)
      await tx.delete(respondents).where(eq(respondents.sessionId, id));

      // 5. Delete questions (references sessions.id)
      await tx.delete(pollQuestions).where(eq(pollQuestions.sessionId, id));

      // 6. Finally delete the session itself
      await tx.delete(sessions).where(eq(sessions.id, id));
    });
  }

  /**
   * Toggle session status between open and closed
   *
   * @param id - The session ID
   * @param isOpen - Whether the session should be open (true) or closed (false)
   * @returns The updated session
   * @throws NotFoundException if session doesn't exist
   */
  async toggleStatus(id: number, isOpen: boolean): Promise<Session> {
    // Ensure session exists
    const existingSession = await this.findOne(id);

    // Only emit event if status is actually changing
    const statusChanged = existingSession.isOpen !== isOpen;

    // Update session status
    const [dbUpdatedSession] = await this.db
      .update(sessions)
      .set({ isOpen })
      .where(eq(sessions.id, id))
      .returning();

    // Emit event for public API to notify connected clients
    if (statusChanged) {
      this.eventEmitter.emit('session.statusChanged', {
        sessionId: id,
        isOpen,
        timestamp: new Date(),
      });
    }

    return this.mapDbSessionToSession(dbUpdatedSession);
  }

  /**
   * Build pre-computed lookup maps for efficient response transformation.
   * 
   * These maps eliminate expensive O(n) and O(b×k×g) operations during
   * response processing by pre-computing them at session creation time.
   * 
   * @param vizConfig - The visualization configuration
   * @param splits - The initialized splits
   * @param basisSplitIndices - Indices of basis splits
   * @returns Pre-computed lookup maps
   */
  private buildLookupMaps(
    vizConfig: SegmentVizConfig,
    splits: SplitWithSegmentGroup[],
    basisSplitIndices: number[]
  ): VisualizationLookupMaps {
    return {
      responseIndexToGroupIndex: this.buildResponseIndexMap(vizConfig),
      profileToSplitIndex: this.buildProfileMap(vizConfig, splits, basisSplitIndices),
    };
  }

  /**
   * Build map from response index to expanded response group index.
   * 
   * Example: If response groups are [[0,1], [2,3], [4]], this returns:
   * {0: 0, 1: 0, 2: 1, 3: 1, 4: 2}
   * 
   * @param vizConfig - The visualization configuration
   * @returns Map from response index to group index
   */
  private buildResponseIndexMap(vizConfig: SegmentVizConfig): Record<number, number> {
    const map: Record<number, number> = {};

    vizConfig.responseQuestion.responseGroups.expanded.forEach((group, groupIdx) => {
      group.values.forEach(responseIdx => {
        map[responseIdx] = groupIdx;
      });
    });

    return map;
  }

  /**
   * Build map from respondent group profile to basis split index.
   * 
   * The profile key is a colon-separated string where each position
   * represents the response group index for a grouping question (or "null").
   * 
   * Example: "0:1:null:2" means:
   * - First grouping question: response group 0
   * - Second grouping question: response group 1
   * - Third grouping question: no answer (null)
   * - Fourth grouping question: response group 2
   * 
   * @param vizConfig - The visualization configuration
   * @param splits - All splits
   * @param basisSplitIndices - Indices of basis splits
   * @returns Map from profile key to basis split index
   */
  private buildProfileMap(
    vizConfig: SegmentVizConfig,
    splits: SplitWithSegmentGroup[],
    basisSplitIndices: number[]
  ): Record<string, number> {
    const map: Record<string, number> = {};
    const allGroupingQuestions = [
      ...vizConfig.groupingQuestions.x,
      ...vizConfig.groupingQuestions.y,
    ];

    // For each basis split, compute its profile key
    for (const splitIdx of basisSplitIndices) {
      const split = splits[splitIdx];
      const profileParts: string[] = [];

      // Build profile key from the split's groups
      for (const gq of allGroupingQuestions) {
        const splitGroup = split.groups.find(
          (g) =>
            g.question.varName === gq.question.varName &&
            g.question.batteryName === gq.question.batteryName &&
            g.question.subBattery === gq.question.subBattery
        );

        if (!splitGroup || !splitGroup.responseGroup) {
          profileParts.push("null");
        } else {
          // Find which response group index this is
          const responseGroupIdx = gq.responseGroups.findIndex(
            (rg) =>
              rg.values.length === splitGroup.responseGroup!.values.length &&
              rg.values.every((v) => splitGroup.responseGroup!.values.includes(v))
          );
          profileParts.push(responseGroupIdx.toString());
        }
      }

      const profileKey = profileParts.join(":");
      map[profileKey] = splitIdx;
    }

    return map;
  }

  /**
   * Map database session to API contract Session type.
   * 
   * This provides a clean separation between database representation
   * and API contract, allowing us to evolve either independently.
   * 
   * @param dbSession - Session from database
   * @returns Session in API contract format
   */
  private mapDbSessionToSession(dbSession: DbSession): Session {
    return {
      id: dbSession.id,
      slug: dbSession.slug,
      isOpen: dbSession.isOpen,
      description: dbSession.description,
      createdAt: dbSession.createdAt!,
      sessionConfig: dbSession.sessionConfig,
    };
  }
}
