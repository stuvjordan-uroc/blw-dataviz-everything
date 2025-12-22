import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from './database/database.module';
import { SessionsModule } from './sessions/sessions.module';
import { QuestionsModule } from './questions/questions.module';
import { AuthModule } from './auth/auth.module';

/**
 * AppModule is the root module of the application.
 * 
 * In NestJS, modules are used to organize your application structure.
 * The root module imports all feature modules (like SessionsModule, QuestionsModule).
 * 
 * Modules included:
 * - EventEmitterModule: For event-driven communication (shared with public API when unified)
 * - DatabaseModule: For database connection ✓
 * - AuthModule: For authentication (login, JWT) ✓
 * - SessionsModule: For session CRUD operations ✓
 * - QuestionsModule: For browsing questions ✓
 */
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    DatabaseModule,
    AuthModule,
    SessionsModule,
    QuestionsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
