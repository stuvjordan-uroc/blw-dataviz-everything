/**
 * Data Migrations Index
 * 
 * Central export point for all data migrations organized by PostgreSQL schema.
 * 
 * IMPORTANT: When schema changes, update ALL data migrations to work with
 * the current schema definitions.
 */

import type { SchemaMigrations, DataMigration } from './types';
import questionsMigrations from './questions/index.js';
// import { responsesMigrations } from './responses'; // Add when responses schema exists

/**
 * All data migrations organized by PostgreSQL schema
 * 
 * Migrations within each schema are independent.
 * Migrations execute in this order:
 * 1. questions
 * 2. responses (when added)
 */
export const allMigrationsBySchema: SchemaMigrations[] = [
  {
    schema: 'questions',
    migrations: questionsMigrations,
  },
  // Add more schemas here as they are created
  // {
  //   schema: 'responses',
  //   migrations: responsesMigrations,
  // },
];

/**
 * Flattened list of all migrations for running all at once
 */
export const allMigrations: DataMigration[] = allMigrationsBySchema.flatMap(
  s => s.migrations
);

// Re-export everything from core for convenience
export {
  runDataMigrations,
  rollbackDataMigration,
  rollbackAllDataMigrations,
  getAppliedMigrations,
  ensureTrackingTable,
  dataMigrationsTracking,
} from './core';

export type { RunMigrationsOptions, RollbackAllOptions } from './core';
export type { DataMigration, SchemaMigrations } from './types';