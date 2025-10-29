#!/usr/bin/env tsx
/**
 * Reset data migrations (for development only!)
 * Rolls back all data migrations in reverse order
 * 
 * Usage:
 *   npm run data:reset              # Rollback all migrations
 *   npm run data:reset questions    # Rollback only questions schema migrations
 *   npm run data:reset responses    # Rollback only responses schema migrations
 */

import { rollbackAllDataMigrations, allMigrations, allMigrationsBySchema } from './index';

const schemaArg = process.argv[2]; // e.g., 'questions' or 'responses'

async function main() {
  console.log('⚠️  WARNING: This will rollback data migrations!\n');

  if (schemaArg) {
    const schemaMigrations = allMigrationsBySchema.find(s => s.schema === schemaArg);

    if (!schemaMigrations) {
      console.error(`❌ Unknown schema: ${schemaArg}`);
      console.log(`\nAvailable schemas: ${allMigrationsBySchema.map(s => s.schema).join(', ')}`);
      process.exit(1);
    }

    console.log(`Rolling back data migrations for schema: ${schemaArg}\n`);
    await rollbackAllDataMigrations(schemaMigrations.migrations, { schema: schemaArg });
  } else {
    console.log('Rolling back all data migrations...\n');
    await rollbackAllDataMigrations(allMigrations);
  }

  console.log('\n✅ Rollback complete');
  process.exit(0);
}

main().catch((error) => {
  console.error('\n❌ Error rolling back data migrations:', error);
  process.exit(1);
});