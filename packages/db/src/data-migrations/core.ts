import { pgTable, text, timestamp, serial } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { DataMigration } from './types';
import { db } from '../index';// ...existing code...

/**
 * Core data migration functionality
 * 
 * This module provides:
 * - Tracking table for applied migrations
 * - Functions to run and rollback migrations
 * - Query functions to check migration status

/**
 * Table to track which data migrations have been applied
 * 
 * This table lives in the default 'public' schema and tracks
 * migrations across all PostgreSQL schemas.
 */
export const dataMigrationsTracking = pgTable('data_migrations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  schema: text('schema').notNull(),
  appliedAt: timestamp('applied_at').notNull().defaultNow(),
});

/**
 * Ensure the tracking table exists
 * Safe to call multiple times - uses CREATE TABLE IF NOT EXISTS
 */
export async function ensureTrackingTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS data_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      schema TEXT NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * Get the set of all applied migration names
 * 
 * @param schema - Optional: filter by PostgreSQL schema name
 * @returns Set of migration names that have been applied
 */
export async function getAppliedMigrations(schema?: string): Promise<Set<string>> {
  await ensureTrackingTable();

  const query = schema
    ? db
      .select({ name: dataMigrationsTracking.name })
      .from(dataMigrationsTracking)
      .where(sql`${dataMigrationsTracking.schema} = ${schema}`)
    : db
      .select({ name: dataMigrationsTracking.name })
      .from(dataMigrationsTracking);

  const applied = await query;
  return new Set(applied.map(m => m.name));
}


/**
 * Mark a migration as applied in the tracking table
 */
async function markMigrationApplied(name: string, schema: string): Promise<void> {
  await db.insert(dataMigrationsTracking).values({ name, schema });
}

/**
 * Remove a migration from the tracking table (for rollback)
 */
async function markMigrationUnapplied(name: string): Promise<void> {
  await db.delete(dataMigrationsTracking)
    .where(sql`${dataMigrationsTracking.name} = ${name}`);
}

export interface RunMigrationsOptions {
  /** Optional: only run migrations for this PostgreSQL schema */
  schema?: string;

  /** If true, show detailed output */
  verbose?: boolean;
}

/**
 * Run all pending data migrations
 * 
 * @param migrations - Array of migrations to run
 * @param options - Configuration options
 */
export async function runDataMigrations(
  migrations: DataMigration[],
  options: RunMigrationsOptions = {}
): Promise<void> {
  const { verbose = true } = options;
  const applied = await getAppliedMigrations(options.schema);

  let ranCount = 0;

  for (const migration of migrations) {
    if (!applied.has(migration.name)) {
      if (verbose) {
        console.log(`🔄 Running: ${migration.name}`);
      }

      try {
        await migration.up(db);

        // Extract schema from migration name (e.g., "questions_0001_..." -> "questions")
        const schema = migration.name.split('_')[0];
        await markMigrationApplied(migration.name, schema);

        if (verbose) {
          console.log(`✅ Completed: ${migration.name}`);
        }
        ranCount++;
      } catch (error) {
        console.error(`❌ Failed: ${migration.name}`);
        throw error;
      }
    } else {
      // Don't log skipped migrations - they're already shown in the preview
    }
  }

  // Only show summary if we actually ran migrations
  if (verbose && ranCount > 0) {
    console.log(`\n✅ Successfully applied ${ranCount} migration(s)`);
  }
}

/**
 * Rollback a specific migration
 * 
 * @param migrations - All available migrations
 * @param migrationName - Name of the migration to rollback
 */
export async function rollbackDataMigration(
  migrations: DataMigration[],
  migrationName: string
): Promise<void> {
  const applied = await getAppliedMigrations();

  if (!applied.has(migrationName)) {
    throw new Error(`Migration "${migrationName}" has not been applied`);
  }

  const migration = migrations.find(m => m.name === migrationName);
  if (!migration) {
    throw new Error(`Migration "${migrationName}" not found`);
  }

  console.log(`🔄 Rolling back: ${migrationName}`);

  try {
    await migration.down(db);
    await markMigrationUnapplied(migrationName);
    console.log(`✓ Rolled back: ${migrationName}`);
  } catch (error) {
    console.error(`✗ Rollback failed: ${migrationName}`);
    throw error;
  }
}

export interface RollbackAllOptions {
  /** Optional: only rollback migrations for this PostgreSQL schema */
  schema?: string;

  /** If true, show detailed output */
  verbose?: boolean;
}

/**
 * Rollback all applied migrations in reverse order
 * 
 * @param migrations - All available migrations
 * @param options - Configuration options
 */
export async function rollbackAllDataMigrations(
  migrations: DataMigration[],
  options: RollbackAllOptions = {}
): Promise<void> {
  const { verbose = true } = options;
  const applied = await getAppliedMigrations(options.schema);

  // Filter to only applied migrations, then reverse the order
  const toRollback = migrations
    .filter(m => applied.has(m.name))
    .reverse();

  if (toRollback.length === 0) {
    if (verbose) {
      console.log('No migrations to rollback');
    }
    return;
  }

  for (const migration of toRollback) {
    await rollbackDataMigration(migrations, migration.name);
  }

  if (verbose) {
    console.log(`\n✓ Rolled back ${toRollback.length} migration(s)`);
  }
}