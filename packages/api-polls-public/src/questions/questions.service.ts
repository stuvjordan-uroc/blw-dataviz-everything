import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { pollQuestions, sessions } from 'shared-schemas';

/**
 * QuestionsService handles business logic for retrieving questions
 */
@Injectable()
export class QuestionsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: ReturnType<typeof drizzle>
  ) { }

  /**
   * Get all questions for a given session ID
   * 
   * @param sessionId - The ID of the session
   * @returns Array of questions belonging to the session
   * @throws NotFoundException if session doesn't exist
   */
  async getQuestionsBySessionId(sessionId: number) {
    // First verify the session exists
    const session = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (session.length === 0) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    // Get all questions for this session
    const sessionQuestions = await this.db
      .select()
      .from(pollQuestions)
      .where(eq(pollQuestions.sessionId, sessionId));

    return sessionQuestions;
  }
}
