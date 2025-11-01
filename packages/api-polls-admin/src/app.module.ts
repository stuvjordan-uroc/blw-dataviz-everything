import { Module } from '@nestjs/common';
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
 * - DatabaseModule: For database connection ✓
 * - AuthModule: For authentication (login, JWT) ✓
 * - SessionsModule: For session CRUD operations ✓
 * - QuestionsModule: For browsing questions ✓
 */
@Module({
  imports: [DatabaseModule, AuthModule, SessionsModule, QuestionsModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
