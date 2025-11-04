import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

/**
 * Test Helper Utilities
 * 
 * Provides utilities for integration tests that run against a containerized API.
 * These helpers manage direct database connections for seeding data and cleanup.
 */

/**
 * Get the test database connection
 * 
 * Connects to the test database running in the postgres-test container.
 * The connection URL should be provided via TEST_DATABASE_URL env var.
 */
export function getTestDb() {
  const connectionString = process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:password@localhost:5433/blw_dataviz_test';

  const client = postgres(connectionString, {
    max: 1,
    onnotice: () => { }, // Suppress NOTICE messages
  });

  return {
    db: drizzle(client),
    client,
    cleanup: async () => {
      await client.end();
    }
  };
}

/**
 * Get the test API URL
 * 
 * Returns the URL for the containerized API running in api-polls-admin-test container.
 */
export function getTestApiUrl(): string {
  return process.env.TEST_API_URL || 'http://localhost:3004';
}

/**
 * Seed a test admin user into the database
 * 
 * This is useful for auth tests that need to test user creation/deletion.
 * For other tests, use the admin created by data migrations (admin@dev.local).
 * 
 * @param db - Database instance
 * @param email - User email (defaults to test@example.com)
 * @param password - Plain password (defaults to 'password123')
 * @returns Object with user data and plain password
 */
export async function seedTestAdminUser(
  db: ReturnType<typeof drizzle>,
  email: string = 'test@example.com',
  password: string = 'password123'
) {
  const bcrypt = await import('bcrypt');
  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db.execute(sql`
    INSERT INTO "admin"."users" (email, name, password_hash, is_active)
    VALUES (${email}, 'Test User', ${passwordHash}, true)
    RETURNING id, email, name, is_active, created_at
  `);

  return {
    user,
    password, // Return plain password for testing login
  };
}

/**
 * Clean session-related tables between tests
 * 
 * Truncates session data but preserves questions, batteries, and users.
 * Use this in afterEach hooks to clean up between tests.
 * 
 * @param db - Database instance
 */
export async function cleanSessionData(db: ReturnType<typeof drizzle>) {
  await db.execute(sql`
    TRUNCATE TABLE 
      "polls"."responses",
      "polls"."respondents",
      "polls"."questions",
      "polls"."sessions"
    CASCADE
  `);
}

/**
 * Clean all test data
 * 
 * Truncates all tables. Use this sparingly, typically only in beforeAll
 * or when you need a complete reset.
 * 
 * @param db - Database instance
 */
export async function cleanAllData(db: ReturnType<typeof drizzle>) {
  await db.execute(sql`
    TRUNCATE TABLE 
      "admin"."users",
      "polls"."responses",
      "polls"."respondents",
      "polls"."questions",
      "polls"."session_statistics",
      "polls"."sessions",
      "questions"."questions",
      "questions"."sub_batteries",
      "questions"."batteries"
    CASCADE
  `);
}

/**
 * Wait for a condition to be true (polling with timeout)
 * 
 * Useful for waiting for async operations to complete
 * 
 * @param condition - Function that returns true when condition is met
 * @param timeoutMs - Maximum time to wait (default 5000ms)
 * @param intervalMs - How often to check (default 100ms)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
}

/**
 * Extract JWT token from login response
 * 
 * @param loginResponse - Response from login endpoint
 * @returns JWT access token
 */
export function extractToken(loginResponse: { body: { accessToken?: string; access_token?: string } }): string {
  return loginResponse.body.accessToken || loginResponse.body.access_token || '';
}

