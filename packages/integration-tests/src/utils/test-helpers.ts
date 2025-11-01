import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

/**
 * Test Helper Utilities
 * 
 * Common functions used across multiple test suites
 */

/**
 * Seed a test admin user into the database
 * 
 * This is useful for tests that require an authenticated user.
 * Returns the created user (without password hash) and the plain password.
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
 * Seed test questions and batteries
 * 
 * Creates a basic set of test questions that can be used in tests
 * 
 * @param db - Database instance
 */
export async function seedTestQuestions(db: ReturnType<typeof drizzle>) {
  // Create a test battery
  await db.execute(sql`
    INSERT INTO "questions"."batteries" (name, prefix)
    VALUES ('test_battery', 'TEST')
    ON CONFLICT (name) DO NOTHING
  `);

  // Create a default sub_battery (empty string) for questions without sub-batteries
  await db.execute(sql`
    INSERT INTO "questions"."sub_batteries" ("batteryName", name)
    VALUES ('test_battery', '')
    ON CONFLICT ("batteryName", name) DO NOTHING
  `);

  // Create test questions (subBattery is '' for questions without a specific sub-battery)
  await db.execute(sql`
    INSERT INTO "questions"."questions" ("varName", text, "batteryName", "subBattery", responses)
    VALUES 
      ('q1', 'Test Question 1', 'test_battery', '', ARRAY['Yes', 'No']),
      ('q2', 'Test Question 2', 'test_battery', '', ARRAY['Agree', 'Disagree', 'Neutral'])
    ON CONFLICT ("varName", "batteryName", "subBattery") DO NOTHING
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
export function extractToken(loginResponse: any): string {
  return loginResponse.body.accessToken || loginResponse.body.access_token;
}
