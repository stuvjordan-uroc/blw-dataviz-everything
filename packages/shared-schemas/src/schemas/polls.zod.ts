/**
 * Zod validation schemas for the polls schema tables
 * Generated from Drizzle table definitions using drizzle-zod
 */

import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { sessions, questions, respondents, responses, sessionStatistics } from './polls';
import { z } from 'zod';

// ============================================================================
// SESSION CONFIG VALIDATION SCHEMAS
// ============================================================================

/**
 * ResponseGroup schema
 * Validates the structure of response groupings in session config
 */
export const responseGroupSchema = z.object({
  label: z.string(),
  values: z.array(z.number()),
});

/**
 * Question reference schema
 * Validates the structure of question references in session config
 */
export const questionSchema = z.object({
  varName: z.string(),
  batteryName: z.string(),
  subBattery: z.string(),
});

/**
 * Response question schema (includes expanded and collapsed response groups)
 */
export const responseQuestionSchema = questionSchema.extend({
  responseGroups: z.object({
    expanded: z.array(responseGroupSchema),
    collapsed: z.array(responseGroupSchema),
  }),
});

/**
 * Grouping question schema (includes single set of response groups)
 */
export const groupingQuestionSchema = questionSchema.extend({
  responseGroups: z.array(responseGroupSchema),
});

/**
 * SessionConfig schema
 * Validates the complete structure of a session configuration
 * This ensures the JSON stored in the database matches the SessionConfig TypeScript interface
 */
export const sessionConfigSchema = z.object({
  responseQuestions: z.array(responseQuestionSchema),
  groupingQuestions: z.array(groupingQuestionSchema),
});

// ============================================================================
// SESSIONS TABLE SCHEMAS
// ============================================================================

/**
 * Base insert schema generated from Drizzle table
 * We refine it to add proper validation for sessionConfig
 */
const baseInsertSessionSchema = createInsertSchema(sessions);

/**
 * Insert session schema with refined sessionConfig validation
 * This replaces the auto-generated validation for sessionConfig with our custom schema
 */
export const insertSessionSchema = baseInsertSessionSchema.extend({
  sessionConfig: sessionConfigSchema.optional(),
});

export const selectSessionSchema = createSelectSchema(sessions);

// ============================================================================
// QUESTIONS TABLE SCHEMAS
// ============================================================================

export const insertPollQuestionSchema = createInsertSchema(questions);
export const selectPollQuestionSchema = createSelectSchema(questions);

// ============================================================================
// RESPONDENTS TABLE SCHEMAS
// ============================================================================

export const insertRespondentSchema = createInsertSchema(respondents);
export const selectRespondentSchema = createSelectSchema(respondents);

// ============================================================================
// RESPONSES TABLE SCHEMAS
// ============================================================================

export const insertResponseSchema = createInsertSchema(responses);
export const selectResponseSchema = createSelectSchema(responses);

// ============================================================================
// SESSION_STATISTICS TABLE SCHEMAS
// ============================================================================

export const insertSessionStatisticsSchema = createInsertSchema(sessionStatistics);
export const selectSessionStatisticsSchema = createSelectSchema(sessionStatistics);
