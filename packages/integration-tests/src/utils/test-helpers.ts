/**
 * Test Helpers for Integration Tests
 * Based on the actual API schemas and surfaces built
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

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
