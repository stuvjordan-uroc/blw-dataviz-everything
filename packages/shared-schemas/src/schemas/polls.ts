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
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";
import { questions as questionsDef } from "./questions";
import type {
  ResponseQuestion,
  GroupingQuestion,
  Split,
  SegmentVizConfig,
} from "shared-computation";

/* CREATE POLLS SCHEMA AND ITS TABLES */

//schema

export const pollsSchema = pgSchema("polls");


export interface SessionConfig {
  responseQuestions: ResponseQuestion[];
  groupingQuestions: GroupingQuestion[];
  segmentVizConfig: SegmentVizConfig;
}

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

//types for session statistics









//session_statistics table
export const sessionStatistics = pollsSchema.table("session_statistics", {
  sessionId: integer()
    .primaryKey()
    .references(() => sessions.id), //only one row per session!!! Note this means application will have to handle concurrent updates!
  statistics: jsonb("statistics").$type<Split[]>(),
  computedAt: timestamp("computed_at").defaultNow(),
  // Fields for incremental computation tracking
  lastProcessedRespondentId: integer("last_processed_respondent_id"), // highest respondent.id processed so far
});

// outbox_events table: stores domain events atomically written alongside business data
export const outboxEvents = pollsSchema.table("outbox_events", {
  id: serial("id").primaryKey(),
  aggregateType: text("aggregate_type").notNull(),
  aggregateId: integer("aggregate_id"),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").$type<Record<string, any>>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  lockOwner: text("lock_owner"),
  lockedAt: timestamp("locked_at"),
});

export type OutboxEventRow = InferSelectModel<typeof outboxEvents>;

// Dead-letter queue table for outbox items the consumer cannot process
export const outboxDlq = pollsSchema.table("outbox_dlq", {
  id: serial("id").primaryKey(),
  outboxId: integer(),
  streamName: text("stream_name"),
  streamId: text("stream_id"),
  eventType: text("event_type"),
  payload: jsonb("payload").$type<Record<string, any>>().notNull(),
  errorMessage: text("error_message"),
  failedAt: timestamp("failed_at").defaultNow(),
});

export type OutboxDlqRow = InferSelectModel<typeof outboxDlq>;
