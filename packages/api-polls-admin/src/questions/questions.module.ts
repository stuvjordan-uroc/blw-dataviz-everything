import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { BatteriesController } from './batteries.controller';

/**
 * QuestionsModule provides read-only access to browse questions
 * 
 * This module allows administrators to view available questions
 * when configuring poll sessions.
 */
@Module({
  controllers: [QuestionsController, BatteriesController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule { }
