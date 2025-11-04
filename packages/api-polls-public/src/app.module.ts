import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { QuestionsModule } from './questions/questions.module';

/**
 * AppModule is the root module of the application.
 * 
 * In NestJS, modules are used to organize your application structure.
 * The root module imports all feature modules.
 * 
 * Modules included:
 * - DatabaseModule: For database connection ✓
 * - QuestionsModule: For retrieving session questions ✓
 */
@Module({
  imports: [DatabaseModule, QuestionsModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
