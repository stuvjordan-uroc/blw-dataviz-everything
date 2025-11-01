import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { JwtAuthGuard } from 'shared-auth';

/**
 * BatteriesController provides endpoints for browsing question batteries
 * 
 * All endpoints are protected with JwtAuthGuard - requires valid JWT token
 * 
 * Routes defined:
 * - GET /batteries                    - Get all batteries
 * - GET /batteries/:name/sub-batteries - Get sub-batteries for a battery
 */
@Controller('batteries')
@UseGuards(JwtAuthGuard) // Protect all routes in this controller
export class BatteriesController {
  constructor(private readonly questionsService: QuestionsService) { }

  /**
   * GET /batteries
   * Get all question batteries
   */
  @Get()
  async findAll() {
    return await this.questionsService.findAllBatteries();
  }

  /**
   * GET /batteries/:name/sub-batteries
   * Get sub-batteries for a specific battery
   * 
   * Example: GET /batteries/demographics/sub-batteries
   */
  @Get(':name/sub-batteries')
  async findSubBatteries(@Param('name') batteryName: string) {
    return await this.questionsService.findSubBatteriesByBattery(batteryName);
  }
}
