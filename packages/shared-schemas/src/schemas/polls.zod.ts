/**
 * Zod validation schemas for the polls schema tables
 * Generated from Drizzle table definitions using drizzle-zod
 */

import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { sessions, questions, respondents, responses, sessionStatistics } from './polls';
import { z } from 'zod';

// Type for response groups (moved from shared-computation)
export interface ResponseGroup {
  label: string;
  values: number[];
}

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
 * Note: subBattery is required (use empty string '' for questions without a sub-battery)
 */
export const questionSchema = z.object({
  varName: z.string(),
  batteryName: z.string(),
  subBattery: z.string().default(''), // Empty string for questions without a sub-battery
});

/**
 * Helper function: Check if response group values are mutually exclusive
 * Returns true if no value appears in more than one response group
 */
const hasExclusiveValues = (groups: ResponseGroup[]) => {
  // Flatten all values from all groups into a single array
  const allValues = groups.flatMap(g => g.values);
  // Create a Set to find unique values
  const uniqueValues = new Set(allValues);
  // If the count of all values equals unique values, there are no duplicates
  return allValues.length === uniqueValues.size;
};

/**
 * Helper function: Check if two arrays of response groups have the same union of values
 * Returns true if the set of all values in expanded equals the set of all values in collapsed
 */
const haveSameUnion = (expanded: ResponseGroup[], collapsed: ResponseGroup[]) => {
  // Create sets of all values from expanded and collapsed groups
  const expandedSet = new Set(expanded.flatMap(g => g.values));
  const collapsedSet = new Set(collapsed.flatMap(g => g.values));

  // Quick check: if sizes differ, the unions can't be equal
  if (expandedSet.size !== collapsedSet.size) return false;

  // Check that every value in expanded exists in collapsed
  for (const value of expandedSet) {
    if (!collapsedSet.has(value)) return false;
  }
  return true;
};

/**
 * Response question schema (includes expanded and collapsed response groups)
 * 
 * Validation rules:
 * 1. Values within expanded response groups must be mutually exclusive
 * 2. Values within collapsed response groups must be mutually exclusive
 * 3. The union of expanded values must equal the union of collapsed values
 */
export const responseQuestionSchema = questionSchema.extend({
  responseGroups: z.object({
    expanded: z.array(responseGroupSchema),
    collapsed: z.array(responseGroupSchema),
  }),
}).refine(
  (data) => hasExclusiveValues(data.responseGroups.expanded),
  { message: "Response group values in 'expanded' must be mutually exclusive (no value can appear in multiple groups)" }
).refine(
  (data) => hasExclusiveValues(data.responseGroups.collapsed),
  { message: "Response group values in 'collapsed' must be mutually exclusive (no value can appear in multiple groups)" }
).refine(
  (data) => haveSameUnion(data.responseGroups.expanded, data.responseGroups.collapsed),
  { message: "The union of 'expanded' and 'collapsed' response group values must be equal (same set of all values)" }
);

/**
 * Grouping question schema (includes single set of response groups)
 */
export const groupingQuestionSchema = questionSchema.extend({
  responseGroups: z.array(responseGroupSchema),
}).refine(
  (data) => hasExclusiveValues(data.responseGroups),
  { message: "Response group values must be mutually exclusive (no value can appear in multiple groups)" }
);

/**
 * Placeholder for segmentVizConfig validation
 * TODO: Import from shared-computation-simple when ready
 */
export const segmentVizConfigSchema = z.record(z.any());

/**
 * SessionConfig schema
 * Validates the complete structure of a session configuration
 * This ensures the JSON stored in the database matches the SessionConfig TypeScript interface
 */
export const sessionConfigSchema = z.object({
  responseQuestions: z.array(responseQuestionSchema),
  groupingQuestions: z.array(groupingQuestionSchema),
  segmentVizConfig: segmentVizConfigSchema,
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
 * The slug is optional - if not provided, it will be auto-generated by the service
 */
export const insertSessionSchema = baseInsertSessionSchema.extend({
  sessionConfig: sessionConfigSchema.optional(),
  slug: z.string().optional(),
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

/**
 * Schema for submitting responses from a single respondent
 * Validates an array of response objects, each containing:
 * - questionSessionId: The ID of the question from polls.questions table
 * - response: The response value (index into the responses array) or null
 */
export const submitResponsesSchema = z.array(
  z.object({
    questionSessionId: z.number().int(),
    response: z.number().int().nullable(),
  })
);

// ============================================================================
// SESSION_STATISTICS TABLE SCHEMAS
// ============================================================================

export const insertSessionStatisticsSchema = createInsertSchema(sessionStatistics);
export const selectSessionStatisticsSchema = createSelectSchema(sessionStatistics);
