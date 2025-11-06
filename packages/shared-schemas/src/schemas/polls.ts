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
import { questions as questionsDef } from "./questions";

/* CREATE POLLS SCHEMA AND ITS TABLES */

//schema

export const pollsSchema = pgSchema("polls");

//types for session configuration

export interface ResponseGroup {
  label: string;
  values: number[]; //must be indices of responses column of questions.questions
}

export interface Question {
  varName: string;
  batteryName: string;
  // subBattery is required (empty string '' for questions without a sub-battery)
  // This matches the database constraint where subBattery is part of the primary key
  subBattery: string;
}

export interface SessionConfig {
  responseQuestions: (Question & {
    responseGroups: { expanded: ResponseGroup[]; collapsed: ResponseGroup[] };
  })[];
  groupingQuestions: (Question & { responseGroups: ResponseGroup[] })[];
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
interface Split {
  groups: {
    question: Question;
    responseGroup: ResponseGroup | null;
  }[];
  responseQuestions: (Question & {
    responseGroups: {
      expanded: (ResponseGroup & { proportion: number })[];
      collapsed: (ResponseGroup & { proportion: number })[];
    };
  })[];
}

//session_statistics table
export const sessionStatistics = pollsSchema.table("session_statistics", {
  sessionId: integer()
    .primaryKey()
    .references(() => sessions.id), //only one row per session!!! Note this means application will have to handle concurrent updates!
  statistics: jsonb("statistics").$type<Split[]>(),
  computedAt: timestamp("computed_at").defaultNow(),
});
