import { config } from 'dotenv';
import { resolve } from 'path';
import { seedAdmin } from './admin/seed-admin';
import { seedDemocraticCharacteristics } from './questions/seed-democratic-characteristics';

/**
 * Main seeding orchestrator
 * 
 * Runs all seed scripts in order to populate the database with initial data.
 * Seeds are idempotent - safe to run multiple times.
 */

async function main() {
  // Load environment variables from root .env
  config({ path: resolve(__dirname, '../../../../.env') });

  console.log('🌱 Starting database seeding...\n');

  try {
    // Seed admin user
    console.log('📋 Seeding admin user...');
    await seedAdmin();
    console.log('✅ Admin user seeded\n');

    // Seed democratic characteristics questions from S3
    console.log('📋 Seeding democratic characteristics questions...');
    await seedDemocraticCharacteristics();
    console.log('✅ Democratic characteristics questions seeded\n');

    // Add more seed functions here as needed
    // await seedOtherQuestions();
    // await seedSurveyResponses();

    console.log('✅ All seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
