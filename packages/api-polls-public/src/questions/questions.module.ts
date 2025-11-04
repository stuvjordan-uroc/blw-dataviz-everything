import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

/**
 * QuestionsModule organizes the questions feature
 * 
 * This module:
 * - Provides QuestionsService for business logic
 * - Exposes QuestionsController for HTTP endpoints
 */
@Module({
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule { }
