import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "dotenv";

config({ path: "../../.env" });

/**
 * Create a database connection with the given URL
 * 
 * @param databaseUrl - Connection string (defaults to DATABASE_URL from env)
 * @returns Drizzle database instance
 */
export function createDbConnection(databaseUrl?: string) {
  const connectionString = databaseUrl || process.env.DATABASE_URL!;

  if (!connectionString) {
    throw new Error('Database URL is required. Set DATABASE_URL environment variable or pass it explicitly.');
  }

  const client = postgres(connectionString, {
    onnotice: () => { }, // Suppress PostgreSQL NOTICE messages
  });

  return drizzle(client, { logger: false });
}

/**
 * Get the appropriate database URL
 * For data migrations, TEST_DATABASE_URL takes precedence to allow testing
 * Otherwise uses DATABASE_URL
 */
function getDatabaseUrl(): string {
  // Check if we're in test mode - TEST_DATABASE_URL should ONLY be used by test:db-populate
  if (process.env.TEST_DATABASE_URL) {
    // Safety check: Only allow TEST_DATABASE_URL if it actually contains 'test' in the database name
    if (!process.env.TEST_DATABASE_URL.includes('_test')) {
      throw new Error(
        'TEST_DATABASE_URL must contain "_test" in database name for safety. ' +
        `Got: ${process.env.TEST_DATABASE_URL}`
      );
    }
    console.log('⚠️  Using TEST_DATABASE_URL - migrations will run against test database');
    return process.env.TEST_DATABASE_URL;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return process.env.DATABASE_URL;
}

/**
 * Default database instance
 * - Uses DATABASE_URL in normal operation
 * - Uses TEST_DATABASE_URL when explicitly set (for test:db-populate)
 * - Validates that TEST_DATABASE_URL contains "_test" for safety
 */
export const db = createDbConnection(getDatabaseUrl());

export * from "shared-schemas";
