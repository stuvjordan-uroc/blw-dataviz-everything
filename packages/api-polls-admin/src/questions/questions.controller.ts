import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { JwtAuthGuard } from 'shared-auth';

/**
 * QuestionsController provides read-only endpoints for browsing questions
 * 
 * All endpoints are protected with JwtAuthGuard - requires valid JWT token
 * 
 * Routes defined:
 * - GET /questions                    - Get all questions
 * - GET /questions/battery/:name      - Get questions for a specific battery
 * 
 * Note: Battery-related routes are in a separate controller to avoid conflicts
 */
@Controller('questions')
@UseGuards(JwtAuthGuard) // Protect all routes in this controller
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) { }

  /**
   * GET /questions
   * Get all available questions
   */
  @Get()
  async findAll() {
    return await this.questionsService.findAllQuestions();
  }

  /**
   * GET /questions/battery/:name
   * Get questions for a specific battery
   * 
   * Example: GET /questions/battery/demographics
   */
  @Get('battery/:name')
  async findByBattery(@Param('name') batteryName: string) {
    return await this.questionsService.findQuestionsByBattery(batteryName);
  }
}
