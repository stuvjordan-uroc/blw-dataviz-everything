import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  Logger,
} from "@nestjs/common";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../database/database.providers";
import {
  sessions,
  respondents,
  responses,
  pollQuestions,
} from "shared-schemas";
import type {
  Question,
  SubmitResponsesDto,
  SubmitResponsesResponse,
  RespondentAnswer,
  VisualizationData,
} from "shared-types";
import { BatchUpdateScheduler } from "./batch-update-scheduler.service";
import { RespondentResponses } from "./response-transformer.service";
import { VisualizationCacheService } from "./visualization-cache.service";

/**
 * ResponsesService handles the submission and retrieval of poll responses.
 * 
 * Key responsibilities:
 * 1. Validate session exists and is active
 * 2. Create or retrieve respondent
 * 3. Persist responses to database
 * 4. Queue responses for batch visualization updates
 */
@Injectable()
export class ResponsesService {
  private readonly logger = new Logger(ResponsesService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: ReturnType<typeof drizzle>,
    private batchScheduler: BatchUpdateScheduler,
    private visualizationCache: VisualizationCacheService
  ) { }

  /**
   * Submit responses for a poll session
   * 
   * Each submission creates a new respondent (no authentication/tracking).
   * 
   * @param dto - The submission data
   * @returns The created respondent ID
   */
  async submitResponses(dto: SubmitResponsesDto): Promise<SubmitResponsesResponse> {
    // 1. Validate session
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, dto.sessionId));

    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    if (!session.isOpen) {
      throw new BadRequestException(`Session ${dto.sessionId} is not open`);
    }

    if (!session.sessionConfig) {
      throw new BadRequestException(`Session ${dto.sessionId} has no configuration`);
    }

    // 2. Validate answers match session questions
    this.validateAnswers(dto.answers, session.sessionConfig.questionOrder);

    // 3. Create new respondent (always - no authentication/identification)
    const [newRespondent] = await this.db
      .insert(respondents)
      .values({
        sessionId: dto.sessionId,
      })
      .returning();

    const respondentId = newRespondent.id;
    this.logger.log(`Created new respondent ${respondentId} for session ${dto.sessionId}`);

    // 4. Persist responses to database
    await this.persistResponses(respondentId, dto.answers);

    // 5. Queue for batch update
    const visualizationIds = session.sessionConfig.visualizations.map((v) => v.id);

    const respondentResponses: RespondentResponses = {
      respondentId,
      answers: dto.answers,
    };

    this.batchScheduler.queueResponses(
      dto.sessionId,
      visualizationIds,
      [respondentResponses]
    );

    this.logger.log(
      `Submitted ${dto.answers.length} responses for respondent ${respondentId}, ` +
      `queued for ${visualizationIds.length} visualizations`
    );

    return { respondentId };
  }

  /**
   * Validate that answers match the session's questions
   * 
   * @param answers - The submitted answers
   * @param questions - The session's question order
   */
  private validateAnswers(answers: RespondentAnswer[], questions: Question[]): void {
    // Basic validation: check that all answers correspond to session questions
    for (const answer of answers) {
      const matchingQuestion = questions.find(
        (q) =>
          q.varName === answer.varName &&
          q.batteryName === answer.batteryName &&
          q.subBattery === answer.subBattery
      );

      if (!matchingQuestion) {
        throw new BadRequestException(
          `Answer for question ${answer.varName}/${answer.batteryName}/${answer.subBattery} ` +
          `does not match any question in the session`
        );
      }

      // Validate responseIndex is a non-negative integer
      if (
        !Number.isInteger(answer.responseIndex) ||
        answer.responseIndex < 0
      ) {
        throw new BadRequestException(
          `Invalid responseIndex ${answer.responseIndex} for question ${answer.varName}`
        );
      }
    }
  }

  /**
   * Persist responses to the database
   * 
   * @param respondentId - The respondent ID
   * @param answers - The answers to persist
   */
  private async persistResponses(
    respondentId: number,
    answers: RespondentAnswer[]
  ): Promise<void> {
    // First, get the respondent's session
    const [respondent] = await this.db
      .select()
      .from(respondents)
      .where(eq(respondents.id, respondentId));

    if (!respondent) {
      throw new NotFoundException(`Respondent ${respondentId} not found`);
    }

    await this.db.transaction(async (tx) => {
      for (const answer of answers) {
        // Find the question ID from polls.questions
        const [question] = await tx
          .select()
          .from(pollQuestions)
          .where(
            and(
              eq(pollQuestions.sessionId, respondent.sessionId),
              eq(pollQuestions.varName, answer.varName),
              eq(pollQuestions.batteryName, answer.batteryName),
              eq(pollQuestions.subBattery, answer.subBattery)
            )
          );

        if (!question) {
          this.logger.warn(
            `Question ${answer.varName}/${answer.batteryName}/${answer.subBattery} ` +
            `not found in session ${respondent.sessionId}`
          );
          continue;
        }

        await tx.insert(responses).values({
          respondentId,
          questionSessionId: question.id,
          response: answer.responseIndex,
        });
      }
    });
  }

  /**
   * Get responses for a session (for admin/analysis purposes)
   * 
   * @param sessionId - The session ID
   * @returns Array of respondent responses
   */
  async getSessionResponses(sessionId: number): Promise<RespondentResponses[]> {
    // Validate session exists
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (!session.sessionConfig) {
      throw new BadRequestException(`Session ${sessionId} has no configuration`);
    }

    // Get all respondents for the session
    const sessionRespondents = await this.db
      .select()
      .from(respondents)
      .where(eq(respondents.sessionId, sessionId));

    // Get all responses for each respondent
    const result: RespondentResponses[] = [];

    for (const respondent of sessionRespondents) {
      // Get responses joined with questions to get varName, batteryName, subBattery
      const respondentAnswers = await this.db
        .select({
          respondentId: responses.respondentId,
          questionSessionId: responses.questionSessionId,
          response: responses.response,
          varName: pollQuestions.varName,
          batteryName: pollQuestions.batteryName,
          subBattery: pollQuestions.subBattery,
        })
        .from(responses)
        .innerJoin(pollQuestions, eq(responses.questionSessionId, pollQuestions.id))
        .where(eq(responses.respondentId, respondent.id));

      result.push({
        respondentId: respondent.id,
        answers: respondentAnswers.map((r) => ({
          varName: r.varName,
          batteryName: r.batteryName,
          subBattery: r.subBattery,
          responseIndex: r.response || 0, // Default to 0 if null
        })),
      });
    }

    return result;
  }

  /**
   * Get session statistics
   * 
   * @param sessionId - The session ID
   * @returns Statistics about the session
   */
  async getSessionStats(sessionId: number) {
    // Validate session exists
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Count respondents
    const sessionRespondents = await this.db
      .select()
      .from(respondents)
      .where(eq(respondents.sessionId, sessionId));

    // Count total responses
    let totalResponses = 0;
    for (const respondent of sessionRespondents) {
      const respondentResponses = await this.db
        .select()
        .from(responses)
        .where(eq(responses.respondentId, respondent.id));

      totalResponses += respondentResponses.length;
    }

    return {
      sessionId,
      respondentCount: sessionRespondents.length,
      totalResponses,
      isOpen: session.isOpen,
    };
  }

  /**
   * Get session by ID
   * 
   * @param sessionId - The session ID
   * @returns Session data
   * @throws NotFoundException if session doesn't exist
   */
  async getSession(sessionId: number) {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return session;
  }

  /**
   * Get current visualization state for a session
   * 
   * @param sessionId - The session ID
   * @param includeViewMaps - Whether to include viewMaps (default: false)
   * @returns Visualization data
   */
  async getVisualizationData(sessionId: number, includeViewMaps = false) {
    // Validate session exists
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (!session.sessionConfig) {
      throw new BadRequestException(`Session ${sessionId} has no configuration`);
    }

    // Get visualizations from cache (which will wake them up if needed)
    const visualizations = await this.visualizationCache.getVisualizationsForSession(
      sessionId
    );

    const result: VisualizationData[] = [];

    for (const [vizId, vizState] of visualizations) {
      const vizData: Partial<VisualizationData> = {
        visualizationId: vizId,
        config: vizState.config,
        sequenceNumber: vizState.sequenceNumber,
        splits: vizState.splits,
        basisSplitIndices: vizState.basisSplitIndices,
        lastUpdated: vizState.lastUpdated,
        vizWidth: vizState.vizWidth,
        vizHeight: vizState.vizHeight,
      };

      // Only include viewMaps when explicitly requested (e.g., for GET /sessions/:slug)
      if (includeViewMaps) {
        vizData.viewMaps = vizState.viewMaps;
      }

      result.push(vizData as VisualizationData);
    }

    return result;
  }
}
