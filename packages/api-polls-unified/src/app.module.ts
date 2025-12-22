import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppModule as AdminModule } from 'api-polls-admin/src/app.module';
import { AppModule as PublicModule } from 'api-polls-public/src/app.module';

/**
 * UnifiedAppModule combines both admin and public polling APIs
 * into a single application that shares an EventEmitter instance.
 * 
 * This enables real-time communication between the admin and public APIs:
 * - Admin API emits events when session state changes
 * - Public API listens for these events and notifies connected SSE clients
 * 
 * Route structure:
 * - /admin/* - Admin API endpoints (authentication required)
 * - /* - Public API endpoints (no authentication)
 */
@Module({
  imports: [
    // Shared EventEmitter for cross-module communication
    EventEmitterModule.forRoot({
      // Use wildcards for event names
      wildcard: false,
      // Set this to `true` to use wildcards
      delimiter: '.',
      // Maximum number of listeners that can be assigned to an event
      maxListeners: 10,
      // Show event name in memory leak message when more than max amount of listeners is assigned
      verboseMemoryLeak: true,
      // Disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),

    // Admin API module
    AdminModule,

    // Public API module
    PublicModule,
  ],
  controllers: [],
  providers: [],
})
export class UnifiedAppModule { }
