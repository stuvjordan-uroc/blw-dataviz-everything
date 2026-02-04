import { NestFactory } from '@nestjs/core';
import { UnifiedAppModule } from './app.module';
import { AllExceptionsFilter } from 'api-polls-admin/dist/common/filters/all-exceptions.filter';
import * as dotenv from 'dotenv';
import { LogLevel } from '@nestjs/common';

//

/**
 * Bootstrap the unified NestJS application
 * 
 * This combines both the admin and public polling APIs into a single application.
 * The APIs share an EventEmitter instance, enabling real-time communication:
 * - When admin changes session state, public API is notified immediately
 * - Public API can broadcast these changes to connected SSE clients
 * 
 * Route structure:
 * - Admin API on /admin/* (requires authentication)
 * - Public API on /* (no authentication required)
 */
async function bootstrap() {
  // Load environment variables from root .env
  dotenv.config({ path: '../../.env' });

  // Determine log levels based on LOG_LEVEL environment variable
  const logLevel = process.env.LOG_LEVEL || 'log';
  const logLevels: LogLevel[] = logLevel === 'debug'
    ? ['error', 'warn', 'log', 'debug', 'verbose']
    : ['error', 'warn', 'log'];

  // Create the unified NestJS application
  const app = await NestFactory.create(UnifiedAppModule, {
    logger: logLevels,
  });

  // Enable CORS so frontends can make requests to this API
  app.enableCors();

  // Register global exception filter for consistent error responses
  app.useGlobalFilters(new AllExceptionsFilter());

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Get port from environment or default to 3005
  const port = process.env.POLLING_UNIFIED_PORT || process.env.PORT || 3005;

  // Start the server
  await app.listen(port);
  console.log(`🚀 Unified Polls API is running on: http://localhost:${port}`);
  console.log(`   - Admin API: http://localhost:${port}/api/admin`);
  console.log(`   - Public API: http://localhost:${port}/api`);
}

bootstrap();
