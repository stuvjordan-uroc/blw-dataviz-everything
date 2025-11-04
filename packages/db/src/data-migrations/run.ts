#!/usr/bin/env tsx
/**
 * Run all pending data migrations
 * 
 * Usage:
 *   npm run data:migrate              # Run all migrations
 *   npm run data:migrate questions    # Run only questions schema migrations
 *   npm run data:migrate responses    # Run only responses schema migrations
 */

import { runDataMigrations, allMigrations, allMigrationsBySchema, getAppliedMigrations } from './index';

const schemaArg = process.argv[2]; // e.g., 'questions' or 'responses'

async function main() {
  let migrationsToRun;
  let schemaFilter: string | undefined;

  if (schemaArg) {
    const schemaMigrations = allMigrationsBySchema.find(s => s.schema === schemaArg);

    if (!schemaMigrations) {
      console.error(`❌ Unknown schema: ${schemaArg}`);
      console.log(`\nAvailable schemas: ${allMigrationsBySchema.map(s => s.schema).join(', ')}`);
      process.exit(1);
    }

    console.log(`Running data migrations for schema: ${schemaArg}\n`);
    migrationsToRun = schemaMigrations.migrations;
    schemaFilter = schemaArg;
  } else {
    console.log('Running all data migrations...\n');
    migrationsToRun = allMigrations;
  }

  // Check what's already applied and show a preview
  const applied = await getAppliedMigrations(schemaFilter);
  const pending = migrationsToRun.filter(m => !applied.has(m.name));
  const alreadyApplied = migrationsToRun.filter(m => applied.has(m.name));

  if (pending.length === 0) {
    console.log('✅ All migrations are already applied!');
    if (alreadyApplied.length > 0) {
      console.log(`\n📋 Applied migrations (${alreadyApplied.length}):`);
      alreadyApplied.forEach(m => console.log(`   ✓ ${m.name}`));
    }
    console.log('\n🎉 Nothing to do - database is up to date');
    process.exit(0);
  }

  console.log(`📋 Found ${pending.length} pending migration(s):`);
  pending.forEach(m => console.log(`   • ${m.name}`));

  if (alreadyApplied.length > 0) {
    console.log(`\n⊘ Skipping ${alreadyApplied.length} already applied:`);
    alreadyApplied.forEach(m => console.log(`   ✓ ${m.name}`));
  }

  console.log('\n🔄 Applying pending migrations...\n');

  await runDataMigrations(migrationsToRun);

  console.log('\n✅ Migration run complete');
  process.exit(0);
}

main().catch((error) => {
  console.error('\n❌ Error running data migrations:', error);
  process.exit(1);
});