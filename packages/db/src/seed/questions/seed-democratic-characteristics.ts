import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { batteries, subBatteries, questions } from 'shared-schemas';
import { eq, inArray, and } from 'drizzle-orm';
import { fetchJsonFromS3, getDataMigrationsBucket } from '../utils/s3';

/**
 * JSON structure from S3 file
 */
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

const BATTERY_NAME_IMP = 'democratic_characteristics_importance';
const BATTERY_NAME_PERF = 'democratic_characteristics_performance';

/**
 * Seed democratic characteristics questions from S3
 * 
 * Fetches performance/importance questions from S3 and upserts them into the database.
 * Preserves functionality from original data-migrations/questions/0001_dem_characteristics.ts
 */
export async function seedDemocraticCharacteristics(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Create database connection
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    // Fetch JSON from S3
    const bucket = getDataMigrationsBucket();
    const data = await fetchJsonFromS3<PerfImpJson>(
      bucket,
      'db/schemas/questions/perf-imp.json'
    );

    console.log(`  ↓ Fetched data from S3: ${bucket}/db/schemas/questions/perf-imp.json`);

    // Upsert batteries
    for (const batteryData of [
      { name: BATTERY_NAME_IMP, prefix: data.importance.prefix },
      { name: BATTERY_NAME_PERF, prefix: data.performance.prefix },
    ]) {
      const existing = await db
        .select()
        .from(batteries)
        .where(eq(batteries.name, batteryData.name))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(batteries)
          .set({ prefix: batteryData.prefix })
          .where(eq(batteries.name, batteryData.name));
        console.log(`  ↻ Updated battery: ${batteryData.name}`);
      } else {
        await db.insert(batteries).values(batteryData);
        console.log(`  ✓ Created battery: ${batteryData.name}`);
      }
    }

    // Get unique categories for sub-batteries
    const uniqueCategories = [...new Set(data.characteristics.map((c) => c.category))];

    // Upsert sub-batteries
    for (const category of uniqueCategories) {
      for (const batteryName of [BATTERY_NAME_IMP, BATTERY_NAME_PERF]) {
        const existing = await db
          .select()
          .from(subBatteries)
          .where(and(
            eq(subBatteries.batteryName, batteryName),
            eq(subBatteries.name, category)
          ))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(subBatteries).values({
            batteryName,
            name: category,
          });
          console.log(`  ✓ Created sub-battery: ${batteryName} / ${category}`);
        }
      }
    }

    // Upsert questions
    for (const char of data.characteristics) {
      for (const config of [
        {
          batteryName: BATTERY_NAME_IMP,
          responses: data.importance.responses,
          label: 'importance',
        },
        {
          batteryName: BATTERY_NAME_PERF,
          responses: data.performance.responses,
          label: 'performance',
        },
      ]) {
        const existing = await db
          .select()
          .from(questions)
          .where(and(
            eq(questions.varName, char.variable_name),
            eq(questions.batteryName, config.batteryName),
            eq(questions.subBattery, char.category)
          ))
          .limit(1);

        const questionData = {
          varName: char.variable_name,
          text: char.question_text,
          batteryName: config.batteryName,
          subBattery: char.category,
          responses: config.responses,
        };

        if (existing.length > 0) {
          await db
            .update(questions)
            .set({
              text: questionData.text,
              responses: questionData.responses,
            })
            .where(and(
              eq(questions.varName, char.variable_name),
              eq(questions.batteryName, config.batteryName),
              eq(questions.subBattery, char.category)
            ));
        } else {
          await db.insert(questions).values(questionData);
        }
      }
    }

    console.log(`  ✓ Seeded ${data.characteristics.length} characteristics × 2 batteries`);
  } finally {
    await client.end();
  }
}
