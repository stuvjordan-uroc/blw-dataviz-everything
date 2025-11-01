import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../../api-polls-admin/src/app.module';
import { AllExceptionsFilter } from '../../../api-polls-admin/src/common/filters/all-exceptions.filter';
import { DATABASE_CONNECTION } from '../../../api-polls-admin/src/database/database.providers';
import { drizzle } from 'drizzle-orm/postgres-js';

/**
 * Test Application Manager
 * 
 * This utility creates a NestJS application instance for integration testing.
 * It's similar to the bootstrap() function in main.ts, but:
 * - Uses the test database connection instead of the dev database
 * - Doesn't actually listen on a port (uses supertest instead)
 * - Can be torn down after tests complete
 */

export interface TestAppInstance {
  app: INestApplication;
  moduleRef: TestingModule;
}

/**
 * Create a NestJS application instance for testing
 * 
 * @param testDb - The test database instance from setupTestDatabase()
 * @returns NestJS application instance configured for testing
 * 
 * Usage:
 * ```typescript
 * const { db } = await setupTestDatabase();
 * const { app } = await createTestApp(db);
 * // Make requests to app using supertest
 * await app.close();
 * ```
 */
export async function createTestApp(
  testDb: ReturnType<typeof drizzle>
): Promise<TestAppInstance> {
  console.log('🚀 Creating test application...');

  // Create a testing module - this is like AppModule but for testing
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    // Override the DATABASE_CONNECTION provider with our test database
    // This ensures all database operations in the API use the test database
    .overrideProvider(DATABASE_CONNECTION)
    .useValue(testDb)
    .compile();

  // Create the actual NestJS application instance
  const app = moduleRef.createNestApplication();

  // Apply the same configuration as in main.ts
  app.enableCors();
  app.useGlobalFilters(new AllExceptionsFilter());

  // Initialize the application (but don't listen on a port)
  // Supertest will handle HTTP requests internally
  await app.init();

  console.log('✅ Test application ready');

  return { app, moduleRef };
}

/**
 * Close and cleanup a test application instance
 * 
 * @param app - The NestJS application instance to close
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
  console.log('👋 Closing test application...');
  await app.close();
  console.log('✅ Test application closed');
}
