import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { QuestionsModule } from "./questions/questions.module";
import { ResponsesModule } from "./responses/responses.module";

/**
 * AppModule is the root module of the application.
 *
 * In NestJS, modules are used to organize your application structure.
 * The root module imports all feature modules.
 *
 * Modules included:
 * - DatabaseModule: For database connection ✓
 * - QuestionsModule: For retrieving session questions ✓
 * - ResponsesModule: For submitting poll responses ✓
 */
@Module({
  imports: [DatabaseModule, QuestionsModule, ResponsesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
