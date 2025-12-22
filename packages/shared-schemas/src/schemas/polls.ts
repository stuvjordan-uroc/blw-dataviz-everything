import {
  pgSchema,
  serial,
  integer,
  text,
  foreignKey,
  unique,
  jsonb,
  timestamp,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { questions as questionsDef } from "./questions";
import type { Question } from "shared-types";
import type { SegmentVizConfig, SplitWithSegmentGroup, ViewMaps } from "shared-computation";

/**
 * Session configuration for a polling session.
 * Defines which questions are presented to respondents and how responses are visualized.
 */
export interface SessionConfig {
  // Questions in the order they will be presented to respondents
  questionOrder: Question[];

  // One visualization per response question, with unique ID for reference
  visualizations: (SegmentVizConfig & { id: string })[];
}

/**
 * Pre-computed lookup maps for efficient response transformation.
 * Built at session creation to minimize response processing latency.
 */
export interface VisualizationLookupMaps {
  // Maps response index to expanded response group index (O(1) lookup)
  // Example: {0: 0, 1: 0, 2: 1, 3: 1, 4: 2}
  responseIndexToGroupIndex: Record<number, number>;

  // Maps group profile signature to basis split index (O(1) lookup)
  // Key format: serialized profile like "0:1:null:2" where each position
  // corresponds to a grouping question's response group index (or null)
  profileToSplitIndex: Record<string, number>;
}

/* CREATE POLLS SCHEMA AND ITS TABLES */

//schema

export const pollsSchema = pgSchema("polls");


//sessions table
export const sessions = pollsSchema.table("sessions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  sessionConfig: jsonb("session_config").$type<SessionConfig>(),
  description: text(),
  isOpen: boolean("is_open").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

//questions table
export const questions = pollsSchema.table(
  "questions",
  {
    id: serial("id").primaryKey(), //this is unique to a question-session combination, because of the no-duplicate-questions-within-a-session constraint below.
    sessionId: integer().references(() => sessions.id),
    varName: text().notNull(),
    batteryName: text().notNull(),
    // subBattery must match questions.questions schema (NOT NULL, use '' for no sub-battery)
    subBattery: text().notNull().default(""),
    orderingIndex: integer("ordering_index").notNull(),
  },
  (table) => [
    //Composite foreign key to questions schema
    foreignKey({
      columns: [table.varName, table.batteryName, table.subBattery],
      foreignColumns: [
        questionsDef.varName,
        questionsDef.batteryName,
        questionsDef.subBattery,
      ],
    }),
    //ensure no duplicate questions within a session
    unique().on(
      table.sessionId,
      table.varName,
      table.batteryName,
      table.subBattery
    ),
  ]
);

//respondents table
export const respondents = pollsSchema.table("respondents", {
  id: serial("id").primaryKey(),
  sessionId: integer()
    .notNull()
    .references(() => sessions.id),
  // Optional: add other respondent metadata
  // createdAt: timestamp("created_at").defaultNow(),
  // anonymousId: text("anonymous_id"), // if you want to track across sessions
});

//responses table
export const responses = pollsSchema.table(
  "responses",
  {
    respondentId: integer()
      .notNull()
      .references(() => respondents.id),
    questionSessionId: integer().references(() => questions.id),
    response: integer(), //this will be null if a repondent gives a response that is not an index in the the responses array of questions.questions.
  },
  (table) => [
    // Ensure each respondent can only answer each question once
    unique().on(table.respondentId, table.questionSessionId),
  ]
);

//session_visualizations table
//Stores the computed visualization state for each visualization in a session
export const sessionVisualizations = pollsSchema.table(
  "session_visualizations",
  {
    sessionId: integer()
      .notNull()
      .references(() => sessions.id),
    visualizationId: text("visualization_id").notNull(), // matches the id in SessionConfig.visualizations
    basisSplitIndices: jsonb("basis_split_indices").$type<number[]>(),
    splits: jsonb("splits").$type<SplitWithSegmentGroup[]>(),
    viewMaps: jsonb("view_maps").$type<ViewMaps>(),
    lookupMaps: jsonb("lookup_maps").$type<VisualizationLookupMaps>(),
    computedAt: timestamp("computed_at").defaultNow(),
  },
  (table) => [
    // Composite primary key: one row per visualization per session
    primaryKey({ columns: [table.sessionId, table.visualizationId] }),
  ]
);
