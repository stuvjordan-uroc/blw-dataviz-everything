/**
 * Seed script to create the initial admin user
 * 
 * Usage:
 *   npm run seed:admin
 * 
 * Environment variables required:
 *   INITIAL_ADMIN_EMAIL - Email for the first admin user
 *   INITIAL_ADMIN_PASSWORD - Password for the first admin user
 * 
 * This script:
 * 1. Connects to the database
 * 2. Creates an admin user with the provided credentials
 * 3. Uses onConflict to prevent errors if the user already exists
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from 'shared-schemas/src/schemas/admin';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

// Load environment variables
config({ path: '../../.env' });

async function seedAdminUser() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('❌ Error: INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD environment variables are required');
    console.error('');
    console.error('Set them in your .env file:');
    console.error('  INITIAL_ADMIN_EMAIL=admin@example.com');
    console.error('  INITIAL_ADMIN_PASSWORD=yourSecurePassword');
    process.exit(1);
  }

  console.log('🌱 Seeding admin user...');
  console.log(`   Email: ${email}`);

  // Connect to database
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert the admin user
    const [adminUser] = await db
      .insert(users)
      .values({
        email,
        name: 'System Administrator',
        passwordHash,
      })
      .onConflictDoNothing() // Don't fail if user already exists
      .returning();

    if (adminUser) {
      console.log('✅ Admin user created successfully!');
      console.log(`   ID: ${adminUser.id}`);
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Name: ${adminUser.name}`);
    } else {
      console.log('ℹ️  Admin user already exists with this email');
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await client.end();
  }

  console.log('');
  console.log('🎉 Seeding complete!');
  process.exit(0);
}

seedAdminUser();
