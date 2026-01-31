/**
 * UI Participant E2E Test Seed Script
 * 
 * This script provides a FULLY SELF-CONTAINED seed for E2E testing that:
 * 1. Loads questions from S3 into questions.questions table
 * 2. Creates a realistic SessionConfig using those questions
 * 3. Seeds polls schema (sessions, polls.questions) - simulating admin session creation
 * 4. Seeds polls.respondents and polls.responses - simulating participant poll submissions
 * 
 * This script does NOT depend on the unreliable existing integration test system.
 * It mirrors the production flow: admin creates session → participants submit responses
 * 
 * Purpose: Enable manual E2E testing of ui-participant against api-polls-unified
 * 
 * Usage:
 *   npm run test:ui-participant:seed
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  // Questions schema tables (PostgreSQL "questions" schema)
  batteries,
  subBatteries,
  questions as questionsSchemaQuestions,
} from 'shared-schemas';
import type { Question, CreateSessionDto, SubmitResponsesDto, RespondentAnswer } from 'shared-types';
import { fetchJsonFromS3, getDataMigrationsBucket } from '../data-migrations/utils/s3';

// S3 JSON structure for democratic characteristics questions
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

const TEST_SESSION_SLUG = 'ui-participant-e2e-test';
const NUM_RESPONSES = 20;
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3006';
const ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL || 'admin@dev.local';
const ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || 'dev-password-changeme';

// Battery names for democratic characteristics questions
const BATTERY_NAME_IMP = "democratic_characteristics_importance";
const BATTERY_NAME_PERF = "democratic_characteristics_performance";

async function seed() {
  console.log('🌱 Starting UI Participant E2E seed...\n');
  console.log('This script simulates the complete production flow:');
  console.log('  1. S3 → questions schema (data migration)');
  console.log('  2. Admin API creates session → POST /admin/sessions');
  console.log('  3. Participants submit responses → POST /sessions/{slug}/responses\n');

  // Connect to test database (only for S3 questions loading)
  const connectionString = process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:password@localhost:5433/blw_dataviz_test';

  console.log(`📊 Connecting to database: ${connectionString.split('@')[1]}`);
  console.log(`🌐 API endpoint: ${API_BASE_URL}`);
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    // ============================================================================
    // STEP 1: Load questions from S3 into questions schema
    // ============================================================================
    // This simulates what data migrations do in production.
    // Questions are stored in S3 and loaded into the questions.questions table.
    // The questions schema serves as the "source of truth" for all question definitions.

    console.log('\n📦 STEP 1: Loading questions from S3...');

    // Check if questions already exist (idempotent)
    const existingQuestions = await db.select().from(questionsSchemaQuestions);

    if (existingQuestions.length > 0) {
      console.log(`   ℹ️  Questions already exist (${existingQuestions.length} found), skipping S3 load`);
    } else {
      console.log('   Fetching democratic characteristics from S3...');

      const bucket = getDataMigrationsBucket();
      const data = await fetchJsonFromS3<PerfImpJson>(bucket, 'db/schemas/questions/perf-imp.json');

      // Insert the two batteries (importance and performance)
      console.log('   Inserting batteries...');
      await db.insert(batteries).values([
        {
          name: BATTERY_NAME_IMP,
          prefix: data.importance.prefix,
        },
        {
          name: BATTERY_NAME_PERF,
          prefix: data.performance.prefix,
        },
      ]);

      // Get unique categories for sub-batteries
      const uniqueCategories = [...new Set(data.characteristics.map(c => c.category))];
      console.log(`   Inserting ${uniqueCategories.length} sub-batteries per battery...`);

      const subBatteryValues = uniqueCategories.flatMap(category => [
        { batteryName: BATTERY_NAME_IMP, name: category },
        { batteryName: BATTERY_NAME_PERF, name: category },
      ]);

      await db.insert(subBatteries).values(subBatteryValues);

      // Insert questions for both batteries
      console.log(`   Inserting ${data.characteristics.length * 2} questions...`);
      const questionValues = data.characteristics.flatMap(char => [
        // Importance question
        {
          varName: char.variable_name,
          text: char.question_text,
          batteryName: BATTERY_NAME_IMP,
          subBattery: char.category,
          responses: data.importance.responses,
        },
        // Performance question
        {
          varName: char.variable_name,
          text: char.question_text,
          batteryName: BATTERY_NAME_PERF,
          subBattery: char.category,
          responses: data.performance.responses,
        },
      ]);

      await db.insert(questionsSchemaQuestions).values(questionValues);
      console.log(`   ✅ Loaded ${questionValues.length} questions from S3`);
    }

    // Get all questions for session creation
    const allQuestions = await db.select().from(questionsSchemaQuestions);
    console.log(`   ✅ Questions schema ready: ${allQuestions.length} questions available`);

    // ============================================================================
    // STEP 2: Build CreateSessionDto for admin API
    // ============================================================================
    // A CreateSessionDto defines which questions are in the session (as Question keys)
    // and how they should be visualized (SegmentVizConfig without IDs).
    // The admin API will:
    // - Expand Question keys to QuestionWithDetails (query from questions schema)
    // - Add IDs to visualizations
    // - Store the full SessionConfig in the database
    // - Populate polls.questions linking table

    console.log('\n🎯 STEP 2: Building session creation request...');

    // Select performance questions (these will be visualized)
    const performanceQuestions = allQuestions.filter(q =>
      q.batteryName === BATTERY_NAME_PERF &&
      q.varName != null &&
      q.batteryName != null &&
      q.subBattery != null
    ).slice(0, 3); // Use first 3 performance questions

    // Select importance questions for grouping/segmentation
    const importanceQuestions = allQuestions.filter(q =>
      q.batteryName === BATTERY_NAME_IMP &&
      q.varName != null &&
      q.batteryName != null &&
      q.subBattery != null
    ).slice(0, 2); // Use first 2 importance questions as grouping variables

    if (performanceQuestions.length === 0) {
      console.error('❌ No performance questions found!');
      process.exit(1);
    }

    console.log(`   Selected questions for session:`);
    console.log(`   - ${performanceQuestions.length} response questions (visualized)`);
    performanceQuestions.forEach(q =>
      console.log(`     • ${q.varName} (${q.subBattery})`)
    );
    console.log(`   - ${importanceQuestions.length} grouping questions (segments)`);
    importanceQuestions.forEach(q =>
      console.log(`     • ${q.varName} (${q.subBattery})`)
    );

    // Build CreateSessionDto - what we send to POST /admin/sessions
    const createSessionDto: CreateSessionDto = {
      slug: TEST_SESSION_SLUG,
      description: 'E2E test session for ui-participant',
      sessionConfig: {
        // Question keys only - admin API will expand to QuestionWithDetails
        questionOrder: [
          ...importanceQuestions.map(q => ({
            varName: q.varName!,
            batteryName: q.batteryName!,
            subBattery: q.subBattery!,
          })),
          ...performanceQuestions.map(q => ({
            varName: q.varName!,
            batteryName: q.batteryName!,
            subBattery: q.subBattery!,
          })),
        ],

        // SegmentVizConfig without IDs - admin API will add them
        visualizations: performanceQuestions.map((rq) => ({
          responseQuestion: {
            question: {
              varName: rq.varName!,
              batteryName: rq.batteryName!,
              subBattery: rq.subBattery!,
            },
            responseGroups: {
              // All questions from S3 have 4 responses (indices 0-3)
              expanded: (rq.responses as string[]).map((label, i) => ({
                label,
                values: [i],
              })),
              collapsed: [
                { label: 'Low', values: [0, 1] },
                { label: 'High', values: [2, 3] },
              ],
            },
          },
          groupingQuestions: {
            x: importanceQuestions.slice(0, 1).map(gq => ({
              question: {
                varName: gq.varName!,
                batteryName: gq.batteryName!,
                subBattery: gq.subBattery!,
              },
              responseGroups: (gq.responses as string[]).map((label, i) => ({
                label,
                values: [i],
              })),
              questionDisplayLabel: gq.text || gq.varName!,
            })),
            y: importanceQuestions.slice(1, 2).map(gq => ({
              question: {
                varName: gq.varName!,
                batteryName: gq.batteryName!,
                subBattery: gq.subBattery!,
              },
              responseGroups: (gq.responses as string[]).map((label, i) => ({
                label,
                values: [i],
              })),
              questionDisplayLabel: gq.text || gq.varName!,
            })),
          },
          minGroupAvailableWidth: 100,
          minGroupHeight: 80,
          groupGapX: 10,
          groupGapY: 10,
          responseGap: 2,
          baseSegmentWidth: 5,
          images: {
            circleRadius: 3,
            baseColorRange: ['#66bb6a', '#1b5e20'],
            groupColorOverrides: [],
          },
        })),
      },
    };

    console.log(`   ✅ Session DTO created with ${createSessionDto.sessionConfig.questionOrder.length} questions`);

    console.log(`   ✅ Session DTO created with ${createSessionDto.sessionConfig.questionOrder.length} questions`);

    // ============================================================================
    // STEP 3: Create session via admin API
    // ============================================================================
    // POST to /admin/sessions with JWT authentication
    // The admin API will:
    // - Validate the session configuration
    // - Expand Question keys to QuestionWithDetails
    // - Add IDs to visualizations
    // - Insert into polls.sessions and polls.questions
    // See: packages/api-polls-admin/src/sessions/sessions.controller.ts

    console.log('\n📝 STEP 3: Creating session via admin API...');

    // First, authenticate to get JWT token
    console.log('   Authenticating admin user...');
    const loginResponse = await fetch(`${API_BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      throw new Error(`Failed to authenticate: ${loginResponse.status} - ${error}`);
    }

    const { accessToken } = await loginResponse.json() as { accessToken: string };
    console.log('   ✅ Admin authenticated');

    // Create the session
    console.log(`   Creating session: ${TEST_SESSION_SLUG}...`);
    const createSessionResponse = await fetch(`${API_BASE_URL}/admin/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(createSessionDto),
    });

    if (!createSessionResponse.ok) {
      const error = await createSessionResponse.text();
      throw new Error(`Failed to create session: ${createSessionResponse.status} - ${error}`);
    }

    const session = await createSessionResponse.json() as { id: number; slug: string };
    console.log(`   ✅ Session created: ${session.slug} (ID: ${session.id})`);
    console.log(`   ✅ Admin API handled polls.sessions and polls.questions population`);

    // ============================================================================
    // STEP 4: Submit responses via public API
    // ============================================================================
    // POST to /sessions/{slug}/responses (no authentication required)
    // The public API will:
    // - Validate responses against session questions
    // - Create respondent record
    // - Insert response records
    // - Emit events for real-time visualization updates
    // See: packages/api-polls-public/src/responses/responses.controller.ts

    console.log(`\n👥 STEP 4: Submitting ${NUM_RESPONSES} participant responses via API...`);

    const allSessionQuestions = [...importanceQuestions, ...performanceQuestions];

    for (let i = 0; i < NUM_RESPONSES; i++) {
      // Build answers for this respondent
      const answers: RespondentAnswer[] = allSessionQuestions.map(question => {
        const responseLabels = question.responses as string[] | null;
        const responseIndex = responseLabels && responseLabels.length > 0
          ? Math.floor(Math.random() * responseLabels.length)
          : Math.floor(Math.random() * 101);

        return {
          varName: question.varName,
          batteryName: question.batteryName,
          subBattery: question.subBattery,
          responseIndex,
        };
      });

      const submitDto: SubmitResponsesDto = {
        sessionId: session.id,
        answers,
      };

      // Submit responses via public API
      const submitResponse = await fetch(`${API_BASE_URL}/sessions/${TEST_SESSION_SLUG}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitDto),
      });

      if (!submitResponse.ok) {
        const error = await submitResponse.text();
        console.error(`   ❌ Failed to submit responses for participant ${i + 1}: ${error}`);
        continue;
      }

      process.stdout.write(`   Submitted responses for participant ${i + 1}/${NUM_RESPONSES}\r`);
    }

    console.log(`\n   ✅ Submitted ${NUM_RESPONSES} participant responses via public API`);
    console.log(`   ✅ Public API handled polls.respondents and polls.responses`);

    console.log('\n🎉 UI Participant E2E seed completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Start ui-participant dev server:');
    console.log('     cd packages/ui-participant');
    console.log('     npm run dev -- --mode e2e');
    console.log(`  2. Visit: http://localhost:5173/sessions/${TEST_SESSION_SLUG}`);

  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seed
seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
// Run seed
seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
