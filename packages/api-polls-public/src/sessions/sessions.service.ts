import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../database/database.providers";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import { sessions, questions } from "shared-schemas";
import type { SessionResponse, Question, QuestionWithDetails } from "shared-types";
import { ResponsesService } from "../responses/responses.service";

/**
 * SessionsService handles session information retrieval for public clients
 */
@Injectable()
export class SessionsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: ReturnType<typeof drizzle>,
    private responsesService: ResponsesService
  ) { }

  /**
   * Get complete session information by slug
   * 
   * Returns everything a client needs to interact with a session:
   * - Session metadata
   * - Configuration
   * - Current visualization state
   * - API endpoints
   * 
   * @param slug - The session's unique slug
   * @returns Complete session info
   * @throws NotFoundException if session doesn't exist
   */
  async getSessionBySlug(slug: string): Promise<SessionResponse> {
    // Get session by slug
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.slug, slug));

    if (!session) {
      throw new NotFoundException(`Session with slug '${slug}' not found`);
    }

    if (!session.sessionConfig) {
      throw new NotFoundException(`Session ${session.id} has no configuration`);
    }

    // Get full question details for the session
    const fullQuestions = await this.getFullQuestionDetails(
      session.sessionConfig.questionOrder
    );

    // Get current visualization data with viewMaps (static metadata for client-side view switching)
    const visualizations = await this.responsesService.getVisualizationData(session.id, true);

    // Build response with all needed information
    return {
      // Session metadata
      id: session.id,
      slug: session.slug,
      isOpen: session.isOpen,
      description: session.description,
      createdAt: session.createdAt,

      // Session configuration with full question details
      config: {
        ...session.sessionConfig,
        questionOrder: fullQuestions,
      },

      // Current visualization state
      visualizations,

      // API endpoints for client to use
      endpoints: {
        // For submitting responses (if session is open)
        submitResponse: `/api/sessions/${slug}/responses`,

        // For real-time visualization updates
        visualizationStream: `/api/visualizations/session/${session.id}/stream`,
      },
    };
  }

  /**
   * Fetch full question details from the database
   * 
   * @param questionKeys - Array of Question keys to fetch
   * @returns Array of full question objects with text and responses fields
   */
  private async getFullQuestionDetails(
    questionKeys: Question[]
  ): Promise<QuestionWithDetails[]> {
    // Fetch all matching questions from the database
    const fetchedQuestions = await Promise.all(
      questionKeys.map(key =>
        this.db
          .select()
          .from(questions)
          .where(
            and(
              eq(questions.varName, key.varName),
              eq(questions.batteryName, key.batteryName),
              eq(questions.subBattery, key.subBattery)
            )
          )
          .limit(1)
          .then(results => results[0])
      )
    );

    // Verify all questions were found
    const missingQuestions = questionKeys.filter((key, index) => !fetchedQuestions[index]);
    if (missingQuestions.length > 0) {
      throw new NotFoundException(
        `Questions not found: ${missingQuestions.map(q => `${q.batteryName}.${q.varName}.${q.subBattery}`).join(', ')}`
      );
    }

    // Return in the same order as questionKeys
    return fetchedQuestions as QuestionWithDetails[];
  }
}
