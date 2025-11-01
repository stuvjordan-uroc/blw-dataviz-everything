import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { questions, batteries, subBatteries } from 'shared-schemas/src/schemas/questions';
import type { InferSelectModel } from 'drizzle-orm';

/**
 * Type definitions
 */
type Question = InferSelectModel<typeof questions>;
type Battery = InferSelectModel<typeof batteries>;
type SubBattery = InferSelectModel<typeof subBatteries>;

/**
 * QuestionsService provides read-only access to the questions schema
 * 
 * This service allows administrators to:
 * - Browse all available questions
 * - Filter questions by battery
 * - View battery and sub-battery information
 * 
 * This is used when creating session configurations to select which
 * questions will be included in a poll session.
 */
@Injectable()
export class QuestionsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: ReturnType<typeof drizzle>,
  ) { }

  /**
   * Get all questions
   * 
   * @returns Array of all questions with their full configuration
   */
  async findAllQuestions(): Promise<Question[]> {
    return await this.db.select().from(questions);
  }

  /**
   * Get questions for a specific battery
   * 
   * @param batteryName - The name of the battery
   * @returns Array of questions in that battery
   */
  async findQuestionsByBattery(batteryName: string): Promise<Question[]> {
    return await this.db
      .select()
      .from(questions)
      .where(eq(questions.batteryName, batteryName));
  }

  /**
   * Get all batteries
   * 
   * @returns Array of all batteries
   */
  async findAllBatteries(): Promise<Battery[]> {
    return await this.db.select().from(batteries);
  }

  /**
   * Get sub-batteries for a specific battery
   * 
   * @param batteryName - The name of the battery
   * @returns Array of sub-batteries
   */
  async findSubBatteriesByBattery(batteryName: string): Promise<SubBattery[]> {
    return await this.db
      .select()
      .from(subBatteries)
      .where(eq(subBatteries.batteryName, batteryName));
  }
}
