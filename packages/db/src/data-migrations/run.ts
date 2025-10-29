#!/usr/bin/env tsx
/**
 * Run all pending data migrations
 * 
 * Usage:
 *   npm run data:migrate              # Run all migrations
 *   npm run data:migrate questions    # Run only questions schema migrations
 *   npm run data:migrate responses    # Run only responses schema migrations
 */

import { runDataMigrations, allMigrations, allMigrationsBySchema } from './index';

const schemaArg = process.argv[2]; // e.g., 'questions' or 'responses'

async function main() {
  if (schemaArg) {
    const schemaMigrations = allMigrationsBySchema.find(s => s.schema === schemaArg);

    if (!schemaMigrations) {
      console.error(`❌ Unknown schema: ${schemaArg}`);
      console.log(`\nAvailable schemas: ${allMigrationsBySchema.map(s => s.schema).join(', ')}`);
      process.exit(1);
    }

    console.log(`Running data migrations for schema: ${schemaArg}\n`);
    console.log('Migrations to run:', schemaMigrations.migrations);
    await runDataMigrations(schemaMigrations.migrations);
  } else {
    console.log('Running all data migrations...\n');
    await runDataMigrations(allMigrations);
  }

  console.log('\n✅ Migration run complete');
  process.exit(0);
}

main().catch((error) => {
  console.error('\n❌ Error running data migrations:', error);
  process.exit(1);
});