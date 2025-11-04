import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

/**
 * Bootstrap the NestJS application
 * 
 * This is the entry point for the Public Polls API. It:
 * 1. Loads environment variables from root .env
 * 2. Creates a NestJS application instance using AppModule
 * 3. Enables CORS for cross-origin requests (needed for frontend)
 * 4. Starts listening on the configured port
 */
async function bootstrap() {
  // Load environment variables from root .env (same as db package)
  dotenv.config({ path: '../../.env' });

  // Create the NestJS application
  const app = await NestFactory.create(AppModule);

  // Enable CORS so frontends can make requests to this API
  app.enableCors();

  // Get port from environment or default to 3004
  const port = process.env.POLLING_PUBLIC_PORT || process.env.PORT || 3004;

  // Start the server
  await app.listen(port);
  console.log(`🚀 Polls Public API is running on: http://localhost:${port}`);
}

bootstrap();
