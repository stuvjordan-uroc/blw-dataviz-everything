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
  questions as pollQuestions,
  respondents,
  responses,
  sessionStatistics,
} from "shared-schemas/src/schemas/polls";
import { questions as questionBank } from "shared-schemas/src/schemas/questions";
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
  ) {}

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
          .from(questionBank)
          .where(
            inArray(
              questionBank.varName,
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
                  `(varName: ${q.varName}, battery: ${
                    q.batteryName
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
    // First check if session exists
    await this.findOne(id);

    const [updatedSession] = await this.db
      .update(sessions)
      .set({ isOpen })
      .where(eq(sessions.id, id))
      .returning();

    return updatedSession;
  }
}
