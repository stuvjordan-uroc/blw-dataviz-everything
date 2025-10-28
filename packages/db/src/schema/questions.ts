/* NEXT STEPS

1. Change battery transformation config and function so that it downloads questions.json, and uses the categories
to derive the sub-batteries lists

2. Try to run the migration scripts.


*/

import { pgSchema, text, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { z } from 'zod';
import { fetchS3File } from '../scripts/utils/parsers'; // Only used for questions data
import { db } from '../index';

// Create questions schema and its tables

export const questionsSchema = pgSchema("questions");

export const batteries = questionsSchema.table("batteries", {
  name: text().notNull().primaryKey(),
  subBatteries: text().array(),
  prefix: text()
})

export const questions = questionsSchema.table("questions", {
  varName: text().notNull().primaryKey(),
  text: text(),
  batteryName: text().notNull().references(() => batteries.name),
  subBattery: text(),
  responses: text().array()  //index in this array will give coded response in responses table
}, (table) => ([
  check("sub_battery_in_battery_list",
    sql`${table.subBattery} IS NULL OR EXISTS (
      SELECT 1 FROM ${batteries} 
      WHERE ${batteries.name} = ${table.batteryName} 
      AND ${table.subBattery} = ANY(${batteries.subBatteries})
    )`
  )
]))

// Data Migration Logic
export const questionsMigrationConfig = {
  name: "questions",
  dataSources: [
    {
      s3Key: null, // Hard-coded data
      target: "batteries",
      transformer: transformBatteries
    },
    {
      s3Key: "questions.json",
      target: "questions",
      transformer: transformQuestions
    }
  ],
  rollback: rollbackQuestionsData
};

// Data transformation functions
const BatterySchema = z.object({
  name: z.string(),
  prefix: z.string().optional(),
  sub_batteries: z.string().array().optional()
});

const QuestionSchema = z.object({
  var_name: z.string(),
  question_text: z.string().optional(),
  battery: z.string(),
  sub_battery: z.string().optional(),
  responses: z.array(z.string()).optional(),
});

async function transformBatteries(_s3Key: string | null): Promise<Record<string, unknown[]>> {
  // Hard-coded battery data
  const hardCodedBatteries = [
    {
      name: "democratic_characteristics_performance",
      prefix: "How well does the following statement describe the United States of today?",
      subBatteries: [
        "Electoral competition and political accountability",
        "Executive, legislative, and judicial powers",
        "Government influence on media, business, and other private organizations",
        "Political and civil rights",
        "Public discourse",
        "Role of military, law enforcement, and government agencies in politics"
      ]
    },
    {
      name: "democratic_characteristics_importance",
      prefix: "How import is the following characteristic for democratic government?",
      subBatteries: [
        "Electoral competition and political accountability",
        "Executive, legislative, and judicial powers",
        "Government influence on media, business, and other private organizations",
        "Political and civil rights",
        "Public discourse",
        "Role of military, law enforcement, and government agencies in politics"
      ]
    },
  ];

  // Validate the hard-coded data
  const validatedData = hardCodedBatteries.map(item => BatterySchema.parse(item));

  return {
    batteries: validatedData
  };
}

async function transformQuestions(s3Key: string): Promise<Record<string, unknown[]>> {
  const rawData = await fetchS3File(s3Key, 'json') as unknown as {
    prefix_performance: string;
    prefix_importance: string;
    prompts: {
      variable_name: string;
      question_text: string;
      short_text: string;
      category: string;
    }[]
  };
  const validatedData = [
    ...rawData.prompts.map((prompt) => QuestionSchema.parse({
      var_name: prompt.variable_name,
      text: prompt.question_text,
      battery: "democratic_characteristics_performance",
      sub_battery: prompt.category,
      responses: ["The U.S. does not meet this standard", "The U.S. partly meets this standard", "The U.S. mostly meets this standard", "The U.S. fully meets this standard", "Not sure", "Skipped", "Not asked"]
    })),
    ...rawData.prompts.map((prompt) => QuestionSchema.parse({
      var_name: prompt.variable_name,
      text: prompt.question_text,
      battery: "democratic_characteristics_importance",
      sub_battery: prompt.category,
      responses: ["Not relevant -- This has no impact on democracy", "Beneficial -- This enhances democracy, but is not required for democracy", "Important -- If this is absent, democracy is compromised", "Essential -- A country cannot be considered a democracy without this.", "Skipped", "Not asked"]
    }))
  ]
  return {
    questions: validatedData.map(row => ({
      varName: row.var_name,
      text: row.question_text,
      batteryName: row.battery,
      subBattery: row.sub_battery,
      responses: row.responses ? row.responses : []
    }))
  };
}

async function rollbackQuestionsData(): Promise<void> {
  // Define how to rollback this data
  await db.delete(questions);
  await db.delete(batteries);
}