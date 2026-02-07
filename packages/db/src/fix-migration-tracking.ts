#!/usr/bin/env tsx
/**
 * Fix migration tracking by recording migration 0017 that was applied but not tracked
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

config({ path: resolve(__dirname, '../../../.env') });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  console.log('🔧 Fixing migration tracking...\n');

  try {
    // Read the migration file to compute its hash
    const migration17Path = resolve(__dirname, '../schema-migrations/0017_superb_gertrude_yorkes.sql');
    const migration17Content = readFileSync(migration17Path, 'utf-8');
    const hash = createHash('sha256').update(migration17Content).digest('hex');

    console.log('📋 Migration 0017 details:');
    console.log(`   File: 0017_superb_gertrude_yorkes.sql`);
    console.log(`   Hash: ${hash}`);
    console.log(`   Content: ${migration17Content.substring(0, 100)}...\n`);

    // Check if it's already recorded
    const existing = await sql`
      SELECT hash FROM drizzle.__drizzle_migrations 
      WHERE hash = ${hash}
    `;

    if (existing.length > 0) {
      console.log('✅ Migration 0017 is already recorded in the database!');
      console.log('   Nothing to do.\n');
    } else {
      console.log('⚠️  Migration 0017 is NOT recorded in the database.');
      console.log('   But we verified the columns exist from the first diagnostic.');
      console.log('\n🔧 Inserting migration record...\n');

      // Use the timestamp from the journal
      const timestamp = 1770217720973;

      await sql`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
        VALUES (${hash}, ${timestamp})
      `;

      console.log('✅ Successfully recorded migration 0017!\n');
    }

    // Verify the fix
    const count = await sql`
      SELECT COUNT(*) as count FROM drizzle.__drizzle_migrations
    `;
    console.log(`📊 Total migrations now recorded: ${count[0].count}`);
    console.log(`   Expected: 18 (0000-0017)`);

    if (count[0].count === '18') {
      console.log('\n✅ Migration tracking is now fixed!');
      console.log('   Next step: Run db:migrate on Railway to apply migration 0018 (prefix column)');
    } else {
      console.log(`\n⚠️  Expected 18 but got ${count[0].count}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
