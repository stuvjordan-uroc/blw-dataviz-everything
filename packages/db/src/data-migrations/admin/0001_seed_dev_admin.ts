import type { DataMigration } from '../types';
import { users } from 'shared-schemas/src/schemas/admin';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

/**
 * Seed development admin user
 * 
 * This migration creates a default admin user for local development.
 * It is SKIPPED in production environments for security.
 * 
 * The admin credentials come from environment variables:
 * - INITIAL_ADMIN_EMAIL (default: admin@dev.local)
 * - INITIAL_ADMIN_PASSWORD (default: dev-password-changeme)
 */
export const migration: DataMigration = {
  name: 'admin_0001_seed_dev_admin',

  up: async (db) => {
    // Skip in production for security
    if (process.env.NODE_ENV === 'production') {
      console.log('⏭️  Skipping dev admin seed in production environment');
      return;
    }

    console.log('🌱 Seeding development admin user...');

    const email = process.env.INITIAL_ADMIN_EMAIL || 'admin@dev.local';
    const password = process.env.INITIAL_ADMIN_PASSWORD || 'dev-password-changeme';

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert the admin user (skip if already exists)
    const [adminUser] = await db
      .insert(users)
      .values({
        email,
        name: 'Dev Administrator',
        passwordHash,
      })
      .onConflictDoNothing()
      .returning();

    if (adminUser) {
      console.log('✅ Development admin user created');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Name: ${adminUser.name}`);
      console.log(`   ID: ${adminUser.id}`);
    } else {
      console.log('ℹ️  Development admin user already exists');
    }
  },

  down: async (db) => {
    // Skip in production
    if (process.env.NODE_ENV === 'production') {
      console.log('⏭️  Skipping dev admin removal in production environment');
      return;
    }

    console.log('🧹 Removing development admin user...');

    const email = process.env.INITIAL_ADMIN_EMAIL || 'admin@dev.local';

    await db.delete(users).where(eq(users.email, email));

    console.log('✅ Development admin user removed');
  },
};
