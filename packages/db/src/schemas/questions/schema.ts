import { pgSchema, text, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";

/* CREATE QUESTIONS SCHEMA AND ITS TABLES */

//schema
export const questionsSchema = pgSchema("questions");

//batteries table
export const batteries = questionsSchema.table("batteries", {
  name: text().notNull().primaryKey(),
  subBatteries: text().array(),
  prefix: text(),
});

//questions table
export const questions = questionsSchema.table(
  "questions",
  {
    varName: text().notNull().primaryKey(),
    text: text(),
    batteryName: text()
      .notNull()
      .references(() => batteries.name),
    subBattery: text(),
    responses: text().array(), //index in this array will give coded response in responses table
  },
  (table) => [
    check(
      "sub_battery_in_battery_list",
      sql`${table.subBattery} IS NULL OR EXISTS (
      SELECT 1 FROM ${batteries} 
      WHERE ${batteries.name} = ${table.batteryName} 
      AND ${table.subBattery} = ANY(${batteries.subBatteries})
    )`
    ),
  ]
);

export type BatteryInsert = InferInsertModel<typeof batteries>;
export type QuestionInsert = InferInsertModel<typeof questions>;
