/**
 * Test Helpers for Integration Tests
 * Based on the actual API schemas and surfaces built
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql, inArray } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { batteries, subBatteries, questions, sessions, pollQuestions, sessionVisualizations } from 'shared-schemas';
import { testBattery, testSubBattery, testQuestions } from '../fixtures/test-questions';
import { initializeSplitsWithSegments } from 'shared-computation';

/**
 * Get database connection for tests
 * Uses TEST_DATABASE_URL environment variable
 */
export function getTestDb() {
  const connectionString = process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:password@localhost:5433/blw_dataviz_test';

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  return {
    db,
    cleanup: async () => {
      await client.end();
    },
  };
}

/**
 * Get admin API URL
 */
export function getAdminApiUrl(): string {
  return process.env.TEST_ADMIN_API_URL || 'http://localhost:3004';
}

/**
 * Get public API URL
 */
export function getPublicApiUrl(): string {
  return process.env.TEST_PUBLIC_API_URL || 'http://localhost:3005';
}

/**
 * Clean all session-related data from database
 * Useful for cleanup between tests
 */
export async function cleanSessionData(db: any) {
  await db.execute(sql`
    TRUNCATE TABLE polls.session_visualizations CASCADE;
  `);
  await db.execute(sql`
    TRUNCATE TABLE polls.responses CASCADE;
  `);
  await db.execute(sql`
    TRUNCATE TABLE polls.respondents CASCADE;
  `);
  await db.execute(sql`
    TRUNCATE TABLE polls.sessions CASCADE;
  `);
}

/**
 * Seed test questions into the database
 * Inserts test battery, sub-battery, and questions from fixtures
 * Safe to call multiple times - will skip if data already exists
 */
export async function seedTestQuestions(db: any) {
  try {
    // Insert battery (will skip if already exists due to primary key constraint)
    await db.insert(batteries).values(testBattery).onConflictDoNothing();

    // Insert sub-battery (will skip if already exists due to unique constraint)
    await db.insert(subBatteries).values(testSubBattery).onConflictDoNothing();

    // Insert questions (will skip if already exist due to primary key constraint)
    await db.insert(questions).values(testQuestions).onConflictDoNothing();

    return {
      battery: testBattery,
      subBattery: testSubBattery,
      questions: testQuestions,
    };
  } catch (error) {
    console.error('Error seeding test questions:', error);
    throw error;
  }
}

/**
 * Clean test questions from the database
 * Removes all test data seeded by seedTestQuestions
 */
export async function cleanTestQuestions(db: any) {
  try {
    // Delete in reverse order of dependencies
    // First delete responses (has FK to polls.questions)
    await db.execute(sql`
      DELETE FROM polls.responses WHERE "respondentId" IN (
        SELECT id FROM polls.respondents WHERE "sessionId" IN (
          SELECT id FROM polls.sessions WHERE slug LIKE 'test-%'
        )
      );
    `);
    // Then delete from polls.questions (has FK to questions.questions)
    await db.execute(sql`
      DELETE FROM polls.questions WHERE "sessionId" IN (
        SELECT id FROM polls.sessions WHERE slug LIKE 'test-%'
      );
    `);
    // Then delete from questions schema tables
    await db.execute(sql`
      DELETE FROM questions.questions WHERE "batteryName" = 'test';
    `);
    await db.execute(sql`
      DELETE FROM questions.sub_batteries WHERE "batteryName" = 'test';
    `);
    await db.execute(sql`
      DELETE FROM questions.batteries WHERE name = 'test';
    `);
  } catch (error) {
    console.error('Error cleaning test questions:', error);
    throw error;
  }
}

/**
 * Seed an existing session into the database
 * This creates a session with all associated poll questions and visualizations
 * 
 * IMPORTANT: This function properly initializes the visualization splits and lookup maps
 * using the same logic as the session creation service, so responses can be processed correctly.
 * 
 * @param db - Database connection
 * @param sessionData - Session data to insert (defaults to existingOpenSession)
 * @returns The created session with its ID
 */
