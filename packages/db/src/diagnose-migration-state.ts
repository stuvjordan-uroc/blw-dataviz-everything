#!/usr/bin/env tsx
/**
 * Diagnostic script to check migration state vs actual database schema
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../../../.env') });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  console.log('🔍 Diagnosing migration state...\n');

  try {
    // Check which migrations are recorded
    console.log('📋 Recorded migrations in __drizzle_migrations:');
    const migrations = await sql`
      SELECT hash, created_at 
      FROM drizzle.__drizzle_migrations 
      ORDER BY hash
    `;
    console.table(migrations);
    console.log(`Total recorded migrations: ${migrations.length}\n`);

    // Check if problematic columns exist
    console.log('🔎 Checking for columns from migration 0017 (grid_labels, view_id_lookup):');
    const sessionVizColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'polls' 
        AND table_name = 'session_visualizations'
        AND column_name IN ('grid_labels', 'view_id_lookup')
      ORDER BY column_name
    `;
    console.table(sessionVizColumns);
    console.log(`Found ${sessionVizColumns.length}/2 expected columns from migration 0017\n`);

    // Check if new prefix column exists
    console.log('🔎 Checking for new prefix column in sub_batteries:');
    const subBatteryColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'questions' 
        AND table_name = 'sub_batteries'
        AND column_name = 'prefix'
    `;
    console.table(subBatteryColumns);
    console.log(`Prefix column exists: ${subBatteryColumns.length > 0}\n`);

    // Check all columns in sub_batteries for reference
    console.log('📋 All columns in questions.sub_batteries:');
    const allSubBatteryColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'questions' 
        AND table_name = 'sub_batteries'
      ORDER BY ordinal_position
    `;
    console.table(allSubBatteryColumns);

    console.log('\n🎯 DIAGNOSIS:');
    if (sessionVizColumns.length === 2) {
      console.log('❌ Migration 0017 columns exist but migration may not be recorded');
      if (migrations.length < 17) {
        console.log(`   Migration table has ${migrations.length} entries but should have at least 17`);
        console.log('   → Need to manually insert missing migration records');
      } else if (migrations.length === 17) {
        console.log('   Migration table has 17 entries, but 0017 might have failed to record');
        console.log('   → Need to check if hash 17 exists or manually insert it');
      } else {
        console.log('   Migration table looks complete but db:migrate is re-running old migrations');
        console.log('   → Drizzle migration journal may be out of sync with database');
      }
    } else {
      console.log('✅ Migration 0017 columns do not exist - normal state');
    }

    if (subBatteryColumns.length > 0) {
      console.log('✅ New prefix column already exists - migration 0018 was manually applied');
    } else {
      console.log('⏳ New prefix column does not exist - migration 0018 needs to be applied');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

main();
