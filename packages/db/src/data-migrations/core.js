"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataMigrationsTracking = void 0;
exports.ensureTrackingTable = ensureTrackingTable;
exports.getAppliedMigrations = getAppliedMigrations;
exports.runDataMigrations = runDataMigrations;
exports.rollbackDataMigration = rollbackDataMigration;
exports.rollbackAllDataMigrations = rollbackAllDataMigrations;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const index_1 = require("../index"); // ...existing code...
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
exports.dataMigrationsTracking = (0, pg_core_1.pgTable)('data_migrations', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.text)('name').notNull().unique(),
    schema: (0, pg_core_1.text)('schema').notNull(),
    appliedAt: (0, pg_core_1.timestamp)('applied_at').notNull().defaultNow(),
});
/**
 * Ensure the tracking table exists
 * Safe to call multiple times - uses CREATE TABLE IF NOT EXISTS
 */
async function ensureTrackingTable() {
    await index_1.db.execute((0, drizzle_orm_1.sql) `
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
async function getAppliedMigrations(schema) {
    await ensureTrackingTable();
    const query = schema
        ? index_1.db
            .select({ name: exports.dataMigrationsTracking.name })
            .from(exports.dataMigrationsTracking)
            .where((0, drizzle_orm_1.sql) `${exports.dataMigrationsTracking.schema} = ${schema}`)
        : index_1.db
            .select({ name: exports.dataMigrationsTracking.name })
            .from(exports.dataMigrationsTracking);
    const applied = await query;
    return new Set(applied.map(m => m.name));
}
/**
 * Mark a migration as applied in the tracking table
 */
async function markMigrationApplied(name, schema) {
    await index_1.db.insert(exports.dataMigrationsTracking).values({ name, schema });
}
/**
 * Remove a migration from the tracking table (for rollback)
 */
async function markMigrationUnapplied(name) {
    await index_1.db.delete(exports.dataMigrationsTracking)
        .where((0, drizzle_orm_1.sql) `${exports.dataMigrationsTracking.name} = ${name}`);
}
/**
 * Run all pending data migrations
 *
 * @param migrations - Array of migrations to run
 * @param options - Configuration options
 */
async function runDataMigrations(migrations, options = {}) {
    const { verbose = true } = options;
    const applied = await getAppliedMigrations(options.schema);
    let ranCount = 0;
    let skippedCount = 0;
    for (const migration of migrations) {
        if (!applied.has(migration.name)) {
            if (verbose) {
                console.log(`🔄 Running: ${migration.name}`);
            }
            try {
                await migration.up(index_1.db);
                // Extract schema from migration name (e.g., "questions_0001_..." -> "questions")
                const schema = migration.name.split('_')[0];
                await markMigrationApplied(migration.name, schema);
                if (verbose) {
                    console.log(`✓ Completed: ${migration.name}`);
                }
                ranCount++;
            }
            catch (error) {
                console.error(`✗ Failed: ${migration.name}`);
                throw error;
            }
        }
        else {
            if (verbose) {
                console.log(`⊘ Skipping (already applied): ${migration.name}`);
            }
            skippedCount++;
        }
    }
    if (verbose) {
        console.log(`\nSummary: ${ranCount} applied, ${skippedCount} skipped`);
    }
}
/**
 * Rollback a specific migration
 *
 * @param migrations - All available migrations
 * @param migrationName - Name of the migration to rollback
 */
async function rollbackDataMigration(migrations, migrationName) {
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
        await migration.down(index_1.db);
        await markMigrationUnapplied(migrationName);
        console.log(`✓ Rolled back: ${migrationName}`);
    }
    catch (error) {
        console.error(`✗ Rollback failed: ${migrationName}`);
        throw error;
    }
}
/**
 * Rollback all applied migrations in reverse order
 *
 * @param migrations - All available migrations
 * @param options - Configuration options
 */
async function rollbackAllDataMigrations(migrations, options = {}) {
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
//# sourceMappingURL=core.js.map