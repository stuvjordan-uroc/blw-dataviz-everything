import type { DataMigration } from '../types';
import { batteries, subBatteries, questions } from 'shared';
import { fetchJsonFromS3, getDataMigrationsBucket } from '../utils/s3';
import { sql } from 'drizzle-orm'

interface PerfImpJson {
  importance: {
    prefix: string;
    responses: string[];
  };
  performance: {
    prefix: string;
    responses: string[];
  };
  characteristics: {
    variable_name: string;
    question_text: string;
    short_text: string;
    category: string;
  }[];
}

const batteryNameImp = "democratic_characteristics_importance"
const batteryNamePerf = "democratic_characteristics_performance"


export const migration: DataMigration = {
  name: 'questions_0001_dem_characteristics',

  up: async (db) => {
    // Fetch JSON from S3
    const bucket = getDataMigrationsBucket();
    const data = await fetchJsonFromS3<PerfImpJson>(bucket, 'db/schemas/questions/perf-imp.json');

    // Insert the two batteries
    await db.insert(batteries).values([
      {
        name: batteryNameImp,
        prefix: data.importance.prefix,
      },
      {
        name: batteryNamePerf,
        prefix: data.performance.prefix,
      },
    ]);

    // Get unique categories for sub-batteries
    const uniqueCategories = [...new Set(data.characteristics.map(c => c.category))];

    // Insert sub-batteries for both batteries
    const subBatteryValues = uniqueCategories.flatMap(category => [
      {
        batteryName: batteryNameImp,
        name: category,
      },
      {
        batteryName: batteryNamePerf,
        name: category,
      },
    ]);

    await db.insert(subBatteries).values(subBatteryValues);

    // Insert questions for both batteries
    const questionValues = data.characteristics.flatMap(char => [
      // Importance question
      {
        varName: char.variable_name,
        text: char.question_text,
        batteryName: batteryNameImp,
        subBattery: char.category,
        responses: data.importance.responses,
      },
      // Performance question
      {
        varName: char.variable_name,
        text: char.question_text,
        batteryName: batteryNamePerf,
        subBattery: char.category,
        responses: data.performance.responses,
      },
    ]);

    await db.insert(questions).values(questionValues);
  },

  down: async (db) => {
    // Delete in reverse order due to foreign keys
    await db.delete(questions)
      .where(sql`battery_name IN ('dem_characteristics_importance', 'dem_characteristics_performance')`);

    await db.delete(subBatteries)
      .where(sql`battery_name IN ('dem_characteristics_importance', 'dem_characteristics_performance')`);

    await db.delete(batteries)
      .where(sql`name IN ('dem_characteristics_importance', 'dem_characteristics_performance')`);
  },
};