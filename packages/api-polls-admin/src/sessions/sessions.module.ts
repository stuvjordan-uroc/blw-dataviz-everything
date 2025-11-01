import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';

/**
 * SessionsModule organizes all session-related code
 * 
 * In NestJS, each feature typically has its own module containing:
 * - Controllers (handle HTTP requests) - SessionsController ✓
 * - Services (business logic) - SessionsService ✓
 * - Any other related providers
 * 
 * This module will be imported into AppModule to make sessions
 * functionality available in the application.
 */
@Module({
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService], // Export so other modules can use it if needed
})
export class SessionsModule { }