export async function seedExistingSession(
  db: ReturnType<typeof drizzle>,
  sessionData?: InferInsertModel<typeof sessions>
): Promise<InferSelectModel<typeof sessions>> {
  const { existingOpenSession, existingSessionPollQuestions } =
    await import("../fixtures/test-sessions");

  const dataToInsert = sessionData || existingOpenSession;

  if (!dataToInsert.sessionConfig) {
    throw new Error('Session data must have a sessionConfig');
  }

  // Add unique suffix to slug to avoid conflicts between tests
  const uniqueSlug = `${dataToInsert.slug}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Insert the session with unique slug
  const [session] = await db
    .insert(sessions)
    .values({
      ...dataToInsert,
      slug: uniqueSlug,
    })
    .returning();

  // Insert poll questions for this session
  const pollQuestionsData = existingSessionPollQuestions.map((q) => ({
    ...q,
    sessionId: session.id,
  }));

  await db.insert(pollQuestions).values(pollQuestionsData);

  // Initialize and insert session visualizations
  // Use the same initialization logic as the session creation service
  for (const vizConfig of dataToInsert.sessionConfig.visualizations) {
    const { id, ...config } = vizConfig;

    // Initialize splits with segments (same as session creation)
    const { basisSplitIndices, splits } = initializeSplitsWithSegments(config);

    // Build responseIndexToGroupIndex lookup map
    const responseIndexToGroupIndex: Record<number, number> = {};
    config.responseQuestion.responseGroups.expanded.forEach((group, groupIdx) => {
      group.values.forEach(responseIdx => {
        responseIndexToGroupIndex[responseIdx] = groupIdx;
      });
    });

    // Build profileToSplitIndex lookup map
    // This maps respondent profiles (e.g., "0:1:2") to basis split indices
    const profileToSplitIndex: Record<string, number> = {};
    const allGroupingQuestions = [
      ...config.groupingQuestions.x,
      ...config.groupingQuestions.y,
    ];

    // For each basis split, compute its profile key
    for (const splitIdx of basisSplitIndices) {
      const split = splits[splitIdx];
      const profileParts: string[] = [];

      // Build profile key from the split's groups
      for (const gq of allGroupingQuestions) {
        const splitGroup = split.groups.find(
          (g) =>
            g.question.varName === gq.question.varName &&
            g.question.batteryName === gq.question.batteryName &&
            g.question.subBattery === gq.question.subBattery
        );

        if (!splitGroup || !splitGroup.responseGroup) {
          profileParts.push("null");
        } else {
          // Find which response group index this is
          const responseGroupIdx = gq.responseGroups.findIndex(
            (rg) =>
              rg.values.length === splitGroup.responseGroup!.values.length &&
              rg.values.every((v) => splitGroup.responseGroup!.values.includes(v))
          );
          profileParts.push(responseGroupIdx.toString());
        }
      }

      const profileKey = profileParts.join(":");
      profileToSplitIndex[profileKey] = splitIdx;
    }

    // Insert the initialized visualization
    await db.insert(sessionVisualizations).values({
      sessionId: session.id,
      visualizationId: id,
      basisSplitIndices,
      splits,
      lookupMaps: {
        responseIndexToGroupIndex,
        profileToSplitIndex,
      },
    });
  }

  return session;
}

/**
 * Clean up existing session fixtures from the database
 * Removes sessions created by seedExistingSession
 * 
 * @param db - Database connection
 */
export async function cleanExistingSessions(db: ReturnType<typeof drizzle>): Promise<void> {
  const { existingOpenSession, existingClosedSession } =
    await import("../fixtures/test-sessions");

  // Delete sessions by their slugs
  // CASCADE will handle related poll questions, visualizations, respondents, responses
  await db
    .delete(sessions)
    .where(
      inArray(sessions.slug, [
        existingOpenSession.slug,
        existingClosedSession.slug,
      ])
    );
}

/**
 * SSE Event received from the visualization stream
 */
export interface StreamEvent {
  type: string;
  data: any;
}

/**
 * SSE Stream Listener for testing visualization updates
 */
export interface StreamListener {
  /** All events received so far */
  events: StreamEvent[];
  /** Wait for a specific event type */
  waitForEvent: (eventType: string, timeout?: number) => Promise<any>;
  /** Close the connection */
  close: () => void;
}

/**
 * Create an SSE listener for visualization stream
 * 
 * Connects to GET /visualizations/session/:sessionId/stream
 * and collects all events for testing.
 * 
 * @param sessionId - The session ID to listen to
 * @returns Stream listener with collected events
 * 
 * @example
 * const listener = await createVisualizationStreamListener(sessionId);
 * 
 * // Wait for snapshot
 * const snapshot = await listener.waitForEvent('visualization.snapshot');
 * 
 * // Submit responses...
 * 
 * // Wait for update
 * const update = await listener.waitForEvent('visualization.updated', 10000);
 * 
 * // Cleanup
 * listener.close();
 */
export async function createVisualizationStreamListener(sessionId: number): Promise<StreamListener> {
  const publicApiUrl = getPublicApiUrl();
  const url = `${publicApiUrl}/visualizations/session/${sessionId}/stream`;

  const events: StreamEvent[] = [];
  const eventEmitter = new (await import('events')).EventEmitter();

  // Fetch API with SSE parsing
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to connect to stream: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('Response body is not readable');
  }

  let buffer = '';
  let currentEvent: { event?: string; data?: string } = {};

  // Parse SSE stream in background
  const parseStream = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          // Empty line = end of event
          if (line === '') {
            if (currentEvent.event && currentEvent.data) {
              const event: StreamEvent = {
                type: currentEvent.event,
                data: JSON.parse(currentEvent.data),
              };
              events.push(event);
              eventEmitter.emit('event', event);
              eventEmitter.emit(event.type, event.data);
            }
            currentEvent = {};
            continue;
          }

          // Parse SSE fields
          if (line.startsWith('event:')) {
            currentEvent.event = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            currentEvent.data = (currentEvent.data || '') + line.substring(5).trim();
          }
          // Ignore comments (lines starting with :)
        }
      }
    } catch (error) {
      console.error('Error reading SSE stream:', error);
    }
  };

  // Start parsing in background
  parseStream();

  return {
    events,

    waitForEvent: (eventType: string, timeout = 5000): Promise<any> => {
      return new Promise((resolve, reject) => {
        // Check if event already received
        const existingEvent = events.find(e => e.type === eventType);
        if (existingEvent) {
          resolve(existingEvent.data);
          return;
        }

        // Wait for event
        const timer = setTimeout(() => {
          eventEmitter.off(eventType, handler);
          reject(new Error(`Timeout waiting for event: ${eventType} (${timeout}ms)`));
        }, timeout);

        const handler = (data: any) => {
          clearTimeout(timer);
          resolve(data);
        };

        eventEmitter.once(eventType, handler);
      });
    },

    close: () => {
      reader.cancel();
      eventEmitter.removeAllListeners();
    },
  };
}