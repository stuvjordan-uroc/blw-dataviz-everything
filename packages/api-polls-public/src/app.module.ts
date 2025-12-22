import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { DatabaseModule } from "./database/database.module";
import { QuestionsModule } from "./questions/questions.module";
import { ResponsesModule } from "./responses/responses.module";
import { SessionsModule } from "./sessions/sessions.module";

/**
 * AppModule is the root module of the application.
 *
 * In NestJS, modules are used to organize your application structure.
 * The root module imports all feature modules.
 *
 * Modules included:
 * - EventEmitterModule: For event-driven communication (shared with admin API when unified)
 * - DatabaseModule: For database connection ✓
 * - SessionsModule: For session info retrieval (main entry point) ✓
 * - QuestionsModule: For retrieving session questions ✓
 * - ResponsesModule: For submitting poll responses ✓
 */
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    DatabaseModule,
    SessionsModule,
    QuestionsModule,
    ResponsesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
