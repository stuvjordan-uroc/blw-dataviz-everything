import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { DATABASE_CONNECTION } from "../database/database.providers";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import {
  sessions,
  pollQuestions,
  respondents,
  responses,
  sessionStatistics,
  outboxEvents,
  questions,
  sessionConfigSchema,
} from "shared-schemas";
import {
  sessionCreatedSchema,
  sessionStatusChangedSchema,
  sessionRemovedSchema,
} from "shared-broker";
import { Statistics, validateSegmentVizConfig } from "shared-computation";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { customAlphabet } from "nanoid";

/**
 * Type definitions for session operations
 * These are automatically inferred from the Drizzle schema
 */
type Session = InferSelectModel<typeof sessions>;
type NewSession = InferInsertModel<typeof sessions>;

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
    private db: ReturnType<typeof drizzle>
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
   * Create a new poll session
   *
   * @param sessionData - The session configuration and metadata
   * @returns The newly created session with its ID and generated slug
   */
  async create(sessionData: NewSession): Promise<Session> {
    // Stage 1: Zod validation for structure and basic constraints
    if (sessionData.sessionConfig) {
      sessionConfigSchema.parse(sessionData.sessionConfig);
    }

    // Stage 2: Deep semantic validation using shared-computation's validator
    if (sessionData.sessionConfig) {
      // Create temporary Statistics instance for validation
      const tempStats = new Statistics({
        responseQuestions: sessionData.sessionConfig.responseQuestions,
        groupingQuestions: sessionData.sessionConfig.groupingQuestions,
      });

      // Validate segmentVizConfig against the questions
      // This throws descriptive errors if invalid (duplicates, keys not matching, etc.)
      validateSegmentVizConfig(tempStats, sessionData.sessionConfig.segmentVizConfig);
    }

    return await this.db.transaction(async (tx) => {
      // Generate a unique slug if not provided
      const slug = sessionData.slug || this.generateSlug();

      // Extract all questions from sessionConfig
      const responseQuestions =
        sessionData.sessionConfig?.responseQuestions || [];
      const groupingQuestions =
        sessionData.sessionConfig?.groupingQuestions || [];
      const allQuestions = [...responseQuestions, ...groupingQuestions];

      // Require at least one response question
      if (responseQuestions.length === 0) {
        throw new BadRequestException(
          "Session must have at least one question in responseQuestions array"
        );
      }

      // Validate that all questions exist in questions.questions
      if (allQuestions.length > 0) {
        // Check if all questions exist
        const existingQuestions = await tx
          .select()
          .from(questions)
          .where(
            inArray(
              questions.varName,
              allQuestions.map((q) => q.varName)
            )
          );

        // Validate each question exists with exact match
        const missingQuestions = allQuestions.filter((q) => {
          return !existingQuestions.some(
            (eq) =>
              eq.varName === q.varName &&
              eq.batteryName === q.batteryName &&
              eq.subBattery === q.subBattery
          );
        });

        if (missingQuestions.length > 0) {
          throw new BadRequestException(
            `The following questions do not exist in the question bank: ${missingQuestions
              .map(
                (q) =>
                  `(varName: ${q.varName}, battery: ${q.batteryName
                  }, subBattery: ${q.subBattery || "(none)"})`
              )
              .join(", ")}`
          );
        }
      }

      // Insert the session with generated or provided slug
      const [session] = await tx
        .insert(sessions)
        .values({ ...sessionData, slug })
        .returning();

      // Populate polls.questions with all questions for this session
      if (allQuestions.length > 0) {
        const pollQuestionsData = allQuestions.map((q, index) => ({
          sessionId: session.id,
          varName: q.varName,
          batteryName: q.batteryName,
          subBattery: q.subBattery,
          orderingIndex: index,
        }));

        await tx.insert(pollQuestions).values(pollQuestionsData);
      }

      // Validate payload with Zod before writing to outbox (aborts tx on validation failure)
      const createdPayload = {
        sessionId: session.id,
        slug,
        sessionConfig: session.sessionConfig,
        description: session.description,
        createdAt: session.createdAt,
      };

      sessionCreatedSchema.parse(createdPayload);

      await tx.insert(outboxEvents).values({
        aggregateType: "session",
        aggregateId: session.id,
        eventType: "session.created",
        payload: createdPayload,
      });

      return session;
    });
  }

  /**
   * Get all sessions
   *
   * @returns Array of all sessions in the database
   */
  async findAll(): Promise<Session[]> {
    return await this.db.select().from(sessions);
  }

  /**
   * Get a specific session by ID
   *
   * @param id - The session ID
   * @returns The session if found
   * @throws NotFoundException if session doesn't exist
   */
  async findOne(id: number): Promise<Session> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id));

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    return session;
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
      // 1. Delete session statistics (references sessions.id)
      await tx
        .delete(sessionStatistics)
        .where(eq(sessionStatistics.sessionId, id));

      // 2. Get all respondent IDs for this session
      const sessionRespondents = await tx
        .select({ id: respondents.id })
        .from(respondents)
        .where(eq(respondents.sessionId, id));

      const respondentIds = sessionRespondents.map((r) => r.id);

      // Also capture question count for reporting in the outbox payload
      const sessionQuestions = await tx
        .select({ id: pollQuestions.id })
        .from(pollQuestions)
        .where(eq(pollQuestions.sessionId, id));

      const questionCount = sessionQuestions.length;

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

      // Write an outbox event to notify workers that this session was removed.
      // Include small metadata so workers can react deterministically (counts, timestamp).
      const removedPayload = {
        sessionId: id,
        removedAt: new Date().toISOString(),
        respondentCount: respondentIds.length,
        questionCount,
      };

      sessionRemovedSchema.parse(removedPayload);

      await tx.insert(outboxEvents).values({
        aggregateType: "session",
        aggregateId: id,
        eventType: "session.removed",
        payload: removedPayload,
      });

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
    // Ensure session exists and perform update + outbox insert atomically
    await this.findOne(id);

    const updatedSession = await this.db.transaction(async (tx) => {
      const [s] = await tx
        .update(sessions)
        .set({ isOpen })
        .where(eq(sessions.id, id))
        .returning();

      // compute lastRespondentId (high-water-mark) when closing so workers can deterministically drain
      let lastRespondentId: number | null = null;
      if (!isOpen) {
        const respondentRows = await tx
          .select({ id: respondents.id })
          .from(respondents)
          .where(eq(respondents.sessionId, id));

        if (respondentRows && respondentRows.length > 0) {
          lastRespondentId = Math.max(...respondentRows.map((r) => r.id));
        }
      }

      // enqueue outbox event so worker can react to open/close and release resources
      const statusPayload = {
        sessionId: id,
        isOpen,
        changedAt: new Date().toISOString(),
        lastRespondentId,
      };

      sessionStatusChangedSchema.parse(statusPayload);

      await tx.insert(outboxEvents).values({
        aggregateType: "session",
        aggregateId: id,
        eventType: "session.status.changed",
        payload: statusPayload,
      });

      return s;
    });

    return updatedSession;
  }
}
