/**
 * Zod validation schemas for the questions schema tables
 * Generated from Drizzle table definitions using drizzle-zod
 */

import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { batteries, subBatteries, questions } from './questions';

// ============================================================================
// BATTERIES TABLE SCHEMAS
// ============================================================================

/**
 * Schema for validating data when INSERTING into the batteries table.
 * - name: required (primary key)
 * - prefix: optional (nullable in database)
 */
export const insertBatterySchema = createInsertSchema(batteries);

/**
 * Schema for validating data when SELECTING from the batteries table.
 * Matches the exact structure of rows returned from the database.
 */
export const selectBatterySchema = createSelectSchema(batteries);

// ============================================================================
// SUB_BATTERIES TABLE SCHEMAS
// ============================================================================

/**
 * Schema for validating data when INSERTING into the sub_batteries table.
 * - id: optional (auto-generated serial primary key)
 * - batteryName: required (foreign key to batteries)
 * - name: required
 */
export const insertSubBatterySchema = createInsertSchema(subBatteries);

/**
 * Schema for validating data when SELECTING from the sub_batteries table.
 * Matches the exact structure of rows returned from the database.
 * - id: will be a number
 * - batteryName: will be a string
 * - name: will be a string
 */
export const selectSubBatterySchema = createSelectSchema(subBatteries);

// ============================================================================
// QUESTIONS TABLE SCHEMAS
// ============================================================================

/**
 * Schema for validating data when INSERTING into the questions table.
 * - varName: required (part of composite primary key)
 * - text: optional (nullable)
 * - batteryName: required (part of composite primary key, foreign key)
 * - subBattery: required (part of composite primary key, foreign key)
 * - responses: optional (nullable array of strings)
 */
export const insertQuestionSchema = createInsertSchema(questions);

/**
 * Schema for validating data when SELECTING from the questions table.
 * Matches the exact structure of rows returned from the database.
 */
export const selectQuestionSchema = createSelectSchema(questions);
