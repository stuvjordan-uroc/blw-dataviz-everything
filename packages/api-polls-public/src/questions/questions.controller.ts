import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { QuestionsService } from './questions.service';

/**
 * QuestionsController handles HTTP requests for questions
 * 
 * Base route: /sessions
 */
@Controller('sessions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) { }

  /**
   * GET /sessions/:sessionId/questions
   * 
   * Retrieves all questions for a given session
   * 
   * @param sessionId - The ID of the session (from URL parameter)
   * @returns Array of questions
   */
  @Get(':sessionId/questions')
  async getQuestionsBySessionId(
    @Param('sessionId', ParseIntPipe) sessionId: number
  ) {
    return this.questionsService.getQuestionsBySessionId(sessionId);
  }
}
