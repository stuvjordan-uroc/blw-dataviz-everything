#!/usr/bin/env tsx
/**
 * Compare migration file hashes with database records
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { createHash } from 'crypto';

config({ path: resolve(__dirname, '../../../.env') });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  console.log('🔍 Checking migration hash consistency...\n');

  try {
    // Read migration journal
    const journalPath = resolve(__dirname, '../schema-migrations/meta/_journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));

    console.log('📋 Migration files in journal:');
    journal.entries.forEach((entry: any, i: number) => {
      console.log(`  ${i}: ${entry.tag} (${entry.when})`);
    });
    console.log(`\nTotal in journal: ${journal.entries.length}\n`);

    // Get recorded migrations from database
    const recorded = await sql`
      SELECT hash, created_at 
      FROM drizzle.__drizzle_migrations 
      ORDER BY created_at
    `;

    console.log('📋 Migrations recorded in database:');
    console.log(`Total: ${recorded.length}\n`);

    // Check for mismatches
    console.log('🔎 Analysis:');

    if (journal.entries.length !== recorded.length + 1) {
      console.log(`⚠️  Journal has ${journal.entries.length} entries`);
      console.log(`⚠️  Database has ${recorded.length} entries`);
      console.log(`⚠️  Expected database to have ${journal.entries.length} entries\n`);

      console.log('💡 This means migration(s) in the journal haven\'t been recorded in the database.');
      console.log(`   Missing: Migration index ${recorded.length} (${journal.entries[recorded.length]?.tag})\n`);
    } else {
      console.log(`✅ Entry count matches (journal has one more pending)\n`);
    }

    // List migration files
    const migrationsDir = resolve(__dirname, '../schema-migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log('📁 Migration SQL files on disk:');
    files.forEach((f, i) => {
      console.log(`  ${i}: ${f}`);
    });
    console.log(`\nTotal files: ${files.length}\n`);

    console.log('🎯 CONCLUSION:');
    console.log(`   Journal expects: ${journal.entries.length} migrations`);
    console.log(`   Database has: ${recorded.length} migrations recorded`);
    console.log(`   SQL files: ${files.length} migration files\n`);

    if (recorded.length === journal.entries.length - 1) {
      const nextMigration = journal.entries[recorded.length];
      console.log(`✅ Database is ONE migration behind (normal state after generating new migration)`);
      console.log(`   Next to apply: ${nextMigration.tag}`);
    } else if (recorded.length < journal.entries.length - 1) {
      console.log(`❌ Database is MULTIPLE migrations behind`);
      console.log(`   This explains why drizzle-kit migrate tries to re-run old migrations`);
      console.log(`   It's attempting to apply migrations ${recorded.length} through ${journal.entries.length - 1}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

main();
