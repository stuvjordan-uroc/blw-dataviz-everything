import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from 'shared-schemas';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

/**
 * Seed initial admin user
 * 
 * Uses ADMIN_EMAIL and ADMIN_PASSWORD from environment variables.
 * Upserts (updates if exists, inserts if not) to be idempotent.
 */
export async function seedAdmin(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set');
  }

  // Create database connection
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    // Check if admin user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    // Hash the password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    if (existingUser.length > 0) {
      // Update existing user
      await db
        .update(users)
        .set({
          passwordHash,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(users.email, adminEmail));

      console.log(`  ↻ Updated existing admin user: ${adminEmail}`);
    } else {
      // Insert new user
      await db.insert(users).values({
        email: adminEmail,
        name: 'Admin',
        passwordHash,
        isActive: true,
      });

      console.log(`  ✓ Created new admin user: ${adminEmail}`);
    }
  } finally {
    await client.end();
  }
}
