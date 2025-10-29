import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

/**
 * A data migration that can be applied (up) or rolled back (down)
 */
export interface DataMigration {
  /** Unique name for this migration (e.g., "questions_0001_initial_batteries") */
  name: string;

  /** Apply the migration */
  up: (db: PostgresJsDatabase) => Promise<void>;

  /** Rollback the migration */
  down: (db: PostgresJsDatabase) => Promise<void>;
}

/**
 * Migrations organized by PostgreSQL schema
 */
export interface SchemaMigrations {
  /** Name of the PostgreSQL schema (e.g., "questions", "responses") */
  schema: string;

  /** All migrations for this schema, in execution order */
  migrations: DataMigration[];
}