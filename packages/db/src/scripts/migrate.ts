import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config } from 'dotenv';
import { readdirSync, existsSync } from 'fs';
import path from 'path';

config({ path: '../../../.env' });

async function runUnifiedMigrations(): Promise<void> {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(sql);

  try {
    console.log('Running schema migrations...');
    const migrationsDir = path.join(__dirname, '../migrations');

    if (!existsSync(migrationsDir)) {
      console.log('No migrations directory found. Creating...');
      return;
    }

    await migrate(db, { migrationsFolder: migrationsDir });
    console.log('Schema migrations completed.');

    console.log('Running data migrations...');
    const dataMigrations = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.ts') && f !== 'meta')
      .sort();

    for (const migrationFile of dataMigrations) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      console.log(`Running data migration: ${migrationFile}`);

      try {
        // Dynamic import of the migration file
        const migration = await import(migrationPath);
        if (migration.up) {
          await migration.up();
        } else {
          console.warn(`No 'up' function found in ${migrationFile}`);
        }
      } catch (error) {
        console.error(`Error running data migration ${migrationFile}:`, error);
        throw error;
      }
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

async function rollbackLastMigration(): Promise<void> {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

  try {
    console.log('Rolling back last migration...');
    const migrationsDir = path.join(__dirname, '../migrations');

    const dataMigrations = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.ts'))
      .sort()
      .reverse(); // Get latest first

    if (dataMigrations.length === 0) {
      console.log('No data migrations found to rollback.');
      return;
    }

    const latestMigration = dataMigrations[0];
    const migrationPath = path.join(migrationsDir, latestMigration);

    console.log(`Rolling back: ${latestMigration}`);
    const migration = await import(migrationPath);

    if (migration.down) {
      await migration.down();
      console.log('Rollback completed successfully!');
    } else {
      console.warn(`No 'down' function found in ${latestMigration}`);
    }
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// CLI interface
const action = process.argv[2];

if (action === 'rollback') {
  rollbackLastMigration().catch(console.error);
} else {
  runUnifiedMigrations().catch(console.error);
}