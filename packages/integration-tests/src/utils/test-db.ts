import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables (suppress dotenv logs in tests)
config({ path: path.join(__dirname, '../../../.env'), debug: false });

/**
 * Test Database Manager
 * 
 * This utility manages test database lifecycle:
 * - Creates connections to a separate test database
 * - Runs migrations from the db package
 * - Provides cleanup utilities
 * - Ensures test isolation
 */

export interface TestDbConnection {
  db: ReturnType<typeof drizzle>;
  client: ReturnType<typeof postgres>;
  cleanup: () => Promise<void>;
}

/**
 * Get the test database connection string
 * 
 * Strategy: Use TEST_DATABASE_URL if set, otherwise modify DATABASE_URL
 * to use a different database name (appends _test)
 */
function getTestDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL;
  }

  // Default: modify the development DATABASE_URL
  const devUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/blw_dataviz';

  // Replace database name with _test suffix
  // Example: blw_dataviz -> blw_dataviz_test
  return devUrl.replace(/\/([^/]+)(\?.*)?$/, '/$1_test$2');
}

/**
 * Setup test database connection and run migrations
 * 
 * This should be called in a beforeAll() hook in your test suites
 * 
 * @returns Object containing db instance, client, and cleanup function
 */
export async function setupTestDatabase(): Promise<TestDbConnection> {
  const connectionString = getTestDatabaseUrl();

  console.log('🔧 Setting up test database...');

  // Create database client
  const client = postgres(connectionString, {
    max: 1, // Single connection for tests
    onnotice: () => { }, // Suppress NOTICE messages from Postgres
  });

  // Create drizzle instance
  const db = drizzle(client);

  // Run migrations from the db package
  const migrationsFolder = path.join(__dirname, '../../../db/schema-migrations');

  try {
    console.log('📦 Running migrations...');
    await migrate(db, { migrationsFolder });
    console.log('✅ Test database ready');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await client.end();
    throw error;
  }

  // Cleanup function to be called in afterAll()
  const cleanup = async () => {
    console.log('🧹 Cleaning up test database...');
    await cleanupAllTables(db);
    await client.end();
    console.log('✅ Cleanup complete');
  };

  return { db, client, cleanup };
}

/**
 * Clean all data from all tables (for test isolation)
 * 
 * This truncates all tables but keeps the schema intact.
 * Called between test suites to ensure isolation.
 */
async function cleanupAllTables(db: ReturnType<typeof drizzle>): Promise<void> {
  // Truncate all tables in the correct order (respecting foreign keys)
  // We use CASCADE to handle foreign key constraints

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
 * Clean specific tables
 * 
 * Use this when you only want to clean certain tables between tests
 * within the same test suite
 * 
 * @param db - Drizzle database instance
 * @param tables - Table names, can be schema-qualified (e.g., 'admin.users')
 */
export async function cleanTables(
  db: ReturnType<typeof drizzle>,
  tables: string[]
): Promise<void> {
  // Handle schema-qualified table names: 'admin.users' -> '"admin"."users"'
  const tableList = tables.map(t => {
    if (t.includes('.')) {
      const [schema, table] = t.split('.');
      return `"${schema}"."${table}"`;
    }
    return `"${t}"`;
  }).join(', ');
  await db.execute(sql.raw(`TRUNCATE TABLE ${tableList} CASCADE`));
}

/**
 * Drop and recreate the test database (nuclear option)
 * 
 * Only use this if you need to completely reset the database schema.
 * Normally, the migration-based approach is preferred.
 */
export async function resetTestDatabase(): Promise<void> {
  const connectionString = getTestDatabaseUrl();
  const dbName = connectionString.match(/\/([^/?]+)(\?|$)/)?.[1];

  if (!dbName || !dbName.includes('test')) {
    throw new Error('Safety check: Can only reset databases with "test" in the name');
  }

  // Connect to postgres database to drop/create the test database
  const adminUrl = connectionString.replace(/\/[^/]+(\?.*)?$/, '/postgres$1');
  const adminClient = postgres(adminUrl);

  try {
    console.log(`🔄 Resetting test database: ${dbName}`);

    // Drop database if exists
    await adminClient.unsafe(`DROP DATABASE IF EXISTS "${dbName}"`);

    // Create fresh database
    await adminClient.unsafe(`CREATE DATABASE "${dbName}"`);

    console.log('✅ Test database reset complete');
  } finally {
    await adminClient.end();
  }
}
