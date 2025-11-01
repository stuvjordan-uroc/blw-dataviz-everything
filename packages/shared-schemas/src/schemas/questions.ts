import { pgSchema, text, serial, unique, foreignKey, primaryKey } from "drizzle-orm/pg-core";
import type { InferInsertModel } from "drizzle-orm";

/* CREATE QUESTIONS SCHEMA AND ITS TABLES */

//schema
export const questionsSchema = pgSchema("questions");

//batteries table
export const batteries = questionsSchema.table(
  "batteries",
  {
    name: text().notNull().primaryKey(),
    prefix: text(),
  }
);

//sub-batteries table

export const subBatteries = questionsSchema.table(
  "sub_batteries",
  {
    id: serial("id").primaryKey(),
    batteryName: text().notNull().references(() => batteries.name),
    name: text().notNull()
  },
  (table) => [
    //insure that the set of sub-batteries belonging to any battery has no duplicates.
    unique().on(table.batteryName, table.name)
  ]
)

//questions table
export const questions = questionsSchema.table(
  "questions",
  {
    varName: text().notNull(),
    text: text(),
    batteryName: text()
      .notNull()
      .references(() => batteries.name),
    // subBattery is part of the composite primary key, so it cannot be NULL in PostgreSQL.
    // Use empty string '' for questions that don't belong to a sub-battery (simple batteries).
    subBattery: text().notNull().default(''),
    responses: text().array(), //index in this array will give coded response in responses table
  },
  (table) => [
    // Composite primary key
    primaryKey({ columns: [table.varName, table.batteryName, table.subBattery] }),
    // Composite foreign key: ensures subBattery belongs to the correct battery
    // References the unique constraint (batteryName, name) in subBatteries
    foreignKey({
      columns: [table.batteryName, table.subBattery],
      foreignColumns: [subBatteries.batteryName, subBatteries.name]
    })
  ]
);

export type BatteryInsert = InferInsertModel<typeof batteries>;
export type SubBatteryInsert = InferInsertModel<typeof subBatteries>;
export type QuestionInsert = InferInsertModel<typeof questions>;
