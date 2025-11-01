import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import * as dotenv from 'dotenv';

/**
 * Bootstrap the NestJS application
 * 
 * This is the entry point for the API. It:
 * 1. Loads environment variables from root .env
 * 2. Creates a NestJS application instance using AppModule
 * 3. Enables CORS for cross-origin requests (needed for frontend)
 * 4. Registers global exception filter for consistent error handling
 * 5. Starts listening on the configured port
 */
async function bootstrap() {
  // Load environment variables from root .env (same as db package)
  dotenv.config({ path: '../../.env' });

  // Create the NestJS application
  const app = await NestFactory.create(AppModule);

  // Enable CORS so frontends can make requests to this API
  app.enableCors();

  // Register global exception filter for consistent error responses
  app.useGlobalFilters(new AllExceptionsFilter());

  // Get port from environment or default to 3003
  const port = process.env.POLLING_ADMIN_PORT || process.env.PORT || 3003;

  // Start the server
  await app.listen(port);
  console.log(`🚀 Polls Admin API is running on: http://localhost:${port}`);
}

bootstrap();
